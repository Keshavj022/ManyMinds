"""
Onboarding: demographics + Big Five quiz.

Phase 1: POST /demographics — upserts a userProfile doc, advances the user
                              doc's onboardingStep to max(current, 1).
Phase 2: POST /quiz         — scores Big Five, writes quizResponses +
                              personalityProfile docs, seeds the council,
                              flips onboardingStep → 2.

Cosmos layout (see app/core/database.py):
  - users container, PK=/userId — polymorphic by `type`:
      * 'user'                — id == userId
      * 'userProfile'         — id = f"profile-{userId}"
      * 'personalityProfile'  — id = f"personality-{userId}"
      * 'quizResponses'       — id = f"quiz-{userId}"
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends

from app.core.database import get_pool, read_item, upsert
from app.schemas.onboarding import (
    DemographicsRequest,
    DemographicsResponse,
    PersonalityProfile,
    ProfileResponse,
    QuizResult,
    QuizSubmission,
)
from app.services.council import ensure_council_seeded
from app.services.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/onboarding", tags=["onboarding"])


def _now_iso() -> str:
    """ISO-8601 timestamp suitable for storing in a Cosmos document."""
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Phase 1 — demographics
# ---------------------------------------------------------------------------
@router.post("/demographics", response_model=DemographicsResponse)
async def save_demographics(
    body: DemographicsRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> DemographicsResponse:
    pool = get_pool()
    if pool is None:
        # Stub mode: just echo back + advance step.
        return DemographicsResponse(
            full_name=body.full_name,
            date_of_birth=body.date_of_birth,
            gender=body.gender,
            location=body.location,
            preferred_language=body.preferred_language,
            bio=body.bio,
            onboarding_step=1,
        )

    user_id = str(user["id"])
    now = _now_iso()

    # ---- Upsert userProfile doc ------------------------------------------
    profile_id = f"profile-{user_id}"
    existing_profile = await read_item("users", profile_id, user_id)
    profile_doc: dict[str, Any] = dict(existing_profile) if existing_profile else {}
    profile_doc.update(
        {
            "id": profile_id,
            "type": "userProfile",
            "userId": user_id,
            "fullName": body.full_name,
            # Pydantic `date` serialises poorly through Cosmos; keep as ISO string.
            "dateOfBirth": body.date_of_birth.isoformat() if body.date_of_birth else None,
            "gender": body.gender,
            "location": body.location,
            "preferredLanguage": body.preferred_language,
            "bio": body.bio,
            "updatedAt": now,
        }
    )
    if not existing_profile:
        profile_doc["createdAt"] = now
    await upsert("users", profile_doc)

    # ---- Advance onboardingStep on the user doc --------------------------
    user_doc = await read_item("users", user_id, user_id)
    if user_doc and user_doc.get("type") == "user":
        current_step = int(user_doc.get("onboardingStep") or 0)
        if current_step < 1:
            user_doc["onboardingStep"] = 1
            user_doc["updatedAt"] = now
            await upsert("users", user_doc)
    else:
        logger.warning(
            "save_demographics: user doc %s missing in Cosmos, skipping step bump",
            user_id,
        )

    return DemographicsResponse(
        full_name=body.full_name,
        date_of_birth=body.date_of_birth,
        gender=body.gender,
        location=body.location,
        preferred_language=body.preferred_language,
        bio=body.bio,
        onboarding_step=1,
    )


# ---------------------------------------------------------------------------
# Phase 2 — quiz scoring
# ---------------------------------------------------------------------------
def _score_big_five(responses: list[Any]) -> dict[str, int]:
    """Sum responses per dimension and normalise to 0-100."""
    sums: dict[str, int] = defaultdict(int)
    counts: dict[str, int] = defaultdict(int)
    for r in responses:
        sums[r.dimension] += r.response
        counts[r.dimension] += 1
    profile: dict[str, int] = {}
    for dim in ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]:
        if counts.get(dim):
            avg = sums[dim] / counts[dim]
            # 1..5 → 0..100
            score = round((avg - 1) / 4 * 100)
        else:
            score = 50
        profile[dim] = max(0, min(100, score))
    return profile


def _dominant_trait(profile: dict[str, int]) -> str:
    return max(profile.items(), key=lambda kv: kv[1])[0]


@router.post("/quiz", response_model=QuizResult)
async def submit_quiz(
    body: QuizSubmission,
    user: dict[str, Any] = Depends(get_current_user),
) -> QuizResult:
    profile_dict = _score_big_five(body.responses)
    dominant = _dominant_trait(profile_dict)
    profile_model = PersonalityProfile(
        **profile_dict,
        dominant_trait=dominant,
    )

    pool = get_pool()
    if pool is None:
        await ensure_council_seeded(user["id"])
        return QuizResult(profile=profile_model, onboarding_step=2, council_seeded=True)

    user_id = str(user["id"])
    now = _now_iso()

    # ---- quizResponses doc (single doc replaces the old DELETE+INSERT-20) -
    quiz_doc = {
        "id": f"quiz-{user_id}",
        "type": "quizResponses",
        "userId": user_id,
        "responses": [
            {
                "questionId": r.question_id,
                "dimension": r.dimension,
                "response": r.response,
            }
            for r in body.responses
        ],
        "updatedAt": now,
    }
    await upsert("users", quiz_doc)

    # ---- personalityProfile doc -----------------------------------------
    personality_doc = {
        "id": f"personality-{user_id}",
        "type": "personalityProfile",
        "userId": user_id,
        "openness": profile_dict["openness"],
        "conscientiousness": profile_dict["conscientiousness"],
        "extraversion": profile_dict["extraversion"],
        "agreeableness": profile_dict["agreeableness"],
        "neuroticism": profile_dict["neuroticism"],
        # Computed in Python — Cosmos has no generated-column equivalent.
        "dominantTrait": dominant,
        "updatedAt": now,
    }
    await upsert("users", personality_doc)

    # ---- Advance the user doc's onboardingStep --------------------------
    user_doc = await read_item("users", user_id, user_id)
    if user_doc and user_doc.get("type") == "user":
        user_doc["onboardingStep"] = 2
        user_doc["updatedAt"] = now
        await upsert("users", user_doc)
    else:
        logger.warning(
            "submit_quiz: user doc %s missing in Cosmos, skipping step bump",
            user_id,
        )

    # ---- Seed the council (now Cosmos-backed) ----------------------------
    await ensure_council_seeded(user_id)
    return QuizResult(profile=profile_model, onboarding_step=2, council_seeded=True)


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------
@router.get("/status")
async def status(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Quick endpoint for the frontend to know which onboarding phase to show."""
    return {
        "user_id": user["id"],
        "onboarding_step": user.get("onboarding_step", 0),
        "complete": user.get("onboarding_step", 0) >= 2,
    }


