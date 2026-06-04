"""
Memory graph router.

Returns mocked nodes/edges. Real Neo4j integration is out of scope for
the API rebuild — but the shape is final so the frontend can wire up
the graph visualiser today.

The mock is *deterministic* per (user, session) so the same user always
sees the same evolving graph in dev.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Path, Query

from app.schemas.memory import GraphEdge, GraphNode, GraphResponse, NodeDetail
from app.services.memory_graph import get_memory_graph
from app.services.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memory", tags=["memory"])


# Deterministic seed words by kind, used to keep mocks stable.
_SEED_TOPICS = ["career", "family", "creativity", "rest", "anxiety", "relationships", "money", "purpose"]
_SEED_PEOPLE = ["Maya", "Jordan", "Sam", "Priya", "Alex"]
_SEED_EMOTIONS = ["tired", "hopeful", "stuck", "energised", "anxious", "curious"]
_SEED_PREFERENCES = ["loves rain", "writes at night", "drinks black coffee", "long walks", "morning runs"]
_SEED_EVENTS = ["job change", "move to a new city", "got a dog", "started therapy", "lost a friend"]


def _stable_int(seed: str, mod: int) -> int:
    h = hashlib.sha1(seed.encode()).digest()
    return h[0] % mod if mod else 0


def _stable_node(seed: str, kind: str, label_pool: list[str], color: str) -> GraphNode:
    idx = _stable_int(seed + kind, len(label_pool))
    label = label_pool[idx]
    days_ago = _stable_int(seed + label, 30)
    return GraphNode(
        id=f"{kind}:{label.lower().replace(' ', '-')}",
        label=label,
        kind=kind,  # type: ignore[arg-type]
        weight=0.4 + (_stable_int(seed + label, 60) / 100),
        color=color,
        metadata={"seed": seed},
        last_referenced=datetime.now(timezone.utc) - timedelta(days=days_ago),
    )


def _build_graph(user_id: str, session_id: str | None) -> GraphResponse:
    seed = f"{user_id}|{session_id or ''}"
    topic = _stable_node(seed + "1", "topic", _SEED_TOPICS, "#7AAEFF")
    topic2 = _stable_node(seed + "2", "topic", _SEED_TOPICS, "#7AAEFF")
    person = _stable_node(seed + "3", "person", _SEED_PEOPLE, "#FF8C8C")
    person2 = _stable_node(seed + "4", "person", _SEED_PEOPLE, "#FF8C8C")
    emotion = _stable_node(seed + "5", "emotion", _SEED_EMOTIONS, "#F4B5C8")
    pref = _stable_node(seed + "6", "preference", _SEED_PREFERENCES, "#C29CFF")
    event = _stable_node(seed + "7", "event", _SEED_EVENTS, "#FFD27A")

    nodes = [topic, topic2, person, person2, emotion, pref, event]
    edges = [
        GraphEdge(id="e1", source=topic.id, target=emotion.id, kind="evokes", weight=0.7),
        GraphEdge(id="e2", source=person.id, target=topic.id, kind="associated_with", weight=0.6),
        GraphEdge(id="e3", source=topic2.id, target=event.id, kind="part_of", weight=0.5),
        GraphEdge(id="e4", source=person2.id, target=emotion.id, kind="triggers", weight=0.4),
        GraphEdge(id="e5", source=pref.id, target=topic.id, kind="related", weight=0.5),
        GraphEdge(id="e6", source=event.id, target=person.id, kind="involves", weight=0.6),
        GraphEdge(id="e7", source=topic.id, target=topic2.id, kind="links_to", weight=0.3),
    ]
    return GraphResponse(nodes=nodes, edges=edges, generated_at=datetime.now(timezone.utc))


@router.get("/graph", response_model=GraphResponse)
async def graph(
    session_id: str | None = Query(default=None),
    since: datetime | None = Query(default=None),
    kinds: list[str] | None = Query(default=None),
    user: dict[str, Any] = Depends(get_current_user),
) -> GraphResponse:
    # Prefer the live Neo4j graph when configured.
    mem = get_memory_graph()
    if mem.available:
        live = await mem.get_user_graph(user["id"], since=since, kinds=kinds)
        if live is not None and live.get("nodes"):
            return GraphResponse(
                nodes=[GraphNode(**n) for n in live["nodes"]],
                edges=[GraphEdge(**e) for e in live["edges"]],
                generated_at=datetime.now(timezone.utc),
            )
        # If Neo4j is up but the user has no data yet, surface an empty graph
        # rather than synthetic mock data — that's honest.
        if live is not None:
            return GraphResponse(
                nodes=[],
                edges=[],
                generated_at=datetime.now(timezone.utc),
            )

    # Fallback — deterministic per-user generator (preserves prior UX).
    result = _build_graph(user["id"], session_id)
    if kinds:
        kinds_set = set(kinds)
        result.nodes = [n for n in result.nodes if n.kind in kinds_set]
        node_ids = {n.id for n in result.nodes}
        result.edges = [e for e in result.edges if e.source in node_ids and e.target in node_ids]
    if since:
        result.nodes = [n for n in result.nodes if not n.last_referenced or n.last_referenced >= since]
        node_ids = {n.id for n in result.nodes}
        result.edges = [e for e in result.edges if e.source in node_ids and e.target in node_ids]
    return result


@router.get("/node/{node_id}", response_model=NodeDetail)
async def node_detail(
    node_id: str = Path(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> NodeDetail:
    graph = _build_graph(user["id"], None)
    node = next((n for n in graph.nodes if n.id == node_id), None)
    if not node:
        # synthesise a generic one so the endpoint always returns something useful
        node = GraphNode(
            id=node_id,
            label=node_id.split(":", 1)[-1].replace("-", " ").title(),
            kind="topic",
            weight=0.5,
            color="#7AAEFF",
            last_referenced=datetime.now(timezone.utc) - timedelta(days=1),
        )
    connections = [e for e in graph.edges if e.source == node.id or e.target == node.id]
    return NodeDetail(
        node=node,
        connections=connections,
        related_messages=[
            {
                "id": "msg-mock-1",
                "speaker": "Aria",
                "content": "We talked about this two weeks ago — same edge of the same question.",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=12)).isoformat(),
            },
            {
                "id": "msg-mock-2",
                "speaker": "Echo",
                "content": "Mm. The feeling underneath it has come up before.",
                "created_at": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat(),
            },
        ],
    )
