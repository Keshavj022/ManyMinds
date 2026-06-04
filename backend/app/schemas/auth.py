"""Auth-related Pydantic schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.common import APIModel


class SignupRequest(APIModel):
    email: EmailStr
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(APIModel):
    email: EmailStr
    password: str


class RefreshRequest(APIModel):
    refresh_token: str


class LogoutRequest(APIModel):
    refresh_token: str | None = None


class UserPublic(APIModel):
    id: str
    email: str
    username: str
    onboarding_step: int = 0
    is_verified: bool = False


class TokenResponse(APIModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    expires_in: int  # seconds


class AuthResponse(APIModel):
    user: UserPublic
    tokens: TokenResponse


class AccessTokenResponse(APIModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class CurrentUserResponse(APIModel):
    user: UserPublic
    issued_at: datetime


class PasswordResetRequest(APIModel):
    email: EmailStr


class PasswordResetConfirm(APIModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


class PasswordResetAck(APIModel):
    # Always-true ack so we don't leak which emails exist.
    accepted: bool = True
    delivery: str = "queued"  # one of: queued, console, none
