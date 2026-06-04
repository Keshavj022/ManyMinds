"""
Council-member service: seeding the 5 canonical members for a user,
loading them back, mapping Cosmos docs to slugs, and fetching personality
profile context for prompt building.

Cosmos layout (see app/core/database.py):
  - council container, PK=/userId
      doc.type='councilMember' — one per (user, slug) pair (unique-key policy
      on (/userId, /slug)).
  - users container, PK=/userId
      doc.type='personalityProfile' — id = f"personality-{user_id}"

Designed to work in stub mode (no Cosmos creds) by returning in-memory mocks
that match the live shape, exactly as the old PG implementation did.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from app.core.database import (
    get_pool,
    query,
    read_item,
    upsert,
)
from app.services.personalities.personas import (
    COUNCIL_ORDER,
    COUNCIL_PERSONAS,
    Persona,
)

logger = logging.getLogger(__name__)


# In-memory write-through cache. Source of truth is Cosmos when available,
# but we mirror council docs here so hot reads (and stub mode) work without
# round-tripping the cluster.
_STUB_COUNCIL: dict[str, dict[str, dict[str, Any]]] = {}
# user_id -> { member_id -> council member shape (API output) }
_STUB_PERSONALITY: dict[str, dict[str, int]] = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _persona_to_default_row(user_id: str, persona: Persona) -> dict[str, Any]:
    """Default per-user member fields (used when seeding a new council)."""
    return {
        "userId": user_id,
        "name": persona.name,
        "slug": persona.id,
        "personalityType": persona.personality_type,
        "tone": persona.default_tone,
        "expertiseAreas": list(persona.default_expertise),
        "behavioralConstraints": {},
        "colorTheme": persona.color_theme,
        "positionOrder": persona.position_order,
        "isActive": True,
    }


def _coerce_jsonb(value: Any) -> dict:
    """Defensive shape coercion.

    Cosmos returns dicts already, but the PG path used to return JSON-encoded
    strings, so we keep the helper so accidental string payloads still parse
    cleanly rather than blowing up the API response.
    """
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        import json
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:  # noqa: BLE001
            return {}
    return {}


def _row_to_member(row: dict[str, Any]) -> dict[str, Any]:
    """Convert a Cosmos doc (or stub row) to the API council-member shape.

    Accepts both snake_case (legacy/stub) and camelCase (Cosmos) keys so the
    helper works on either side.
    """
    def pick(*keys: str, default: Any = None) -> Any:
        for k in keys:
            if k in row and row[k] is not None:
                return row[k]
        return default

    name = (pick("name", default="") or "").strip()
    explicit_slug = pick("slug")
    persona = (
        COUNCIL_PERSONAS.get(str(explicit_slug).lower())
        if explicit_slug
        else COUNCIL_PERSONAS.get(name.lower())
    )
    slug = persona.id if persona else (str(explicit_slug).lower() if explicit_slug else name.lower())
    personality_type = pick(
        "personalityType",
        "personality_type",
        default=(persona.personality_type if persona else ""),
    )
    position_order = pick("positionOrder", "position_order")
    if position_order is None:
        position_order = persona.position_order if persona else 0
    return {
        "id": str(row.get("id") or ""),
        "slug": slug,
        "name": name or (persona.name if persona else ""),
        "role": persona.role if persona else personality_type,
        "personality_type": personality_type,
        "tone": pick("tone"),
        "expertise_areas": list(pick("expertiseAreas", "expertise_areas", default=[]) or []),
        "behavioral_constraints": _coerce_jsonb(
            pick("behavioralConstraints", "behavioral_constraints", default={})
        ),
        "color_theme": pick(
            "colorTheme",
            "color_theme",
            default=(persona.color_theme if persona else None),
        ),
        "position_order": position_order,
        "is_active": bool(pick("isActive", "is_active", default=True)),
        "one_liner": persona.one_liner if persona else None,
        "portrait": persona.portrait if persona else None,
    }


def mock_council_for_user(user_id: str) -> list[dict[str, Any]]:
    """Return a stub-mode council (one member per persona)."""
    out: list[dict[str, Any]] = []
    for slug in COUNCIL_ORDER:
        persona = COUNCIL_PERSONAS[slug]
        out.append(
            {
                "id": f"stub-{slug}-{user_id[-6:]}",
                "slug": slug,
                "name": persona.name,
                "role": persona.role,
                "personality_type": persona.personality_type,
                "tone": persona.default_tone,
                "expertise_areas": list(persona.default_expertise),
                "behavioral_constraints": {},
                "color_theme": persona.color_theme,
                "position_order": persona.position_order,
                "is_active": True,
                "one_liner": persona.one_liner,
                "portrait": persona.portrait,
            }
        )
    return out


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def ensure_council_seeded(user_id: str) -> list[dict[str, Any]]:
    """Make sure every canonical persona has a councilMember doc for this user.

    Returns the user's current council ordered by positionOrder.
    In stub mode, returns the in-memory mock.
    """
    pool = get_pool()
    if pool is None:
        # Stub mode — preserve the previous behaviour exactly.
        cached = _STUB_COUNCIL.get(user_id)
        if cached:
            members = list(cached.values())
            members.sort(key=lambda m: (m.get("position_order", 0), m.get("name", "")))
            return members
        members = mock_council_for_user(user_id)
        _STUB_COUNCIL[user_id] = {m["id"]: m for m in members}
        return members

    # Live mode — partition-scoped query for existing members.
    existing = await query(
        "council",
        "SELECT * FROM c WHERE c.type = 'councilMember' ORDER BY c.positionOrder ASC",
        partition_key=user_id,
    )
    present_slugs: set[str] = set()
    for doc in existing:
        slug = (doc.get("slug") or "").lower()
        if not slug:
            # Legacy/safety: fall back to name-based persona lookup.
            persona = COUNCIL_PERSONAS.get((doc.get("name") or "").lower())
            slug = persona.id if persona else ""
        if slug:
            present_slugs.add(slug)

    missing = [s for s in COUNCIL_ORDER if s not in present_slugs]
    for slug in missing:
        persona = COUNCIL_PERSONAS[slug]
        doc = {
            "id": str(uuid.uuid4()),
            "type": "councilMember",
            **_persona_to_default_row(user_id, persona),
        }
        await upsert("council", doc)

    # Re-fetch the now-complete set, ordered by positionOrder then name.
    rows = await query(
        "council",
        (
            "SELECT * FROM c WHERE c.type = 'councilMember' "
            "ORDER BY c.positionOrder ASC"
        ),
        partition_key=user_id,
    )
    members = [_row_to_member(r) for r in rows]
    # Cosmos can't ORDER BY two paths without a composite index, so do the
    # secondary sort (by name) in Python — cheap, list is always small.
    members.sort(key=lambda m: (m.get("position_order", 0), m.get("name", "")))

    # Keep the in-memory mirror warm for hot reads / stub-fallback parity.
    _STUB_COUNCIL[user_id] = {m["id"]: dict(m) for m in members}
    return members


async def list_council(user_id: str) -> list[dict[str, Any]]:
    return await ensure_council_seeded(user_id)


async def update_member(
    user_id: str,
    member_id: str,
    *,
    tone: str | None = None,
    expertise_areas: list[str] | None = None,
    behavioral_constraints: dict | None = None,
) -> dict[str, Any] | None:
    """Patch tone / expertise / constraints on a single council member."""
    pool = get_pool()
    if pool is None:
        # Stub mode — overlay onto the mock, persisting through the cache.
        members_by_id = _STUB_COUNCIL.setdefault(
            user_id, {m["id"]: m for m in mock_council_for_user(user_id)}
        )
        m = members_by_id.get(member_id)
        if not m:
            return None
        if tone is not None:
            m["tone"] = tone
        if expertise_areas is not None:
            m["expertise_areas"] = list(expertise_areas)
        if behavioral_constraints is not None:
            m["behavioral_constraints"] = behavioral_constraints
        return m

    # Live mode — point read, patch, upsert.
    doc = await read_item("council", member_id, user_id)
    if not doc or doc.get("type") != "councilMember":
        return None

    if tone is not None:
        doc["tone"] = tone
    if expertise_areas is not None:
        doc["expertiseAreas"] = list(expertise_areas)
    if behavioral_constraints is not None:
        doc["behavioralConstraints"] = behavioral_constraints

    saved = await upsert("council", doc)
    # `upsert` returns the saved doc on success; fall back to the in-memory
    # `doc` we just patched if Cosmos returned None (transient failure).
    shaped = _row_to_member(saved or doc)

    # Refresh the in-memory mirror so subsequent list_council calls in this
    # process see the change immediately.
    mirror = _STUB_COUNCIL.setdefault(user_id, {})
    mirror[shaped["id"]] = dict(shaped)
    return shaped


async def member_lookup_by_id_or_slug(
    user_id: str,
    member_ref: str,
) -> dict[str, Any] | None:
    """Find a council member by their Cosmos id, by slug ('aria'), or by name."""
    if not member_ref:
        return None
    members = await list_council(user_id)
    ref = member_ref.strip().lower()
    for m in members:
        if str(m["id"]) == member_ref or m["slug"] == ref or m["name"].lower() == ref:
            return m
    return None


async def get_user_personality_profile(user_id: str) -> dict[str, int] | None:
    """Return the Big Five profile as a plain dict, or None if not yet taken.

    Lives in the `users` container, type='personalityProfile',
    id = f"personality-{user_id}", PK = user_id.
    """
    pool = get_pool()
    if pool is None:
        cached = _STUB_PERSONALITY.get(user_id)
        if cached:
            return dict(cached)
        # Stub demo profile — slightly high openness for interesting replies.
        return {
            "openness": 78,
            "conscientiousness": 62,
            "extraversion": 48,
            "agreeableness": 65,
            "neuroticism": 55,
        }

    doc = await read_item("users", f"personality-{user_id}", user_id)
    if not doc or doc.get("type") != "personalityProfile":
        return None
    profile = {
        "openness": int(doc.get("openness") or 0),
        "conscientiousness": int(doc.get("conscientiousness") or 0),
        "extraversion": int(doc.get("extraversion") or 0),
        "agreeableness": int(doc.get("agreeableness") or 0),
        "neuroticism": int(doc.get("neuroticism") or 0),
    }
    _STUB_PERSONALITY[user_id] = dict(profile)
    return profile


__all__ = [
    "ensure_council_seeded",
    "list_council",
    "update_member",
    "member_lookup_by_id_or_slug",
    "get_user_personality_profile",
    "mock_council_for_user",
]
