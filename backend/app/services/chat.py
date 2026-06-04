"""
Chat session / message service.

Persists user + member messages and runs the prompt-then-LLM pipeline
per responder. Falls back to in-memory mock storage in stub mode.

Cosmos layout:
- sessions       (PK=/userId)    type='session'
- conversations  (PK=/sessionId) type='message'
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.database import get_pool, query, read_item, upsert
from app.services.council import (
    get_user_personality_profile,
    list_council,
    member_lookup_by_id_or_slug,
)
from app.services.llm import generate_chat_reply
from app.services.memory_graph import get_memory_graph
from app.services.orchestration import choose_responders
from app.services.personalities import build_chat_prompt
from app.services.personalities.personas import COUNCIL_PERSONAS

logger = logging.getLogger(__name__)


# In-memory stub stores (only used when Cosmos is unavailable).
_STUB_SESSIONS: dict[str, dict[str, Any]] = {}
_STUB_MESSAGES: dict[str, list[dict[str, Any]]] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _session_doc_to_api(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert a Cosmos session doc to the API-facing dict the routes expect."""
    return {
        "id": doc.get("id"),
        "user_id": doc.get("userId"),
        "title": doc.get("title"),
        "session_type": doc.get("sessionType"),
        "environment_id": doc.get("environmentId"),
        "started_at": doc.get("startedAt"),
        "ended_at": doc.get("endedAt"),
    }


def _message_doc_to_api(
    doc: dict[str, Any], members: list[dict[str, Any]]
) -> dict[str, Any]:
    """Convert a Cosmos message doc into the slim shape the API + prompt expect."""
    cm_id = doc.get("councilMemberId")
    return {
        "id": doc.get("id"),
        "session_id": doc.get("sessionId"),
        "council_member_id": cm_id,
        "member_slug": _slug_for_member_id(members, cm_id),
        "member_name": _name_for_member_id(members, cm_id),
        "role": doc.get("role"),
        "content": doc.get("content"),
        "content_type": doc.get("contentType"),
        "image_url": doc.get("imageUrl"),
        "voice_audio_url": doc.get("voiceAudioUrl"),
        "created_at": doc.get("createdAt"),
    }


# --------------------------------------------------------------------------
# Sessions
# --------------------------------------------------------------------------
async def create_session(
    user_id: str,
    title: str | None = None,
    environment_id: str | None = None,
    session_type: str = "chat",
) -> dict[str, Any]:
    pool = get_pool()
    sid = str(uuid.uuid4())
    started_at_iso = _now_iso()

    if pool is None:
        s = {
            "id": sid,
            "user_id": user_id,
            "title": title or "New conversation",
            "session_type": session_type,
            "environment_id": environment_id,
            "started_at": _now(),
            "ended_at": None,
        }
        _STUB_SESSIONS[sid] = s
        _STUB_MESSAGES[sid] = []
        return s

    doc = {
        "id": sid,
        "userId": user_id,
        "type": "session",
        "title": title or "New conversation",
        "sessionType": session_type,
        "environmentId": environment_id,
        "startedAt": started_at_iso,
        "endedAt": None,
        "createdAt": started_at_iso,
    }
    await upsert("sessions", doc)

    # Write-through to the stub cache so hot reads stay snappy.
    _STUB_SESSIONS[sid] = {
        "id": sid,
        "user_id": user_id,
        "title": doc["title"],
        "session_type": session_type,
        "environment_id": environment_id,
        "started_at": started_at_iso,
        "ended_at": None,
    }
    _STUB_MESSAGES.setdefault(sid, [])
    return _session_doc_to_api(doc)


