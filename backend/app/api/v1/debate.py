"""Debate router."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Path

from app.schemas.debate import (
    AdvanceResponse,
    Debate,
    DebateArgument,
    DebateCreate,
    DebateParticipant,
)
from app.services.debate import advance_debate, create_debate, get_debate
from app.services.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/debate", tags=["debate"])


def _to_debate(d: dict[str, Any]) -> Debate:
    return Debate(
        id=d["id"],
        session_id=d["session_id"],
        topic=d["topic"],
        status=d["status"],
        total_rounds=d["total_rounds"],
        current_round=d["current_round"],
        moderator_member_id=d.get("moderator_member_id"),
        moderator_slug=d.get("moderator_slug"),
        participants=[DebateParticipant(**p) for p in d.get("participants", [])],
        arguments=[DebateArgument(**a) for a in d.get("arguments", [])],
        started_at=d.get("started_at"),
        ended_at=d.get("ended_at"),
        next_speaker=DebateParticipant(**d["next_speaker"]) if d.get("next_speaker") else None,
    )


@router.post("", response_model=Debate, status_code=201)
async def create(
    body: DebateCreate,
    user: dict[str, Any] = Depends(get_current_user),
) -> Debate:
    d = await create_debate(user["id"], body.topic, total_rounds=body.total_rounds)
    if not d:
        raise HTTPException(status_code=500, detail="failed to create debate")
    return _to_debate(d)


@router.get("/{debate_id}", response_model=Debate)
async def fetch(
    debate_id: str = Path(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> Debate:
    d = await get_debate(user["id"], debate_id)
    if not d:
        raise HTTPException(status_code=404, detail="debate not found")
    return _to_debate(d)


@router.post("/{debate_id}/advance", response_model=AdvanceResponse)
async def advance(
    debate_id: str = Path(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> AdvanceResponse:
    result = await advance_debate(user["id"], debate_id)
    d = result.get("debate")
    if not d:
        raise HTTPException(status_code=404, detail="debate not found")
    new_arg = result.get("new_argument")
    return AdvanceResponse(
        debate=_to_debate(d),
        new_argument=DebateArgument(**new_arg) if new_arg else None,
    )
