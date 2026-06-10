/**
 * The Journey — single source of truth for the landing cinematic.
 *
 * One persistent 3D world, one master scroll progress (0..1 across the
 * JourneyHero section). The camera travels through it in acts:
 *
 *   boot      (time-driven)   members materialize on a cyber platform
 *   breakout  0.00 → 0.06     platform shatters; they drop through the floor
 *   fall      0.06 → 0.34     plunge down a shaft of 7 stacked diorama worlds
 *   landing   0.34 → 0.40     decelerate + touch down in the café
 *   council   0.40 → 0.52     seated around a real table, lively conversation
 *   glide1    0.52 → 0.56     the floor opens — descent to the debate hall
 *   debate    0.56 → 0.72     6 scripted rounds, side lighting, speech bubbles
 *   glide2    0.72 → 0.76     descend again, on to the games den
 *   games     0.76 → 0.90     two play, three watch, banter chat
 *   finale    0.90 → 1.00     pull-back to a dollhouse cutaway of the tower + CTA
 *
 * Both the 3D scene (JourneyScene) and the HTML shell (JourneyHero) import
 * from here — neither hardcodes a number the other needs.
 */

import type { CouncilMemberId } from "../positions";

// ---------------------------------------------------------------------------
// Acts
// ---------------------------------------------------------------------------

export type JourneyAct =
  | "boot"
  | "breakout"
  | "fall"
  | "landing"
  | "council"
  | "glide1"
  | "debate"
  | "glide2"
  | "games"
  | "finale";

export const BOOT_DURATION = 2.6; // s — terminal types, members materialize
export const WAVE_DURATION = 1.4; // s — all five wave before scroll takes over

export const ACT_BOUNDS = {
  breakoutEnd: 0.06,
  fallEnd: 0.34,
  landingEnd: 0.4,
  councilEnd: 0.52,
  glide1End: 0.56,
  debateEnd: 0.72,
  glide2End: 0.76,
  gamesEnd: 0.9,
} as const;

/** Scroll-resolved act (boot/wave are time-driven and resolved by the scene). */
export function actAt(p: number): Exclude<JourneyAct, "boot"> {
  if (p < ACT_BOUNDS.breakoutEnd) return "breakout";
  if (p < ACT_BOUNDS.fallEnd) return "fall";
  if (p < ACT_BOUNDS.landingEnd) return "landing";
  if (p < ACT_BOUNDS.councilEnd) return "council";
  if (p < ACT_BOUNDS.glide1End) return "glide1";
  if (p < ACT_BOUNDS.debateEnd) return "debate";
  if (p < ACT_BOUNDS.glide2End) return "glide2";
  if (p < ACT_BOUNDS.gamesEnd) return "games";
  return "finale";
}

const ACT_RANGES: Record<Exclude<JourneyAct, "boot">, [number, number]> = {
  breakout: [0, ACT_BOUNDS.breakoutEnd],
  fall: [ACT_BOUNDS.breakoutEnd, ACT_BOUNDS.fallEnd],
  landing: [ACT_BOUNDS.fallEnd, ACT_BOUNDS.landingEnd],
  council: [ACT_BOUNDS.landingEnd, ACT_BOUNDS.councilEnd],
  glide1: [ACT_BOUNDS.councilEnd, ACT_BOUNDS.glide1End],
  debate: [ACT_BOUNDS.glide1End, ACT_BOUNDS.debateEnd],
  glide2: [ACT_BOUNDS.debateEnd, ACT_BOUNDS.glide2End],
  games: [ACT_BOUNDS.glide2End, ACT_BOUNDS.gamesEnd],
  finale: [ACT_BOUNDS.gamesEnd, 1],
};

/** Local 0..1 progress within an act. */
export function actLocal(p: number, act: Exclude<JourneyAct, "boot">): number {
  const [a, b] = ACT_RANGES[act];
  if (b <= a) return 0;
  return Math.max(0, Math.min(1, (p - a) / (b - a)));
}

// ---------------------------------------------------------------------------
// World geometry — the vertical shaft + ground-level zones
// ---------------------------------------------------------------------------

export const JOURNEY_WORLD_ORDER = [
  "mountain",
  "zen",
  "forest",
  "rooftop",
  "beach",
  "library",
  "cafe",
] as const;

export type JourneyWorldId = (typeof JOURNEY_WORLD_ORDER)[number];

export const N_WORLDS = JOURNEY_WORLD_ORDER.length; // 7
export const WORLD_GAP = 22; // vertical distance between stacked worlds
export const WORLD_TOP_Y = (N_WORLDS - 1) * WORLD_GAP; // 132 — mountain
export const CYBER_Y = WORLD_TOP_Y + WORLD_GAP; // 154 — the digital void

