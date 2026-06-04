/**
 * ManyMinds — Onboarding data + scoring
 *
 * The Big Five quiz is intentionally NOT clinical. Each question is a tiny
 * everyday scenario a friend would actually ask, scored on a 0-100 slider.
 * Some items are reverse-coded to counter acquiescence bias.
 *
 * Scoring strategy:
 *  - For each dimension, average the (possibly reversed) item values.
 *  - Reverse-coded items are flipped: 100 - value.
 */
import type { CouncilMemberId } from "@/lib/design-tokens";

export type BigFiveDimension =
  | "openness"
  | "conscientiousness"
  | "extraversion"
  | "agreeableness"
  | "neuroticism";

export interface Question {
  id: string;
  dimension: BigFiveDimension;
  prompt: string;
  leftLabel: string;
  rightLabel: string;
  reverse?: boolean;
  vibeColor: CouncilMemberId;
  reaction?: string;
}

export interface BigFiveScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

// ---------------------------------------------------------------------------
// Question bank — 20 items, 4 per dimension, vibe distributed across council
// ---------------------------------------------------------------------------
export const BIG_FIVE_QUESTIONS: ReadonlyArray<Question> = [
  // ───────── Openness ─────────
  {
    id: "o1",
    dimension: "openness",
    prompt:
      "It's Friday night. You're choosing between a museum opening with new ideas vs your favorite restaurant for the fifth time.",
    leftLabel: "Restaurant. Always.",
    rightLabel: "Museum. New things.",
    vibeColor: "nova",
    reaction: "Oooh — I love that you're up for adventure.",
  },
  {
    id: "o2",
    dimension: "openness",
    prompt:
      "Someone hands you a poetry book about a topic you know nothing about. You...",
    leftLabel: "Quietly put it down",
    rightLabel: "Open page one",
    vibeColor: "sage",
    reaction: "Curiosity is the foundation of everything good.",
  },
  {
    id: "o3",
    dimension: "openness",
    prompt:
      "You're more drawn to conversations about practical, tangible things than abstract 'what if' ideas.",
    leftLabel: "What ifs all night",
    rightLabel: "Keep it grounded",
    reverse: true,
    vibeColor: "aria",
    reaction: "Got it — you want both, but reality first.",
  },
  {
    id: "o4",
    dimension: "openness",
    prompt:
      "A friend wants to take you somewhere they refuse to describe. You go in blind.",
    leftLabel: "Tell me everything",
    rightLabel: "Mystery? Yes please",
    vibeColor: "rex",
    reaction: "Living dangerously. I respect it.",
  },

  // ───────── Conscientiousness ─────────
  {
    id: "c1",
    dimension: "conscientiousness",
    prompt: "There's a deadline next Tuesday. When do you start?",
    leftLabel: "Monday night",
    rightLabel: "Today, obviously",
    vibeColor: "aria",
    reaction: "Noted — your past self respects your future self.",
  },
  {
    id: "c2",
    dimension: "conscientiousness",
    prompt: "Your desk right now is...",
    leftLabel: "Creatively chaotic",
    rightLabel: "Suspiciously tidy",
    vibeColor: "sage",
    reaction: "Order tells me how you think.",
  },
  {
    id: "c3",
    dimension: "conscientiousness",
    prompt:
      "Plans are a vibe-killer. You'd rather see what the day brings than schedule it out.",
    leftLabel: "Calendar everything",
    rightLabel: "Let the day breathe",
    reverse: true,
    vibeColor: "nova",
    reaction: "Spontaneity has its own kind of structure.",
  },
  {
    id: "c4",
    dimension: "conscientiousness",
    prompt:
      "A new hobby. Do you finish the tutorial, or jump in and figure it out as you go?",
    leftLabel: "Just start",
    rightLabel: "Tutorial cover to cover",
    vibeColor: "echo",
    reaction: "Both paths get you there — yours is yours.",
  },

  // ───────── Extraversion ─────────
  {
    id: "e1",
    dimension: "extraversion",
    prompt:
      "You walk into a party where you only know one person.",
    leftLabel: "Find them, don't move",
    rightLabel: "3 new friends in 10 min",
    vibeColor: "rex",
    reaction: "Knowing your social default is half the battle.",
  },
  {
    id: "e2",
    dimension: "extraversion",
    prompt:
      "After a long week, recharging looks like...",
    leftLabel: "Solo. Dark room. Bliss.",
    rightLabel: "Dinner with the crew",
    vibeColor: "echo",
    reaction: "Energy comes from different places. Both valid.",
  },
  {
    id: "e3",
    dimension: "extraversion",
    prompt:
      "You'd genuinely rather have a quiet night in than be the center of attention.",
    leftLabel: "Spotlight me",
    rightLabel: "Quiet, please",
    reverse: true,
    vibeColor: "sage",
    reaction: "Quiet voices often carry the loudest ideas.",
  },
  {
    id: "e4",
    dimension: "extraversion",
    prompt:
      "Big group brainstorm — chaotic and loud. How do you feel?",
    leftLabel: "Internally screaming",
    rightLabel: "Thriving",
    vibeColor: "nova",
    reaction: "Now I know how to pace our sessions.",
  },

  // ───────── Agreeableness ─────────
  {
    id: "a1",
    dimension: "agreeableness",
    prompt:
      "Your coworker took credit for your idea in front of the boss.",
    leftLabel: "Confront them today",
    rightLabel: "Let it slide, work around it",
    vibeColor: "rex",
    reaction: "Oh, I will definitely remember this.",
  },
  {
    id: "a2",
    dimension: "agreeableness",
    prompt:
      "Someone's clearly wrong but feels strongly about it. You...",
    leftLabel: "Set them straight",
    rightLabel: "Listen first, then maybe nudge",
    vibeColor: "echo",
    reaction: "How you disagree tells me everything.",
  },
  {
    id: "a3",
    dimension: "agreeableness",
    prompt:
      "If someone needs help and it's inconvenient — honestly, you usually pass.",
    leftLabel: "I always show up",
    rightLabel: "Not my problem today",
    reverse: true,
    vibeColor: "aria",
    reaction: "Boundaries are data too.",
  },
  {
    id: "a4",
    dimension: "agreeableness",
    prompt:
      "A stranger holds the door for you with the wrong amount of eye contact. You feel...",
    leftLabel: "Lowkey suspicious",
    rightLabel: "Genuinely warmed",
    vibeColor: "nova",
    reaction: "I love a person who notices small kindnesses.",
  },

  // ───────── Neuroticism ─────────
  {
    id: "n1",
    dimension: "neuroticism",
    prompt: "Plans got cancelled at the last minute.",
    leftLabel: "Pure relief",
    rightLabel: "Spiral a little",
    vibeColor: "echo",
    reaction: "Got you — I'll know when to check in.",
  },
  {
    id: "n2",
    dimension: "neuroticism",
    prompt:
      "You read a text from a friend that's just 'we need to talk.'",
    leftLabel: "Cool, I'm calling",
    rightLabel: "I am now physically ill",
    vibeColor: "rex",
    reaction: "Yeah. Yeah I do this too.",
  },
  {
    id: "n3",
    dimension: "neuroticism",
    prompt:
      "You bounce back from setbacks pretty fast — they don't really shake you.",
    leftLabel: "Built different",
    rightLabel: "They stick with me",
    reverse: true,
    vibeColor: "sage",
    reaction: "Resilience and sensitivity aren't opposites.",
  },
  {
    id: "n4",
    dimension: "neuroticism",
    prompt:
      "Quiet moment alone. Your mind drifts to...",
    leftLabel: "Wherever, it's fine",
    rightLabel: "That thing from 2019",
    vibeColor: "aria",
    reaction: "Logged. Now I know how to time the heavy stuff.",
  },
];