async def list_sessions(user_id: str, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
    pool = get_pool()
    if pool is None:
        sessions = [s for s in _STUB_SESSIONS.values() if s["user_id"] == user_id]
        sessions.sort(key=lambda s: s["started_at"], reverse=True)
        return sessions[offset : offset + limit]

    sql = (
        "SELECT * FROM c WHERE c.type = 'session' "
        "ORDER BY c.startedAt DESC OFFSET @off LIMIT @lim"
    )
    params = [
        {"name": "@off", "value": int(offset)},
        {"name": "@lim", "value": int(limit)},
    ]
    rows = await query(
        "sessions",
        sql,
        parameters=params,
        partition_key=user_id,
    )
    return [_session_doc_to_api(r) for r in rows]


async def get_session(user_id: str, session_id: str) -> dict[str, Any] | None:
    pool = get_pool()
    if pool is None:
        s = _STUB_SESSIONS.get(session_id)
        return s if s and s["user_id"] == user_id else None

    doc = await read_item("sessions", session_id, partition_key=user_id)
    if not doc or doc.get("type") != "session":
        return None
    return _session_doc_to_api(doc)


# --------------------------------------------------------------------------
# Messages
# --------------------------------------------------------------------------
def _slug_for_member_id(members: list[dict[str, Any]], member_id: str | None) -> str | None:
    if not member_id:
        return None
    for m in members:
        if str(m["id"]) == str(member_id):
            return m["slug"]
    return None


def _name_for_member_id(members: list[dict[str, Any]], member_id: str | None) -> str | None:
    if not member_id:
        return None
    for m in members:
        if str(m["id"]) == str(member_id):
            return m["name"]
    return None


async def _insert_message(
    user_id: str,
    session_id: str,
    *,
    role: str,
    content: str,
    content_type: str = "text",
    council_member_id: str | None = None,
    image_url: str | None = None,
    voice_audio_url: str | None = None,
    model_used: str | None = None,
) -> dict[str, Any]:
    pool = get_pool()
    members = await list_council(user_id)
    if pool is None:
        msg = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "council_member_id": council_member_id,
            "member_slug": _slug_for_member_id(members, council_member_id),
            "member_name": _name_for_member_id(members, council_member_id),
            "role": role,
            "content": content,
            "content_type": content_type,
            "image_url": image_url,
            "voice_audio_url": voice_audio_url,
            "created_at": _now(),
        }
        _STUB_MESSAGES.setdefault(session_id, []).append(msg)
        return msg

    msg_id = str(uuid.uuid4())
    created_at_iso = _now_iso()
    doc = {
        "id": msg_id,
        "sessionId": session_id,
        "userId": user_id,
        "type": "message",
        "councilMemberId": council_member_id,
        "role": role,
        "content": content,
        "contentType": content_type,
        "imageUrl": image_url,
        "voiceAudioUrl": voice_audio_url,
        "modelUsed": model_used,
        "createdAt": created_at_iso,
    }
    await upsert("conversations", doc)

    # Write-through to the stub mirror so hot reads stay snappy.
    api_msg = _message_doc_to_api(doc, members)
    _STUB_MESSAGES.setdefault(session_id, []).append(api_msg)
    return api_msg


