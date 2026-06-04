"""Council-member schemas."""
from __future__ import annotations

from pydantic import Field

from app.schemas.common import APIModel


class CouncilMember(APIModel):
    id: str
    slug: str  # 'aria' | 'rex' | 'sage' | 'nova' | 'echo'
    name: str
    role: str
    personality_type: str
    tone: str | None = None
    expertise_areas: list[str] = Field(default_factory=list)
    behavioral_constraints: dict = Field(default_factory=dict)
    color_theme: str | None = None
    position_order: int = 0
    is_active: bool = True
    one_liner: str | None = None
    portrait: str | None = None


class CouncilMemberUpdate(APIModel):
    tone: str | None = Field(default=None, max_length=50)
    expertise_areas: list[str] | None = None
    behavioral_constraints: dict | None = None


class Environment(APIModel):
    id: str
    slug: str
    name: str
    description: str | None = None
    mood: str | None = None
    thumbnail_url: str | None = None
    scene_url: str | None = None
    ambient_audio_url: str | None = None


class SetEnvironmentRequest(APIModel):
    environment_id: str | None = None
    environment_slug: str | None = None
