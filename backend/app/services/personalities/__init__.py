"""
Council member personality system.

Exports:
- COUNCIL_PERSONAS: dict[str, Persona] — the 5 canonical members
- get_persona(slug_or_id): persona lookup
- build_chat_prompt(...): the chat-reply system prompt builder (Azure OpenAI)
- build_debate_prompt(...): the debate-argument prompt builder
- build_commentary_prompt(...): the game-commentary prompt builder

Orchestration (which members reply) lives in app.services.orchestration.
"""
from app.services.personalities.personas import (
    COUNCIL_PERSONAS,
    COUNCIL_ORDER,
    Persona,
    get_persona,
)
from app.services.personalities.prompts import (
    build_chat_prompt,
    build_debate_prompt,
    build_commentary_prompt,
)

__all__ = [
    "COUNCIL_PERSONAS",
    "COUNCIL_ORDER",
    "Persona",
    "get_persona",
    "build_chat_prompt",
    "build_debate_prompt",
    "build_commentary_prompt",
]