# ---------------------------------------------------------------------------
# Profile — read back stored demographics + personality
# ---------------------------------------------------------------------------
@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    user: dict[str, Any] = Depends(get_current_user),
) -> ProfileResponse:
    """Everything we have on the signed-in user, for the Profile page.

    Demographics live in the `userProfile` doc and personality in the
    `personalityProfile` doc (see module docstring). Both are optional — a user
    who only finished phase 1 has no personality yet, and vice-versa.
    """
    user_id = str(user["id"])
    step = int(user.get("onboarding_step", 0) or 0)
    base = ProfileResponse(
        email=user.get("email"),
        username=user.get("username"),
        preferred_language="en",
        onboarding_step=step,
    )

    pool = get_pool()
    if pool is None:
        return base

    profile_doc = await read_item("users", f"profile-{user_id}", user_id)
    if profile_doc:
        base.full_name = profile_doc.get("fullName")
        base.date_of_birth = profile_doc.get("dateOfBirth")
        base.gender = profile_doc.get("gender")
        base.location = profile_doc.get("location")
        base.preferred_language = profile_doc.get("preferredLanguage") or "en"
        base.bio = profile_doc.get("bio")

    personality_doc = await read_item("users", f"personality-{user_id}", user_id)
    if personality_doc:
        base.personality = PersonalityProfile(
            openness=int(personality_doc.get("openness", 50)),
            conscientiousness=int(personality_doc.get("conscientiousness", 50)),
            extraversion=int(personality_doc.get("extraversion", 50)),
            agreeableness=int(personality_doc.get("agreeableness", 50)),
            neuroticism=int(personality_doc.get("neuroticism", 50)),
            dominant_trait=personality_doc.get("dominantTrait"),
        )

    return base
