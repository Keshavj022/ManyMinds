"""
Thin Azure OpenAI client wrapper with graceful fallback to stub mode.

Design rules:
- `openai` is loaded lazily — if it's not installed or Azure creds are absent
  the client stays in stub mode and never raises on the request path.
- Public surface is intentionally minimal: one async `generate()` plus three
  flavoured helpers (`generate_chat_reply`, `generate_debate_argument`,
  `generate_commentary`, `generate_member_greeting`). Callers shouldn't have
  to know whether the reply came from Azure OpenAI or a canned stub.
- The prompt builders in `services/personalities/prompts.py` produce a single
  composed instruction string. We map that to the Azure Chat Completions API
  as: system = composed prompt, user = the actual current input (or a short
  "Reply now." kickoff when there isn't a discrete user turn — e.g. debate).

References:
- The contract here is inspired by the multi-helper service in
  github-repo/ManyMinds/backend/app/services/azure_openai.py — it adds a
  `generate_member_greeting` parallel and consolidates response handling.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.core.config import settings
from app.services.stubs import (
    classify_intent,
    stub_chat_reply,
    stub_commentary,
    stub_debate_argument,
    stub_for_intent,
)

logger = logging.getLogger(__name__)


# Chat completions accept arbitrary message lists; we keep the type loose.
Message = dict[str, str]


class AzureOpenAIClient:
    """Wrapper around the Azure OpenAI SDK with a stub fallback.

    Methods always return a string; failures are swallowed and logged so the
    rest of the app can keep its uniform "string in, string out" contract.
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

        if not (settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_ENDPOINT):
            logger.info(
                "AZURE_OPENAI_API_KEY / AZURE_OPENAI_ENDPOINT not set — using stub responses"
            )
            return

        try:
            from openai import AzureOpenAI  # type: ignore

            self._client = AzureOpenAI(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
            )
            self._available = True
            logger.info(
                "Azure OpenAI client initialised (deployment=%s, api-version=%s)",
                settings.AZURE_OPENAI_DEPLOYMENT,
                settings.AZURE_OPENAI_API_VERSION,
            )
        except ImportError:
            logger.warning("openai package not installed — using stubs")
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to init Azure OpenAI client: %s — falling back to stubs", exc
            )

    @property
    def available(self) -> bool:
        self._try_init()
        return self._available

    # ----------------------------------------------------------------- core
    async def _chat(
        self,
        messages: list[Message],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Single Azure chat completion call. Returns text or "" on failure."""
        if not self._available or self._client is None:
            return ""

        try:
            # The openai SDK is sync for Azure; run it off the event loop.
            response = await asyncio.to_thread(
                self._client.chat.completions.create,
                model=settings.AZURE_OPENAI_DEPLOYMENT,
                messages=messages,
                temperature=(
                    temperature
                    if temperature is not None
                    else settings.AZURE_OPENAI_TEMPERATURE
                ),
                max_tokens=(
                    max_tokens
                    if max_tokens is not None
                    else settings.AZURE_OPENAI_MAX_OUTPUT_TOKENS
                ),
            )
            choice = response.choices[0] if response and response.choices else None
            content = getattr(getattr(choice, "message", None), "content", "") or ""
            return content.strip()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Azure OpenAI call failed: %s", exc)
            return ""

    async def generate(
        self,
        prompt: str,
        *,
        user_message: str | None = None,
        fallback_member_id: str = "aria",
        fallback_intent_message: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Generate a single text reply. Always returns a non-empty string.

        Args:
            prompt: the full composed system instruction (from prompts.py).
            user_message: the literal user turn that triggered this reply.
                For chat this is the user's message; for debate/commentary it
                doesn't really exist, so we fall back to a "Reply now." nudge.
        """
        self._try_init()
        if not self._available:
            return stub_chat_reply(
                fallback_member_id, fallback_intent_message or ""
            )

        messages: list[Message] = [
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": (user_message or "").strip() or "Reply now.",
            },
        ]
        text = await self._chat(
            messages, temperature=temperature, max_tokens=max_tokens
        )
        if not text:
            logger.warning("Empty Azure response — falling back to stub")
            return stub_chat_reply(
                fallback_member_id, fallback_intent_message or ""
            )
        return text


