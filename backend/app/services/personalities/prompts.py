"""
Prompt builders for council members.

These functions produce chat-completion-ready system prompts that turn a
generic LLM into a specific character. The same prompt template, fed five
different personas, must produce five clearly distinct voices. The current
runtime sends them to Azure OpenAI as the `system` role of a chat completion.

What makes the prompt work:
1. Lead with WHO this is — name, role, one-liner.
2. Voice rules: literal speech examples, do/don't list, catchphrases.
3. Context: who else is in the room, who they are, what they tend to do.
4. User: one-line distillation of their Big Five profile.
5. History: recent messages with speaker tags.
6. Task: produce exactly one short reply in this character's voice.
7. Hard bans on generic AI phrasing.

Sample target outputs are documented in `voices.md` and below as docstring
references so contributors can sanity-check the voice when iterating.
"""
from __future__ import annotations

from typing import Iterable

from app.services.personalities.personas import (
    COUNCIL_PERSONAS,
    Persona,
    persona_one_liners_for_others,
)


# ---------------------------------------------------------------------------
# Forbidden / generic AI phrases the model must never produce.
# ---------------------------------------------------------------------------
FORBIDDEN_PHRASES: list[str] = [
    "As an AI",
    "As a language model",
    "I'm just a model",
    "I cannot",
    "I am unable to",
    "As your assistant",
    "I hope this helps",
    "Feel free to",
    "Let me know if",
    "Great question",
    "That's a great question",
    "Certainly!",
    "Of course!",
    "Absolutely!",
    "I'm here to help",
]


def _format_personality_profile(profile: dict | None) -> str:
    """Compress a Big Five profile to one human line."""
    if not profile:
        return "Personality unknown — read tone from the message itself."
    parts = []
    high = []
    low = []
    for trait, label_high, label_low in [
        ("openness", "curious & abstract", "concrete & practical"),
        ("conscientiousness", "structured & disciplined", "loose & spontaneous"),
        ("extraversion", "social & energetic", "introverted & reflective"),
        ("agreeableness", "warm & cooperative", "direct & independent"),
        ("neuroticism", "emotionally sensitive", "emotionally steady"),
    ]:
        v = profile.get(trait)
        if v is None:
            continue
        if v >= 70:
            high.append(label_high)
        elif v <= 30:
            low.append(label_low)
    if high:
        parts.append("leans " + ", ".join(high))
    if low:
        parts.append("more " + ", ".join(low))
    if not parts:
        return "Balanced personality across all five Big Five dimensions."
    return "User " + "; ".join(parts) + "."


def _format_history(history: Iterable[dict], limit: int = 8) -> str:
    """Compress recent messages into 'Speaker: text' lines."""
    items = list(history)[-limit:]
    if not items:
        return "(this is the start of the conversation)"
    lines = []
    for msg in items:
        speaker = msg.get("speaker") or msg.get("author") or "User"
        text = (msg.get("content") or "").strip().replace("\n", " ")
        if len(text) > 240:
            text = text[:237] + "..."
        lines.append(f"{speaker}: {text}")
    return "\n".join(lines)


def _format_others_active(active_ids: Iterable[str], self_id: str) -> str:
    """Describe other council members who are also responding right now."""
    others = [pid for pid in active_ids if pid != self_id and pid in COUNCIL_PERSONAS]
    if not others:
        return "You are speaking solo this turn."
    names = [COUNCIL_PERSONAS[pid].name for pid in others]
    if len(names) == 1:
        return f"{names[0]} is also responding this turn — feel free to react to or contrast with them."
    if len(names) == 2:
        return (
            f"{names[0]} and {names[1]} are also responding this turn — "
            "you can play off each other but keep your own voice."
        )
    return (
        f"{', '.join(names[:-1])} and {names[-1]} are also responding this turn — "
        "you can play off each other but keep your own voice."
    )


def _voice_examples_block(persona: Persona) -> str:
    return "\n".join(f'  - "{ex}"' for ex in persona.voice_signature)


def _list_block(items: list[str]) -> str:
    return "\n".join(f"  - {x}" for x in items)


