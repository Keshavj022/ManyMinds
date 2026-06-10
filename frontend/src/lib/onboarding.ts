/**
 * ManyMinds — Onboarding data + scoring
 *
 * Onboarding is a conversation, not a form. The council takes turns asking —
 * demographics flow like a group chat, and the Big Five quiz is a deck of 20
 * "is this you?" cards answered on a 1-5 scale from "not me" to "very me".
 *
 * Scoring:
 *  - Each dimension has 4 items; some are reverse-coded to counter
 *    acquiescence bias.
 *  - Local scores are 0-100 per dimension (average of normalized items).
 *  - The backend receives plain 1-5 Likert responses with reverse-coding
 *    already applied, so it can score raw averages.
 */
import type { CouncilMemberId } from "@/lib/design-tokens";

export type BigFiveDimension =
  | "openness"
  | "conscientiousness"
  | "extraversion"
  | "agreeableness"
  | "neuroticism";

export interface BigFiveScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

// ---------------------------------------------------------------------------
// Quiz — 20 cards, 4 per dimension, each asked by a member in their voice.
// Answered on a 1-5 orb scale: 1 = "not me", 5 = "very me".
// ---------------------------------------------------------------------------
export interface Question {
  id: string;
  dimension: BigFiveDimension;
  /** Which member asks this one. */
  member: CouncilMemberId;
  prompt: string;
  /** When true, "very me" counts AGAINST the dimension. */
  reverse?: boolean;
}

export const BIG_FIVE_QUESTIONS: ReadonlyArray<Question> = [
  // ───────── Openness ─────────
  {
    id: "o1",
    dimension: "openness",
    member: "nova",
    prompt:
      "You're the one in the group who says \"okay, but what if we tried it a completely different way?\"",
  },
  {
    id: "o2",
    dimension: "openness",
    member: "sage",
    prompt:
      "A topic you know nothing about comes up — and you lean in instead of out.",
  },
  {
    id: "o3",
    dimension: "openness",
    member: "aria",
    prompt:
      "Honestly? You'd rather keep things practical than wander off into big abstract what-ifs.",
    reverse: true,
  },
  {
    id: "o4",
    dimension: "openness",
    member: "rex",
    prompt:
      "A friend says \"don't ask questions, just come\" — and you're already putting your shoes on.",
  },

  // ───────── Conscientiousness ─────────
  {
    id: "c1",
    dimension: "conscientiousness",
    member: "aria",
    prompt:
      "Deadline next Tuesday. Some quiet part of you has already started.",
  },
  {
    id: "c2",
    dimension: "conscientiousness",
    member: "sage",
    prompt: "Your space stays tidy because a tidy room is a tidy head.",
  },
  {
    id: "c3",
    dimension: "conscientiousness",
    member: "nova",
    prompt:
      "Plans feel a little like a cage — you'd rather see where the day takes you.",
    reverse: true,
  },
  {
    id: "c4",
    dimension: "conscientiousness",
    member: "echo",
    prompt:
      "When you say you'll do a thing, the thing gets done. Every time.",
  },

  // ───────── Extraversion ─────────
  {
    id: "e1",
    dimension: "extraversion",
    member: "rex",
    prompt:
      "You walk into a party knowing one person and walk out knowing seven.",
  },
  {
    id: "e2",
    dimension: "extraversion",
    member: "nova",
    prompt: "A loud, chaotic group brainstorm? That's your happy place.",
  },
  {
    id: "e3",
    dimension: "extraversion",
    member: "sage",
    prompt:
      "After a long week, the perfect night is just you, a door that locks, and quiet.",
    reverse: true,
  },
  {
    id: "e4",
    dimension: "extraversion",
    member: "echo",
    prompt:
      "Talking it out loud is how you figure out what you actually think.",
  },

  // ───────── Agreeableness ─────────
  {
    id: "a1",
    dimension: "agreeableness",
    member: "echo",
    prompt:
      "A friend's having a rough day, and yours quietly reshapes itself around them.",
  },
  {
    id: "a2",
    dimension: "agreeableness",
    member: "aria",
    prompt:
      "Someone's clearly wrong — but you hear them all the way out before you say so.",
  },
  {
    id: "a3",
    dimension: "agreeableness",
    member: "rex",
    prompt:
      "If helping out is genuinely inconvenient, you'll usually pass.",
    reverse: true,
  },
  {
    id: "a4",
    dimension: "agreeableness",
    member: "nova",
    prompt:
      "Small kindnesses from strangers can genuinely make your whole day.",
  },

  // ───────── Neuroticism ─────────
  {
    id: "n1",
    dimension: "neuroticism",
    member: "echo",
    prompt:
      "A \"we need to talk\" text can quietly take over your entire afternoon.",
  },
  {
    id: "n2",
    dimension: "neuroticism",
    member: "rex",
    prompt:
      "Plans fall through last-minute and, be honest, part of you spirals a little.",
  },
  {
    id: "n3",
    dimension: "neuroticism",
    member: "sage",
    prompt:
      "Setbacks roll off you — a day later, you've mostly let them go.",
    reverse: true,
  },
  {
    id: "n4",
    dimension: "neuroticism",
    member: "aria",
    prompt:
      "In quiet moments, your brain loves to queue up that one thing from years ago.",
  },
];

