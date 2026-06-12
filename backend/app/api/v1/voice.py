"""
Voice synthesis router.

Endpoint:
    POST /api/v1/voice/{member_slug}/speak
        Body: { "text": "..." }
        Response: audio/mpeg streamed mp3 from ElevenLabs.

If ELEVENLABS_API_KEY is unset, this returns 503 with a clear message and the
frontend silently falls back to text-only (the voice toggle still works as a
UI state).

The endpoint is auth-gated — anonymous callers can't run up an ElevenLabs bill.
"""
from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Path, status
from fastapi.responses import StreamingResponse
from pydantic import Field

from app.schemas.common import APIModel
from app.services.security import get_current_user
from app.services.voice import VoiceUnavailable, get_voice_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice", tags=["voice"])

MemberSlug = Literal["aria", "rex", "sage", "nova", "echo"]


class SpeakRequest(APIModel):
    text: str = Field(min_length=1, max_length=2500)


@router.post(
    "/{member_slug}/speak",
    responses={
        200: {"content": {"audio/mpeg": {}}, "description": "Streamed mp3 audio"},
        503: {"description": "Voice not configured / upstream error"},
    },
)
async def speak(
    body: SpeakRequest,
    member_slug: MemberSlug = Path(...),
    _user: dict[str, Any] = Depends(get_current_user),
) -> StreamingResponse:
    voice = get_voice_client()
    if not voice.available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice synthesis is not configured on this server",
        )

    # Pull the FIRST chunk before we commit to a 200 response. ElevenLabs
    # surfaces auth/quota errors (e.g. 401 "free tier disabled", 429) on the
    # very first read — if we streamed blindly we'd send a 200 with an empty
    # body and the browser would just play silence with no way to know it
    # failed. Probing here lets us return an honest 503 so the UI can show the
    # "voices are taking a break" fallback.
    agen = voice.synthesize_stream(text=body.text, member_slug=member_slug)
    try:
        first_chunk = await agen.__anext__()
    except StopAsyncIteration:
        first_chunk = b""
    except VoiceUnavailable as exc:
        await agen.aclose()
        logger.warning("Voice synthesis unavailable for %s: %s", member_slug, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice synthesis is temporarily unavailable",
        ) from exc

    async def stream() -> Any:
        try:
            if first_chunk:
                yield first_chunk
            async for chunk in agen:
                yield chunk
        except VoiceUnavailable as exc:
            # Stream already started — we can't change status code mid-stream;
            # log and end cleanly. The frontend treats truncated audio as a
            # synthesis failure.
            logger.warning("Voice stream aborted: %s", exc)
        finally:
            await agen.aclose()

    return StreamingResponse(
        stream(),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-store",
            "X-Voice-Member": member_slug,
        },
    )


@router.get("/status")
async def voice_status(_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Tiny helper for the frontend to know whether to show the voice toggle as live."""
    voice = get_voice_client()
    return {"available": voice.available}
