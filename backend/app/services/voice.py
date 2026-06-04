"""
ElevenLabs voice synthesis with graceful no-key fallback.

Required env vars (all optional — without ELEVENLABS_API_KEY the voice
endpoint returns 503 and the frontend silently skips audio playback):

    ELEVENLABS_API_KEY            secret key from ElevenLabs dashboard
    ELEVENLABS_MODEL              default: eleven_turbo_v2_5
    ELEVENLABS_OUTPUT_FORMAT      default: mp3_44100_128

    ELEVENLABS_VOICE_ARIA   per-member voice id. Defaults point at public
    ELEVENLABS_VOICE_REX    ElevenLabs voices that match each council member's
    ELEVENLABS_VOICE_SAGE   personality. Override to use cloned/branded voices.
    ELEVENLABS_VOICE_NOVA
    ELEVENLABS_VOICE_ECHO

The HTTP call is implemented against the public ElevenLabs REST API
(https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream). We use
`httpx` (already in requirements.txt) rather than the elevenlabs SDK to keep
the dependency surface small and to control timeouts precisely.
"""
from __future__ import annotations

import logging
from typing import AsyncIterator

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

API_BASE = "https://api.elevenlabs.io/v1"


def _voice_for(slug: str) -> str:
    mapping = {
        "aria": settings.ELEVENLABS_VOICE_ARIA,
        "rex": settings.ELEVENLABS_VOICE_REX,
        "sage": settings.ELEVENLABS_VOICE_SAGE,
        "nova": settings.ELEVENLABS_VOICE_NOVA,
        "echo": settings.ELEVENLABS_VOICE_ECHO,
    }
    return mapping.get(slug, settings.ELEVENLABS_VOICE_SAGE)


def _voice_settings_for(slug: str) -> dict[str, float]:
    """Member-flavoured voice settings — stability/similarity/style/use_speaker_boost.

    These are tuned so each member's voice profile *feels* like their persona:
      - Aria   : precise + warm — high stability, low style.
      - Rex    : punchy        — lower stability, more style.
      - Sage   : calm          — high stability + similarity.
      - Nova   : expressive    — low stability, high style.
      - Echo   : warm + steady — balanced.
    """
    presets = {
        "aria": {"stability": 0.70, "similarity_boost": 0.75, "style": 0.20, "use_speaker_boost": True},
        "rex":  {"stability": 0.40, "similarity_boost": 0.75, "style": 0.55, "use_speaker_boost": True},
        "sage": {"stability": 0.80, "similarity_boost": 0.80, "style": 0.15, "use_speaker_boost": True},
        "nova": {"stability": 0.35, "similarity_boost": 0.70, "style": 0.65, "use_speaker_boost": True},
        "echo": {"stability": 0.65, "similarity_boost": 0.78, "style": 0.30, "use_speaker_boost": True},
    }
    return presets.get(slug, {"stability": 0.6, "similarity_boost": 0.75, "style": 0.3, "use_speaker_boost": True})


class VoiceClient:
    """Thin async wrapper around the ElevenLabs TTS endpoint."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None
        self._available: bool = False
        self._init_attempted: bool = False

    def _try_init(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True
        if not settings.ELEVENLABS_API_KEY:
            logger.info("ELEVENLABS_API_KEY not set — voice synthesis disabled")
            return
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=8.0),
            headers={
                "xi-api-key": settings.ELEVENLABS_API_KEY,
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
            },
        )
        self._available = True
        logger.info(
            "ElevenLabs client initialised (model=%s, fmt=%s)",
            settings.ELEVENLABS_MODEL,
            settings.ELEVENLABS_OUTPUT_FORMAT,
        )

    @property
    def available(self) -> bool:
        self._try_init()
        return self._available

    async def close(self) -> None:
        if self._client is not None:
            try:
                await self._client.aclose()
            except Exception as exc:  # noqa: BLE001
                logger.warning("ElevenLabs close failed: %s", exc)
        self._client = None

    async def synthesize_stream(
        self,
        *,
        text: str,
        member_slug: str,
    ) -> AsyncIterator[bytes]:
        """Stream mp3 bytes for the given text in the council member's voice.

        Raises VoiceUnavailable when the API key is missing or the upstream
        call fails. The HTTP layer above converts that into a 503 to the
        frontend so the UI can fall back to text-only.
        """
        self._try_init()
        if not self._available or self._client is None:
            raise VoiceUnavailable("ELEVENLABS_API_KEY not configured")

        voice_id = _voice_for(member_slug)
        url = f"{API_BASE}/text-to-speech/{voice_id}/stream"
        params = {"output_format": settings.ELEVENLABS_OUTPUT_FORMAT}
        body = {
            "text": text,
            "model_id": settings.ELEVENLABS_MODEL,
            "voice_settings": _voice_settings_for(member_slug),
        }
        try:
            async with self._client.stream(
                "POST", url, params=params, json=body
            ) as response:
                if response.status_code >= 400:
                    # Read the (short) error body to surface a real diagnostic.
                    err = await response.aread()
                    logger.warning(
                        "ElevenLabs error %s: %s",
                        response.status_code,
                        err[:200].decode("utf-8", "replace"),
                    )
                    raise VoiceUnavailable(
                        f"ElevenLabs returned {response.status_code}"
                    )
                async for chunk in response.aiter_bytes():
                    if chunk:
                        yield chunk
        except VoiceUnavailable:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("ElevenLabs request failed: %s", exc)
            raise VoiceUnavailable(str(exc)) from exc


class VoiceUnavailable(RuntimeError):
    """Raised when synthesis can't run (missing key, upstream error, etc.)."""


# ---------------------------------------------------------------------------
# Singleton accessor
# ---------------------------------------------------------------------------

_client: VoiceClient | None = None


def get_voice_client() -> VoiceClient:
    global _client
    if _client is None:
        _client = VoiceClient()
    return _client


__all__ = [
    "VoiceClient",
    "VoiceUnavailable",
    "get_voice_client",
]