/** What the orbs mean, smallest to largest. */
export const SCALE_LABELS = [
  "not me",
  "not really",
  "sometimes",
  "mostly me",
  "very me",
] as const;

// ---------------------------------------------------------------------------
// Scoring — answers are 1-5 Likert values keyed by question id
// ---------------------------------------------------------------------------
export function scoreQuiz(answers: Record<string, number>): BigFiveScores {
  const sums: Record<BigFiveDimension, number> = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0,
  };
  const counts: Record<BigFiveDimension, number> = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0,
  };

  for (const q of BIG_FIVE_QUESTIONS) {
    const raw = answers[q.id];
    if (raw === undefined) continue;
    const clamped = Math.max(1, Math.min(5, Math.round(raw)));
    const normalized = (clamped - 1) / 4; // 0..1
    const value = q.reverse ? 1 - normalized : normalized;
    sums[q.dimension] += value;
    counts[q.dimension] += 1;
  }

  const dim = (d: BigFiveDimension): number =>
    counts[d] === 0 ? 50 : Math.round((sums[d] / counts[d]) * 100);

  return {
    openness: dim("openness"),
    conscientiousness: dim("conscientiousness"),
    extraversion: dim("extraversion"),
    agreeableness: dim("agreeableness"),
    neuroticism: dim("neuroticism"),
  };
}

/** Apply reverse-coding so the backend can average raw 1-5 responses. */
export function toBackendResponse(q: Question, value: number): number {
  const clamped = Math.max(1, Math.min(5, Math.round(value)));
  return q.reverse ? 6 - clamped : clamped;
}

export function getDominantTrait(scores: BigFiveScores): BigFiveDimension {
  const entries = Object.entries(scores) as Array<[BigFiveDimension, number]>;
  // Distance from neutral 50 — strongest deviation wins
  entries.sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50));
  return entries[0][0];
}

// ---------------------------------------------------------------------------
// Calibration reveal — trait display + dominant-trait celebrations
// ---------------------------------------------------------------------------
export const TRAIT_DISPLAY: Record<
  BigFiveDimension,
  { label: string; sub: string; member: CouncilMemberId }
> = {
  openness: {
    label: "Openness",
    sub: "how far you'll wander",
    member: "nova",
  },
  conscientiousness: {
    label: "Conscientiousness",
    sub: "how you like things done",
    member: "aria",
  },
  extraversion: {
    label: "Extraversion",
    sub: "where your energy comes from",
    member: "rex",
  },
  agreeableness: {
    label: "Agreeableness",
    sub: "how much warmth you lead with",
    member: "echo",
  },
  neuroticism: {
    label: "Sensitivity",
    sub: "how deeply the waves hit",
    member: "sage",
  },
};

export interface Celebration {
  member: CouncilMemberId;
  headline: string;
  line: string;
}

const CELEBRATIONS: Record<
  BigFiveDimension,
  { high: Celebration; low: Celebration }
