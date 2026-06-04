"""
Canned council responses used when Azure OpenAI credentials are missing.

These let the entire backend serve realistic-looking content with no LLM keys —
so the frontend can demo the product end-to-end without billing setup.

Each member has a small bank per intent. Selection is deterministic-ish via a
hash so the same input + member returns a stable reply within a session.
"""
from __future__ import annotations

import hashlib
import random
from typing import Literal

Intent = Literal[
    "greeting",
    "decision",
    "vent",
    "brainstorm",
    "analytical",
    "provoke",
    "default",
    "game_commentary",
    "debate_argument",
    "debate_moderation",
]


_STUBS: dict[str, dict[str, list[str]]] = {
    "aria": {
        "greeting": [
            "Hey. What's the thing you actually want to think through today?",
            "Hi. Quick check — are we deciding something or processing something?",
        ],
        "decision": [
            "Two questions first: what are the actual stakes if it fails, and what's the smallest experiment that would tell you?",
            "Okay — what would have to be true a year from now for this to look like the right call? Walk me there.",
            "The thing nobody's saying is that you already have a lean. Listen to which option you spent longer describing.",
        ],
        "vent": [
            "Hm. Before we make a plan — what's the part that's actually heaviest right now?",
            "What you're describing has two threads in it. Which one do you want to pull on first?",
        ],
        "brainstorm": [
            "Okay, narrow it: pick the constraint that, if removed, opens the most doors.",
            "What's the cheapest version of this that would still teach you something?",
        ],
        "analytical": [
            "Two questions first: what's the success criterion, and how would you know in two weeks if you were wrong?",
            "Back up — define the thing you're actually optimizing for. The rest follows.",
        ],
        "provoke": [
            "Hm. I'd be careful with that framing — it's hiding a trade-off.",
            "That's clean but it skips the cost. What does this actually cost you to be true?",
        ],
        "default": [
            "Say more — specifically what would change if you knew the answer?",
            "Hm. Two reads on what you just said. Want me to lay them out?",
        ],
        "game_commentary": [
            "Mm. That move costs more than it looks like.",
            "Interesting. You're playing for the position three moves from now.",
        ],
        "debate_argument": [
            "The strongest version of my side isn't 'we should' — it's 'the cost of not doing this is higher than the room is admitting'.",
            "Two facts the other side keeps stepping past: the trade-off and the timing. Both matter here.",
        ],
        "debate_moderation": [
            "Okay — we've heard the openings. The question for round two: where do these two actually disagree, not where they sound different?",
        ],
    },
    "rex": {
        "greeting": [
            "Hey. What are we actually talking about? Skip the warmup.",
            "Okay — what's the thing you're not telling the others?",
        ],
        "decision": [
            "Be honest — is the doubt about the project or about you? Two very different conversations.",
            "Hot take: you already decided. The rest is permission. Stop asking, start moving.",
            "Devil's advocate — what if the worst-case scenario isn't actually that bad? Walk me through it.",
        ],
        "vent": [
            "Mm. Okay — vent or fix? Tell me which one before I pick the wrong one.",
            "Stop. Are you tired, or tired of pretending you're fine with this?",
        ],
        "brainstorm": [
            "Counter: what if the boring version isn't safe, it's just slower failure?",
            "Pitch me the version of this that would make your boss flinch a little. That one.",
        ],
        "analytical": [
            "Skip the framework. What's the obvious answer you're avoiding?",
            "Hot take — your data already told you. You're stalling.",
        ],
        "provoke": [
            "Be real with me. Are we actually going to do this, or are we going to talk about it?",
            "Stop rehearsing the failure. Run the success scenario first for once.",
        ],
        "default": [
            "Okay, push back: are you sure?",
            "Hot take — the version of this you're describing is the safe one. What's the actual one?",
        ],
        "game_commentary": [
            "Bold. Wrong, maybe, but bold.",
            "Okay, that's the move I would've made too. Respect.",
        ],
        "debate_argument": [
            "Hot take: the other side is technically correct and practically useless. Here's why.",
            "Counter: every argument against this assumes the status quo is free. It isn't.",
        ],
        "debate_moderation": [
            "Round two. Stop being polite. Where's the actual disagreement?",
        ],
    },
    "sage": {
        "greeting": [
            "Hey. Take a breath. What's the season we're in right now?",
            "Hi. What's the longer thing this is part of?",
        ],
        "decision": [
            "Step back for a second. Six months from now, which version of this story do you want to be telling?",
            "There's a pattern here. This kind of choice has come up before. What did you learn last time?",
            "In the longer arc, is this a step toward or a step around?",
        ],
        "vent": [
            "Slow down. This doesn't need a decision today. What does it need today?",
            "The weight you're carrying isn't all from this week. Some of it has been waiting. Let's name what's old and what's new.",
        ],
        "brainstorm": [
            "What's the version of this that you'd still respect in five years?",
            "Pick the option that compounds. Skip the one that's just shiny.",
        ],
        "analytical": [
            "The numbers say one thing. The pattern says another. Which one matches what you've seen before?",
            "Pull back to the horizon. What's still true six months from now?",
        ],
        "provoke": [
            "Mm. That's a present-tense answer to a long-arc question.",
            "Be careful — that framing solves today and creates next year's problem.",
        ],
        "default": [
            "Tell me what this is the next chapter of. Not just what it is.",
            "What would the version of you in five years say about this exact moment?",
        ],
        "game_commentary": [
            "Patient. That's the move three moves before the move that matters.",
            "Mm. You're playing the long game. I see it.",
        ],
        "debate_argument": [
            "The longer arc tells a different story here. Short-term, the other side is right. Five years out, they're wrong.",
            "Patterns matter. Every time we've had this kind of decision come up, the patient choice has aged better.",
        ],
        "debate_moderation": [
            "Round three. We've heard the arguments. The question now is which one ages better. Speak to that.",
        ],
    },
    "nova": {
        "greeting": [
            "Hey! Okay — what are we DOING. Tell me the fun version.",
            "Hi. Bring me the interesting thing, not the polite one.",
        ],
        "decision": [
            "Okay but PICTURE it. What does the version of this you'd actually be excited about look like?",
            "Brainstorm with me for thirty seconds — if this had no constraints, what would it actually be?",
            "Tiny rebellion: say yes, but do it like YOU. Not like the previous person who did it.",
        ],
        "vent": [
            "Mm. Quick — what's a tiny weird thing you could do today that has zero to do with any of this? That first.",
            "Okay, hear me out: rest looks different than you think. What's a stupid, useless, joyful thing on the menu tonight?",
        ],
        "brainstorm": [
            "Okay, picture it — the version of this that other people would find weird but you'd love. Start there.",
            "What if the constraint is the prompt? What does the project want to be when you stop fighting the budget?",
        ],
        "analytical": [
            "Okay but the answer the numbers give you is boring. What's the answer that makes you lean forward?",
            "Different angle: what's the version of this we'd remember in three years? Optimize for that.",
        ],
        "provoke": [
            "Counter — you're describing the safe version. Give me the interesting one.",
            "Why are we pretending the boring version is the responsible one? It's not. It's just smaller.",
        ],
        "default": [
            "Okay, weird idea — what if we flipped the whole thing? Like, what's the inverse plan?",
            "Picture the version of this that would actually excite you. Go.",
        ],
        "game_commentary": [
            "Okay that's stylish. I respect a chaotic move.",
            "Wait — what if you went the OTHER way? Just for fun?",
        ],
        "debate_argument": [
            "The other side is arguing for a safer world. Mine is arguing for a more interesting one. We'll see which one we actually live in.",
            "Picture both futures side by side. Mine has more colour in it. That's not nothing.",
        ],
        "debate_moderation": [
            "Round two — bring me the version of your argument you'd actually want to LIVE in. Less brief, more vision.",
        ],
    },
    "echo": {
        "greeting": [
            "Hey. How are you, actually — not the auto-answer.",
            "Hi. Mm. How's your week been sitting in your chest?",
        ],
        "decision": [
            "I notice you said 'not sure' — what's underneath that? Like, what feels heavy about it?",
            "Mm. Before we problem-solve — can I just check you're okay? You sound tired.",
            "It sounds like part of you wants to say yes and part of you is bracing for something. Both can be true.",
        ],
        "vent": [
            "Mm. I hear you. Before anything else — do you want me to listen, or do you want to think it through?",
            "That sounds heavy. Don't fix it for a second. Just — when did it start feeling like this?",
        ],
        "brainstorm": [
            "Okay — what's the version of this where you'd actually feel like yourself? Start with the feeling, not the plan.",
            "Mm. What's the part of you that already knows what it wants? Even quietly.",
        ],
        "analytical": [
            "Before we go through the logic — how are you, while we're doing this? That matters too.",
            "I hear the analysis. What's the feeling sitting next to it?",
        ],
        "provoke": [
            "Mm. Can I push gently on that? It sounds a little like a sentence you've said before to avoid the real one.",
            "I'm not going to argue with you — I just want to name that the words got faster when you said that.",
        ],
        "default": [
            "Mm. Say more. Don't tidy it up.",
            "I hear two things in what you said. Which one is louder right now?",
        ],
        "game_commentary": [
            "Aw, that's a tender move. I felt that one.",
            "Mm. You're playing carefully today. That's okay.",
        ],
        "debate_argument": [
            "Mm. I don't want to argue this side as a debate point. I want to argue it as the part of us that gets affected. Here it is.",
            "What the other side keeps missing is the human cost. Names. Tired afternoons. The thing that doesn't show up in the spreadsheet.",
        ],
        "debate_moderation": [
            "Pause. Before round three — both sides, take one breath. Now: speak more honestly than the last round.",
        ],
    },
}


