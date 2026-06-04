"""
Chat router: create sessions, post messages, retrieve history, basic WS stub.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)

from app.schemas.chat import (
    Message,
    MessageCreate,
    MessageTurn,
    Session,
    SessionCreate,
)
from app.services.chat import (
    create_session,
    get_session,
    handle_user_message,
    list_messages,
    list_sessions,
)
from app.services.council import list_council
from app.services.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=Session, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    body: SessionCreate,
    user: dict[str, Any] = Depends(get_current_user),
) -> Session:
    s = await create_session(user["id"], title=body.title, environment_id=body.environment_id)
    return Session(**s)


@router.get("/sessions", response_model=list[Session])
async def list_chat_sessions(
    user: dict[str, Any] = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[Session]:
    rows = await list_sessions(user["id"], limit=limit, offset=offset)
    return [Session(**r) for r in rows]


@router.get("/sessions/{session_id}", response_model=Session)
async def get_chat_session(
    session_id: str = Path(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> Session:
    s = await get_session(user["id"], session_id)
    if not s:
        raise HTTPException(status_code=404, detail="session not found")
    return Session(**s)


@router.get("/sessions/{session_id}/messages", response_model=list[Message])
async def list_chat_messages(
    session_id: str = Path(...),
    user: dict[str, Any] = Depends(get_current_user),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[Message]:
    s = await get_session(user["id"], session_id)
    if not s:
        raise HTTPException(status_code=404, detail="session not found")
    rows = await list_messages(user["id"], session_id, limit=limit, offset=offset)
    return [Message(**r) for r in rows]


@router.post(
    "/sessions/{session_id}/messages",
    response_model=MessageTurn,
    status_code=status.HTTP_201_CREATED,
)
async def post_chat_message(
    body: MessageCreate,
    session_id: str = Path(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> MessageTurn:
    s = await get_session(user["id"], session_id)
    if not s:
        raise HTTPException(status_code=404, detail="session not found")
    result = await handle_user_message(
        user["id"],
        session_id,
        content=body.content,
        content_type=body.content_type,
        image_url=body.image_url,
        voice_audio_url=body.voice_audio_url,
        target_member_id=body.target_member_id,
    )
    return MessageTurn(
        user_message=Message(**result["user_message"]),
        member_messages=[Message(**m) for m in result["member_messages"]],
    )


# --------------------------------------------------------------------------
# WebSocket — streaming stub
#
# Real streaming will be added when Azure OpenAI streaming is wired up. For
# now the WS accepts a JSON {content, target_member_id?} and emits the same
# turn payload as the REST POST endpoint, member-by-member, with small
# delays so the UI can render typing animations.
# --------------------------------------------------------------------------
@router.websocket("/sessions/{session_id}/ws")
async def chat_websocket(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()
    # In stub/no-auth-on-WS mode we accept the stub user; in live mode
    # auth at the websocket layer can be added with a query token.
    user_id = websocket.query_params.get("user_id") or "00000000-0000-0000-0000-00000000face"

    try:
        members = await list_council(user_id)
        await websocket.send_json({"type": "ready", "members": [{"slug": m["slug"], "name": m["name"]} for m in members]})

        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "detail": "invalid json"})
                continue

            content = msg.get("content")
            if not content:
                await websocket.send_json({"type": "error", "detail": "missing content"})
                continue

            target = msg.get("target_member_id")
            result = await handle_user_message(
                user_id,
                session_id,
                content=content,
                target_member_id=target,
            )
            await websocket.send_json({"type": "user_message", "message": _message_json(result["user_message"])})
            for m in result["member_messages"]:
                # Tiny typing-style delay between members.
                await asyncio.sleep(0.35)
                await websocket.send_json({"type": "typing", "member_slug": m.get("member_slug")})
                await asyncio.sleep(0.45)
                await websocket.send_json({"type": "member_message", "message": _message_json(m)})
            await websocket.send_json({"type": "turn_complete"})
    except WebSocketDisconnect:
        logger.info("ws disconnect for session %s", session_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception("ws error: %s", exc)
        try:
            await websocket.close()
        except Exception:  # noqa: BLE001
            pass


def _message_json(m: dict[str, Any]) -> dict[str, Any]:
    d = dict(m)
    if "created_at" in d and hasattr(d["created_at"], "isoformat"):
        d["created_at"] = d["created_at"].isoformat()
    return d