def build_chat_prompt(
    persona: Persona,
    user_message: str,
    conversation_history: list[dict] | None = None,
    user_personality_profile: dict | None = None,
    session_context: dict | None = None,
    other_members_active: list[str] | None = None,
) -> str:
    """Build the full system prompt for a single council member's chat reply.

    Sample target outputs (kept as living docs):

    Aria, on "I don't know if I should leave my job":
      "Two questions first: what would have to be true at your current job
       a year from now to make it a yes? And — is the alternative an actual
       option, or just a feeling?"

    Rex, on "I'm tired all the time":
      "Be honest with me. Tired physically, or tired of the thing you keep
       saying yes to? Because those need very different conversations."

    Sage, on "I think I want to move cities":
      "There's a pattern here. You've described this same restlessness twice
       in the last two months. That's not a decision yet — that's data
       arriving. Sit with it for one more week, then we look again."

    Nova, on "I have a presentation tomorrow and I'm anxious":
      "Okay — picture the version of this presentation where you actually
       like giving it. What does that version sound like? Lead with that,
       not with the slides."

    Echo, on "Everyone says I should be happier":
      "Mm. 'Everyone says.' That's a lot of voices. Whose voice is missing
       from that sentence?"
    """
    history_text = _format_history(conversation_history or [])
    profile_line = _format_personality_profile(user_personality_profile)
    others_line = _format_others_active(other_members_active or [], persona.id)

    env = (session_context or {}).get("environment")
    env_line = (
        f"Setting: you are sitting with the user in a {env} environment."
        if env
        else "Setting: relaxed chat — no specific environment cue."
    )

    rs = persona.response_style
    max_sentences = rs.get("max_sentences", 4)

    user_overrides = (session_context or {}).get("member_overrides", {}) or {}
    user_tone = user_overrides.get("tone")
    user_constraints = user_overrides.get("behavioral_constraints") or {}
    extra_tone = f"\nUser-tuned tone for this member: {user_tone}." if user_tone else ""
    extra_constraints = ""
    if user_constraints:
        constraint_lines = "\n".join(f"  - {k}: {v}" for k, v in user_constraints.items())
        extra_constraints = f"\nUser-defined constraints:\n{constraint_lines}"

    forbidden_block = ", ".join(f'"{p}"' for p in FORBIDDEN_PHRASES[:10])

    prompt = f"""# ROLE
You ARE {persona.name} — {persona.role}. Not playing them, not pretending. You are them.

{persona.portrait}

When you speak, speak like {persona.name} actually speaks — not like an AI assistant, not like a chatbot, not like a coach. {persona.name} is a real friend in a real conversation.

# VOICE — examples of how {persona.name} actually talks
{_voice_examples_block(persona)}

# SPEECH TRAITS — imitate these patterns
{_list_block(persona.speech_traits)}

# DO
{_list_block(persona.do)}

# DON'T
{_list_block(persona.dont)}

# CATCHPHRASES (use sparingly, never every turn)
{_list_block(persona.catchphrases)}{extra_tone}{extra_constraints}

# THE OTHER COUNCIL MEMBERS IN THE ROOM
{persona_one_liners_for_others(persona.id)}

{others_line}

# THE USER
{profile_line}

# CONVERSATION SO FAR
{history_text}

# CURRENT MESSAGE FROM THE USER
{user_message.strip()}

# {env_line}

# TASK
Reply as {persona.name}, in {persona.name}'s voice, in {max_sentences} sentences or fewer.

HARD RULES — these are non-negotiable:
- NEVER use phrases like {forbidden_block}, or any variant.
- NEVER start with "As {persona.name}" or "{persona.name} says" — just speak.
- NEVER list bullet points unless explicitly asked.
- NEVER moralize, lecture, or add disclaimers.
- NEVER be saccharine. NEVER use therapy-speak.
- DO sound like a real friend who has been listening.
- DO feel free to disagree with what other members might say.
- DO reference the conversation history when it matters.
- DO use a catchphrase only if it actually fits — not as a tic.

Reply now. One short reply, no preamble, no signature.
"""
    return prompt


def build_debate_prompt(
    persona: Persona,
    topic: str,
    side: str,
    round_number: int,
    total_rounds: int,
    prior_arguments: list[dict] | None = None,
    user_personality_profile: dict | None = None,
) -> str:
    """Build a prompt for one debate argument from one council member.

    `side` is one of "for", "against", or "moderator".
    `prior_arguments` is a list of {speaker, side, content} for what's been said.
    """
    history_lines = []
    for arg in (prior_arguments or [])[-10:]:
        speaker = arg.get("speaker", "Someone")
        side_label = arg.get("side", "")
        content = (arg.get("content") or "").strip().replace("\n", " ")
        if len(content) > 280:
            content = content[:277] + "..."
        history_lines.append(f"[{side_label}] {speaker}: {content}")
    history_text = "\n".join(history_lines) if history_lines else "(no arguments yet)"

    profile_line = _format_personality_profile(user_personality_profile)

    if side == "moderator":
        role_block = f"""# YOUR ROLE: MODERATOR
You are {persona.name}, moderating this debate. Stay in your voice but stay neutral.
Open the round (round {round_number} of {total_rounds}) with one or two sentences:
- frame what just happened,
- pose the question the next speakers need to answer,
- keep the energy honest.
"""
    elif side == "for":
        role_block = f"""# YOUR SIDE: FOR
You argue FOR the topic. Round {round_number} of {total_rounds}.
Make ONE clean argument in your voice. Reference prior speakers when useful.
"""
    else:
        role_block = f"""# YOUR SIDE: AGAINST
You argue AGAINST the topic. Round {round_number} of {total_rounds}.
Make ONE clean argument in your voice. Reference prior speakers when useful.
"""

    return f"""# ROLE
You ARE {persona.name} — {persona.role}. {persona.one_liner}

# VOICE — examples
{_voice_examples_block(persona)}

# SPEECH TRAITS
{_list_block(persona.speech_traits)}

# DO
{_list_block(persona.do)}

# DON'T
{_list_block(persona.dont)}

# TOPIC
"{topic}"

{role_block}

# WHAT HAS BEEN SAID
{history_text}

# THE USER WATCHING
{profile_line}

# TASK
Speak as {persona.name}, in {persona.name}'s voice, in 3-5 sentences.
- No bullet points. No headers. No "As {persona.name},".
- Stay in character even when arguing a side you wouldn't naturally pick.
- This is a real debate between real friends — be sharp but not cruel.
"""


def build_commentary_prompt(
    persona: Persona,
    game_type: str,
    move_summary: str,
    snapshot_summary: str | None = None,
) -> str:
    """Short, snappy game commentary in this member's voice (1-2 sentences)."""
    snapshot = snapshot_summary or ""
    return f"""# ROLE
You ARE {persona.name} — {persona.role}. {persona.one_liner}

# VOICE — examples
{_voice_examples_block(persona)}

# DO
{_list_block(persona.do)}

# DON'T
{_list_block(persona.dont)}

# GAME
{game_type}

# JUST HAPPENED
{move_summary}

{("# CURRENT STATE\n" + snapshot) if snapshot else ""}

# TASK
React in 1-2 sentences, in {persona.name}'s voice. Quick, in-the-moment, in character. No preamble.
"""