// ---------------------------------------------------------------------------
// Scoring
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
    const clamped = Math.max(0, Math.min(100, raw));
    const value = q.reverse ? 100 - clamped : clamped;
    sums[q.dimension] += value;
    counts[q.dimension] += 1;
  }

  const dim = (d: BigFiveDimension): number =>
    counts[d] === 0 ? 50 : Math.round(sums[d] / counts[d]);

  return {
    openness: dim("openness"),
    conscientiousness: dim("conscientiousness"),
    extraversion: dim("extraversion"),
    agreeableness: dim("agreeableness"),
    neuroticism: dim("neuroticism"),
  };
}

export function getDominantTrait(scores: BigFiveScores): BigFiveDimension {
  const entries = Object.entries(scores) as Array<[BigFiveDimension, number]>;
  // Distance from neutral 50 — strongest deviation wins
  entries.sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50));
  return entries[0][0];
}

// ---------------------------------------------------------------------------
// Calibration story — 2 paragraphs, name-checks specific members
// ---------------------------------------------------------------------------
const TRAIT_LINES: Record<
  BigFiveDimension,
  { high: string; low: string; member: string }
> = {
  openness: {
    high: "Nova picked up on how much you light up around new ideas — she's already cooking up tangents you'll love.",
    low: "Sage saw that you prefer ideas with their feet on the ground, so they'll keep things concrete and useful.",
    member: "Nova",
  },
  conscientiousness: {
    high: "Aria noticed your appreciation for structure — expect her to bring receipts, frameworks, and clean follow-throughs.",
    low: "Aria caught that you move by intuition more than plans, so she'll meet you with options instead of itineraries.",
    member: "Aria",
  },
  extraversion: {
    high: "Rex caught your social energy and is fully ready to push, banter, and keep the room loud when you want it loud.",
    low: "Echo noticed you recharge in quieter spaces — she'll keep things gentle and give your voice room to land.",
    member: "Rex",
  },
  agreeableness: {
    high: "Echo heard your warmth and is going to make sure every conversation feels like it actually cares back.",
    low: "Rex appreciated your edge — he'll happily play sparring partner and keep things honest, not polite.",
    member: "Echo",
  },
  neuroticism: {
    high: "Echo picked up on your sensitivity to undercurrents — she'll be the one checking in when things feel heavy.",
    low: "Sage saw your steady center, so she'll trust you with the harder questions when they come up.",
    member: "Echo",
  },
};

