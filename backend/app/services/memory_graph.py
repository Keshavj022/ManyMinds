"""
Neo4j-backed memory graph for ManyMinds.

Each user owns a subgraph of their conversations: topics, people, emotions,
preferences, events. Council members and chat messages are also nodes so the
graph can answer "which member surfaced which topic, from which message."

Required env vars (all optional; absent = graceful fallback to the deterministic
generator in app/api/v1/memory.py):

    NEO4J_URI         e.g. bolt://localhost:7687
                          neo4j://localhost:7687
                          neo4j+s://<your-aura-instance>.databases.neo4j.io
    NEO4J_USER        default: neo4j
    NEO4J_PASSWORD    password for the user
    NEO4J_DATABASE    default: neo4j

Design rules:
  - The `neo4j` Python package is loaded eagerly only if NEO4J_URI is set.
    If the package isn't installed or the driver fails to connect, we log and
    operate in the same fallback mode as no-key.
  - `ingest_turn(...)` is best-effort: failures must NEVER bubble up into the
    chat flow.
  - All writes are scoped by `user_id` — `MATCH (u:User {id: $user_id})` is
    used for every read/write so subgraphs stay tenant-isolated.

Schema (created on startup if absent):

    (:User {id})
    (:CouncilMember {user_id, slug, name, role})
    (:Session   {id, user_id})
    (:Message   {id, user_id, role, content, created_at, member_slug?})
    (:Topic     {user_id, label})        // canonical label per user
    (:Person    {user_id, label})
    (:Emotion   {user_id, label})
    (:Preference{user_id, label})
    (:Event     {user_id, label})

    (m:Message)-[:MENTIONS {weight}]->(:Topic|:Person|:Emotion|:Preference|:Event)
    (m:Message)-[:SAID_BY]->(c:CouncilMember)
    (m:Message)-[:IN_SESSION]->(s:Session)
    (u:User)-[:HAS_MESSAGE]->(m:Message)
    (u:User)-[:KNOWS]->(entity)             // every node a user has is hung off the User
    (c:CouncilMember)-[:SURFACED {weight, count}]->(entity)
    (entity)-[:CO_OCCURS_WITH {weight}]->(entity)   // pairwise, built incrementally

Indexes & constraints created at boot time keep MERGEs O(1).
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Entity extraction — small, dependency-free heuristics
# ---------------------------------------------------------------------------
# These are intentionally crude: they exist so the graph has *something*
# meaningful to display the moment a user starts chatting. A heavier NLP
# upgrade can swap in spaCy / an LLM-as-extractor later without changing this
# module's external API.

EMOTION_WORDS = {
    "happy", "sad", "anxious", "anxiety", "stressed", "tired", "exhausted",
    "frustrated", "angry", "curious", "hopeful", "excited", "scared", "worried",
    "lonely", "grateful", "content", "stuck", "energised", "energized", "calm",
    "overwhelmed", "burned out", "burnt out", "nervous", "joy", "peace",
}
PREFERENCE_VERBS = ("love", "loves", "hate", "hates", "prefer", "prefers", "enjoy", "enjoys")
EVENT_KEYWORDS = (
    "move", "moved", "job", "promoted", "promotion", "fired", "started",
    "graduated", "married", "engagement", "engaged", "breakup", "broke up",
    "lost", "born", "trip", "travel", "moved out",
)

# Match capitalised proper-noun runs after splitting on punctuation.
_PROPER_RE = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b")
_STOP_PROPER = {
    "I", "Im", "Ill", "Ive", "Its", "Ok", "Okay", "Yes", "No", "Hey",
    "Hi", "Hello", "Aria", "Rex", "Sage", "Nova", "Echo", "ManyMinds",
    "Council",
}
_TOPIC_RE = re.compile(r"[A-Za-z][A-Za-z\-]{3,}")
_TOPIC_STOP = {
    "really", "going", "where", "about", "would", "could", "should", "think",
    "thing", "things", "people", "person", "actually", "right", "still",
    "maybe", "probably", "their", "there", "they're", "youre", "you're",
    "yeah", "okay", "ok", "well", "kind", "sort", "going", "what", "when",
    "more", "less", "with", "without", "from", "into", "this", "that",
    "these", "those", "tell", "talk", "told", "said", "say", "want", "wants",
    "knew", "know", "knows", "want", "wanted", "needs", "need", "kinda",
    "much", "many", "some", "thing", "every", "another", "anyone", "feel",
    "felt", "feeling", "feelings", "trying", "doing", "saying", "thought",
    "thoughts", "back", "really", "good", "bad", "yeah",
}


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip().lower()


@dataclass
class ExtractedEntities:
    topics: list[str]
    people: list[str]
    emotions: list[str]
    preferences: list[str]
    events: list[str]

    def is_empty(self) -> bool:
        return not (self.topics or self.people or self.emotions or self.preferences or self.events)

    def all_labels(self) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        out.extend(("Topic", t) for t in self.topics)
        out.extend(("Person", p) for p in self.people)
        out.extend(("Emotion", e) for e in self.emotions)
        out.extend(("Preference", p) for p in self.preferences)
        out.extend(("Event", e) for e in self.events)
        return out


def extract_entities(text: str, *, max_topics: int = 4) -> ExtractedEntities:
    """Pull a handful of memorable items from a message.

    Heuristics, in order:
      1. People — capitalised proper nouns (≤ 3 words), excluding council names.
      2. Emotions — words in EMOTION_WORDS.
      3. Preferences — sentences with "I love/hate/prefer X".
      4. Events — keyword-anchored phrases.
      5. Topics — frequent non-stopword tokens that aren't already classified.
    """
    if not text:
        return ExtractedEntities([], [], [], [], [])

    # 1. People
    proper: list[str] = []
    for m in _PROPER_RE.finditer(text):
        name = m.group(1).strip()
        flat = name.replace(" ", "")
        if flat in _STOP_PROPER:
            continue
        if name not in proper:
            proper.append(name)
    people = proper[:5]

    lower = text.lower()

    # 2. Emotions
    emotions: list[str] = []
    for w in EMOTION_WORDS:
        if w in lower and w not in emotions:
            emotions.append(w)
    emotions = emotions[:4]

    # 3. Preferences ("I love X", "she loves rain", "I prefer mornings")
    prefs: list[str] = []
    for verb in PREFERENCE_VERBS:
        for m in re.finditer(rf"\b{verb}\s+([a-z][a-z\- ]{{2,32}})", lower):
            tail = m.group(1).strip().split(",")[0].split(".")[0].strip()
            tail = " ".join(tail.split()[:4])
            if tail and tail not in prefs and tail not in _TOPIC_STOP:
                prefs.append(tail)
    prefs = prefs[:3]

    # 4. Events — keyword-anchored
    events: list[str] = []
    for kw in EVENT_KEYWORDS:
        if re.search(rf"\b{re.escape(kw)}\b", lower):
            phrase = kw if " " in kw else f"{kw}"
            if phrase not in events:
                events.append(phrase)
    events = events[:3]

    # 5. Topics — content tokens that aren't already captured
    classified = {_normalise(p) for p in people} | set(emotions) | set(prefs) | set(events)
    freq: dict[str, int] = {}
    for tok in _TOPIC_RE.findall(lower):
        if tok in _TOPIC_STOP or tok in classified:
            continue
        freq[tok] = freq.get(tok, 0) + 1
    topics = [w for w, _ in sorted(freq.items(), key=lambda kv: (-kv[1], kv[0]))][:max_topics]

    return ExtractedEntities(
        topics=topics,
        people=people,
        emotions=emotions,
        preferences=prefs,
        events=events,
    )


# ---------------------------------------------------------------------------
# Neo4j driver wrapper
# ---------------------------------------------------------------------------

class MemoryGraph:
    """Singleton wrapper around the Neo4j async driver.

    Methods:
      - connect()             : called from app lifespan on startup
      - close()               : called from app lifespan on shutdown
      - ensure_schema()       : creates indexes/constraints once
      - ingest_turn(...)      : called from chat after a turn lands
      - get_user_graph(...)   : returns nodes + edges in the existing schema
    """

    def __init__(self) -> None:
        self._driver: Any | None = None
        self._available: bool = False
        self._schema_ready: bool = False

    # ---- lifecycle -----------------------------------------------------
    @property
    def available(self) -> bool:
        return self._available

    async def connect(self) -> None:
        if not settings.NEO4J_URI:
            logger.info("NEO4J_URI not set — memory graph runs in fallback mode")
            return
        try:
            from neo4j import AsyncGraphDatabase  # type: ignore
        except ImportError:
            logger.warning("neo4j package not installed — memory graph in fallback mode")
            return

        auth = None
        if settings.NEO4J_PASSWORD:
            auth = (settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        try:
            self._driver = AsyncGraphDatabase.driver(settings.NEO4J_URI, auth=auth)
            await self._driver.verify_connectivity()
            self._available = True
            logger.info(
                "Neo4j connected (uri=%s, db=%s)",
                settings.NEO4J_URI,
                settings.NEO4J_DATABASE,
            )
            await self.ensure_schema()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Neo4j connect failed: %s — using fallback mode", exc)
            self._driver = None
            self._available = False

    async def close(self) -> None:
        if self._driver is not None:
            try:
                await self._driver.close()
            except Exception as exc:  # noqa: BLE001
                logger.warning("Neo4j close failed: %s", exc)
        self._driver = None
        self._available = False
        self._schema_ready = False

    def _session(self):  # type: ignore[no-untyped-def]
        return self._driver.session(database=settings.NEO4J_DATABASE)  # type: ignore[union-attr]

    # ---- schema --------------------------------------------------------
    async def ensure_schema(self) -> None:
        if not self._driver or self._schema_ready:
            return
        statements = [
            # Uniqueness — one User per id, one node-per-(user_id,label) for each
            # entity kind, one Message per id, one Session per id.
            "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
            "CREATE CONSTRAINT message_id IF NOT EXISTS FOR (m:Message) REQUIRE m.id IS UNIQUE",
            "CREATE CONSTRAINT session_id IF NOT EXISTS FOR (s:Session) REQUIRE s.id IS UNIQUE",
            "CREATE CONSTRAINT council_user_slug IF NOT EXISTS "
            "FOR (c:CouncilMember) REQUIRE (c.user_id, c.slug) IS UNIQUE",
            "CREATE CONSTRAINT topic_user_label IF NOT EXISTS "
            "FOR (t:Topic) REQUIRE (t.user_id, t.label) IS UNIQUE",
            "CREATE CONSTRAINT person_user_label IF NOT EXISTS "
            "FOR (p:Person) REQUIRE (p.user_id, p.label) IS UNIQUE",
            "CREATE CONSTRAINT emotion_user_label IF NOT EXISTS "
            "FOR (e:Emotion) REQUIRE (e.user_id, e.label) IS UNIQUE",
            "CREATE CONSTRAINT preference_user_label IF NOT EXISTS "
            "FOR (p:Preference) REQUIRE (p.user_id, p.label) IS UNIQUE",
            "CREATE CONSTRAINT event_user_label IF NOT EXISTS "
            "FOR (e:Event) REQUIRE (e.user_id, e.label) IS UNIQUE",
            # Composite-ish indexes for fast user-scoped queries.
            "CREATE INDEX message_user IF NOT EXISTS FOR (m:Message) ON (m.user_id)",
            "CREATE INDEX topic_user IF NOT EXISTS FOR (t:Topic) ON (t.user_id)",
            "CREATE INDEX person_user IF NOT EXISTS FOR (p:Person) ON (p.user_id)",
            "CREATE INDEX emotion_user IF NOT EXISTS FOR (e:Emotion) ON (e.user_id)",
        ]
        try:
            async with self._session() as session:
                for stmt in statements:
                    try:
                        await session.run(stmt)
                    except Exception as exc:  # noqa: BLE001
                        # Constraints/indexes already there or DB perms missing;
                        # don't blow up the whole boot.
                        logger.debug("Neo4j schema stmt skipped (%s): %s", stmt[:60], exc)
            self._schema_ready = True
            logger.info("Neo4j schema constraints ensured")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Neo4j ensure_schema failed: %s", exc)

    # ---- ingestion -----------------------------------------------------
    async def ingest_turn(
        self,
        *,
        user_id: str,
        session_id: str,
        user_message: dict[str, Any],
        member_messages: Iterable[dict[str, Any]],
    ) -> None:
        """Best-effort write of the turn into the graph. Never raises."""
        if not self._available or not self._driver:
            return
        try:
            async with self._session() as session:
                await session.execute_write(
                    _write_turn_tx,
                    user_id=user_id,
                    session_id=session_id,
                    user_message=user_message,
                    member_messages=list(member_messages),
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Neo4j ingest_turn failed (non-fatal): %s", exc)

    # ---- reads ---------------------------------------------------------
    async def get_user_graph(
        self,
        user_id: str,
        *,
        since: datetime | None = None,
        kinds: list[str] | None = None,
        limit_nodes: int = 60,
    ) -> dict[str, list[dict[str, Any]]] | None:
        """Return the user's graph in the shape the /memory endpoint expects.

        Returns None if Neo4j isn't available — callers should fall back to
        the deterministic generator.
        """
        if not self._available or not self._driver:
            return None
        try:
            async with self._session() as session:
                rows = await session.execute_read(
                    _read_graph_tx,
                    user_id=user_id,
                    since=since,
                    kinds=kinds,
                    limit_nodes=limit_nodes,
                )
            return rows
        except Exception as exc:  # noqa: BLE001
            logger.warning("Neo4j get_user_graph failed: %s", exc)
            return None


# ---- top-level transaction functions ---------------------------------------
# Defined at module-level so the driver can pickle/dispatch them.

async def _write_turn_tx(  # type: ignore[no-untyped-def]
    tx,
    *,
    user_id: str,
    session_id: str,
    user_message: dict[str, Any],
    member_messages: list[dict[str, Any]],
) -> None:
    # User + Session anchors.
    await tx.run(
        "MERGE (u:User {id:$user_id}) "
        "MERGE (s:Session {id:$session_id}) "
        "  ON CREATE SET s.user_id=$user_id, s.created_at=$now "
        "MERGE (u)-[:OWNS]->(s)",
        user_id=user_id,
        session_id=session_id,
        now=datetime.now(timezone.utc),
    )

    all_messages = [{**user_message, "_role": "user"}] + [
        {**m, "_role": "assistant"} for m in member_messages
    ]

    for msg in all_messages:
        content = msg.get("content") or ""
        member_slug = msg.get("member_slug")
        member_name = msg.get("member_name")
        msg_id = msg.get("id") or _fallback_msg_id(content, msg.get("created_at"))
        created_at = msg.get("created_at") or datetime.now(timezone.utc)
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at)
            except Exception:  # noqa: BLE001
                created_at = datetime.now(timezone.utc)

        # Message node + relationships to User, Session, CouncilMember.
        await tx.run(
            "MATCH (u:User {id:$user_id}) "
            "MATCH (s:Session {id:$session_id}) "
            "MERGE (m:Message {id:$id}) "
            "  ON CREATE SET m.user_id=$user_id, m.role=$role, m.content=$content, "
            "                m.member_slug=$member_slug, m.created_at=$created_at "
            "MERGE (u)-[:HAS_MESSAGE]->(m) "
            "MERGE (m)-[:IN_SESSION]->(s)",
            user_id=user_id,
            session_id=session_id,
            id=str(msg_id),
            role=msg["_role"],
            content=content[:4000],
            member_slug=member_slug,
            created_at=created_at,
        )

        if member_slug and member_name:
            await tx.run(
                "MATCH (u:User {id:$user_id}) "
                "MATCH (m:Message {id:$id}) "
                "MERGE (c:CouncilMember {user_id:$user_id, slug:$slug}) "
                "  ON CREATE SET c.name=$name "
                "MERGE (u)-[:HAS_COUNCIL_MEMBER]->(c) "
                "MERGE (m)-[:SAID_BY]->(c)",
                user_id=user_id,
                id=str(msg_id),
                slug=member_slug,
                name=member_name,
            )

        # Entity extraction + linkage. We extract from both user and member
        # messages — user messages reveal what they care about, member
        # messages reveal what was *surfaced* (so we keep `:SURFACED` edges).
        ents = extract_entities(content)
        if ents.is_empty():
            continue

        for label, value in ents.all_labels():
            await tx.run(
                f"MATCH (u:User {{id:$user_id}}) "
                f"MATCH (m:Message {{id:$msg_id}}) "
                f"MERGE (n:{label} {{user_id:$user_id, label:$value}}) "
                f"  ON CREATE SET n.first_seen=$now, n.weight=1 "
                f"  ON MATCH  SET n.weight=coalesce(n.weight,1)+0.5, n.last_seen=$now "
                f"MERGE (u)-[:KNOWS]->(n) "
                f"MERGE (m)-[:MENTIONS]->(n)",
                user_id=user_id,
                msg_id=str(msg_id),
                value=value,
                now=datetime.now(timezone.utc),
            )
            if member_slug:
                await tx.run(
                    f"MATCH (c:CouncilMember {{user_id:$user_id, slug:$slug}}) "
                    f"MATCH (n:{label} {{user_id:$user_id, label:$value}}) "
                    f"MERGE (c)-[r:SURFACED]->(n) "
                    f"  ON CREATE SET r.count=1, r.weight=0.4 "
                    f"  ON MATCH  SET r.count=r.count+1, r.weight=r.weight+0.15",
                    user_id=user_id,
                    slug=member_slug,
                    value=value,
                )

        # Pairwise co-occurrence — increment edges between every pair of
        # entities mentioned in the same message. The graph view depends on
        # these for the relational web.
        labels = ents.all_labels()
        for i in range(len(labels)):
            for j in range(i + 1, len(labels)):
                la, va = labels[i]
                lb, vb = labels[j]
                await tx.run(
                    f"MATCH (a:{la} {{user_id:$user_id, label:$va}}) "
                    f"MATCH (b:{lb} {{user_id:$user_id, label:$vb}}) "
                    f"MERGE (a)-[r:CO_OCCURS_WITH]-(b) "
                    f"  ON CREATE SET r.weight=0.3 "
                    f"  ON MATCH  SET r.weight=coalesce(r.weight,0.3)+0.15",
                    user_id=user_id,
                    va=va,
                    vb=vb,
                )


async def _read_graph_tx(  # type: ignore[no-untyped-def]
    tx,
    *,
    user_id: str,
    since: datetime | None,
    kinds: list[str] | None,
    limit_nodes: int,
) -> dict[str, list[dict[str, Any]]]:
    # Map backend Pydantic NodeKind ↔ Neo4j label.
    kind_to_label = {
        "topic": "Topic",
        "person": "Person",
        "emotion": "Emotion",
        "preference": "Preference",
        "event": "Event",
    }
    label_to_kind = {v: k for k, v in kind_to_label.items()}
    label_color = {
        "Topic": "#7AAEFF",
        "Person": "#FF8C8C",
        "Emotion": "#F4B5C8",
        "Preference": "#C29CFF",
        "Event": "#FFD27A",
    }

    selected_labels = (
        [kind_to_label[k] for k in kinds if k in kind_to_label]
        if kinds
        else list(kind_to_label.values())
    )

    nodes: list[dict[str, Any]] = []
    seen: set[str] = set()
    for lbl in selected_labels:
        cypher = (
            f"MATCH (u:User {{id:$user_id}})-[:KNOWS]->(n:{lbl}) "
            "WHERE $since IS NULL OR n.last_seen IS NULL OR n.last_seen >= $since "
            "RETURN n.label AS label, n.weight AS weight, n.last_seen AS last_seen "
            "ORDER BY coalesce(n.weight,1) DESC LIMIT $limit"
        )
        result = await tx.run(cypher, user_id=user_id, since=since, limit=limit_nodes)
        async for record in result:
            label = record["label"]
            kind = label_to_kind[lbl]
            node_id = f"{kind}:{label}"
            if node_id in seen:
                continue
            seen.add(node_id)
            nodes.append(
                {
                    "id": node_id,
                    "label": label,
                    "kind": kind,
                    "weight": float(record["weight"] or 1.0),
                    "color": label_color[lbl],
                    "metadata": {},
                    "last_referenced": record["last_seen"],
                }
            )

    node_labels = {n["id"].split(":", 1)[1] for n in nodes}
    edges: list[dict[str, Any]] = []
    if node_labels:
        cypher = (
            "MATCH (u:User {id:$user_id})-[:KNOWS]->(a)-[r:CO_OCCURS_WITH]-(b) "
            "WHERE labels(a)[0] IN $labels AND labels(b)[0] IN $labels "
            "  AND a.label IN $nl AND b.label IN $nl "
            "RETURN labels(a)[0] AS la, a.label AS al, labels(b)[0] AS lb, b.label AS bl, "
            "       r.weight AS w "
            "ORDER BY r.weight DESC LIMIT 200"
        )
        result = await tx.run(
            cypher,
            user_id=user_id,
            labels=selected_labels,
            nl=list(node_labels),
        )
        seen_edge: set[tuple[str, str]] = set()
        idx = 0
        async for record in result:
            la = record["la"]; al = record["al"]
            lb = record["lb"]; bl = record["bl"]
            src = f"{label_to_kind.get(la, 'topic')}:{al}"
            dst = f"{label_to_kind.get(lb, 'topic')}:{bl}"
            key = tuple(sorted((src, dst)))
            if key in seen_edge or src == dst:
                continue
            seen_edge.add(key)
            edges.append(
                {
                    "id": f"e{idx}",
                    "source": src,
                    "target": dst,
                    "kind": "co_occurs",
                    "weight": float(record["w"] or 0.5),
                }
            )
            idx += 1

    return {"nodes": nodes, "edges": edges}


def _fallback_msg_id(content: str, created_at: Any) -> str:
    """When the chat service handed us a stub message that lacks an id (in
    practice this won't happen post-DB, but in stub mode the chat service
    synthesizes its own ids), derive a stable id from the content."""
    import hashlib

    h = hashlib.sha1(f"{created_at}|{content[:200]}".encode()).hexdigest()
    return f"msg-{h[:16]}"


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_memory: MemoryGraph | None = None


def get_memory_graph() -> MemoryGraph:
    global _memory
    if _memory is None:
        _memory = MemoryGraph()
    return _memory


__all__ = [
    "MemoryGraph",
    "ExtractedEntities",
    "extract_entities",
    "get_memory_graph",
]
