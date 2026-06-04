// Simplified Ludo engine — 40-step main track + 4-step home stretch per player.
// Cross-shape rendering happens in the UI; the simulation just tracks token positions.
// 4 players: blue (user), red (Rex), yellow (Nova), green (Echo).

import type { CouncilMemberId } from "@/lib/design-tokens";

export type LudoColor = "blue" | "red" | "yellow" | "green";

export type LudoPlayer = {
  color: LudoColor;
  name: string;
  isUser: boolean;
  /** Council member who is this player; user has no memberId. */
  memberId: CouncilMemberId | null;
};

/**
 * Token state:
 *  - kind "home": at home base (hasn't entered the board yet).
 *  - kind "track": on the main 40-step shared track at position `pos` (0..39).
 *      Each color has a different start index, so "pos" is global.
 *  - kind "stretch": on the home stretch (0..3).
 *  - kind "finished": made it to center.
 */
export type Token =
  | { kind: "home"; color: LudoColor; id: number }
  | { kind: "track"; color: LudoColor; id: number; pos: number; stepsTaken: number }
  | { kind: "stretch"; color: LudoColor; id: number; pos: number }
  | { kind: "finished"; color: LudoColor; id: number };

export type LudoState = {
  players: LudoPlayer[];
  turn: LudoColor;
  dice: number | null; // last roll, null = need to roll
  tokens: Token[]; // 16 total: 4 per player
  winner: LudoColor | null;
  /** if true, next action is a re-roll because of a 6 */
  extraTurn: boolean;
  message: string;
};

export const TRACK_LENGTH = 40;
export const STRETCH_LENGTH = 4;
export const TOKENS_PER_PLAYER = 4;

const START_INDEX: Record<LudoColor, number> = {
  blue: 0,
  red: 10,
  yellow: 20,
  green: 30,
};

/** Safe squares on the track (typically start squares + a few stars). */
export const SAFE_SQUARES: ReadonlySet<number> = new Set([0, 8, 10, 18, 20, 28, 30, 38]);

const PLAYER_ORDER: LudoColor[] = ["blue", "red", "yellow", "green"];

export const COLOR_TO_MEMBER: Record<LudoColor, CouncilMemberId | null> = {
  blue: null, // user
  red: "rex",
  yellow: "nova",
  green: "echo",
};

export function initialLudo(): LudoState {
  const players: LudoPlayer[] = [
    { color: "blue", name: "You", isUser: true, memberId: null },
    { color: "red", name: "Rex", isUser: false, memberId: "rex" },
    { color: "yellow", name: "Nova", isUser: false, memberId: "nova" },
    { color: "green", name: "Echo", isUser: false, memberId: "echo" },
  ];
  const tokens: Token[] = [];
  for (const c of PLAYER_ORDER) {
    for (let i = 0; i < TOKENS_PER_PLAYER; i++) {
      tokens.push({ kind: "home", color: c, id: i });
    }
  }
  return {
    players,
    turn: "blue",
    dice: null,
    tokens,
    winner: null,
    extraTurn: false,
    message: "Your turn. Roll the die.",
  };
}

// ---------- Movement ----------

/** Convert global track pos -> "distance from this color's start". */
function distFromStart(color: LudoColor, pos: number): number {
  const s = START_INDEX[color];
  return (pos - s + TRACK_LENGTH) % TRACK_LENGTH;
}

/**
 * Returns the resulting Token if `tok` advances by `steps`, or null if illegal.
 * Does not mutate state, doesn't handle captures yet.
 */
export function computeAdvance(
  tok: Token,
  steps: number,
): Token | null {
  if (tok.kind === "finished") return null;

  if (tok.kind === "home") {
    if (steps !== 6) return null;
    return {
      kind: "track",
      color: tok.color,
      id: tok.id,
      pos: START_INDEX[tok.color],
      stepsTaken: 0,
    };
  }

  if (tok.kind === "track") {
    const newStepsTaken = tok.stepsTaken + steps;
    // total distance to finish = TRACK_LENGTH + STRETCH_LENGTH = 44
    // We need: 39 steps around the track to reach last track square, then enter stretch.
    if (newStepsTaken < TRACK_LENGTH) {
      const newPos = (tok.pos + steps) % TRACK_LENGTH;
      return {
        kind: "track",
        color: tok.color,
        id: tok.id,
        pos: newPos,
        stepsTaken: newStepsTaken,
      };
    }
    // moving into the stretch
    const stretchPos = newStepsTaken - TRACK_LENGTH;
    if (stretchPos < STRETCH_LENGTH) {
      return { kind: "stretch", color: tok.color, id: tok.id, pos: stretchPos };
    }
    if (stretchPos === STRETCH_LENGTH) {
      return { kind: "finished", color: tok.color, id: tok.id };
    }
    return null; // overshoot
  }

  if (tok.kind === "stretch") {
    const newPos = tok.pos + steps;
    if (newPos < STRETCH_LENGTH) {
      return { kind: "stretch", color: tok.color, id: tok.id, pos: newPos };
    }
    if (newPos === STRETCH_LENGTH) {
      return { kind: "finished", color: tok.color, id: tok.id };
    }
    return null;
  }

  return null;
}

