"""
Decide which council members respond to a given message.

This is *not* an LLM call — it's a fast, deterministic heuristic that picks
1-3 members so the user gets a varied, conversation-like reply pattern.

Rules of thumb:
- Explicit target / direct address ("@Aria", "Aria, what do you think?") →
  that member only. These are the ONLY two paths that return a single voice —
  the user asked one friend a question, so one friend answers.
- Emotional content → Echo first, often Nova or Sage as second voice.
- Decision/analysis → Aria + Sage (with Rex if the user is hedging).
- Provocation / "I think I should" → Rex, plus at least one more voice.
- Brainstorm / creativity → Nova first, Aria second.
- Default → 2-3 members, weighted to vary across recent turns.
- Group guarantee: every non-targeted, non-mention path returns AT LEAST 2
  members (topped up with whoever has spoken least recently), capped at 3.

Examples (empty history, all 5 members available):

    >>> choose_responders("be honest with me")   # provocative → rex + a 2nd voice
    ['rex', 'aria']
    >>> choose_responders("hey")                 # default → never a lone voice
    ['aria', 'nova', 'rex']
    >>> choose_responders("@Aria thoughts?")     # direct mention stays 1:1
    ['aria']
    >>> choose_responders("hi", target_member_id="sage")  # explicit target stays 1:1
    ['sage']
"""
from __future__ import annotations

import re
from collections import Counter

from app.services.personalities.personas import COUNCIL_ORDER, COUNCIL_PERSONAS

# Words that suggest an intent. These are intentionally narrow — better to miss
# than to mislabel, because the default rule is healthy.
EMOTIONAL = {
    "sad", "anxious", "tired", "exhausted", "scared", "fear", "afraid",
    "hurt", "alone", "lonely", "stressed", "overwhelmed", "cry", "crying",
    "heartbroken", "hopeless", "depressed", "burnt out", "burned out",
    "miss them", "miss her", "miss him",
}
DECISIONAL = {
    "should i", "do i", "decide", "decision", "leave my job", "quit", "switch",
    "stay or go", "yes or no", "what would you do", "what should i do",
    "pros and cons", "trade-off", "tradeoff",
}
ANALYTICAL = {
    "compare", "analyse", "analyze", "metrics", "kpi", "data", "evidence",
    "framework", "model", "calculate", "estimate", "math",
}
PROVOCATIVE_USER = {
    "honestly", "be real with me", "be honest", "the truth", "challenge me",
    "push back", "devil's advocate", "i think i", "i feel like i should",
    "i probably should", "everyone says i", "people say i",
}
CREATIVE = {
    "brainstorm", "idea", "ideas", "what if", "name for", "design", "create",
    "imagine", "invent", "build", "make", "concept",
}


def _normalise_member_name(s: str) -> str | None:
    s = (s or "").strip().lower()
    if s in COUNCIL_PERSONAS:
        return s
    for slug, persona in COUNCIL_PERSONAS.items():
        if persona.name.lower() == s:
            return slug
    return None


def detect_direct_mention(message: str) -> str | None:
    """Find @Aria / 'Aria,' / 'Hey Sage' style mentions. Returns slug or None."""
    if not message:
        return None
    # @Name
    m = re.search(r"@([A-Za-z]+)", message)
    if m:
        slug = _normalise_member_name(m.group(1))
        if slug:
            return slug
    # "Aria," or "Aria?" or "hey Aria" at sentence start
    pattern = re.compile(
        r"(?:^|\b)(?:hey |hi |okay )?(aria|rex|sage|nova|echo)\b[,\?\s:]",
        re.IGNORECASE,
    )
    m = pattern.search(message)
    if m:
        return _normalise_member_name(m.group(1))
    return None


def _contains_any(text: str, phrases: set[str]) -> bool:
    return any(p in text for p in phrases)


def _recent_speaker_counts(history: list[dict], n: int = 6) -> Counter[str]:
    """Count how often each council member has spoken in the last N turns."""
    counts: Counter[str] = Counter()
    for msg in (history or [])[-n:]:
        sid = msg.get("member_id") or msg.get("speaker_id")
        if sid:
            counts[sid] += 1
    return counts


