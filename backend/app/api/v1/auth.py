"""
Auth endpoints: signup, login, refresh, logout, me, password reset.

Works in stub mode without a database — signup/login synthesise a user and
return tokens so the frontend flow can be demoed end-to-end.

Live mode persists docs to Azure Cosmos DB:
- users        (PK=/userId) holds the `user` doc.
- auth_tokens  (PK=/userId) holds `refreshToken` + `passwordResetToken` docs,
                with id == tokenHash for trivial partition-scoped point ops.
"""
from __future__ import annotations

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.core.config import settings
from app.core.database import get_pool, query, read_item, upsert
from app.schemas.auth import (
    AccessTokenResponse,
    AuthResponse,
    CurrentUserResponse,
    LoginRequest,
    LogoutRequest,
    PasswordResetAck,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    SignupRequest,
    TokenResponse,
    UserPublic,
)
from app.services.email_provider import ConsoleEmailProvider, get_email_provider
from app.services.security import (
    STUB_USER,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    hash_refresh_token,
    verify_password,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


# --------------------------------------------------------------------------
# In-memory stub stores (only consulted when Cosmos is unavailable).
# --------------------------------------------------------------------------
# Shape mirrors the Cosmos `user` document so live/stub branches read the
# same projection helpers downstream.
_STUB_USERS_BY_EMAIL: dict[str, dict[str, Any]] = {}
_STUB_USERS_BY_USERNAME: dict[str, dict[str, Any]] = {}
_STUB_REFRESH_TOKENS: dict[str, dict[str, Any]] = {}  # keyed by tokenHash


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _tokens_for(user_id: str) -> TokenResponse:
    access = create_access_token(user_id)
    refresh, _ = create_refresh_token(user_id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.JWT_ACCESS_TTL_MIN * 60,
    )


def _user_public(row: dict[str, Any]) -> UserPublic:
    """Project a normalized user dict OR a raw Cosmos user doc → UserPublic."""
    return UserPublic(
        id=str(row.get("id") or row.get("userId")),
        email=row["email"],
        username=row["username"],
        onboarding_step=row.get("onboarding_step", row.get("onboardingStep", 0)),
        is_verified=row.get("is_verified", row.get("isVerified", False)),
    )


def _new_user_doc(
    user_id: str,
    email: str,
    username: str,
    password_hash: str,
) -> dict[str, Any]:
    now = _now()
    return {
        "id": user_id,
        "userId": user_id,
        "type": "user",
        "email": email,
        "username": username,
        "passwordHash": password_hash,
        "isVerified": False,
        "isActive": True,
        "onboardingStep": 0,
        "createdAt": _iso(now),
        "updatedAt": _iso(now),
    }


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest) -> AuthResponse:
    pool = get_pool()
    user_id = str(uuid.uuid4())

    if pool is None:
        # Stub mode — enforce uniqueness against in-memory dicts so repeat
        # signups on the same email surface the same 409 the live path raises.
        if body.email in _STUB_USERS_BY_EMAIL or body.username in _STUB_USERS_BY_USERNAME:
            raise HTTPException(status_code=409, detail="email or username already in use")
        doc = _new_user_doc(user_id, body.email, body.username, hash_password(body.password))
        _STUB_USERS_BY_EMAIL[body.email] = doc
        _STUB_USERS_BY_USERNAME[body.username] = doc
        tokens = _tokens_for(user_id)
        await _store_refresh_token(user_id, tokens.refresh_token)
        return AuthResponse(user=_user_public(doc), tokens=tokens)

    # Live mode — pre-check uniqueness with a cross-partition COUNT.
    rows = await query(
        "users",
        "SELECT VALUE COUNT(1) FROM c WHERE c.type='user' AND (c.email=@e OR c.username=@u)",
        [
            {"name": "@e", "value": body.email},
            {"name": "@u", "value": body.username},
        ],
        enable_cross_partition=True,
        max_items=1,
    )
    existing_count = rows[0] if rows else 0
    if existing_count:
        raise HTTPException(status_code=409, detail="email or username already in use")

    doc = _new_user_doc(user_id, body.email, body.username, hash_password(body.password))
    written = await upsert("users", doc)
    if written is None:
        # Cosmos write failed — surface as 500 so the caller knows not to retry blindly.
        raise HTTPException(status_code=500, detail="failed to create user")

    tokens = _tokens_for(user_id)
    await _store_refresh_token(user_id, tokens.refresh_token)
    return AuthResponse(user=_user_public(doc), tokens=tokens)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest) -> AuthResponse:
    pool = get_pool()

    if pool is None:
        # Stub mode — round-trip through the in-memory dict if the user signed
        # up earlier in the process; otherwise mint a fresh stub session so
        # the demo flow doesn't dead-end on a missing user.
        doc = _STUB_USERS_BY_EMAIL.get(body.email)
        if doc:
            if not doc.get("isActive", True) or not verify_password(body.password, doc.get("passwordHash", "")):
                raise HTTPException(status_code=401, detail="invalid email or password")
        else:
            user_id = str(uuid.uuid4())
            doc = {
                **STUB_USER,
                "id": user_id,
                "userId": user_id,
                "type": "user",
                "email": body.email,
                "username": STUB_USER["username"],
                "passwordHash": hash_password(body.password),
                "isVerified": True,
                "isActive": True,
                "onboardingStep": STUB_USER["onboarding_step"],
                "createdAt": _iso(_now()),
                "updatedAt": _iso(_now()),
            }
            _STUB_USERS_BY_EMAIL[body.email] = doc
        tokens = _tokens_for(str(doc["id"]))
        await _store_refresh_token(str(doc["id"]), tokens.refresh_token)
        return AuthResponse(user=_user_public(doc), tokens=tokens)

    # Live mode — email lookup is cross-partition (we don't know the userId yet).
    rows = await query(
        "users",
        "SELECT * FROM c WHERE c.type='user' AND c.email=@e",
        [{"name": "@e", "value": body.email}],
        enable_cross_partition=True,
        max_items=1,
    )
    doc = rows[0] if rows else None
    if (
        not doc
        or not doc.get("isActive", True)
        or not verify_password(body.password, doc.get("passwordHash", ""))
    ):
        raise HTTPException(status_code=401, detail="invalid email or password")

    tokens = _tokens_for(str(doc["id"]))
    await _store_refresh_token(str(doc["id"]), tokens.refresh_token)
    return AuthResponse(user=_user_public(doc), tokens=tokens)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(body: RefreshRequest) -> AccessTokenResponse:
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="not a refresh token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="missing subject")

    token_hash = hash_refresh_token(body.refresh_token)
    pool = get_pool()
    if pool is None:
        stored = _STUB_REFRESH_TOKENS.get(token_hash)
        if stored and stored.get("revokedAt") is not None:
            raise HTTPException(status_code=401, detail="refresh token revoked")
    else:
        # id == tokenHash and PK == userId → trivially point-readable.
        stored = await read_item("auth_tokens", token_hash, str(user_id))
        if stored and stored.get("revokedAt") is not None:
            raise HTTPException(status_code=401, detail="refresh token revoked")

    access = create_access_token(user_id)
    return AccessTokenResponse(access_token=access, expires_in=settings.JWT_ACCESS_TTL_MIN * 60)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def logout(body: LogoutRequest) -> Response:
    if not body.refresh_token:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    try:
        payload = decode_token(body.refresh_token)
    except HTTPException:
        # Match the old behaviour — silently no-op on undecodable tokens.
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    user_id = payload.get("sub")
    if not user_id:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    token_hash = hash_refresh_token(body.refresh_token)
    now_iso = _iso(_now())

    pool = get_pool()
    if pool is None:
        stored = _STUB_REFRESH_TOKENS.get(token_hash)
        if stored and stored.get("revokedAt") is None:
            stored["revokedAt"] = now_iso
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    stored = await read_item("auth_tokens", token_hash, str(user_id))
    if stored and stored.get("revokedAt") is None:
        stored["revokedAt"] = now_iso
        await upsert("auth_tokens", stored)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=CurrentUserResponse)
