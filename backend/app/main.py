"""
ManyMinds FastAPI application entrypoint.

Boots with sensible defaults so `uvicorn app.main:app` works even with no .env.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.core.database import close_pool, create_pool, get_client, is_available
from app.services.azure_language import get_language_client
from app.services.azure_vision import get_vision_client
from app.services.email_provider import get_email_provider
from app.services.llm import get_llm_client
from app.services.memory_graph import get_memory_graph
from app.services.voice import get_voice_client

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
)
logger = logging.getLogger("manyminds")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Connect to Cosmos DB on startup, disconnect on shutdown."""
    logger.info(
        "Starting %s (env=%s, mode=%s)",
        settings.APP_NAME,
        settings.APP_ENV,
        settings.mode,
    )
    await create_pool()
    if not is_available():
        logger.warning(
            "Running in STUB mode — no Cosmos DB, all routes return mocks/in-memory data"
        )
    else:
        logger.info(
            "Cosmos DB connected (database=%s)", settings.COSMOS_DATABASE_NAME
        )

    # Probe LLM availability (lazy init).
    if get_llm_client().available:
        logger.info(
            "Azure OpenAI available (deployment=%s, api-version=%s)",
            settings.AZURE_OPENAI_DEPLOYMENT,
            settings.AZURE_OPENAI_API_VERSION,
        )
    else:
        logger.info("Azure OpenAI not configured — using canned stub responses")

    # Vision (Image Analysis 4.0)
    if get_vision_client().available:
        logger.info("Azure Vision available (endpoint=%s)", settings.AZURE_VISION_ENDPOINT)
    else:
        logger.info("Azure Vision not configured — image messages skipped")

    # Language (Text Analytics) + Translator
    if get_language_client().available:
        logger.info(
            "Azure Language available (endpoint=%s)", settings.AZURE_LANGUAGE_ENDPOINT
        )
    else:
        logger.info(
            "Azure Language not configured — language detect / sentiment disabled"
        )
    if settings.has_translator:
        logger.info(
            "Azure Translator configured (region=%s)", settings.AZURE_TRANSLATOR_REGION
        )

    # Neo4j memory graph — connects in-place; gracefully no-ops without NEO4J_URI.
    await get_memory_graph().connect()
    if get_memory_graph().available:
        logger.info("Memory graph live on Neo4j (uri=%s)", settings.NEO4J_URI)
    else:
        logger.info("Memory graph in fallback mode (NEO4J_URI not set or unreachable)")

    # ElevenLabs voice — lazy probe.
    if get_voice_client().available:
        logger.info("ElevenLabs voice available (model=%s)", settings.ELEVENLABS_MODEL)
    else:
        logger.info("ElevenLabs voice not configured — voice toggle stays UI-only")

    # Email provider — picked from env (SendGrid → SMTP → Console fallback).
    provider = get_email_provider()
    logger.info("Email provider: %s", provider.name)
    try:
        yield
    finally:
        logger.info("Shutting down %s", settings.APP_NAME)
        await get_memory_graph().close()
        await close_pool()


app = FastAPI(
    title="ManyMinds API",
    description=(
        "Backend for ManyMinds — a personalised Council of five AI friends "
        "(Aria, Rex, Sage, Nova, Echo) who chat, debate, play games, and "
        "remember together. Backed by Azure Cosmos DB + Azure OpenAI + "
        "ElevenLabs + Neo4j. Works in 'stub mode' when keys are missing so "
        "the entire surface is demoable without secrets."
    ),
    version="0.1.0",
    lifespan=lifespan,
)


# CORS — allow frontend origin + localhost dev.
_origins = list({settings.FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"})
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", tags=["meta"])
async def healthz() -> dict[str, object]:
    """Health-check endpoint."""
    db_ok = False
    if is_available():
        # A cheap probe: list databases is a single RU and confirms the client
        # can talk to the account.
        try:
            client = get_client()
            if client is not None:
                _ = client.get_database_client(settings.COSMOS_DATABASE_NAME)
                db_ok = True
        except Exception as exc:  # noqa: BLE001
            logger.warning("Cosmos health check failed: %s", exc)
            db_ok = False
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": app.version,
        "env": settings.APP_ENV,
        "db": db_ok,
        "llm": get_llm_client().available,
        "vision": get_vision_client().available,
        "language": get_language_client().available,
        "translator": settings.has_translator,
        "memory_graph": get_memory_graph().available,
        "voice": get_voice_client().available,
        "email": get_email_provider().name,
        "mode": "live" if db_ok else "stub",
    }


@app.get("/", tags=["meta"])
async def root() -> dict[str, str]:
    return {
        "service": settings.APP_NAME,
        "docs": "/docs",
        "health": "/healthz",
        "api": "/api/v1",
    }


app.include_router(api_router)