/** Altitude of world i in the shaft. mountain (i=0) top … cafe (i=6) at y=0. */
export function worldYFor(i: number): number {
  return (N_WORLDS - 1 - i) * WORLD_GAP;
}

/** Tower floor y offsets (all centred on x=0). The café (y=0) doubles as the
 *  council floor; the debate hall and games den are stacked floors BELOW it
 *  and the camera descends the shaft between them. The gap equals WORLD_GAP,
 *  so the descent rhythm matches the fall rhythm. */
export const ZONE_Y = {
  council: 0,
  debate: -WORLD_GAP,
  games: -2 * WORLD_GAP,
} as const;

/** Fraction of each glide act spent HOLDING at the departure floor while it
 *  "opens" (the dressing dissolves) before the members actually drop. Shared
 *  by the scene's motion curves and choreography's animation switches. */
export const GLIDE_HOLD = 0.22;

export const WORLD_LABELS: Record<JourneyWorldId, { name: string; line: string }> = {
  mountain: { name: "Mountain", line: "Falling from peak silence." },
  zen: { name: "Zen Garden", line: "The garden barely stirs." },
  forest: { name: "Forest", line: "A canopy of hush." },
  rooftop: { name: "Rooftop", line: "Dusk on the city's shoulders." },
  beach: { name: "Beach", line: "Salt air, a horizon." },
  library: { name: "Library", line: "Warm light and paper." },
  cafe: { name: "Café", line: "And finally — a table." },
};

/** Fog / background colour per context. The scene damps between these. */
export const WORLD_FOG: Record<JourneyWorldId | "cyber", string> = {
  cyber: "#04070c",
  mountain: "#1b3050",
  zen: "#caa08e",
  forest: "#16352d",
  rooftop: "#2a1b3a",
  beach: "#8fc3da",
  library: "#2a1a14",
  cafe: "#2c211c",
};

// ---------------------------------------------------------------------------
// Member arrangements (floor-local x/z; the scene adds the ZONE_Y floor offsets)
// ---------------------------------------------------------------------------

export interface MemberPose {
  x: number;
  z: number;
  rotY: number;
}

export const MEMBER_ORDER: ReadonlyArray<CouncilMemberId> = [
  "aria",
  "rex",
  "sage",
  "nova",
  "echo",
];

/** Boot line-up on the cyber platform — shoulder to shoulder, facing camera. */
export const LINE_ARRANGEMENT: Record<CouncilMemberId, MemberPose> = (() => {
  const out = {} as Record<CouncilMemberId, MemberPose>;
  MEMBER_ORDER.forEach((id, i) => {
    out[id] = { x: (i - 2) * 1.5, z: 0, rotY: 0 };
  });
  return out;
})();

/** Council circle around the table — 240° arc, radius 2.3, facing center. */
export const COUNCIL_ARRANGEMENT: Record<CouncilMemberId, MemberPose> = (() => {
  const out = {} as Record<CouncilMemberId, MemberPose>;
  const R = 2.3;
  MEMBER_ORDER.forEach((id, i) => {
    const a = ((-210 + i * 60) * Math.PI) / 180;
    const x = Math.cos(a) * R;
    const z = Math.sin(a) * R;
    out[id] = { x, z, rotY: Math.atan2(-x, -z) };
  });
  return out;
})();

/** Debate stage — pro pair stage-left, con pair stage-right, Sage moderating. */
export const DEBATE_ARRANGEMENT: Record<CouncilMemberId, MemberPose> = {
  aria: { x: -3.2, z: 0.4, rotY: 1.15 },
  echo: { x: -1.8, z: 0.8, rotY: 1.0 },
  rex: { x: 3.2, z: 0.4, rotY: -1.15 },
  nova: { x: 1.8, z: 0.8, rotY: -1.0 },
  sage: { x: 0, z: -1.6, rotY: 0 },
};

/** Games lounge — Aria & Rex seated across the board, three spectators. */
export const GAMES_ARRANGEMENT: Record<
  CouncilMemberId,
  MemberPose & { role: "player" | "spectator" }
> = {
  aria: { x: -1.05, z: 0.9, rotY: 1.45, role: "player" },
  rex: { x: 1.05, z: 0.9, rotY: -1.45, role: "player" },
  sage: { x: -2.5, z: -0.7, rotY: 0.55, role: "spectator" },
  nova: { x: 0, z: -1.7, rotY: 0, role: "spectator" },
  echo: { x: 2.5, z: -0.7, rotY: -0.55, role: "spectator" },
};

/** Games table centre (zone-local) — the dressing and the scene both use it. */
export const GAMES_TABLE_CENTER = { x: 0, z: 0.9 } as const;