export function getCalibrationStory(scores: BigFiveScores): string {
  const dominant = getDominantTrait(scores);
  const lines: string[] = [];

  // Paragraph 1: the dominant trait headline
  const dominantHigh = scores[dominant] >= 50;
  const dominantCopy = dominantHigh
    ? TRAIT_LINES[dominant].high
    : TRAIT_LINES[dominant].low;
  lines.push(
    `The council just spent a minute getting to know you, and here's what landed. ${dominantCopy}`,
  );

  // Paragraph 2: two more notable traits
  const others = (Object.keys(scores) as BigFiveDimension[])
    .filter((d) => d !== dominant)
    .sort((a, b) => Math.abs(scores[b] - 50) - Math.abs(scores[a] - 50))
    .slice(0, 2);

  const secondary = others
    .map((d) => (scores[d] >= 50 ? TRAIT_LINES[d].high : TRAIT_LINES[d].low))
    .join(" ");

  lines.push(
    `${secondary} The rest of the room — the parts of you that landed in between — they'll feel out together as you go. This isn't a fixed read; it's a starting note. The more you talk, the sharper they get.`,
  );

  return lines.join("\n\n");
}

// ---------------------------------------------------------------------------
// Demographics — language + purpose options used by /demographics page
// ---------------------------------------------------------------------------
export const AGE_RANGES = [
  { id: "18-24", label: "18 — 24" },
  { id: "25-34", label: "25 — 34" },
  { id: "35-44", label: "35 — 44" },
  { id: "45+", label: "45+" },
] as const;

export const LANGUAGES = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "es", label: "Español", flag: "🇪🇸" },
  { id: "fr", label: "Français", flag: "🇫🇷" },
  { id: "de", label: "Deutsch", flag: "🇩🇪" },
  { id: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { id: "ja", label: "日本語", flag: "🇯🇵" },
] as const;

export const PURPOSES = [
  { id: "brainstorm", label: "Brainstorm", icon: "lightbulb" },
  { id: "decide", label: "Decide", icon: "fork_right" },
  { id: "vent", label: "Vent", icon: "favorite" },
  { id: "learn", label: "Learn", icon: "school" },
  { id: "play", label: "Play", icon: "sports_esports" },
  { id: "curious", label: "Just curious", icon: "explore" },
] as const;

export type DemographicsProfile = {
  name: string;
  ageRange: string;
  language: string;
  location?: string;
  purposes: string[];
};

// ---------------------------------------------------------------------------
// LocalStorage keys (used until backend is wired)
// ---------------------------------------------------------------------------
export const STORAGE_KEYS = {
  profile: "manyminds:profile",
  personality: "manyminds:personality",
} as const;
