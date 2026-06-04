"""Games router."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Path

from app.schemas.games import (
    Commentary,
    CommentaryRequest,
    Game,
    GameCreate,
    GameMoveCreate,
    GameParticipant,
)
from app.services.games import (
    create_game,
    generate_game_commentary,
    get_game,
    record_move,
)
from app.services.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/games", tags=["games"])


def _to_game(g: dict[str, Any]) -> Game:
    return Game(
        id=g["id"],
        session_id=g["session_id"],
        game_type=g["game_type"],
        status=g["status"],
        state=g.get("state") or {},
        current_turn_member_id=g.get("current_turn_member_id"),
        current_turn_slug=g.get("current_turn_slug"),
        winner_member_id=g.get("winner_member_id"),
        user_won=g.get("user_won"),
        participants=[GameParticipant(**p) for p in g.get("participants", [])],
        started_at=g.get("started_at"),
        ended_at=g.get("ended_at"),
    )


@router.post("", response_model=Game, status_code=201)
async def create(
    body: GameCreate,
    user: dict[str, Any] = Depends(get_current_user),
) -> Game:
    g = await create_game(
        user["id"],
        game_type=body.game_type,
        config=body.config,
        member_ids=body.member_ids,
    )
    if not g:
        raise HTTPException(status_code=500, detail="failed to create game")
    return _to_game(g)


@router.get("/{game_id}", response_model=Game)
async def fetch(
    game_id: str = Path(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> Game:
    g = await get_game(user["id"], game_id)
    if not g:
        raise HTTPException(status_code=404, detail="game not found")
    return _to_game(g)


@router.post("/{game_id}/move", response_model=Game)
async def make_move(
    body: GameMoveCreate,
    game_id: str = Path(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> Game:
    g = await get_game(user["id"], game_id)
    if not g:
        raise HTTPException(status_code=404, detail="game not found")
    if not isinstance(body.move_data, dict) or not body.move_data:
        raise HTTPException(status_code=400, detail="move_data required")
    await record_move(
        user["id"],
        game_id,
        move_data=body.move_data,
        snapshot=body.snapshot,
        member_id=body.member_id,
    )
    g = await get_game(user["id"], game_id)
    return _to_game(g)


@router.post("/{game_id}/commentary", response_model=list[Commentary])
async def commentary(
    body: CommentaryRequest,
    game_id: str = Path(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> list[Commentary]:
    g = await get_game(user["id"], game_id)
    if not g:
        raise HTTPException(status_code=404, detail="game not found")
    results = await generate_game_commentary(
        user["id"],
        game_id,
        move_data=body.move_data,
        snapshot=body.snapshot,
        member_refs=body.member_ids,
    )
    return [Commentary(**r) for r in results]
