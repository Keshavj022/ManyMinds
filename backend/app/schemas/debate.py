"""Debate schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import APIModel

Side = Literal["for", "against", "moderator"]
DebateStatus = Literal["pending", "active", "completed", "cancelled"]
ArgumentType = Literal["opening", "argument", "rebuttal", "closing"]


class DebateCreate(APIModel):
    topic: str = Field(min_length=4, max_length=500)
    total_rounds: int = Field(default=3, ge=1, le=8)


class DebateParticipant(APIModel):
    id: str
    council_member_id: str
    member_slug: str
    member_name: str
    side: Side


class DebateArgument(APIModel):
    id: str
    participant_id: str
    member_slug: str
    member_name: str
    side: Side
    round_number: int
    argument_type: ArgumentType = "argument"
    content: str
    strength_score: float | None = None
    created_at: datetime


class Debate(APIModel):
    id: str
    session_id: str
    topic: str
    status: DebateStatus
    total_rounds: int
    current_round: int
    moderator_member_id: str | None
    moderator_slug: str | None = None
    participants: list[DebateParticipant] = Field(default_factory=list)
    arguments: list[DebateArgument] = Field(default_factory=list)
    started_at: datetime | None = None
    ended_at: datetime | None = None
    next_speaker: DebateParticipant | None = None


class AdvanceResponse(APIModel):
    debate: Debate
    new_argument: DebateArgument | None = None