def _least_recent(candidates: list[str], history: list[dict]) -> str:
    """Pick the candidate that has spoken least in recent history."""
    counts = _recent_speaker_counts(history)
    return min(candidates, key=lambda c: (counts.get(c, 0), COUNCIL_ORDER.index(c)))


def choose_responders(
    message: str,
    history: list[dict] | None = None,
    available_member_ids: list[str] | None = None,
    *,
    target_member_id: str | None = None,
) -> list[str]:
    """Return an ordered list of member slugs who should reply.

    `available_member_ids` is the set of member slugs the user actually has —
    in practice the canonical 5, but we respect what the caller passes in.
    """
    history = history or []
    available = available_member_ids or list(COUNCIL_ORDER)
    available_set = {a for a in available if a in COUNCIL_PERSONAS}
    if not available_set:
        return []

    # 1. Explicit target wins.
    if target_member_id and target_member_id in available_set:
        return [target_member_id]

    # 2. Direct mention.
    mentioned = detect_direct_mention(message or "")
    if mentioned and mentioned in available_set:
        return [mentioned]

    msg_lower = (message or "").lower()

    chosen: list[str] = []

    # 3. Intent routing.
    emotional = _contains_any(msg_lower, EMOTIONAL)
    decisional = _contains_any(msg_lower, DECISIONAL)
    analytical = _contains_any(msg_lower, ANALYTICAL)
    provocative = _contains_any(msg_lower, PROVOCATIVE_USER)
    creative = _contains_any(msg_lower, CREATIVE)

    def add(*slugs: str) -> None:
        for s in slugs:
            if s in available_set and s not in chosen:
                chosen.append(s)

    if emotional:
        add("echo")
        # Second voice: long-arc if the venting is heavy, otherwise Nova for lift.
        if any(w in msg_lower for w in ["always", "again", "every time", "for years", "for months"]):
            add("sage")
        else:
            add("nova")
    if decisional:
        add("aria", "sage")
        if provocative or "i think i" in msg_lower:
            add("rex")
    if analytical:
        add("aria")
        # If the analysis seems unmoored from emotion, add Sage; otherwise Rex.
        if emotional:
            add("sage")
        else:
            add("rex")
    if provocative and "rex" not in chosen:
        add("rex")
    if creative:
        add("nova", "aria")

    # 4. Trim to at most 3.
    chosen = chosen[:3]

    # 5. Default: if nothing matched, pick 2 members with variety.
    if not chosen:
        # Always include a "thinking" voice and a "feeling" voice by default,
        # rotating to the least recent member to break monotony.
        thinkers = [m for m in ["aria", "sage"] if m in available_set]
        feelers = [m for m in ["echo", "nova"] if m in available_set]
        provocateurs = [m for m in ["rex"] if m in available_set]

        if thinkers:
            chosen.append(_least_recent(thinkers, history))
        if feelers:
            chosen.append(_least_recent(feelers, history))
        # Occasionally throw Rex in for spice if recent turns have been quiet.
        recent_counts = _recent_speaker_counts(history, n=8)
        if provocateurs and recent_counts.get("rex", 0) == 0 and len(chosen) < 3:
            chosen.append("rex")

    # 6. De-dup preserving order.
    seen: set[str] = set()
    out: list[str] = []
    for m in chosen:
        if m in available_set and m not in seen:
            out.append(m)
            seen.add(m)

    # 7. Group guarantee: outside the two 1:1 cases (explicit target, direct
    #    mention — both returned earlier), the council always answers as a
    #    group. Top up to at least 2 voices with whoever has spoken least
    #    recently, keeping the cap at 3.
    remaining = [m for m in COUNCIL_ORDER if m in available_set and m not in seen]
    while len(out) < 2 and remaining:
        pick = _least_recent(remaining, history)
        out.append(pick)
        seen.add(pick)
        remaining.remove(pick)

    return out[:3]


__all__ = ["choose_responders", "detect_direct_mention"]
