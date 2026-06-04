// Pure function: generate council commentary based on a move and game state.
// Returns null when no one feels like piping up.

import type { GameState, Move, Piece } from "@/lib/games/chess";
import type { CouncilMemberId } from "@/lib/design-tokens";

export type CommentaryEntry = {
  memberId: CouncilMemberId;
  text: string;
};

const RNG = <T,>(arr: ReadonlyArray<T>): T =>
  arr[Math.floor(Math.random() * arr.length)];

// In-character lines per situation.
const LINES = {
  capture: {
    rex: [
      "Oh that's nasty. Just took it. Beautiful.",
      "Knife in. Twist. Love it.",
      "Mercy is for poker, not chess.",
    ],
    nova: [
      "Drama! I felt that one in my spine.",
      "Okay, that's a move with feelings.",
    ],
  } as Record<string, string[]>,
  bigCapture: {
    rex: ["YEP. There it is. The queen falls.", "Did anyone else just hear that?"],
    aria: ["A material swing. The evaluation just shifted hard.", "That changes everything."],
    echo: ["Oof. Brutal — but kind of poetic.", "I felt that one too."],
  } as Record<string, string[]>,
  check: {
    aria: ["Check. Limit their options now.", "Check — they have three legal moves max."],
    rex: ["Run, little king. Run.", "Hands up, your highness."],
    sage: ["Pressure builds. Force them where you want them."],
  } as Record<string, string[]>,
  knight: {
    sage: [
      "Knights are slow but vicious. Good square.",
      "I like the development. Knights before bishops.",
      "Outpost incoming — keep the tempo.",
    ],
  } as Record<string, string[]>,
  pawn2: {
    echo: ["Nice and patient. Let the position breathe.", "Slow chess is honest chess."],
    sage: ["Holding the center. Foundations first."],
  } as Record<string, string[]>,
  castleLikeKing: {
    aria: ["King safety. Always king safety."],
  } as Record<string, string[]>,
  earlyQueen: {
    aria: ["Early queen activity — Aria does not approve.", "She's exposed. Be careful."],
    rex: ["I LIKE it. Queen up the middle, who needs theory."],
  } as Record<string, string[]>,
  promotion: {
    nova: ["A new queen has entered the chat.", "A coronation. I love coronations."],
    rex: ["From peasant to god. That's MY kind of arc."],
  } as Record<string, string[]>,
  checkmate: {
    aria: ["Mate. Game's done.", "Checkmate. Calculated."],
    rex: ["GAME OVER. We did the thing.", "Get him out of here."],
    nova: ["The end credits roll on this one."],
    echo: ["A clean finish. Felt earned.", "That was a good one."],
    sage: ["Endgame technique. Textbook."],
  } as Record<string, string[]>,
  stalemate: {
    aria: ["Stalemate. Half a point each.", "We boxed them in too well. Draw."],
    rex: ["Wait, NOTHING happens? That's so anticlimactic.", "Yawn."],
  } as Record<string, string[]>,
  ariaThinking: {
    aria: [
      "I'm looking three deep. Give me a sec.",
      "Calculating. Don't talk to me.",
      "Hmm, the position is sharper than it looks.",
    ],
  } as Record<string, string[]>,
  blunder: {
    aria: ["That… is not the move I would have played.", "Material is leaking here."],
    echo: ["It's okay. Recover, refocus.", "Don't tilt — there's still play."],
  } as Record<string, string[]>,
  brilliant: {
    sage: ["Beautiful. I see what you're doing.", "Long-term play. Respect."],
    nova: ["Goosebumps. That's art."],
    aria: ["High accuracy move. Engine agrees."],
  } as Record<string, string[]>,
  generic: {
    sage: ["Reasonable continuation.", "Building slowly."],
    echo: ["Looking good. Stay grounded.", "Trust the line."],
    nova: ["The board is humming."],
  } as Record<string, string[]>,
} as const;

function pick(
  bucket: Record<string, string[]>,
): CommentaryEntry | null {
  const ids = Object.keys(bucket) as CouncilMemberId[];
  if (ids.length === 0) return null;
  const id = ids[Math.floor(Math.random() * ids.length)];
  const lines = bucket[id];
  if (!lines || lines.length === 0) return null;
  return { memberId: id, text: RNG(lines) };
}

/**
 * Returns a single commentary line, or null. Inputs are the state BEFORE the move,
 * the move played, and the state AFTER.
 */
export function commentOnMove(
  before: GameState,
  move: Move,
  after: GameState,
): CommentaryEntry | null {
  // Outcome lines come first.
  if (after.checkmate) return pick(LINES.checkmate);
  if (after.stalemate) return pick(LINES.stalemate);

  // Big drama: queen captured
  if (move.capture === "q") return pick(LINES.bigCapture);

  // Promotion
  if (move.promotion) return pick(LINES.promotion);

  // Check
  if (after.check) {
    // 70% chance check comment, otherwise generic
    if (Math.random() < 0.7) return pick(LINES.check);
  }

  // Capture
  if (move.capture) return pick(LINES.capture);

  const mover: Piece | null = before.board[move.from];
  if (!mover) return pick(LINES.generic);

  // Knight move
  if (mover.type === "n" && Math.random() < 0.55) return pick(LINES.knight);

  // Pawn 2-step
  if (mover.type === "p") {
    const r1 = parseInt(move.from[1], 10);
    const r2 = parseInt(move.to[1], 10);
    if (Math.abs(r1 - r2) === 2 && Math.random() < 0.5) return pick(LINES.pawn2);
  }

  // Early queen development (within first 6 plies)
  if (mover.type === "q" && before.history.length < 6 && Math.random() < 0.7) {
    return pick(LINES.earlyQueen);
  }

  // Generic ~40% of the time
  if (Math.random() < 0.4) return pick(LINES.generic);
  return null;
}

export function ariaThinkingLine(): CommentaryEntry {
  const lines = LINES.ariaThinking.aria;
  return { memberId: "aria", text: lines[Math.floor(Math.random() * lines.length)] };
}

export function outroLine(
  result: "userWin" | "aiWin" | "draw",
): CommentaryEntry {
  if (result === "userWin") {
    const opts: CommentaryEntry[] = [
      { memberId: "rex", text: "You cooked Aria. I'll remember this." },
      { memberId: "nova", text: "Big win. We're framing this one." },
      { memberId: "echo", text: "Proud of you. Real proud." },
    ];
    return RNG(opts);
  }
  if (result === "aiWin") {
    const opts: CommentaryEntry[] = [
      { memberId: "aria", text: "Good game. The position got away from you on move 14." },
      { memberId: "sage", text: "Lots to learn from this one. We'll review it." },
      { memberId: "echo", text: "Shake it off. Next one's yours." },
    ];
    return RNG(opts);
  }
  return { memberId: "aria", text: "Draw. Honors even." };
}
