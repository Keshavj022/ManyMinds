"""Chat schemas — sessions and messages."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import APIModel

ContentType = Literal["text", "image", "voice", "multimodal"]


class SessionCreate(APIModel):
    title: str | None = Field(default=None, max_length=255)
    environment_id: str | None = None


class Session(APIModel):
    id: str
    title: str | None = None
    session_type: str = "chat"
    environment_id: str | None = None
    started_at: datetime
    ended_at: datetime | None = None


class Message(APIModel):
    id: str
    session_id: str
    council_member_id: str | None = None
    member_slug: str | None = None
    member_name: str | None = None
    role: Literal["user", "assistant", "system"]
    content: str
    content_type: ContentType = "text"
    image_url: str | None = None
    voice_audio_url: str | None = None
    created_at: datetime


class MessageCreate(APIModel):
    content: str = Field(min_length=1, max_length=8000)
    content_type: ContentType = "text"
    image_url: str | None = None
    voice_audio_url: str | None = None
    target_member_id: str | None = None  # member UUID or slug


class MessageTurn(APIModel):
    """Bundle returned for a single user→council exchange."""
    user_message: Message
    member_messages: list[Message] = Field(default_factory=list)