/** Stool seat height — sitting clips put hips ≈ here at member scale 1.45. */
export const SEAT_TOP_Y = 0.62;

// ---------------------------------------------------------------------------
// Personality plumbing
// ---------------------------------------------------------------------------

export const TALKING_VARIANTS: Record<CouncilMemberId, 0 | 1 | 2> = {
  aria: 0,
  rex: 2,
  sage: 1,
  nova: 2,
  echo: 0,
};

// ---------------------------------------------------------------------------
// Scripts — every spoken line on the journey lives here
// ---------------------------------------------------------------------------

export const BOOT_LINES = [
  "> initializing council...",
  "> linking aria.glb ........ [OK]",
  "> linking rex.glb  ........ [OK]",
  "> linking sage.glb ........ [OK]",
  "> linking nova.glb ........ [OK]",
  "> linking echo.glb ........ [OK]",
  "> council online.",
] as const;
export const BOOT_LINE_INTERVAL = 0.35; // s between terminal lines

export interface DebateRound {
  speaker: CouncilMemberId;
  side: "pro" | "con" | "mod";
  line: string;
}

// The dialogue rule for everything below: the five talk like a real friend
// group, fully inside their own world. They NEVER mention "users", "products",
// "AI", or anything else that breaks the fiction — a visitor should feel like
// they walked in on a conversation, not a pitch.
export const DEBATE_ROUNDS: ReadonlyArray<DebateRound> = [
  { speaker: "sage", side: "mod", line: "Tonight's motion: the best nights are the planned ones. Aria and Echo say yes. Rex and Nova — obviously — say no." },
  { speaker: "aria", side: "pro", line: "Every 'spontaneous' great night I've charted had a planner hiding in it. Someone booked the table. You're welcome." },
  { speaker: "rex", side: "con", line: "Name one legendary story that starts with 'so we stuck to the itinerary.' I'll wait." },
  { speaker: "echo", side: "pro", line: "A plan isn't a cage. It's how you tell someone you were looking forward to them." },
  { speaker: "nova", side: "con", line: "The best nights aren't on any map! You take the weird turn. The weird turn IS the night." },
  { speaker: "sage", side: "mod", line: "Ruling: we plan the first hour, then let Nova drive. Court adjourned." },
];

export interface GameChatLine {
  at: number; // games-act local progress threshold
  speaker: CouncilMemberId;
  line: string;
}

export const GAME_CHAT: ReadonlyArray<GameChatLine> = [
  { at: 0.06, speaker: "sage", line: "She's been staring at that bishop for a full minute. Here we go." },
  { at: 0.18, speaker: "rex", line: "What if I just sacrifice my queen. As a bit." },
  { at: 0.3, speaker: "nova", line: "Do it. Be the chaos you wish to see on the board." },
  { at: 0.45, speaker: "echo", line: "Rex, the last time you 'did the bit' you sulked for two days." },
  { at: 0.6, speaker: "aria", line: "Mate in two if he takes the pawn. Not that I'd ever say it out loud." },
  { at: 0.76, speaker: "rex", line: "I'm not taking the pawn. I can see her smiling. I'm not falling for it." },
  // Punchline lands at games-local 0.84 → fully readable BEFORE the chat
  // panel starts its fade-out near the act boundary.
  { at: 0.84, speaker: "sage", line: "He took the pawn." },
];

/** Short seated small-talk, one shown whenever the council speaker rotates. */
export const COUNCIL_CHATTER: Record<CouncilMemberId, ReadonlyArray<string>> = {
  aria: ["Okay, actual agenda: who picked the falling entrance? I want names.", "I made a spreadsheet about this. Obviously."],
  rex: ["Hot take: falling was the best part.", "I vote we do that again. Immediately."],
  sage: ["Notice how each room changed us a little.", "Long way down. Worth it."],
  nova: ["I LIVED for the rooftop. The colours!", "Can our next table be on the beach? Outvote me, cowards."],
  echo: ["Everyone okay after that drop?", "This is nice. All of us, one table."],
};

// ---------------------------------------------------------------------------
// Act-state callback — the only data channel from scene → HTML shell
// ---------------------------------------------------------------------------

export interface JourneyActState {
  act: JourneyAct;
  /** 0..6 during the fall; clamps to 6 (café) after. */
  worldIndex: number;
  /** Index into DEBATE_ROUNDS, or -1 outside the debate act. */
  debateRound: number;
  /** How many GAME_CHAT lines are revealed (0 outside games). */
  gameChatCount: number;
  /** Who is currently talking at the council table (null outside). */
  councilSpeaker: CouncilMemberId | null;
}
