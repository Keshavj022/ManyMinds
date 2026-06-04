"""
Thin Azure AI Vision (Image Analysis 4.0) client wrapper with graceful fallback.

Design rules (mirrors `services/llm.py`):
- `azure.ai.vision.imageanalysis` is imported lazily — if it isn't installed
  or `settings.has_vision` is False, the client stays in stub mode and never
  raises on the request path.
- Every public method returns the same empty-shape dict when the live client
  is unavailable, so callers (chat, council reactions) can treat the response
  uniformly without branching on availability.
- The underlying SDK is synchronous; we hop off the event loop via
  `asyncio.to_thread` for the actual REST call.

The response shape is intentionally compact:
    {
        "description": str,        # primary caption
        "tags": list[str],         # noun-ish content tags
        "objects": list[str],      # detected object labels
        "categories": list[str],   # high-level categories (Vision 4.0 returns
                                   # these inside CAPTION metadata; kept as a
                                   # placeholder list for forward-compat)
        "read_text": list[str],    # OCR lines via the READ feature
    }
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


EMPTY_RESULT: dict[str, Any] = {
    "description": "",
    "tags": [],
    "objects": [],
    "categories": [],
    "read_text": [],
}


class AzureVisionClient:
    """Wrapper around the Azure AI Vision Image Analysis SDK with stub fallback.

    Methods always return a dict of the shape documented at module level;
    failures are swallowed and logged so callers can keep a uniform contract.
    """

    def __init__(self) -> None:
        self._client: Any | None = None
        self._visual_features: Any | None = None
        self._available: bool = False
        self._init_attempted: bool = False

    # ------------------------------------------------------------------ init
    def _try_init(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True

        if not settings.has_vision:
            logger.info(
                "AZURE_VISION_KEY / AZURE_VISION_ENDPOINT not set — vision disabled"
            )
            return

        try:
            from azure.ai.vision.imageanalysis import ImageAnalysisClient  # type: ignore
            from azure.ai.vision.imageanalysis.models import VisualFeatures  # type: ignore
            from azure.core.credentials import AzureKeyCredential  # type: ignore

            self._client = ImageAnalysisClient(
                endpoint=settings.AZURE_VISION_ENDPOINT,
                credential=AzureKeyCredential(settings.AZURE_VISION_KEY or ""),
            )
            self._visual_features = [
                VisualFeatures.CAPTION,
                VisualFeatures.TAGS,
                VisualFeatures.OBJECTS,
                VisualFeatures.READ,
            ]
            self._available = True
            logger.info(
                "Azure Vision client initialised (endpoint=%s)",
                settings.AZURE_VISION_ENDPOINT,
            )
        except ImportError:
            logger.warning(
                "azure-ai-vision-imageanalysis package not installed — vision disabled"
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to init Azure Vision client: %s — vision disabled", exc
            )

    @property
    def available(self) -> bool:
        self._try_init()
        return self._available

    # ----------------------------------------------------------------- core
    @staticmethod
    def _empty() -> dict[str, Any]:
        # Return a fresh copy so callers can mutate without side-effects.
        return {
            "description": "",
            "tags": [],
            "objects": [],
            "categories": [],
            "read_text": [],
        }

    @staticmethod
    def _normalise(result: Any) -> dict[str, Any]:
        """Map the SDK result object onto our compact dict shape."""
        out = AzureVisionClient._empty()
        if result is None:
            return out

        # Caption
        caption = getattr(result, "caption", None)
        if caption is not None:
            text = getattr(caption, "text", "") or ""
            out["description"] = text.strip()

        # Tags
        tags_result = getattr(result, "tags", None)
        if tags_result is not None:
            tag_list = getattr(tags_result, "list", None) or []
            out["tags"] = [
                (getattr(t, "name", "") or "").strip()
                for t in tag_list
                if getattr(t, "name", None)
            ]

        # Objects
        objects_result = getattr(result, "objects", None)
        if objects_result is not None:
            obj_list = getattr(objects_result, "list", None) or []
            names: list[str] = []
            for obj in obj_list:
                # Each object has a list of (tag) candidates.
                tags = getattr(obj, "tags", None) or []
                if tags:
                    name = getattr(tags[0], "name", "") or ""
                else:
                    name = getattr(obj, "name", "") or ""
                if name:
                    names.append(name.strip())
            out["objects"] = names

        # Categories — Vision 4.0 doesn't return a top-level categories block
        # the way 3.x did; if the SDK ever surfaces one we forward it, else
        # leave it as an empty list for shape stability.
        cats = getattr(result, "categories", None)
        if cats:
            try:
                out["categories"] = [
                    (getattr(c, "name", "") or "").strip()
                    for c in cats
                    if getattr(c, "name", None)
                ]
            except Exception:  # noqa: BLE001
                out["categories"] = []

        # OCR (READ)
        read_result = getattr(result, "read", None)
        if read_result is not None:
            lines: list[str] = []
            blocks = getattr(read_result, "blocks", None) or []
            for block in blocks:
                for line in getattr(block, "lines", None) or []:
                    text = getattr(line, "text", "") or ""
                    if text:
                        lines.append(text.strip())
            out["read_text"] = lines

        return out

    # --------------------------------------------------------------- public
    async def analyze_image_url(self, image_url: str) -> dict[str, Any]:
        """Analyse an image referenced by URL. Always returns the shape above."""
        self._try_init()
        if not self._available or self._client is None:
            return self._empty()

        try:
            result = await asyncio.to_thread(
                self._client.analyze_from_url,
                image_url=image_url,
                visual_features=self._visual_features,
            )
            return self._normalise(result)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Azure Vision analyze_from_url failed: %s", exc)
            return self._empty()

    async def analyze_image_bytes(self, image_bytes: bytes) -> dict[str, Any]:
        """Analyse an in-memory image. Always returns the shape above."""
        self._try_init()
        if not self._available or self._client is None:
            return self._empty()

        try:
            result = await asyncio.to_thread(
                self._client.analyze,
                image_data=image_bytes,
                visual_features=self._visual_features,
            )
            return self._normalise(result)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Azure Vision analyze (bytes) failed: %s", exc)
            return self._empty()

    async def describe_image(
        self,
        image_url: str | None = None,
        image_bytes: bytes | None = None,
    ) -> str:
        """Caption-only convenience. Returns "" when unavailable or on failure."""
        if image_url:
            result = await self.analyze_image_url(image_url)
        elif image_bytes is not None:
            result = await self.analyze_image_bytes(image_bytes)
        else:
            return ""
        return result.get("description", "") or ""


# Module-level singleton
_client: AzureVisionClient | None = None


def get_vision_client() -> AzureVisionClient:
    global _client
    if _client is None:
        _client = AzureVisionClient()
    return _client


__all__ = [
    "AzureVisionClient",
    "get_vision_client",
]
