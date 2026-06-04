"""
Debate service (Cosmos DB port).

Creates debate sessions, auto-assigns sides using persona affinity:
  - Pro:  Aria + Echo  (analytical, empathic — "let's actually do this")
  - Con:  Rex + Nova   (contrarian, creative — "make me see the cost")
  - Mod:  Sage         (long-arc neutral)

`advance` plays one argument from the next speaker in queue.

Storage model
-------------
Cosmos collapses the PG triple (debates / debate_participants /
debate_arguments) into a single polymorphic doc in the `conversations`
container, partitioned by `sessionId`:

    {
      id: <debateId>,
      type: 'debate',
      sessionId, userId,
      topic, status,
      totalRounds, currentRound,
      moderatorMemberId, moderatorSlug,
      participants: [ ... up to 5 ... ],
      arguments:    [ ... ~13 max, append-only ... ],
      startedAt, endedAt, createdAt   # ISO-8601 strings
    }

Lookup by debate id alone requires a tiny cross-partition query (id is
unique, so we cap at 1 row) to discover the sessionId; then we point-read
by (id=debateId, partition_key=sessionId).
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.database import get_container, get_pool, query, read_item, upsert
from app.services.chat import _insert_message, create_session
from app.services.council import (
    get_user_personality_profile,
    list_council,
)
from app.services.llm import generate_debate_argument
from app.services.personalities import build_debate_prompt
from app.services.personalities.personas import COUNCIL_PERSONAS

logger = logging.getLogger(__name__)


PRO_SIDE = ["aria", "echo"]
CON_SIDE = ["rex", "nova"]
MODERATOR_SLUG = "sage"


# In-memory mirror used when Cosmos is unavailable (stub mode). When
# Cosmos is live we ALSO keep this populated as a write-through cache to
# keep hot-path reads cheap — but Cosmos is the source of truth.
_STUB_DEBATES: dict[str, dict[str, Any]] = {}


CONVERSATIONS = "conversations"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | str | None) -> str | None:
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    return dt.isoformat()


# --------------------------------------------------------------------------
# Member helpers
# --------------------------------------------------------------------------
def _slug_for_id(members: list[dict[str, Any]], mid: str | None) -> str | None:
    if not mid:
        return None
    for m in members:
        if str(m["id"]) == str(mid):
            return m["slug"]
    return None


def _member_by_slug(members: list[dict[str, Any]], slug: str) -> dict[str, Any] | None:
    for m in members:
        if m["slug"] == slug:
            return m
    return None


def _participant_payload(
    participant: dict[str, Any], members: list[dict[str, Any]]
) -> dict[str, Any]:
    slug = participant.get("member_slug") or _slug_for_id(
        members, participant.get("council_member_id")
    )
    member = _member_by_slug(members, slug) if slug else None
    return {
        "id": str(participant["id"]),
        "council_member_id": str(participant.get("council_member_id") or ""),
        "member_slug": slug or "",
        "member_name": (member or {}).get("name", ""),
        "side": participant["side"],
    }


# --------------------------------------------------------------------------
# Doc <-> API shape conversions
# --------------------------------------------------------------------------
def _doc_to_internal(doc: dict[str, Any]) -> dict[str, Any]:
    """Translate a Cosmos debate doc to the internal snake_case shape that
    `_shape_debate_for_api` expects."""
    participants = []
    for p in doc.get("participants", []) or []:
        participants.append(
            {
                "id": p.get("id"),
                "council_member_id": p.get("councilMemberId"),
                "member_slug": p.get("memberSlug"),
                "side": p.get("side"),
            }
        )

    arguments = []
    for a in doc.get("arguments", []) or []:
        arguments.append(
            {
                "id": a.get("id"),
                "participant_id": a.get("participantId"),
                "round_number": a.get("roundNumber"),
                "argument_type": a.get("argumentType"),
                "content": a.get("content"),
                "strength_score": a.get("strengthScore"),
                "member_slug": a.get("memberSlug"),
                "member_name": a.get("memberName"),
                "side": a.get("side"),
                "created_at": a.get("createdAt"),
            }
        )

    return {
        "id": doc.get("id"),
        "session_id": doc.get("sessionId"),
        "user_id": doc.get("userId"),
        "topic": doc.get("topic"),
        "status": doc.get("status"),
        "total_rounds": doc.get("totalRounds"),
        "current_round": doc.get("currentRound", 0),
        "moderator_member_id": doc.get("moderatorMemberId"),
        "moderator_slug": doc.get("moderatorSlug"),
        "participants": participants,
        "arguments": arguments,
        "started_at": doc.get("startedAt"),
        "ended_at": doc.get("endedAt"),
    }


def _internal_to_doc(d: dict[str, Any]) -> dict[str, Any]:
    """Translate the internal snake_case shape back to a Cosmos debate doc."""
    participants = []
    for p in d.get("participants", []) or []:
        participants.append(
            {
                "id": p.get("id"),
                "councilMemberId": p.get("council_member_id"),
                "memberSlug": p.get("member_slug"),
                "memberName": p.get("member_name", ""),
                "side": p.get("side"),
            }
        )

    arguments = []
    for a in d.get("arguments", []) or []:
        arguments.append(
            {
                "id": a.get("id"),
                "participantId": a.get("participant_id"),
                "roundNumber": a.get("round_number"),
                "argumentType": a.get("argument_type"),
                "content": a.get("content"),
                "strengthScore": a.get("strength_score"),
                "memberSlug": a.get("member_slug", ""),
                "memberName": a.get("member_name", ""),
                "side": a.get("side"),
                "createdAt": _iso(a.get("created_at")),
            }
        )

    return {
        "id": d["id"],
        "type": "debate",
        "sessionId": d["session_id"],
        "userId": d["user_id"],
        "topic": d.get("topic"),
        "status": d.get("status", "pending"),
        "totalRounds": d.get("total_rounds"),
        "currentRound": d.get("current_round", 0),
        "moderatorMemberId": d.get("moderator_member_id"),
        "moderatorSlug": d.get("moderator_slug"),
        "participants": participants,
        "arguments": arguments,
        "startedAt": _iso(d.get("started_at")),
        "endedAt": _iso(d.get("ended_at")),
        "createdAt": _iso(d.get("created_at") or _now()),
    }


# --------------------------------------------------------------------------
# Create debate
# --------------------------------------------------------------------------
def _build_participants(
    members: list[dict[str, Any]], debate_id: str
) -> list[dict[str, Any]]:
    """Build the 5 standard participants. Each gets a stable uuid id.

    Used in BOTH stub and Cosmos paths so participant ids are uniform.
    """
    out: list[dict[str, Any]] = []
    for slug in PRO_SIDE:
        m = _member_by_slug(members, slug)
        if not m:
            continue
        out.append(
            {
                "id": str(uuid.uuid4()),
                "council_member_id": str(m["id"]),
                "member_slug": slug,
                "member_name": m.get("name", ""),
                "side": "for",
            }
        )
    for slug in CON_SIDE:
        m = _member_by_slug(members, slug)
        if not m:
            continue
        out.append(
            {
                "id": str(uuid.uuid4()),
                "council_member_id": str(m["id"]),
                "member_slug": slug,
                "member_name": m.get("name", ""),
                "side": "against",
            }
        )
    m = _member_by_slug(members, MODERATOR_SLUG)
    if m:
        out.append(
            {
                "id": str(uuid.uuid4()),
                "council_member_id": str(m["id"]),
                "member_slug": MODERATOR_SLUG,
                "member_name": m.get("name", ""),
                "side": "moderator",
            }
        )
    return out


async def create_debate(
    user_id: str,
    topic: str,
    total_rounds: int = 3,
) -> dict[str, Any]:
    members = await list_council(user_id)
    if len(members) < 5:
        logger.warning("debate created with %d members (expected 5)", len(members))

    pool = get_pool()
    debate_id = str(uuid.uuid4())
    moderator_member = _member_by_slug(members, MODERATOR_SLUG)
    participants = _build_participants(members, debate_id)

    if pool is None:
        # Pure stub path — no parent session row, fabricate a sessionId.
        session_id = str(uuid.uuid4())
        debate = {
            "id": debate_id,
            "session_id": session_id,
            "user_id": user_id,
            "topic": topic,
            "status": "pending",
            "total_rounds": total_rounds,
            "current_round": 0,
            "moderator_member_id": str(moderator_member["id"]) if moderator_member else None,
            "moderator_slug": MODERATOR_SLUG if moderator_member else None,
            "participants": participants,
            "arguments": [],
            "started_at": None,
            "ended_at": None,
            "created_at": _now(),
        }
        _STUB_DEBATES[debate_id] = debate
        return _shape_debate_for_api(debate, members)

    # Cosmos path — create the parent session first to get its id (= PK).
    session = await create_session(
        user_id,
        title=f"Debate: {topic[:80]}",
        session_type="debate",
    )
    session_id = str(session["id"])

    debate = {
        "id": debate_id,
        "session_id": session_id,
        "user_id": user_id,
        "topic": topic,
        "status": "pending",
        "total_rounds": total_rounds,
        "current_round": 0,
        "moderator_member_id": str(moderator_member["id"]) if moderator_member else None,
        "moderator_slug": MODERATOR_SLUG if moderator_member else None,
        "participants": participants,
        "arguments": [],
        "started_at": None,
        "ended_at": None,
        "created_at": _now(),
    }

    doc = _internal_to_doc(debate)
    await upsert(CONVERSATIONS, doc)

    # Write-through cache for cheap hot reads.
    _STUB_DEBATES[debate_id] = debate

    return _shape_debate_for_api(debate, members)


# --------------------------------------------------------------------------
# Read
# --------------------------------------------------------------------------
async def _find_session_id_for_debate(debate_id: str) -> str | None:
    """Tiny cross-partition lookup to discover the partition key (sessionId).

    Cap to 1 row. Cheap because id is unique and indexed by default.
    """
    rows = await query(
        CONVERSATIONS,
        "SELECT c.sessionId, c.userId FROM c WHERE c.id = @id AND c.type = 'debate'",
        parameters=[{"name": "@id", "value": debate_id}],
        enable_cross_partition=True,
        max_items=1,
    )
    if not rows:
        return None
    return rows[0].get("sessionId")


async def _read_debate_doc(debate_id: str) -> dict[str, Any] | None:
    """Locate + point-read the debate doc. Returns the raw Cosmos doc."""
    session_id = await _find_session_id_for_debate(debate_id)
    if not session_id:
        return None
    return await read_item(CONVERSATIONS, debate_id, session_id)


async def get_debate(user_id: str, debate_id: str) -> dict[str, Any] | None:
    members = await list_council(user_id)
    pool = get_pool()

    if pool is None:
        d = _STUB_DEBATES.get(debate_id)
        if not d or d.get("user_id") != user_id:
            return None
        return _shape_debate_for_api(d, members)

    doc = await _read_debate_doc(debate_id)
    if not doc:
        # Fall through to the write-through cache if Cosmos is unreachable.
        cached = _STUB_DEBATES.get(debate_id)
        if cached and cached.get("user_id") == user_id:
            return _shape_debate_for_api(cached, members)
        return None

    if doc.get("userId") != user_id:
        return None

    internal = _doc_to_internal(doc)
    # Re-populate write-through cache.
    _STUB_DEBATES[debate_id] = internal
    return _shape_debate_for_api(internal, members)


def _shape_debate_for_api(
    d: dict[str, Any], members: list[dict[str, Any]]
) -> dict[str, Any]:
    """Decorate participants and arguments with member names."""
    out = dict(d)
    parts = []
    for p in out.get("participants", []):
        parts.append(_participant_payload(p, members))
    out["participants"] = parts

    args = []
    by_pid = {p["id"]: p for p in parts}
    for a in out.get("arguments", []):
        a_out = dict(a)
        pid = a_out.get("participant_id")
        p = by_pid.get(pid)
        a_out["member_slug"] = (p or {}).get("member_slug") or a_out.get("member_slug", "")
        a_out["member_name"] = (p or {}).get("member_name") or a_out.get("member_name", "")
        a_out["side"] = (p or {}).get("side", a_out.get("side", "for"))
        args.append(a_out)
    out["arguments"] = args

    # Pick next speaker.
    out["next_speaker"] = _pick_next_speaker(out, parts)
    return out


# --------------------------------------------------------------------------
# Speaker ordering
# --------------------------------------------------------------------------
_DEBATE_ORDER = [
    # round 1: moderator → 2 pros → 2 cons
    ("moderator", "opening"),
    ("for", "opening"),
    ("against", "opening"),
    ("for", "argument"),
    ("against", "argument"),
    # subsequent rounds rotate (rebuttal x4 + moderator wrap)
    ("for", "rebuttal"),
    ("against", "rebuttal"),
    ("for", "rebuttal"),
    ("against", "rebuttal"),
    ("moderator", "argument"),
    ("for", "closing"),
    ("against", "closing"),
    ("moderator", "closing"),
]


def _pick_next_speaker(
    debate: dict[str, Any], parts: list[dict[str, Any]]
) -> dict[str, Any] | None:
    args = debate.get("arguments", [])
    idx = len(args)
    if idx >= len(_DEBATE_ORDER):
        return None
    side_needed, _arg_type = _DEBATE_ORDER[idx]
    same_side = [p for p in parts if p["side"] == side_needed]
    if not same_side:
        return None
    # Rotate within side based on how many of this side have already spoken.
    same_side_count = sum(1 for a in args if a.get("side") == side_needed)
    return same_side[same_side_count % len(same_side)]


# --------------------------------------------------------------------------
# Advance
# --------------------------------------------------------------------------
async def advance_debate(user_id: str, debate_id: str) -> dict[str, Any]:
    members = await list_council(user_id)
    debate = await get_debate(user_id, debate_id)
    if not debate:
        return {"debate": None, "new_argument": None}

    next_speaker = debate.get("next_speaker")
    if not next_speaker:
        # Mark completed.
        await _mark_completed(user_id, debate_id)
        debate = await get_debate(user_id, debate_id)
        return {"debate": debate, "new_argument": None}

    profile = await get_user_personality_profile(user_id)
    args_history = [
        {
            "speaker": a.get("member_name", ""),
            "side": a.get("side", ""),
            "content": a.get("content", ""),
        }
        for a in debate.get("arguments", [])
    ]
    prior_arg_count = len(debate.get("arguments", []))
    round_number = max(1, (prior_arg_count // 5) + 1)
    arg_type = (
        _DEBATE_ORDER[prior_arg_count][1]
        if prior_arg_count < len(_DEBATE_ORDER)
        else "closing"
    )

    slug = next_speaker["member_slug"]
    persona = COUNCIL_PERSONAS.get(slug)
    if not persona:
        return {"debate": debate, "new_argument": None}

    prompt = build_debate_prompt(
        persona=persona,
        topic=debate["topic"],
        side=next_speaker["side"],
        round_number=round_number,
        total_rounds=debate["total_rounds"],
        prior_arguments=args_history,
        user_personality_profile=profile,
    )
    text = await generate_debate_argument(
        prompt,
        member_id=slug,
        side=next_speaker["side"],
        topic=debate["topic"],
        round_number=round_number,
    )

    # Persist.
    new_arg = await _insert_argument(
        user_id,
        debate_id,
        participant_id=next_speaker["id"],
        side=next_speaker["side"],
        member_slug=slug,
        member_name=next_speaker["member_name"],
        content=text,
        round_number=round_number,
        argument_type=arg_type,
        session_id=debate["session_id"],
        council_member_id=next_speaker["council_member_id"],
    )

    # Update current_round + status.
    await _update_round_status(user_id, debate_id, round_number)

    debate = await get_debate(user_id, debate_id)
    return {"debate": debate, "new_argument": new_arg}


# --------------------------------------------------------------------------
# Mutation helpers
# --------------------------------------------------------------------------
async def _load_internal_for_mutation(
    debate_id: str,
) -> tuple[dict[str, Any] | None, str | None, bool]:
    """Return (internal_doc, session_id, is_cosmos).

    is_cosmos=False means stub mode (or Cosmos read failed but we have a
    cached copy). The caller writes back via the same path it loaded from.
    """
    pool = get_pool()
    if pool is None:
        d = _STUB_DEBATES.get(debate_id)
        if not d:
            return None, None, False
        return d, d.get("session_id"), False

    doc = await _read_debate_doc(debate_id)
    if not doc:
        # Fall back to cache if available — don't lose work.
        d = _STUB_DEBATES.get(debate_id)
        if d:
            return d, d.get("session_id"), False
        return None, None, True
    internal = _doc_to_internal(doc)
    return internal, internal.get("session_id"), True


async def _insert_argument(
    user_id: str,
    debate_id: str,
    *,
    participant_id: str,
    side: str,
    member_slug: str,
    member_name: str,
    content: str,
    round_number: int,
    argument_type: str,
    session_id: str,
    council_member_id: str,
) -> dict[str, Any]:
    arg = {
        "id": str(uuid.uuid4()),
        "participant_id": participant_id,
        "round_number": round_number,
        "argument_type": argument_type,
        "content": content,
        "strength_score": None,
        "created_at": _now(),
        "member_slug": member_slug,
        "member_name": member_name,
        "side": side,
    }

    internal, _sid, is_cosmos = await _load_internal_for_mutation(debate_id)
    if internal is None:
        return {}

    internal.setdefault("arguments", []).append(arg)

    if is_cosmos:
        doc = _internal_to_doc(internal)
        await upsert(CONVERSATIONS, doc)

    # Always keep the write-through cache in sync.
    _STUB_DEBATES[debate_id] = internal

    # Mirror the argument into the unified message stream.
    await _insert_message(
        user_id,
        session_id,
        role="assistant",
        content=content,
        council_member_id=council_member_id,
    )

    return arg


async def _update_round_status(
    user_id: str, debate_id: str, current_round: int
) -> None:
    internal, _sid, is_cosmos = await _load_internal_for_mutation(debate_id)
    if internal is None:
        return

    internal["current_round"] = max(
        int(internal.get("current_round") or 0), int(current_round)
    )
    if internal.get("status") == "pending":
        internal["status"] = "active"
        if not internal.get("started_at"):
            internal["started_at"] = _now()

    if is_cosmos:
        doc = _internal_to_doc(internal)
        await upsert(CONVERSATIONS, doc)

    _STUB_DEBATES[debate_id] = internal


async def _mark_completed(user_id: str, debate_id: str) -> None:
    internal, _sid, is_cosmos = await _load_internal_for_mutation(debate_id)
    if internal is None:
        return

    internal["status"] = "completed"
    internal["ended_at"] = _now()

    if is_cosmos:
        doc = _internal_to_doc(internal)
        await upsert(CONVERSATIONS, doc)

    _STUB_DEBATES[debate_id] = internal


__all__ = ["create_debate", "get_debate", "advance_debate"]