# Module-level singleton
_client: AzureOpenAIClient | None = None


def get_llm_client() -> AzureOpenAIClient:
    global _client
    if _client is None:
        _client = AzureOpenAIClient()
    return _client


# ---------------------------------------------------------------------------
# High-level helpers — the only things the rest of the app should import.
# ---------------------------------------------------------------------------
async def generate_chat_reply(
    prompt: str,
    *,
    member_id: str,
    user_message: str,
) -> str:
    """Used by the chat router."""
    client = get_llm_client()
    return await client.generate(
        prompt,
        user_message=user_message,
        fallback_member_id=member_id,
        fallback_intent_message=user_message,
    )


async def generate_debate_argument(
    prompt: str,
    *,
    member_id: str,
    side: str,
    topic: str,
    round_number: int,
) -> str:
    client = get_llm_client()
    if client.available:
        # Debate prompts are entirely self-contained — there's no "user
        # message" turn. We pass the topic as the kickoff and bump
        # temperature slightly for more rhetorical variety.
        text = await client.generate(
            prompt,
            user_message=f"Deliver your round-{round_number} {side} argument now.",
            fallback_member_id=member_id,
            fallback_intent_message=topic,
            temperature=min(1.0, settings.AZURE_OPENAI_TEMPERATURE + 0.05),
        )
        if text:
            return text
    return stub_debate_argument(member_id, side, topic, round_number)


async def generate_commentary(
    prompt: str,
    *,
    member_id: str,
    move_summary: str,
) -> str:
    client = get_llm_client()
    if client.available:
        text = await client.generate(
            prompt,
            user_message=move_summary,
            fallback_member_id=member_id,
            fallback_intent_message=move_summary,
            max_tokens=160,
        )
        if text:
            return text
    return stub_commentary(member_id, move_summary)


async def generate_member_greeting(
    *,
    member_id: str,
    member_name: str,
    persona_portrait: str,
    preferred_language: str = "en",
) -> str:
    """A brief, in-voice greeting for the first connect.

    Mirrors the helper from the reference repo but routes through the same
    stub layer so behaviour is uniform when Azure is offline.
    """
    client = get_llm_client()
    if not client.available:
        return stub_for_intent(member_id, "greeting", member_name)

    language_clause = ""
    if preferred_language and preferred_language.lower() not in {"en", "english"}:
        names = {
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese",
            "ja": "Japanese",
            "ko": "Korean",
            "zh": "Chinese",
            "hi": "Hindi",
            "ar": "Arabic",
            "ru": "Russian",
        }
        lang_label = names.get(preferred_language[:2].lower(), preferred_language)
        language_clause = (
            f"\n\nIMPORTANT: Greet ONLY in {lang_label} ({preferred_language})."
        )
    else:
        language_clause = "\n\nIMPORTANT: Greet in English."

    system = (
        f"You ARE {member_name}. {persona_portrait}\n"
        "Write a single 1–2 sentence greeting in your own voice. "
        "Do NOT ask a question, do NOT introduce yourself by name, do NOT use "
        "generic AI phrasing. Keep it short, warm, and clearly in character."
        f"{language_clause}"
    )

    text = await client._chat(  # noqa: SLF001 — internal use, intentional
        [
            {"role": "system", "content": system},
            {"role": "user", "content": "Greet the user who just joined."},
        ],
        temperature=0.9,
        max_tokens=100,
    )
    return text or stub_for_intent(member_id, "greeting", member_name)


__all__ = [
    "AzureOpenAIClient",
    "get_llm_client",
    "generate_chat_reply",
    "generate_debate_argument",
    "generate_commentary",
    "generate_member_greeting",
    "classify_intent",
]