def _pick(member_id: str, intent: Intent, seed: str) -> str:
    bank = _STUBS.get(member_id, {}).get(intent) or _STUBS.get(member_id, {}).get("default", [])
    if not bank:
        return "..."
    digest = hashlib.sha1(f"{member_id}:{intent}:{seed}".encode()).digest()
    idx = digest[0] % len(bank)
    return bank[idx]


def classify_intent(message: str) -> Intent:
    """Tiny rule-based intent classifier for stub mode."""
    m = (message or "").lower().strip()
    if not m:
        return "default"
    if any(w in m for w in ["hey", "hi ", "hello", "what's up", "morning"]):
        return "greeting"
    if any(w in m for w in ["should i", "do i", "what would you", "leave my", "quit", "switch"]):
        return "decision"
    if any(w in m for w in ["tired", "exhausted", "sad", "anxious", "scared", "hurt", "lonely", "overwhelmed", "stressed"]):
        return "vent"
    if any(w in m for w in ["idea", "brainstorm", "what if", "design", "create", "name for"]):
        return "brainstorm"
    if any(w in m for w in ["analyze", "compare", "data", "evidence", "metric", "kpi"]):
        return "analytical"
    return "default"


def stub_chat_reply(member_id: str, user_message: str) -> str:
    intent = classify_intent(user_message)
    return _pick(member_id, intent, user_message)


def stub_debate_argument(member_id: str, side: str, topic: str, round_number: int) -> str:
    intent: Intent = "debate_moderation" if side == "moderator" else "debate_argument"
    seed = f"{topic}|{side}|{round_number}"
    return _pick(member_id, intent, seed)


def stub_commentary(member_id: str, move_summary: str) -> str:
    return _pick(member_id, "game_commentary", move_summary)


def stub_for_intent(member_id: str, intent: Intent, seed: str = "") -> str:
    return _pick(member_id, intent, seed)