> = {
  openness: {
    high: {
      member: "nova",
      headline: "High openness. Nova is THRILLED.",
      line: "“New ideas, weird tangents, museums at midnight — we are going to get along SO well.”",
    },
    low: {
      member: "sage",
      headline: "Feet on the ground. Sage approves.",
      line: "“You like ideas that actually land. Good — so do I.”",
    },
  },
  conscientiousness: {
    high: {
      member: "aria",
      headline: "Beautifully organised. Aria found her person.",
      line: "“You start before the deadline. I could honestly cry.”",
    },
    low: {
      member: "nova",
      headline: "You improvise. Nova respects the chaos.",
      line: "“Plans are more of a suggestion, right? Same. SAME.”",
    },
  },
  extraversion: {
    high: {
      member: "rex",
      headline: "Big room energy. Rex is ready.",
      line: "“Loud brainstorms, late nights, zero awkward silences. Let's go.”",
    },
    low: {
      member: "echo",
      headline: "Quiet power. Echo gets it completely.",
      line: "“We'll keep it gentle. Your voice gets all the room it needs.”",
    },
  },
  agreeableness: {
    high: {
      member: "echo",
      headline: "A genuinely warm one. Echo called it first.",
      line: "“I had a feeling about you from the very first hello.”",
    },
    low: {
      member: "rex",
      headline: "You keep it honest. Rex is delighted.",
      line: "“Finally — someone who'll argue back. This is going to be fun.”",
    },
  },
  neuroticism: {
    high: {
      member: "echo",
      headline: "You feel things deeply. Echo's got you.",
      line: "“I'll know when to check in. That's a promise.”",
    },
    low: {
      member: "sage",
      headline: "Steady as anything. Sage is impressed.",
      line: "“Calm centre, clear head. We'll trust you with the hard questions.”",
    },
  },
};

export function getCelebration(scores: BigFiveScores): Celebration {
  const dominant = getDominantTrait(scores);
  return scores[dominant] >= 50
    ? CELEBRATIONS[dominant].high
    : CELEBRATIONS[dominant].low;
}

// ---------------------------------------------------------------------------
// Demographics — a five-question conversation, one member asking at a time
// ---------------------------------------------------------------------------
export type DemographicStepKey =
  | "name"
  | "birthday"
  | "gender"
  | "location"
  | "language";

export interface DemographicOption {
  id: string;
  label: string;
  flag?: string;
}

export interface DemographicStep {
  key: DemographicStepKey;
  member: CouncilMemberId;
  prompt: string;
  kind: "text" | "date" | "choice";
  options?: ReadonlyArray<DemographicOption>;
  placeholder?: string;
  optional?: boolean;
  skipLabel?: string;
  recapLabel: string;
}

export const LANGUAGES = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "es", label: "Español", flag: "🇪🇸" },
  { id: "fr", label: "Français", flag: "🇫🇷" },
  { id: "de", label: "Deutsch", flag: "🇩🇪" },
  { id: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { id: "ja", label: "日本語", flag: "🇯🇵" },
] as const;

export const GENDER_OPTIONS: ReadonlyArray<DemographicOption> = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "non-binary", label: "Non-binary" },
  { id: "another-way", label: "Another way" },
];

export const DEMOGRAPHIC_STEPS: ReadonlyArray<DemographicStep> = [
  {
    key: "name",
    member: "aria",
    prompt:
      "Hey, you made it. I'm Aria — I keep the receipts around here. First things first: what should we call you?",
    kind: "text",
    placeholder: "Your name",
    recapLabel: "Name",
  },
  {
    key: "birthday",
    member: "sage",
    prompt:
      "Sage here. When's your birthday? Long arcs matter — I like to know the shape of a year before I map it.",
    kind: "date",
    optional: true,
    skipLabel: "Skip this one",
    recapLabel: "Birthday",
  },
  {
    key: "gender",
    member: "echo",
    prompt:
      "Echo — hi. Only if you feel like sharing: how do you identify?",
    kind: "choice",
    options: GENDER_OPTIONS,
    optional: true,
    skipLabel: "Rather not say",
    recapLabel: "Identity",
  },
  {
    key: "location",
    member: "nova",
    prompt:
      "Nova! Okay, my turn. Where's home base? I want to picture the light where you are.",
    kind: "text",
    placeholder: "City, country, anywhere",
    optional: true,
    skipLabel: "Keep it mysterious",
    recapLabel: "Home base",
  },
  {
    key: "language",
    member: "echo",
    prompt:
      "Me again — last one, promise. Which language feels most like home?",
    kind: "choice",
    options: LANGUAGES,
    recapLabel: "Language",
  },
];

export type DemographicAnswers = Partial<Record<DemographicStepKey, string>>;

// ---------------------------------------------------------------------------
// LocalStorage keys — dashboard reads `profile.name`, calibrating reads
// `personality.scores`. Keep both shapes stable.
// ---------------------------------------------------------------------------
export const STORAGE_KEYS = {
  profile: "manyminds:profile",
  personality: "manyminds:personality",
} as const;
