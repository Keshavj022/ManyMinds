"""
Thin Azure AI Language (Text Analytics) + Azure Translator client wrapper.

Design rules (mirrors `services/llm.py`):
- `azure.ai.textanalytics` is imported lazily — if it isn't installed or
  `settings.has_language` is False, language-detection / sentiment stay in
  safe-default mode and never raise on the request path.
- Translation is a SEPARATE Azure resource (Translator) and is guarded by
  `settings.has_translator` independently. We call it over httpx (already in
  requirements) rather than pulling in another SDK.
- Every public method returns a fixed-shape dict; callers get a uniform
  contract whether or not Azure is reachable.

Safe defaults when unavailable:
    detect_language   -> {"iso6391": "en", "name": "English", "confidence": 0.0}
    analyze_sentiment -> {"sentiment": "neutral",
                          "scores": {"positive": 0.0, "neutral": 1.0, "negative": 0.0}}
    translate         -> passthrough (translated_text == original_text)
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


# Sentinel safe-default shapes — kept as constants so tests can import them.
DEFAULT_LANGUAGE: dict[str, Any] = {
    "iso6391": "en",
    "name": "English",
    "confidence": 0.0,
}
DEFAULT_SENTIMENT: dict[str, Any] = {
    "sentiment": "neutral",
    "scores": {"positive": 0.0, "neutral": 1.0, "negative": 0.0},
}

_VALID_SENTIMENTS = {"positive", "neutral", "negative", "mixed"}


class AzureLanguageClient:
    """Wrapper around Azure Text Analytics + Translator with safe fallbacks.

    Methods always return a dict of the documented shape; failures are
    swallowed and logged so callers can stay branch-free.
    """

    def __init__(self) -> None:
        self._client: Any | None = None
        self._available: bool = False
        self._init_attempted: bool = False

    # ------------------------------------------------------------------ init
    def _try_init(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True

        if not settings.has_language:
            logger.info(
                "AZURE_LANGUAGE_KEY / AZURE_LANGUAGE_ENDPOINT not set — language disabled"
            )
            return

        try:
            from azure.ai.textanalytics import TextAnalyticsClient  # type: ignore
            from azure.core.credentials import AzureKeyCredential  # type: ignore

            self._client = TextAnalyticsClient(
                endpoint=settings.AZURE_LANGUAGE_ENDPOINT,
                credential=AzureKeyCredential(settings.AZURE_LANGUAGE_KEY or ""),
            )
            self._available = True
            logger.info(
                "Azure Language client initialised (endpoint=%s)",
                settings.AZURE_LANGUAGE_ENDPOINT,
            )
        except ImportError:
            logger.warning(
                "azure-ai-textanalytics package not installed — language disabled"
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to init Azure Language client: %s — language disabled", exc
            )

    @property
    def available(self) -> bool:
        self._try_init()
        return self._available

    @property
    def translator_available(self) -> bool:
        return settings.has_translator

    # ----------------------------------------------------------------- core
    @staticmethod
    def _default_language() -> dict[str, Any]:
        return {
            "iso6391": DEFAULT_LANGUAGE["iso6391"],
            "name": DEFAULT_LANGUAGE["name"],
            "confidence": DEFAULT_LANGUAGE["confidence"],
        }

    @staticmethod
    def _default_sentiment() -> dict[str, Any]:
        return {
            "sentiment": DEFAULT_SENTIMENT["sentiment"],
            "scores": dict(DEFAULT_SENTIMENT["scores"]),
        }

    @staticmethod
    def _passthrough_translation(
        text: str,
        target_language: str,
        source_language: str | None,
    ) -> dict[str, Any]:
        return {
            "original_text": text,
            "translated_text": text,
            "source_language": source_language or "",
            "target_language": target_language,
        }

    # --------------------------------------------------------------- public
    async def detect_language(self, text: str) -> dict[str, Any]:
        """Detect the dominant language of `text`. Safe-default on failure."""
        self._try_init()
        if not text or not text.strip():
            return self._default_language()
        if not self._available or self._client is None:
            return self._default_language()

        try:
            response = await asyncio.to_thread(
                self._client.detect_language,
                documents=[text],
            )
            if not response:
                return self._default_language()
            doc = response[0]
            if getattr(doc, "is_error", False):
                logger.warning(
                    "Azure Language detect_language returned error: %s",
                    getattr(doc, "error", None),
                )
                return self._default_language()
            primary = getattr(doc, "primary_language", None)
            if primary is None:
                return self._default_language()
            return {
                "iso6391": (getattr(primary, "iso6391_name", "") or "en"),
                "name": (getattr(primary, "name", "") or "English"),
                "confidence": float(
                    getattr(primary, "confidence_score", 0.0) or 0.0
                ),
            }
        except Exception as exc:  # noqa: BLE001
            logger.warning("Azure Language detect_language failed: %s", exc)
            return self._default_language()

    async def analyze_sentiment(self, text: str) -> dict[str, Any]:
        """Analyse sentiment of `text`. Safe-default on failure."""
        self._try_init()
        if not text or not text.strip():
            return self._default_sentiment()
        if not self._available or self._client is None:
            return self._default_sentiment()

        try:
            response = await asyncio.to_thread(
                self._client.analyze_sentiment,
                documents=[text],
            )
            if not response:
                return self._default_sentiment()
            doc = response[0]
            if getattr(doc, "is_error", False):
                logger.warning(
                    "Azure Language analyze_sentiment returned error: %s",
                    getattr(doc, "error", None),
                )
                return self._default_sentiment()

            sentiment = (getattr(doc, "sentiment", "neutral") or "neutral").lower()
            if sentiment not in _VALID_SENTIMENTS:
                sentiment = "neutral"

            scores_obj = getattr(doc, "confidence_scores", None)
            if scores_obj is None:
                scores = dict(DEFAULT_SENTIMENT["scores"])
            else:
                scores = {
                    "positive": float(getattr(scores_obj, "positive", 0.0) or 0.0),
                    "neutral": float(getattr(scores_obj, "neutral", 0.0) or 0.0),
                    "negative": float(getattr(scores_obj, "negative", 0.0) or 0.0),
                }
            return {"sentiment": sentiment, "scores": scores}
        except Exception as exc:  # noqa: BLE001
            logger.warning("Azure Language analyze_sentiment failed: %s", exc)
            return self._default_sentiment()

    async def translate(
        self,
        text: str,
        target_language: str,
        source_language: str | None = None,
    ) -> dict[str, Any]:
        """Translate `text` via Azure Translator REST. Passthrough on failure.

        Translator is a different Azure resource from Language Studio, so we
        gate this on `settings.has_translator` independently and call its
        public REST API directly with httpx (already in requirements).
        """
        if not text or not text.strip() or not target_language:
            return self._passthrough_translation(
                text, target_language, source_language
            )
        if not settings.has_translator:
            return self._passthrough_translation(
                text, target_language, source_language
            )

        endpoint = (settings.AZURE_TRANSLATOR_ENDPOINT or "").rstrip("/")
        if not endpoint:
            return self._passthrough_translation(
                text, target_language, source_language
            )

        url = f"{endpoint}/translate"
        params: dict[str, Any] = {
            "api-version": "3.0",
            "to": target_language,
        }
        if source_language:
            params["from"] = source_language

        headers = {
            "Ocp-Apim-Subscription-Key": settings.AZURE_TRANSLATOR_KEY or "",
            "Ocp-Apim-Subscription-Region": settings.AZURE_TRANSLATOR_REGION or "",
            "Content-Type": "application/json",
        }
        body = [{"text": text}]

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    url, params=params, headers=headers, json=body
                )
                response.raise_for_status()
                data = response.json()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Azure Translator call failed: %s", exc)
            return self._passthrough_translation(
                text, target_language, source_language
            )

        if not isinstance(data, list) or not data:
            return self._passthrough_translation(
                text, target_language, source_language
            )

        first = data[0] or {}
        translations = first.get("translations") or []
        if not translations:
            return self._passthrough_translation(
                text, target_language, source_language
            )

        translated_text = (translations[0].get("text") or "").strip()
        # Translator echoes detected language back when `from` was omitted.
        detected_block = first.get("detectedLanguage") or {}
        detected_source = detected_block.get("language") or source_language or ""

        return {
            "original_text": text,
            "translated_text": translated_text or text,
            "source_language": detected_source,
            "target_language": target_language,
        }


# Module-level singleton
_client: AzureLanguageClient | None = None


def get_language_client() -> AzureLanguageClient:
    global _client
    if _client is None:
        _client = AzureLanguageClient()
    return _client


__all__ = [
    "AzureLanguageClient",
    "get_language_client",
    "DEFAULT_LANGUAGE",
    "DEFAULT_SENTIMENT",
]