/** All legal tokens that can be moved by the current player with the current dice. */
export function legalTokens(state: LudoState): Token[] {
  if (state.dice === null || state.winner) return [];
  const mine = state.tokens.filter((t) => t.color === state.turn);
  const result: Token[] = [];
  for (const t of mine) {
    const next = computeAdvance(t, state.dice);
    if (!next) continue;
    // Disallow moving onto own token stacked at non-safe destination? Standard ludo allows stacking; we'll allow.
    // Disallow capturing on safe squares: a token landing on a safe square with an opponent there does not capture.
    result.push(t);
  }
  return result;
}

/** Apply a roll: produces a new state with state.dice set. */
export function rollDice(state: LudoState): LudoState {
  if (state.winner) return state;
  const roll = 1 + Math.floor(Math.random() * 6);
  const msg = `${nameOf(state, state.turn)} rolled a ${roll}.`;
  return { ...state, dice: roll, message: msg };
}

/** Apply moving token with id+color using the current dice. */
export function applyTokenMove(
  state: LudoState,
  color: LudoColor,
  tokenId: number,
): LudoState {
  if (state.dice === null || state.winner) return state;
  if (state.turn !== color) return state;
  const idx = state.tokens.findIndex((t) => t.color === color && t.id === tokenId);
  if (idx < 0) return state;
  const tok = state.tokens[idx];
  const advanced = computeAdvance(tok, state.dice);
  if (!advanced) return state;

  let tokens = state.tokens.slice();
  tokens[idx] = advanced;

  let captureMsg: string | null = null;
  // Capture logic: if advanced is on the track, on a non-safe square, and there's exactly 1 opponent there
  if (advanced.kind === "track" && !SAFE_SQUARES.has(advanced.pos)) {
    const occupants = tokens.filter(
      (t, i) =>
        i !== idx &&
        t.kind === "track" &&
        t.color !== advanced.color &&
        t.pos === advanced.pos,
    );
    if (occupants.length === 1) {
      const victim = occupants[0];
      tokens = tokens.map((t) =>
        t === victim
          ? ({ kind: "home", color: victim.color, id: victim.id } as Token)
          : t,
      );
      captureMsg = `${nameOf(state, advanced.color)} captured ${nameOf(state, victim.color)}'s token!`;
    }
  }

  // Win check
  const colorTokens = tokens.filter((t) => t.color === color);
  const allFinished = colorTokens.every((t) => t.kind === "finished");
  const winner = allFinished ? color : null;

  // Determine if extra turn (rolled a 6 OR captured OR token finished)
  const wasSix = state.dice === 6;
  const finishedJustNow = advanced.kind === "finished";
  const extraTurn = !winner && (wasSix || !!captureMsg || finishedJustNow);

  const nextTurn = extraTurn ? state.turn : nextPlayer(state.turn);
  let message = captureMsg ?? `${nameOf(state, color)} advanced.`;
  if (winner) message = `${nameOf(state, color)} wins!`;
  else if (extraTurn) message += " Extra turn.";

  return {
    ...state,
    tokens,
    dice: null,
    extraTurn,
    winner,
    turn: nextTurn,
    message,
  };
}

/** Skip turn (no legal move). */
export function skipTurn(state: LudoState): LudoState {
  if (state.winner) return state;
  return {
    ...state,
    dice: null,
    extraTurn: false,
    turn: nextPlayer(state.turn),
    message: `${nameOf(state, state.turn)} had no legal moves. Next.`,
  };
}

function nextPlayer(c: LudoColor): LudoColor {
  const i = PLAYER_ORDER.indexOf(c);
  return PLAYER_ORDER[(i + 1) % PLAYER_ORDER.length];
}

