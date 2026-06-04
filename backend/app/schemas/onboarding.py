"""Onboarding schemas — demographics and Big Five quiz."""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import Field

from app.schemas.common import APIModel

Dimension = Literal[
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
]


class DemographicsRequest(APIModel):
    full_name: str | None = Field(default=None, max_length=100)
    date_of_birth: date | None = None
    gender: str | None = Field(default=None, max_length=30)
    location: str | None = Field(default=None, max_length=150)
    preferred_language: str = Field(default="en", max_length=10)
    bio: str | None = None


class DemographicsResponse(APIModel):
    full_name: str | None
    date_of_birth: date | None
    gender: str | None
    location: str | None
    preferred_language: str
    bio: str | None
    onboarding_step: int


class QuizAnswer(APIModel):
    question_id: int = Field(ge=1, le=100)
    dimension: Dimension
    response: int = Field(ge=1, le=5)


class QuizSubmission(APIModel):
    responses: list[QuizAnswer] = Field(min_length=1)


class PersonalityProfile(APIModel):
    openness: int = Field(ge=0, le=100)
    conscientiousness: int = Field(ge=0, le=100)
    extraversion: int = Field(ge=0, le=100)
    agreeableness: int = Field(ge=0, le=100)
    neuroticism: int = Field(ge=0, le=100)
    dominant_trait: str | None = None


class QuizResult(APIModel):
    profile: PersonalityProfile
    onboarding_step: int
    council_seeded: bool