async def me(user: dict[str, Any] = Depends(get_current_user)) -> CurrentUserResponse:
    return CurrentUserResponse(
        user=_user_public(user),
        issued_at=datetime.now(timezone.utc),
    )


# --------------------------------------------------------------------------
# Password reset
# --------------------------------------------------------------------------

@router.post(
    "/password-reset/request",
    response_model=PasswordResetAck,
    status_code=status.HTTP_200_OK,
)
async def request_password_reset(
    body: PasswordResetRequest, request: Request
) -> PasswordResetAck:
    """Initiate a password reset.

    Always returns 200 so the response doesn't reveal which emails exist.
    If the email maps to an active user, we:
      1. generate a 32-byte URL-safe token
      2. store its SHA-256 hash on a `passwordResetToken` doc in auth_tokens
      3. send the user an email containing /reset-password?token=<plain>
    """
    pool = get_pool()
    provider = get_email_provider()
    delivery = "console" if isinstance(provider, ConsoleEmailProvider) else "queued"

    if pool is None:
        # Stub mode — no DB to look up the user. Still go through the email
        # provider so dev can see the flow.
        logger.info("Password reset in stub mode for %s — emitting console email", body.email)
        await _send_reset_email(provider, body.email, "stub-no-db-token-placeholder")
        return PasswordResetAck(accepted=True, delivery=delivery)

    rows = await query(
        "users",
        "SELECT * FROM c WHERE c.type='user' AND c.email=@e AND c.isActive=true",
        [{"name": "@e", "value": body.email}],
        enable_cross_partition=True,
        max_items=1,
    )
    user_doc = rows[0] if rows else None
    if not user_doc:
        # Don't leak existence — same ack regardless.
        return PasswordResetAck(accepted=True, delivery=delivery)

    user_id = str(user_doc["id"])
    now = _now()
    now_iso = _iso(now)

    # Invalidate any existing live tokens for this user so the latest one
    # is the only one usable.
    existing = await query(
        "auth_tokens",
        "SELECT * FROM c WHERE c.type='passwordResetToken' AND c.userId=@u "
        "AND IS_NULL(c.usedAt) AND c.expiresAt > @now",
        [
            {"name": "@u", "value": user_id},
            {"name": "@now", "value": now_iso},
        ],
        partition_key=user_id,
    )
    for prev in existing:
        prev["usedAt"] = now_iso
        await upsert("auth_tokens", prev)

    plain_token = secrets.token_urlsafe(32)
    token_hash = hash_refresh_token(plain_token)
    expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_TTL_MIN)
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")

    reset_doc = {
        "id": token_hash,
        "userId": user_id,
        "type": "passwordResetToken",
        "tokenHash": token_hash,
        "expiresAt": _iso(expires_at),
        "usedAt": None,
        "createdAt": now_iso,
        "requestedIp": ip,
        "requestedUserAgent": ua,
    }
    await upsert("auth_tokens", reset_doc)

    await _send_reset_email(provider, body.email, plain_token)
    return PasswordResetAck(accepted=True, delivery=delivery)


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def confirm_password_reset(body: PasswordResetConfirm) -> Response:
    """Verify a reset token and set a new password.

    On success the access/refresh tokens for the user's previous sessions
    are revoked — same compromise-mitigation pattern as the old SQL path.
    """
    pool = get_pool()
    if pool is None:
        # Stub mode — accept the new password as a no-op to preserve UX.
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    token_hash = hash_refresh_token(body.token)
    rows = await query(
        "auth_tokens",
        "SELECT * FROM c WHERE c.tokenHash=@h AND c.type=@t",
        [
            {"name": "@h", "value": token_hash},
            {"name": "@t", "value": "passwordResetToken"},
        ],
        enable_cross_partition=True,
        max_items=1,
    )
    reset_doc = rows[0] if rows else None
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if reset_doc.get("usedAt") is not None:
        raise HTTPException(status_code=400, detail="This reset link has already been used")
    expires_at_raw = reset_doc.get("expiresAt")
    expires_at = (
        datetime.fromisoformat(expires_at_raw)
        if isinstance(expires_at_raw, str)
        else expires_at_raw
    )
    if not expires_at or expires_at <= _now():
        raise HTTPException(status_code=400, detail="This reset link has expired")

    user_id = str(reset_doc["userId"])
    now = _now()
    now_iso = _iso(now)

    # Fetch + update the user doc (id == userId on the user-typed doc).
    user_doc = await read_item("users", user_id, user_id)
    if not user_doc or user_doc.get("type") != "user":
        # Should never happen, but treat as an invalid link rather than 500.
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user_doc["passwordHash"] = hash_password(body.new_password)
    user_doc["updatedAt"] = now_iso
    await upsert("users", user_doc)

    # Mark this reset token consumed.
    reset_doc["usedAt"] = now_iso
    await upsert("auth_tokens", reset_doc)

    # Best-effort: revoke any active refresh tokens so the previous session
    # can't continue if the reset was due to a compromise.
    refresh_rows = await query(
        "auth_tokens",
        "SELECT * FROM c WHERE c.type='refreshToken' AND c.userId=@u "
        "AND IS_NULL(c.revokedAt)",
        [{"name": "@u", "value": user_id}],
        partition_key=user_id,
    )
    for rt in refresh_rows:
        rt["revokedAt"] = now_iso
        await upsert("auth_tokens", rt)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _send_reset_email(provider: Any, email: str, plain_token: str) -> None:
    reset_url = f"{settings.APP_BASE_URL.rstrip('/')}/reset-password?token={plain_token}"
    ttl = settings.PASSWORD_RESET_TTL_MIN
    subject = "Reset your ManyMinds password"
    text = (
        f"You (or someone using your email) requested a password reset for ManyMinds.\n\n"
        f"Click this link within {ttl} minutes to set a new password:\n"
        f"  {reset_url}\n\n"
        f"If you didn't ask for this, you can ignore this email — your password\n"
        f"won't change.\n\n"
        f"— The council"
    )
    html = (
        f"<p>You (or someone using your email) requested a password reset for ManyMinds.</p>"
        f"<p>This link expires in <strong>{ttl} minutes</strong>.</p>"
        f"<p><a href=\"{reset_url}\" style=\"display:inline-block;padding:10px 20px;"
        f"background:#9b87d8;color:#15121d;text-decoration:none;border-radius:9999px;"
        f"font-weight:600\">Set a new password</a></p>"
        f"<p style=\"color:#666;font-size:12px\">"
        f"If the button doesn't work, copy this link into your browser:<br>"
        f"<code>{reset_url}</code></p>"
        f"<p style=\"color:#666;font-size:12px\">"
        f"If you didn't ask for this, you can ignore this email.</p>"
    )
    try:
        ok = await provider.send(to=email, subject=subject, text=text, html=html)
        if not ok:
            logger.warning(
                "Password reset email NOT delivered for %s (provider=%s)",
                email,
                getattr(provider, "name", "?"),
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Password reset email send raised: %s", exc)


# --------------------------------------------------------------------------
# Internal helpers
# --------------------------------------------------------------------------
async def _store_refresh_token(user_id: str, refresh_token: str | None) -> None:
    """Persist a refresh-token doc keyed by its SHA-256 hash.

    Works in BOTH stub and live modes — stub mirrors the live shape so
    /refresh and /logout read the same code paths downstream.
    """
    if not refresh_token:
        return
    try:
        payload = decode_token(refresh_token)
    except HTTPException:
        return
    expires_at_ts = payload.get("exp")
    if not expires_at_ts:
        return
    expires_at = datetime.fromtimestamp(expires_at_ts, tz=timezone.utc)
    token_hash = hash_refresh_token(refresh_token)
    doc = {
        "id": token_hash,
        "userId": str(user_id),
        "type": "refreshToken",
        "tokenHash": token_hash,
        "expiresAt": _iso(expires_at),
        "revokedAt": None,
        "createdAt": _iso(_now()),
    }

    pool = get_pool()
    if pool is None:
        _STUB_REFRESH_TOKENS[token_hash] = doc
        return

    # Write-through: keep the stub cache hot in live mode too, so reads in
    # the same process are zero-RU. Cosmos remains the source of truth.
    _STUB_REFRESH_TOKENS[token_hash] = doc
    await upsert("auth_tokens", doc)
