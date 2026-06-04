"""Game schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import APIModel

GameType = Literal["chess", "ludo", "truth_or_dare"]
GameStatus = Literal["pending", "active", "paused", "completed", "cancelled"]


class GameCreate(APIModel):
    game_type: GameType
    config: dict = Field(default_factory=dict)
    member_ids: list[str] | None = None  # slugs or UUIDs


class GameParticipant(APIModel):
    id: str
    council_member_id: str
    member_slug: str
    member_name: str
    piece_color: str | None = None
    position_order: int | None = None


class Game(APIModel):
    id: str
    session_id: str
    game_type: GameType
    status: GameStatus
    state: dict
    current_turn_member_id: str | None
    current_turn_slug: str | None = None
    winner_member_id: str | None
    user_won: bool | None
    participants: list[GameParticipant] = Field(default_factory=list)
    started_at: datetime | None = None
    ended_at: datetime | None = None


class GameMoveCreate(APIModel):
    move_data: dict
    snapshot: dict | None = None
    member_id: str | None = None  # if a council member made the move


class GameMove(APIModel):
    id: str
    game_id: str
    council_member_id: str | None
    move_number: int
    move_data: dict
    state_snapshot: dict | None = None
    created_at: datetime


class CommentaryRequest(APIModel):
    move_data: dict
    snapshot: dict | None = None
    member_ids: list[str] | None = None  # which members should comment


class Commentary(APIModel):
    member_slug: str
    member_name: str
    content: str
