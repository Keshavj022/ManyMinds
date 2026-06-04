"""
Auth primitives — password hashing, JWT issuing/decoding, current-user dep.

Designed to work in BOTH live and stub modes:
- live: hits Azure Cosmos DB via `app.core.database` helpers.
- stub: returns a synthetic user so endpoints stay functional with no DB.
"""
from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.database import get_pool, read_item

logger = logging.getLogger(__name__)

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# A constant stub user used in stub mode so every endpoint has a session.
STUB_USER_ID = "00000000-0000-0000-0000-00000000face"
STUB_USER = {
    "id": STUB_USER_ID,
    "email": "demo@manyminds.local",
    "username": "demo",
    "onboarding_step": 2,
    "is_active": True,
    "is_verified": True,
}


# --------------------------------------------------------------------------
# Password hashing
# --------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _pwd.verify(password, hashed)
    except Exception:  # noqa: BLE001
        return False


# --------------------------------------------------------------------------
# JWT
# --------------------------------------------------------------------------
def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: str, extra: dict[str, Any] | None = None) -> str:
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": int(_now().timestamp()),
        "exp": int((_now() + timedelta(minutes=settings.JWT_ACCESS_TTL_MIN)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGO)


def create_refresh_token(user_id: str) -> tuple[str, datetime]:
    expires_at = _now() + timedelta(days=settings.JWT_REFRESH_TTL_DAYS)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "iat": int(_now().timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGO)
    return token, expires_at


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGO])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def hash_refresh_token(token: str) -> str:
    """Deterministic hash for storing refresh tokens (look-up requires equality)."""
    return hashlib.sha256(token.encode()).hexdigest()


# --------------------------------------------------------------------------
# Current user dependency
# --------------------------------------------------------------------------
def _normalize_user_doc(doc: dict[str, Any]) -> dict[str, Any]:
    """Map a Cosmos `user` document into the shape expected by call-sites.

    Existing call-sites use `user["id"]`, `user["email"]`, `user["username"]`,
    `user["onboarding_step"]`, `user["is_active"]`, `user["is_verified"]`.
    The Cosmos doc stores those keys in camelCase, so we project them back.
    """
    return {
        "id": str(doc.get("id") or doc.get("userId")),
        "email": doc.get("email"),
        "username": doc.get("username"),
        "onboarding_step": doc.get("onboardingStep", 0),
        "is_active": doc.get("isActive", True),
        "is_verified": doc.get("isVerified", False),
    }


async def _load_user_from_db(user_id: str) -> dict[str, Any] | None:
    pool = get_pool()
    if pool is None:
        return None
    # users container is partitioned by /userId, and we set id == userId on
    # the user doc, so a point read is the right tool here.
    doc = await read_item("users", user_id, user_id)
    if not doc:
        return None
    if doc.get("type") != "user":
        return None
    if not doc.get("isActive", True):
        return None
    return _normalize_user_doc(doc)


async def get_current_user(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
) -> dict[str, Any]:
    """Resolve the authenticated user.

    - In stub mode (no DB): if a token is present and valid, decode it and
      return a synthesized user. If no token at all, also return the stub
      user so the demo flow works end-to-end without auth.
    - In live mode: token is required, decoded, and the DB is queried.
    """
    pool = get_pool()
    # Try Authorization header explicitly (oauth2_scheme can be flaky on FastAPI).
    if not token:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1]

    if pool is None:
        # Stub mode — synthesize.
        if token:
            try:
                payload = decode_token(token)
                uid = payload.get("sub") or STUB_USER_ID
                return {**STUB_USER, "id": uid}
            except HTTPException:
                return STUB_USER
        return STUB_USER

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong token type",
        )
    uid = payload.get("sub")
    if not uid:
        raise HTTPException(status_code=401, detail="Token missing subject")
    user = await _load_user_from_db(uid)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_user_optional(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
) -> dict[str, Any] | None:
    try:
        return await get_current_user(request, token)
    except HTTPException:
        return None


__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "hash_refresh_token",
    "get_current_user",
    "get_current_user_optional",
    "STUB_USER",
    "STUB_USER_ID",
]
