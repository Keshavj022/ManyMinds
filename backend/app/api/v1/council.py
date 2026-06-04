"""
Council router: list / customise members, list environments, set current env.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path

from app.core.database import get_pool
from app.schemas.council import (
    CouncilMember,
    CouncilMemberUpdate,
    Environment,
    SetEnvironmentRequest,
)
from app.services.council import list_council, update_member
from app.services.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/council", tags=["council"])


_DEFAULT_ENVIRONMENTS: list[Environment] = [
    Environment(id="env-cafe", slug="cafe", name="Café",
                description="A warm, intimate café with soft lighting and ambient chatter.", mood="cozy"),
    Environment(id="env-beach", slug="beach", name="Beach",
                description="An open shoreline with waves and a golden sky.", mood="calm"),
    Environment(id="env-rooftop", slug="rooftop", name="Rooftop",
                description="A city rooftop at night with neon reflections and open sky.", mood="energetic"),
    Environment(id="env-library", slug="library", name="Library",
                description="A vast library with warm lamps and towering bookshelves.", mood="focused"),
    Environment(id="env-forest", slug="forest", name="Forest",
                description="A quiet forest clearing with ambient birdsong and dappled light.", mood="peaceful"),
]


@router.get("/members", response_model=list[CouncilMember])
async def get_members(user: dict[str, Any] = Depends(get_current_user)) -> list[CouncilMember]:
    members = await list_council(user["id"])
    return [CouncilMember(**m) for m in members]


@router.patch("/members/{member_id}", response_model=CouncilMember)
async def patch_member(
    body: CouncilMemberUpdate,
    member_id: str = Path(..., min_length=1),
    user: dict[str, Any] = Depends(get_current_user),
) -> CouncilMember:
    updated = await update_member(
        user["id"],
        member_id,
        tone=body.tone,
        expertise_areas=body.expertise_areas,
        behavioral_constraints=body.behavioral_constraints,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="council member not found")
    return CouncilMember(**updated)


@router.get("/environments", response_model=list[Environment])
async def get_environments() -> list[Environment]:
    pool = get_pool()
    if pool is None:
        return _DEFAULT_ENVIRONMENTS
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, slug, name, description, thumbnail_url, scene_url, ambient_audio_url, mood "
            "FROM environments WHERE is_active = TRUE ORDER BY name"
        )
    out = []
    for r in rows:
        d = dict(r)
        d["id"] = str(d["id"])
        out.append(Environment(**d))
    return out or _DEFAULT_ENVIRONMENTS


@router.put("/environment", response_model=Environment)
async def set_environment(
    body: SetEnvironmentRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> Environment:
    pool = get_pool()
    if pool is None:
        # Stub: just resolve from defaults.
        target = None
        for e in _DEFAULT_ENVIRONMENTS:
            if body.environment_id == e.id or body.environment_slug == e.slug:
                target = e
                break
        if not target:
            target = _DEFAULT_ENVIRONMENTS[0]
        return target

    uid = uuid.UUID(user["id"])
    async with pool.acquire() as conn:
        if body.environment_id:
            row = await conn.fetchrow(
                "SELECT id, slug, name, description, thumbnail_url, scene_url, ambient_audio_url, mood "
                "FROM environments WHERE id = $1",
                uuid.UUID(body.environment_id),
            )
        elif body.environment_slug:
            row = await conn.fetchrow(
                "SELECT id, slug, name, description, thumbnail_url, scene_url, ambient_audio_url, mood "
                "FROM environments WHERE slug = $1",
                body.environment_slug,
            )
        else:
            raise HTTPException(status_code=400, detail="environment_id or environment_slug required")

        if not row:
            raise HTTPException(status_code=404, detail="environment not found")

        await conn.execute(
            """
            INSERT INTO user_environment_preferences (user_id, current_environment_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET
                current_environment_id = EXCLUDED.current_environment_id,
                updated_at = NOW()
            """,
            uid,
            row["id"],
        )
    d = dict(row)
    d["id"] = str(d["id"])
    return Environment(**d)


@router.get("/environment", response_model=Optional[Environment])
async def current_environment(
    user: dict[str, Any] = Depends(get_current_user),
) -> Optional[Environment]:
    pool = get_pool()
    if pool is None:
        return _DEFAULT_ENVIRONMENTS[0]
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT e.id, e.slug, e.name, e.description, e.thumbnail_url, e.scene_url,
                   e.ambient_audio_url, e.mood
            FROM user_environment_preferences uep
            JOIN environments e ON e.id = uep.current_environment_id
            WHERE uep.user_id = $1
            """,
            uuid.UUID(user["id"]),
        )
    if not row:
        return None
    d = dict(row)
    d["id"] = str(d["id"])
    return Environment(**d)
