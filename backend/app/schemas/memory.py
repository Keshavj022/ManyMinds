"""Memory-graph schemas (mocked — Neo4j integration out of scope)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import APIModel

NodeKind = Literal["topic", "entity", "emotion", "event", "person", "preference"]


class GraphNode(APIModel):
    id: str
    label: str
    kind: NodeKind
    weight: float = 1.0
    color: str | None = None
    metadata: dict = Field(default_factory=dict)
    last_referenced: datetime | None = None


class GraphEdge(APIModel):
    id: str
    source: str
    target: str
    kind: str = "related"
    weight: float = 1.0


class GraphResponse(APIModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    generated_at: datetime


class NodeDetail(APIModel):
    node: GraphNode
    connections: list[GraphEdge]
    related_messages: list[dict] = Field(default_factory=list)