function nameOf(state: LudoState, c: LudoColor): string {
  return state.players.find((p) => p.color === c)?.name ?? c;
}

// ---------- AI ----------

/** Rule-based AI pick. Returns null if no legal move. */
export function pickAITokenMove(state: LudoState): { tokenId: number } | null {
  const legals = legalTokens(state);
  if (legals.length === 0) return null;

  type Scored = { token: Token; score: number };
  const dice = state.dice!;
  const scored: Scored[] = legals.map((tok) => {
    let score = 0;
    const next = computeAdvance(tok, dice)!;

    // Priority 1: get a token out of home on a 6
    if (tok.kind === "home" && dice === 6) score += 50;

    // Priority 2: capture
    if (next.kind === "track" && !SAFE_SQUARES.has(next.pos)) {
      const captureCount = state.tokens.filter(
        (t) =>
          t.kind === "track" &&
          t.color !== next.color &&
          t.pos === next.pos,
      ).length;
      if (captureCount === 1) score += 80;
    }

    // Priority 3: finish a token
    if (next.kind === "finished") score += 70;

    // Priority 4: enter stretch
    if (next.kind === "stretch" && tok.kind === "track") score += 30;

    // Priority 5: advance leading token
    if (tok.kind === "track") score += tok.stepsTaken * 0.5;
    if (tok.kind === "stretch") score += 20 + tok.pos * 2;

    // Priority 6: land on safe square
    if (next.kind === "track" && SAFE_SQUARES.has(next.pos)) score += 10;

    // Avoid being captured: if landing on non-safe near an opponent, penalize a bit
    if (next.kind === "track" && !SAFE_SQUARES.has(next.pos)) {
      const threats = state.tokens.filter((t) => {
        if (t.kind !== "track") return false;
        if (t.color === next.color) return false;
        const distBehind = (next.pos - t.pos + TRACK_LENGTH) % TRACK_LENGTH;
        return distBehind >= 1 && distBehind <= 6;
      }).length;
      score -= threats * 5;
    }

    return { token: tok, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return { tokenId: scored[0].token.id };
}

// ---------- Commentary ----------

export type LudoCommentary = { memberId: CouncilMemberId; text: string };

export function commentOnLudoEvent(
  event:
    | { kind: "roll"; color: LudoColor; value: number }
    | { kind: "capture"; by: LudoColor; victim: LudoColor }
    | { kind: "home-out"; color: LudoColor }
    | { kind: "finish"; color: LudoColor }
    | { kind: "win"; color: LudoColor }
    | { kind: "skip"; color: LudoColor }
    | { kind: "six"; color: LudoColor },
): LudoCommentary | null {
  const r = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  if (event.kind === "capture") {
    if (event.victim === "blue") {
      return r<LudoCommentary>([
        { memberId: "rex", text: "Sent right back to the start. Iconic." },
        { memberId: "echo", text: "Oh, that one hurt. I felt it." },
      ]);
    }
    if (event.by === "blue") {
      return r<LudoCommentary>([
        { memberId: "rex", text: "EXCUSE me, that was MY token!" },
        { memberId: "nova", text: "Look at you. Cold blooded." },
      ]);
    }
    return r<LudoCommentary>([
      { memberId: "rex", text: "Brutal. Love that for us." },
      { memberId: "echo", text: "Welcome home, little token." },
    ]);
  }

  if (event.kind === "win") {
    if (event.color === "blue") {
      return { memberId: "rex", text: "Congrats, you cooked all of us. I'm filing a complaint." };
    }
    if (event.color === "red") {
      return { memberId: "rex", text: "GUESS WHO. I'll be in my trailer." };
    }
    if (event.color === "yellow") {
      return { memberId: "nova", text: "Look at me. The chaos child wins again." };
    }
    return { memberId: "echo", text: "Slow and gentle. We got there." };
  }

  if (event.kind === "home-out" && event.color === "blue") {
    return { memberId: "nova", text: "A token has entered the chat." };
  }

  if (event.kind === "six") {
    return r<LudoCommentary>([
      { memberId: "rex", text: "A SIX. Go again, you menace." },
      { memberId: "aria", text: "Six. Optimal." },
    ]);
  }

  if (event.kind === "finish") {
    return r<LudoCommentary>([
      { memberId: "sage", text: "One token home. Slow progress wins." },
      { memberId: "nova", text: "A token reaches Nirvana." },
    ]);
  }

  return null;
}
