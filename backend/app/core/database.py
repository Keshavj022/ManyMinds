"""
Async Azure Cosmos DB client wrapper + container catalog.

The cluster is OPTIONAL — when COSMOS_ENDPOINT / COSMOS_KEY are unset, every
service drops into "stub mode" (in-memory dicts mirroring the live shapes).
Helpers return None when the client is unavailable so callers can simply
branch on `client is None` or `get_container(name) is None`.

Container catalog (polymorphic via a `type` discriminator on each doc):

  +----------------+---------------+--------------------------------------------------+
  | Container      | Partition key | Doc types                                        |
  +----------------+---------------+--------------------------------------------------+
  | users          | /userId       | user, userProfile, personalityProfile,           |
  |                |               | quizResponses, userEnvironmentPreference         |
  | council        | /userId       | councilMember, avatar, voiceProfile              |
  | sessions       | /userId       | session                                          |
  | conversations  | /sessionId    | message, debate (embeds participants+arguments), |
  |                |               | game (embeds participants), gameMove             |
  | auth_tokens    | /userId       | refreshToken, passwordResetToken                 |
  | environments   | /type         | environment  (global reference data)             |
  +----------------+---------------+--------------------------------------------------+

Design notes:
- All IDs are caller-supplied UUID strings; document `id` equals the entity's
  natural id (userId, sessionId, debateId, gameId, ...).
- Token-hash lookups (refresh + password reset) are cross-partition queries
  on `auth_tokens` — small surface, low RU cost, acceptable.
- Email / username uniqueness is enforced application-side with a pre-check
  (matching the existing PG behaviour). A unique-key policy on `/email` and
  `/username` is also applied at bootstrap.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Container catalog
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class ContainerSpec:
    name: str
    partition_key_path: str
    unique_key_paths: tuple[tuple[str, ...], ...] = ()
    # If non-None, indexing policy hint: paths to include explicitly.
    description: str = ""


CONTAINER_SPECS: tuple[ContainerSpec, ...] = (
    ContainerSpec(
        name="users",
        partition_key_path="/userId",
        # Cosmos unique-key policies are scoped per logical partition. Since
        # each user is its own partition root (id == userId == PK value), a
        # cross-partition email/username collision still needs an application
        # pre-check (see auth.py signup). The unique-key policy below is a
        # last-line guard against double-create within the same partition.
        unique_key_paths=(("/email",), ("/username",)),
        description="user + per-user profile/personality/quiz/env docs",
    ),
    ContainerSpec(
        name="council",
        partition_key_path="/userId",
        unique_key_paths=(("/userId", "/slug"),),
        description="councilMember + avatar + voiceProfile per user",
    ),
    ContainerSpec(
        name="sessions",
        partition_key_path="/userId",
        description="session docs (chat/debate/game/quiz), listed per user",
    ),
    ContainerSpec(
        name="conversations",
        partition_key_path="/sessionId",
        description="message + embedded debate + embedded game + gameMove",
    ),
    ContainerSpec(
        name="auth_tokens",
        partition_key_path="/userId",
        description="refreshToken + passwordResetToken — hash lookups xpart",
    ),
    ContainerSpec(
        name="environments",
        partition_key_path="/type",
        unique_key_paths=(("/slug",),),
        description="global 3D environment reference data",
    ),
)


CONTAINER_BY_NAME: dict[str, ContainerSpec] = {c.name: c for c in CONTAINER_SPECS}


# ---------------------------------------------------------------------------
# CosmosDB singleton
# ---------------------------------------------------------------------------
class CosmosDB:
    """Lazy async Azure Cosmos DB wrapper.

    The handle is held for the process lifetime. `connect()` is idempotent;
    calling it without creds is a no-op that leaves the singleton in stub
    mode. Container handles are cached after first access.
    """

    def __init__(self) -> None:
        self._client: Any | None = None  # azure.cosmos.aio.CosmosClient
        self._database: Any | None = None
        self._containers: dict[str, Any] = {}
        self._available: bool = False

    # -------------------------------------------------------------- lifecycle
    async def connect(self) -> Any | None:
        """Open the client, ensure DB+containers exist if bootstrap is on."""
        if self._client is not None:
            return self._client
        if not (settings.COSMOS_ENDPOINT and settings.COSMOS_KEY):
            logger.warning(
                "COSMOS_ENDPOINT / COSMOS_KEY not set — running in stub mode"
            )
            return None
        try:
            from azure.cosmos.aio import CosmosClient  # type: ignore
            from azure.cosmos import PartitionKey  # type: ignore
            from azure.cosmos import exceptions as cex  # type: ignore
        except ImportError:
            logger.warning(
                "azure-cosmos not installed — running in stub mode. "
                "Install `azure-cosmos==4.7.0`."
            )
            return None

        try:
            self._client = CosmosClient(
                settings.COSMOS_ENDPOINT, settings.COSMOS_KEY
            )
            # Ensure DB exists. create_database_if_not_exists is idempotent.
            if settings.COSMOS_BOOTSTRAP_CONTAINERS:
                try:
                    self._database = await self._client.create_database_if_not_exists(
                        id=settings.COSMOS_DATABASE_NAME
                    )
                except cex.CosmosHttpResponseError:
                    # 403 if the key lacks DB-create permission — fall back to
                    # the existing-database handle so reads still work.
                    self._database = self._client.get_database_client(
                        settings.COSMOS_DATABASE_NAME
                    )
                # Ensure each container exists.
                for spec in CONTAINER_SPECS:
                    await self._ensure_container(
                        spec, PartitionKey, cex
                    )
            else:
                self._database = self._client.get_database_client(
                    settings.COSMOS_DATABASE_NAME
                )
                for spec in CONTAINER_SPECS:
                    self._containers[spec.name] = self._database.get_container_client(
                        spec.name
                    )

            self._available = True
            logger.info(
                "Cosmos DB ready (database=%s, containers=%s)",
                settings.COSMOS_DATABASE_NAME,
                ", ".join(c.name for c in CONTAINER_SPECS),
            )
            return self._client
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to connect to Cosmos DB: %s", exc)
            self._client = None
            self._database = None
            self._containers = {}
            self._available = False
            return None

    async def _ensure_container(
        self, spec: ContainerSpec, partition_key_cls: Any, cex: Any
    ) -> None:
        """create_container_if_not_exists with optional unique-key policy."""
        kwargs: dict[str, Any] = {
            "id": spec.name,
            "partition_key": partition_key_cls(path=spec.partition_key_path),
        }
        if settings.COSMOS_DEFAULT_RU > 0:
            kwargs["offer_throughput"] = settings.COSMOS_DEFAULT_RU
        if spec.unique_key_paths:
            kwargs["unique_key_policy"] = {
                "uniqueKeys": [
                    {"paths": list(paths)} for paths in spec.unique_key_paths
                ]
            }
        try:
            container = await self._database.create_container_if_not_exists(**kwargs)
        except cex.CosmosHttpResponseError as exc:
            # If unique-key policy or throughput conflicts with an existing
            # container, fall back to the existing handle.
            logger.info(
                "Container %s exists with different policy (%s) — "
                "using existing handle.",
                spec.name,
                getattr(exc, "status_code", "?"),
            )
            container = self._database.get_container_client(spec.name)
        self._containers[spec.name] = container

    async def close(self) -> None:
        """Close the underlying aiohttp session inside the SDK."""
        if self._client is not None:
            try:
                await self._client.close()
            except Exception as exc:  # noqa: BLE001
                logger.debug("Cosmos client close raised: %s", exc)
        self._client = None
        self._database = None
        self._containers = {}
        self._available = False

    # ------------------------------------------------------------------ probes
    @property
    def available(self) -> bool:
        return self._available

    def get_container(self, name: str) -> Any | None:
        """Return the cached container handle, or None in stub mode."""
        if not self._available:
            return None
        if name not in CONTAINER_BY_NAME:
            raise ValueError(f"Unknown container name: {name}")
        return self._containers.get(name)


# ---------------------------------------------------------------------------
# Module-level singleton + thin functional facade matching the old API.
# ---------------------------------------------------------------------------
_db = CosmosDB()


async def create_pool() -> Any | None:
    """Backwards-compatible name. Returns the Cosmos client (or None)."""
    return await _db.connect()


async def close_pool() -> None:
    """Backwards-compatible name. Closes the Cosmos client."""
    await _db.close()


def get_pool() -> Any | None:
    """Backwards-compatible name. Returns the Cosmos client (or None).

    Services use this for the `pool is None → stub mode` branch only — they
    do NOT issue queries through this handle directly. Use `get_container`.
    """
    return _db._client if _db.available else None  # noqa: SLF001


def get_client() -> Any | None:
    """Preferred accessor for the underlying CosmosClient."""
    return _db._client if _db.available else None  # noqa: SLF001


def get_container(name: str) -> Any | None:
    """Preferred accessor for a container handle."""
    return _db.get_container(name)


def is_available() -> bool:
    return _db.available


# ---------------------------------------------------------------------------
# Tiny helpers that ride on top of the SDK.
# ---------------------------------------------------------------------------
async def upsert(container_name: str, doc: dict[str, Any]) -> dict[str, Any] | None:
    """upsert_item with a defensive try/except. Returns None in stub mode."""
    container = get_container(container_name)
    if container is None:
        return None
    try:
        return await container.upsert_item(body=doc)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cosmos upsert %s failed: %s", container_name, exc)
        return None


async def read_item(
    container_name: str, item_id: str, partition_key: str
) -> dict[str, Any] | None:
    """Point read by id + partition key. Returns None on miss or stub mode."""
    container = get_container(container_name)
    if container is None:
        return None
    try:
        return await container.read_item(item=item_id, partition_key=partition_key)
    except Exception as exc:  # noqa: BLE001
        # 404s are expected; log everything else at warning.
        if "Resource Not Found" in str(exc) or "NotFound" in type(exc).__name__:
            return None
        logger.warning("Cosmos read_item %s failed: %s", container_name, exc)
        return None


async def delete_item(
    container_name: str, item_id: str, partition_key: str
) -> bool:
    container = get_container(container_name)
    if container is None:
        return False
    try:
        await container.delete_item(item=item_id, partition_key=partition_key)
        return True
    except Exception as exc:  # noqa: BLE001
        if "Resource Not Found" in str(exc):
            return False
        logger.warning("Cosmos delete %s failed: %s", container_name, exc)
        return False


async def query(
    container_name: str,
    query: str,
    parameters: list[dict[str, Any]] | None = None,
    *,
    partition_key: str | None = None,
    enable_cross_partition: bool = False,
    max_items: int | None = None,
) -> list[dict[str, Any]]:
    """Run a SQL query and return up to max_items results.

    If `partition_key` is supplied the query is partition-scoped (cheap).
    Pass `enable_cross_partition=True` to run a fan-out query (RU heavy).
    """
    container = get_container(container_name)
    if container is None:
        return []
    try:
        kwargs: dict[str, Any] = {
            "query": query,
            "parameters": parameters or [],
        }
        if partition_key is not None:
            kwargs["partition_key"] = partition_key
        elif enable_cross_partition:
            # Newer SDK versions infer cross-partition from no PK; older ones
            # required the explicit flag. Pass both shapes defensively.
            kwargs["enable_cross_partition_query"] = True
        out: list[dict[str, Any]] = []
        async for item in container.query_items(**kwargs):
            out.append(item)
            if max_items is not None and len(out) >= max_items:
                break
        return out
    except TypeError:
        # Older SDKs don't accept enable_cross_partition_query.
        kwargs.pop("enable_cross_partition_query", None)
        out = []
        async for item in container.query_items(**kwargs):
            out.append(item)
            if max_items is not None and len(out) >= max_items:
                break
        return out
    except Exception as exc:  # noqa: BLE001
        logger.warning("Cosmos query on %s failed: %s", container_name, exc)
        return []
