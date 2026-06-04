"""
Game service (Azure Cosmos DB port).

Server-side game state is intentionally minimal — the heavy lifting (chess
move validation, ludo path logic, etc.) lives in the frontend engines.
The backend stores moves, snapshots, and the current state JSON so games
can be resumed and replayed.

Container mapping (polymorphic on `type`):

  * ``conversations`` (PK=/sessionId), type='game'
      Parent game document with embedded participants and a running
      ``moveCount`` counter so next-move generation is a cheap read.

  * ``conversations`` (PK=/sessionId), type='gameMove'
      One doc per move. These grow unboundedly so they live as siblings
      of the parent game doc rather than embedded.

Commentary uses the persona prompt system for character-specific reactions.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.database import get_pool, query, read_item, upsert
from app.services.chat import create_session
from app.services.council import list_council
from app.services.llm import generate_commentary
from app.services.personalities import build_commentary_prompt
from app.services.personalities.personas import COUNCIL_PERSONAS

logger = logging.getLogger(__name__)


# In-memory stub stores (only used when Cosmos is unavailable) — also kept
# as a write-through cache for hot reads when Cosmos *is* available.
_STUB_GAMES: dict[str, dict[str, Any]] = {}
_STUB_MOVES: dict[str, list[dict[str, Any]]] = {}


CONTAINER = "conversations"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _initial_state(game_type: str, config: dict | None = None) -> dict[str, Any]:
    """Minimal starting state per game type."""
    config = config or {}
    if game_type == "chess":
        return {
            "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            "moves": [],
            "turn": "w",
        }
    if game_type == "ludo":
        return {
            "board": "initial",
            "dice": None,
            "turn_color": "red",
            "positions": {
                "red": [-1, -1, -1, -1],
                "blue": [-1, -1, -1, -1],
                "green": [-1, -1, -1, -1],
                "yellow": [-1, -1, -1, -1],
            },
        }
    if game_type == "truth_or_dare":
        return {
            "current_choice": None,
            "current_prompt": None,
            "history": [],
        }
    return {}


def _piece_color_for_index(game_type: str, idx: int) -> str | None:
    if game_type == "chess":
        return "white" if idx == 0 else "black"
    if game_type == "ludo":
        return ["red", "blue", "green", "yellow"][idx % 4]
    return None


def _resolve_member_ids(
    members: list[dict[str, Any]],
    refs: list[str] | None,
    game_type: str,
) -> list[dict[str, Any]]:
    if not refs:
        # Sensible defaults: chess → Aria (white) vs Rex (black); ludo →
        # 4 colourful members; truth_or_dare → everyone.
        if game_type == "chess":
            return [m for m in members if m["slug"] in ("aria", "rex")]
        if game_type == "ludo":
            return [m for m in members if m["slug"] in ("aria", "rex", "nova", "echo")]
        return list(members)

    resolved: list[dict[str, Any]] = []
    for r in refs:
        rl = r.strip().lower()
        for m in members:
            if str(m["id"]) == r or m["slug"] == rl or m["name"].lower() == rl:
                if m not in resolved:
                    resolved.append(m)
                break
    return resolved


def _build_participants(
    chosen: list[dict[str, Any]],
    game_id: str,
    game_type: str,
) -> list[dict[str, Any]]:
    participants: list[dict[str, Any]] = []
    for i, m in enumerate(chosen):
        participants.append(
            {
                "id": f"part-{game_id[:8]}-{m['slug']}",
                "council_member_id": str(m["id"]),
                "member_slug": m["slug"],
                "member_name": m["name"],
                "piece_color": _piece_color_for_index(game_type, i),
                "position_order": i,
            }
        )
    return participants


def _game_title(game_type: str) -> str:
    return f"{game_type.replace('_', ' ').title()} game"


def _shape_game(g: dict[str, Any], members: list[dict[str, Any]]) -> dict[str, Any]:
    """Public shape for API responses — adds ``current_turn_slug``."""
    out = dict(g)
    out["current_turn_slug"] = None
    mid = out.get("current_turn_member_id")
    if mid:
        for m in members:
            if str(m["id"]) == str(mid):
                out["current_turn_slug"] = m["slug"]
                break
    return out


def _from_cosmos_doc(doc: dict[str, Any]) -> dict[str, Any]:
    """Translate the Cosmos camelCase doc to the snake_case shape the
    rest of the app expects."""
    out: dict[str, Any] = {
        "id": doc.get("id"),
        "session_id": doc.get("sessionId"),
        "user_id": doc.get("userId"),
        "game_type": doc.get("gameType"),
        "status": doc.get("status"),
        "state": doc.get("state") or {},
        "current_turn_member_id": doc.get("currentTurnMemberId"),
        "current_turn_slug": doc.get("currentTurnSlug"),
        "winner_member_id": doc.get("winnerMemberId"),
        "user_won": doc.get("userWon"),
        "participants": [],
        "started_at": doc.get("startedAt"),
        "ended_at": doc.get("endedAt"),
    }
    for p in doc.get("participants", []) or []:
        out["participants"].append(
            {
                "id": p.get("id"),
                "council_member_id": p.get("councilMemberId"),
                "member_slug": p.get("memberSlug"),
                "member_name": p.get("memberName"),
                "piece_color": p.get("pieceColor"),
                "position_order": p.get("positionOrder"),
            }
        )
    return out


def _to_cosmos_doc(g: dict[str, Any]) -> dict[str, Any]:
    """Translate the in-process snake_case shape into the Cosmos camelCase
    document shape. Datetime values are ISO-encoded."""

    def _iso(v: Any) -> Any:
        if isinstance(v, datetime):
            return v.isoformat()
        return v

    participants_out = []
    for p in g.get("participants", []) or []:
        participants_out.append(
            {
                "id": p.get("id"),
                "councilMemberId": p.get("council_member_id"),
                "memberSlug": p.get("member_slug"),
                "memberName": p.get("member_name"),
                "pieceColor": p.get("piece_color"),
                "positionOrder": p.get("position_order"),
            }
        )

    return {
        "id": g["id"],
        "type": "game",
        "sessionId": g["session_id"],
        "userId": g["user_id"],
        "gameType": g.get("game_type"),
        "status": g.get("status", "active"),
        "state": g.get("state") or {},
        "currentTurnMemberId": g.get("current_turn_member_id"),
        "currentTurnSlug": g.get("current_turn_slug"),
        "winnerMemberId": g.get("winner_member_id"),
        "userWon": g.get("user_won"),
        "participants": participants_out,
        "moveCount": int(g.get("move_count", 0) or 0),
        "startedAt": _iso(g.get("started_at")),
        "endedAt": _iso(g.get("ended_at")),
        "createdAt": _iso(g.get("created_at") or g.get("started_at") or _now_iso()),
    }


# --------------------------------------------------------------------------
# Create
# --------------------------------------------------------------------------
async def create_game(
    user_id: str,
    game_type: str,
    config: dict | None = None,
    member_ids: list[str] | None = None,
) -> dict[str, Any]:
    members = await list_council(user_id)
    chosen = _resolve_member_ids(members, member_ids, game_type)
    state = _initial_state(game_type, config)

    pool = get_pool()

    # Parent session lives in the `sessions` container; chat.create_session
    # handles both modes (stub + Cosmos) under the hood.
    session = await create_session(
        user_id,
        title=_game_title(game_type),
        session_type="game",
    )
    session_id = str(session["id"])

    game_id = str(uuid.uuid4())
    participants = _build_participants(chosen, game_id, game_type)
    started_at_iso = _now_iso()

    game = {
        "id": game_id,
        "session_id": session_id,
        "user_id": user_id,
        "game_type": game_type,
        "status": "active",
        "state": state,
        "current_turn_member_id": None,
        "current_turn_slug": None,
        "winner_member_id": None,
        "user_won": None,
        "participants": participants,
        "started_at": started_at_iso,
        "ended_at": None,
        "move_count": 0,
        "created_at": started_at_iso,
    }

    # Always mirror to the stub cache so hot reads stay cheap.
    _STUB_GAMES[game_id] = dict(game)
    _STUB_MOVES.setdefault(game_id, [])

    if pool is not None:
        doc = _to_cosmos_doc(game)
        await upsert(CONTAINER, doc)

    return _shape_game(game, members)


# --------------------------------------------------------------------------
# Read
# --------------------------------------------------------------------------
async def get_game(user_id: str, game_id: str) -> dict[str, Any] | None:
    members = await list_council(user_id)
    pool = get_pool()

    if pool is None:
        g = _STUB_GAMES.get(game_id)
        if not g or g.get("user_id") != user_id:
            return None
        return _shape_game(g, members)

    # 1) Cross-partition lookup to discover the partition key (sessionId).
    rows = await query(
        CONTAINER,
        (
            "SELECT c.sessionId, c.userId FROM c "
            "WHERE c.type = 'game' AND c.id = @id"
        ),
        parameters=[{"name": "@id", "value": game_id}],
        enable_cross_partition=True,
        max_items=1,
    )
    if not rows:
        # Stub-cache fallback (covers the brief window before a write
        # round-trips to Cosmos).
        g = _STUB_GAMES.get(game_id)
        if g and g.get("user_id") == user_id:
            return _shape_game(g, members)
        return None

    session_id = rows[0].get("sessionId")
    owner = rows[0].get("userId")
    if not session_id or owner != user_id:
        return None

    # 2) Point-read with the discovered partition key.
    doc = await read_item(CONTAINER, game_id, session_id)
    if not doc:
        return None

    shaped = _from_cosmos_doc(doc)
    # Refresh stub cache.
    cache_entry = dict(shaped)
    cache_entry["move_count"] = int(doc.get("moveCount", 0) or 0)
    _STUB_GAMES[game_id] = cache_entry
    return _shape_game(shaped, members)


# --------------------------------------------------------------------------
# Moves
# --------------------------------------------------------------------------
async def record_move(
    user_id: str,
    game_id: str,
    *,
    move_data: dict,
    snapshot: dict | None = None,
    member_id: str | None = None,
) -> dict[str, Any] | None:
    members = await list_council(user_id)
    council_uuid: str | None = None
    if member_id:
        for m in members:
            if str(m["id"]) == member_id or m["slug"] == member_id.lower():
                council_uuid = str(m["id"])
                break

    pool = get_pool()

    if pool is None:
        g = _STUB_GAMES.get(game_id)
        if not g or g["user_id"] != user_id:
            return None
        move_number = len(_STUB_MOVES.get(game_id, [])) + 1
        move = {
            "id": str(uuid.uuid4()),
            "game_id": game_id,
            "council_member_id": council_uuid,
            "move_number": move_number,
            "move_data": move_data,
            "state_snapshot": snapshot,
            "created_at": _now_iso(),
        }
        _STUB_MOVES.setdefault(game_id, []).append(move)
        if snapshot:
            g["state"] = snapshot
        g["move_count"] = move_number
        return move

    # Live mode: need the game doc first so we know sessionId + moveCount.
    game = await get_game(user_id, game_id)
    if not game:
        return None
    session_id = game.get("session_id")
    if not session_id:
        return None

    # moveCount lives on the persisted Cosmos doc; the stub-cache mirrors it.
    cached = _STUB_GAMES.get(game_id, {})
    move_number = int(cached.get("move_count", 0) or 0) + 1

    move_id = str(uuid.uuid4())
    created_at_iso = _now_iso()
    move_doc = {
        "id": move_id,
        "type": "gameMove",
        "sessionId": session_id,
        "userId": user_id,
        "gameId": game_id,
        "councilMemberId": council_uuid,
        "moveNumber": move_number,
        "moveData": move_data,
        "stateSnapshot": snapshot,
        "createdAt": created_at_iso,
    }
    await upsert(CONTAINER, move_doc)

    # Update parent game doc: bump moveCount, optionally update state.
    parent_doc = await read_item(CONTAINER, game_id, session_id)
    if parent_doc is not None:
        parent_doc["moveCount"] = move_number
        if snapshot:
            parent_doc["state"] = snapshot
        await upsert(CONTAINER, parent_doc)

    # Mirror into the stub cache.
    move = {
        "id": move_id,
        "game_id": game_id,
        "council_member_id": council_uuid,
        "move_number": move_number,
        "move_data": move_data,
        "state_snapshot": snapshot,
        "created_at": created_at_iso,
    }
    _STUB_MOVES.setdefault(game_id, []).append(move)
    g_cache = _STUB_GAMES.get(game_id)
    if g_cache is not None:
        g_cache["move_count"] = move_number
        if snapshot:
            g_cache["state"] = snapshot
    return move


# --------------------------------------------------------------------------
# Commentary
# --------------------------------------------------------------------------
def _summarise_move(game_type: str, move_data: dict) -> str:
    if game_type == "chess":
        return f"Chess move: {move_data.get('from','?')}→{move_data.get('to','?')}."
    if game_type == "ludo":
        return (
            f"Ludo: rolled {move_data.get('die_roll','?')}, moved token "
            f"{move_data.get('token','?')} to {move_data.get('to','?')}."
        )
    if game_type == "truth_or_dare":
        choice = move_data.get("choice", "?")
        return f"Truth or Dare: chose {choice}. Prompt: {move_data.get('prompt','')[:120]}"
    return f"Move: {move_data}"


def _summarise_snapshot(game_type: str, snapshot: dict | None) -> str:
    if not snapshot:
        return ""
    if game_type == "chess":
        return f"Position: {snapshot.get('fen','')[:80]} | turn: {snapshot.get('turn','?')}"
    if game_type == "ludo":
        return f"Positions: {snapshot.get('positions',{})}"
    if game_type == "truth_or_dare":
        history = snapshot.get("history", [])
        return f"Last 3 rounds: {history[-3:]}"
    return ""


async def generate_game_commentary(
    user_id: str,
    game_id: str,
    *,
    move_data: dict,
    snapshot: dict | None = None,
    member_refs: list[str] | None = None,
) -> list[dict[str, Any]]:
    g = await get_game(user_id, game_id)
    if not g:
        return []
    members = await list_council(user_id)

    # Decide which members comment: explicit list or all participants + one
    # outsider for spice.
    chosen_slugs: list[str] = []
    if member_refs:
        for r in member_refs:
            rl = r.strip().lower()
            for m in members:
                if str(m["id"]) == r or m["slug"] == rl:
                    chosen_slugs.append(m["slug"])
                    break
    else:
        for p in g.get("participants", []):
            chosen_slugs.append(p["member_slug"])
        # Add Rex if not playing — he likes commenting.
        if "rex" not in chosen_slugs and any(m["slug"] == "rex" for m in members):
            chosen_slugs.append("rex")

    chosen_slugs = chosen_slugs[:3]  # cap

    move_summary = _summarise_move(g["game_type"], move_data)
    snap_summary = _summarise_snapshot(g["game_type"], snapshot)

    async def _one(slug: str) -> dict[str, Any] | None:
        persona = COUNCIL_PERSONAS.get(slug)
        if not persona:
            return None
        prompt = build_commentary_prompt(
            persona=persona,
            game_type=g["game_type"],
            move_summary=move_summary,
            snapshot_summary=snap_summary,
        )
        try:
            text = await generate_commentary(
                prompt,
                member_id=slug,
                move_summary=move_summary,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Commentary generation failed for %s: %s", slug, exc)
            text = ""
        return {
            "member_slug": slug,
            "member_name": persona.name,
            "content": (text or "").strip(),
        }

    results = await asyncio.gather(*(_one(s) for s in chosen_slugs))
    return [r for r in results if r and r["content"]]


__all__ = ["create_game", "get_game", "record_move", "generate_game_commentary"]