async def list_messages(
    user_id: str,
    session_id: str,
    *,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    members = await list_council(user_id)
    pool = get_pool()
    if pool is None:
        msgs = _STUB_MESSAGES.get(session_id, [])
        msgs = sorted(msgs, key=lambda m: m["created_at"])
        return msgs[offset : offset + limit]

    sql = (
        "SELECT * FROM c WHERE c.type = 'message' "
        "ORDER BY c.createdAt ASC OFFSET @off LIMIT @lim"
    )
    params = [
        {"name": "@off", "value": int(offset)},
        {"name": "@lim", "value": int(limit)},
    ]
    rows = await query(
        "conversations",
        sql,
        parameters=params,
        partition_key=session_id,
    )
    return [_message_doc_to_api(r, members) for r in rows]


def _history_for_prompt(messages: list[dict[str, Any]], limit: int = 8) -> list[dict[str, Any]]:
    """Convert stored messages to the slim shape the prompt builder expects."""
    tail = messages[-limit:]
    out = []
    for m in tail:
        speaker = "User" if m["role"] == "user" else (m.get("member_name") or "Council")
        out.append({"speaker": speaker, "content": m["content"], "member_id": m.get("member_slug")})
    return out


async def handle_user_message(
    user_id: str,
    session_id: str,
    *,
    content: str,
    content_type: str = "text",
    image_url: str | None = None,
    voice_audio_url: str | None = None,
    target_member_id: str | None = None,
    environment_slug: str | None = None,
) -> dict[str, Any]:
    """Run the full chat turn: persist user msg, choose responders, generate, persist.

    Returns {user_message, member_messages}.
    """
    user_msg = await _insert_message(
        user_id,
        session_id,
        role="user",
        content=content,
        content_type=content_type,
        image_url=image_url,
        voice_audio_url=voice_audio_url,
    )

    members = await list_council(user_id)
    if not members:
        return {"user_message": user_msg, "member_messages": []}

    # Resolve target_member_id (may be slug or UUID).
    target_slug: str | None = None
    if target_member_id:
        target = await member_lookup_by_id_or_slug(user_id, target_member_id)
        if target:
            target_slug = target["slug"]

    history_msgs = await list_messages(user_id, session_id, limit=20)
    # Strip the just-inserted user message off the end so prompt history is "prior" context.
    prior = [m for m in history_msgs if m["id"] != user_msg["id"]]
    prompt_history = _history_for_prompt(prior, limit=8)

    available_slugs = [m["slug"] for m in members]
    responders = choose_responders(
        content,
        history=[
            {"member_id": m.get("member_slug"), "speaker": m.get("member_name", "User")}
            for m in prior
        ],
        available_member_ids=available_slugs,
        target_member_id=target_slug,
    )

    if not responders:
        return {"user_message": user_msg, "member_messages": []}

    profile = await get_user_personality_profile(user_id)
    session_context: dict[str, Any] = {}
    if environment_slug:
        session_context["environment"] = environment_slug

    member_by_slug = {m["slug"]: m for m in members}

    async def _one_member_reply(slug: str) -> dict[str, Any] | None:
        persona = COUNCIL_PERSONAS.get(slug)
        member = member_by_slug.get(slug)
        if persona is None or member is None:
            return None
        ctx = dict(session_context)
        if member.get("tone") or member.get("behavioral_constraints"):
            ctx["member_overrides"] = {
                "tone": member.get("tone"),
                "behavioral_constraints": member.get("behavioral_constraints") or {},
            }
        prompt = build_chat_prompt(
            persona=persona,
            user_message=content,
            conversation_history=prompt_history,
            user_personality_profile=profile,
            session_context=ctx,
            other_members_active=responders,
        )
        try:
            reply = await generate_chat_reply(prompt, member_id=slug, user_message=content)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Chat generation failed for %s: %s", slug, exc)
            from app.services.stubs import stub_chat_reply as _stub

            reply = _stub(slug, content)
        reply = (reply or "").strip()
        if not reply:
            return None
        return await _insert_message(
            user_id,
            session_id,
            role="assistant",
            content=reply,
            content_type="text",
            council_member_id=str(member["id"]),
            model_used="azure-openai-stub-or-live",
        )

    # Run member replies concurrently for snappy UX.
    results = await asyncio.gather(*(_one_member_reply(s) for s in responders))
    member_messages = [r for r in results if r is not None]

    # Fire-and-forget Neo4j ingestion. ingest_turn never raises, but we also
    # schedule it on the loop so it never blocks the chat response.
    try:
        asyncio.create_task(
            get_memory_graph().ingest_turn(
                user_id=user_id,
                session_id=session_id,
                user_message=user_msg,
                member_messages=member_messages,
            )
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to schedule memory ingestion: %s", exc)

    return {"user_message": user_msg, "member_messages": member_messages}


__all__ = [
    "create_session",
    "list_sessions",
    "get_session",
    "list_messages",
    "handle_user_message",
    "_insert_message",
]
