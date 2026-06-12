"""
Memory graph router.

The graph is built from the user's real interactions via Neo4j
(app/services/memory_graph.py). It does NOT fabricate data: when Neo4j is
unreachable, or when the user simply hasn't generated any memory yet, the
endpoint returns an EMPTY graph. The frontend renders an honest "your map is
still forming" state rather than a synthetic placeholder web.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Path, Query

from app.schemas.memory import GraphEdge, GraphNode, GraphResponse, NodeDetail
from app.services.memory_graph import get_memory_graph
from app.services.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memory", tags=["memory"])


def _dedupe_nodes(nodes: list[GraphNode]) -> list[GraphNode]:
    """Drop any nodes that share an id — node ids are React keys downstream,
    and a collision would crash the visualiser. First occurrence wins."""
    seen: set[str] = set()
    out: list[GraphNode] = []
    for n in nodes:
        if n.id in seen:
            continue
        seen.add(n.id)
        out.append(n)
    return out


def _empty_graph() -> GraphResponse:
    return GraphResponse(nodes=[], edges=[], generated_at=datetime.now(timezone.utc))


@router.get("/graph", response_model=GraphResponse)
async def graph(
    session_id: str | None = Query(default=None),
    since: datetime | None = Query(default=None),
    kinds: list[str] | None = Query(default=None),
    user: dict[str, Any] = Depends(get_current_user),
) -> GraphResponse:
    # The graph only ever reflects the live Neo4j knowledge graph. No mocks.
    mem = get_memory_graph()
    if not mem.available:
        return _empty_graph()

    live = await mem.get_user_graph(user["id"], since=since, kinds=kinds)
    if not live or not live.get("nodes"):
        # Neo4j is up but this user has no memory yet (or it was unreachable) —
        # an empty graph is the honest answer.
        return _empty_graph()

    nodes = _dedupe_nodes([GraphNode(**n) for n in live["nodes"]])
    node_ids = {n.id for n in nodes}
    edges = [
        GraphEdge(**e)
        for e in live["edges"]
        if e.get("source") in node_ids and e.get("target") in node_ids
    ]
    return GraphResponse(
        nodes=nodes,
        edges=edges,
        generated_at=datetime.now(timezone.utc),
    )


@router.get("/node/{node_id}", response_model=NodeDetail)
async def node_detail(
    node_id: str = Path(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> NodeDetail:
    """Detail for a single node. Only real edges/messages from Neo4j — never
    fabricated. Unknown nodes return a minimal, empty detail."""
    mem = get_memory_graph()
    node: GraphNode | None = None
    connections: list[GraphEdge] = []

    if mem.available:
        live = await mem.get_user_graph(user["id"], since=None, kinds=None)
        if live and live.get("nodes"):
            found = next((n for n in live["nodes"] if n.get("id") == node_id), None)
            if found:
                node = GraphNode(**found)
                connections = [
                    GraphEdge(**e)
                    for e in live["edges"]
                    if e.get("source") == node_id or e.get("target") == node_id
                ]

    if node is None:
        node = GraphNode(
            id=node_id,
            label=node_id.split(":", 1)[-1].replace("-", " ").title(),
            kind="topic",
            weight=0.5,
            color="#7AAEFF",
            last_referenced=None,
        )

    return NodeDetail(node=node, connections=connections, related_messages=[])
