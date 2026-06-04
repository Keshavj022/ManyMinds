"""
Application configuration via pydantic-settings.

The app is designed to boot even when secrets/integrations are missing:
- COSMOS_*: optional. If unset, endpoints serve mock data ("stub mode").
- AZURE_OPENAI_*: optional. If unset, LLM responses come from canned stubs.
- AZURE_VISION_*, AZURE_LANGUAGE_*, AZURE_TRANSLATOR_*: optional. Each guards
  its own service; missing creds simply disable that feature.
- ELEVENLABS_*: optional. Voice TTS/STT disabled when missing.
- NEO4J_*: optional. Memory graph endpoints return deterministic fake data.

Sensible defaults are provided so `uvicorn app.main:app` works with no .env.
"""
from __future__ import annotations

import secrets

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    # ---- Application
    APP_NAME: str = "ManyMinds"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    # ---- Database — Azure Cosmos DB (NoSQL API). Optional in dev.
    # When endpoint+key are missing the whole app falls into "stub mode":
    # every service writes to in-memory dicts so the frontend still works.
    # Endpoint format: https://<account>.documents.azure.com:443/
    COSMOS_ENDPOINT: str | None = None
    COSMOS_KEY: str | None = None
    COSMOS_DATABASE_NAME: str = "manyminds"
    # When True, the lifespan boot will create any missing containers
    # (with the partition keys defined in app/core/database.py). Set False
    # in production after the IaC step has provisioned them.
    COSMOS_BOOTSTRAP_CONTAINERS: bool = True
    # Default RU/s for any container created at bootstrap. Cosmos shared
    # throughput at the DB level is cheaper for small workloads — set this
    # to 0 to disable per-container throughput and use the DB-level pool.
    COSMOS_DEFAULT_RU: int = 400

    # ---- JWT auth
    # Default generated per-process; set JWT_SECRET in env for stable tokens.
    JWT_SECRET: str = secrets.token_urlsafe(48)
    JWT_ALGO: str = "HS256"
    JWT_ACCESS_TTL_MIN: int = 30
    JWT_REFRESH_TTL_DAYS: int = 30

    # ---- LLM (Azure OpenAI) — optional
    # All four AZURE_OPENAI_* values must be set for the live client to come up.
    # AZURE_OPENAI_ENDPOINT format: https://<resource>.openai.azure.com/
    # AZURE_OPENAI_DEPLOYMENT is the deployment name you configured in the
    # Azure portal (NOT the underlying model name — though they often match
    # e.g. "gpt-4o-mini").
    AZURE_OPENAI_ENDPOINT: str | None = None
    AZURE_OPENAI_API_KEY: str | None = None
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4o-mini"
    AZURE_OPENAI_API_VERSION: str = "2024-02-15-preview"
    AZURE_OPENAI_TEMPERATURE: float = 0.85
    AZURE_OPENAI_MAX_OUTPUT_TOKENS: int = 512

    # ---- Azure Computer Vision (Image Analysis 4.0) — optional
    # Enables describe_image / analyze_image_url so council members can
    # actually react to images the user attaches to chat messages.
    AZURE_VISION_ENDPOINT: str | None = None
    AZURE_VISION_KEY: str | None = None

    # ---- Azure AI Language (Text Analytics) — optional
    # Used for deterministic language detection (routing user input to the
    # right preferred_language) and numeric sentiment scores (fed into the
    # Neo4j memory graph as edge weights).
    AZURE_LANGUAGE_ENDPOINT: str | None = None
    AZURE_LANGUAGE_KEY: str | None = None

    # ---- Azure Translator — optional
    # Separate Azure resource from Language. Translator REST sends a
    # region header so AZURE_TRANSLATOR_REGION is required when used.
    AZURE_TRANSLATOR_ENDPOINT: str = "https://api.cognitive.microsofttranslator.com"
    AZURE_TRANSLATOR_KEY: str | None = None
    AZURE_TRANSLATOR_REGION: str | None = None

    # ---- Voice (ElevenLabs) — optional
    ELEVENLABS_API_KEY: str | None = None
    ELEVENLABS_MODEL: str = "eleven_turbo_v2_5"
    ELEVENLABS_OUTPUT_FORMAT: str = "mp3_44100_128"
    # Per-member voice IDs. Defaults point at well-known public ElevenLabs voices;
    # override any of them in env to use a specific cloned/branded voice.
    ELEVENLABS_VOICE_ARIA: str = "EXAVITQu4vr4xnSDxMaL"  # "Sarah" — clear, analytical
    ELEVENLABS_VOICE_REX: str = "VR6AewLTigWG4xSOukaG"   # "Arnold" — punchy, direct
    ELEVENLABS_VOICE_SAGE: str = "TX3LPaxmHKxFdv7VOQHJ"  # "Liam" — calm, grounded
    ELEVENLABS_VOICE_NOVA: str = "MF3mGyEYCl7XYWbV9V6O"  # "Elli" — bright, expressive
    ELEVENLABS_VOICE_ECHO: str = "AZnzlk1XvdvUeBnXmlld"  # "Domi" — warm, attentive

    # ---- Neo4j — optional
    # When NEO4J_URI is unset, the /memory/graph endpoint falls back to the
    # deterministic per-user generator so the UI keeps working.
    # Typical URIs:
    #   bolt://localhost:7687       (local docker / standalone)
    #   neo4j://localhost:7687      (single-instance with routing)
    #   neo4j+s://xxxxx.databases.neo4j.io   (Neo4j Aura — cloud)
    NEO4J_URI: str | None = None
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str | None = None
    NEO4J_DATABASE: str = "neo4j"

    # ---- Email (transactional) — optional
    # Provider auto-selected by which credentials are present:
    #   1. SENDGRID_API_KEY        → SendGrid HTTP API
    #   2. SMTP_HOST + SMTP_USER   → SMTP (Postmark / Mailgun / Gmail / Resend SMTP / etc.)
    #   3. nothing                 → Console provider (token printed to backend logs;
    #                                useful for local dev; password reset still works
    #                                end-to-end since you can copy the link from logs).
    APP_BASE_URL: str = "http://localhost:3000"  # used to build reset links

    SENDGRID_API_KEY: str | None = None

    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_STARTTLS: bool = True
    SMTP_USE_SSL: bool = False

    EMAIL_FROM: str = "ManyMinds <no-reply@manyminds.local>"
    PASSWORD_RESET_TTL_MIN: int = 30

    @property
    def has_database(self) -> bool:
        return bool(self.COSMOS_ENDPOINT and self.COSMOS_KEY)

    @property
    def has_llm(self) -> bool:
        return bool(self.AZURE_OPENAI_API_KEY and self.AZURE_OPENAI_ENDPOINT)

    @property
    def has_vision(self) -> bool:
        return bool(self.AZURE_VISION_KEY and self.AZURE_VISION_ENDPOINT)

    @property
    def has_language(self) -> bool:
        return bool(self.AZURE_LANGUAGE_KEY and self.AZURE_LANGUAGE_ENDPOINT)

    @property
    def has_translator(self) -> bool:
        return bool(self.AZURE_TRANSLATOR_KEY and self.AZURE_TRANSLATOR_REGION)

    @property
    def has_neo4j(self) -> bool:
        return bool(self.NEO4J_URI)

    @property
    def has_voice(self) -> bool:
        return bool(self.ELEVENLABS_API_KEY)

    @property
    def has_email(self) -> bool:
        return bool(self.SENDGRID_API_KEY) or bool(self.SMTP_HOST and self.SMTP_USER)

    @property
    def mode(self) -> str:
        return "live" if self.has_database else "stub"


settings = Settings()
