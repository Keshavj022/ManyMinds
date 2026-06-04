// Pure functional chess engine. No React, no IO.
// Standard movement, check, checkmate, stalemate, pawn promotion.
// Castling and threefold repetition omitted intentionally to keep this tight.

export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Square = `${File}${Rank}`;
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type Color = "w" | "b";
export type Piece = { type: PieceType; color: Color };
export type Board = Record<Square, Piece | null>;
export type Move = {
  from: Square;
  to: Square;
  promotion?: PieceType;
  capture?: PieceType;
  enPassant?: boolean;
  pieceType?: PieceType;
};
export type GameState = {
  board: Board;
  turn: Color;
  history: Move[];
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
  enPassantTarget: Square | null;
};

const FILES: File[] = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8];

export const ALL_SQUARES: Square[] = (() => {
  const out: Square[] = [];
  for (const f of FILES) for (const r of RANKS) out.push(`${f}${r}` as Square);
  return out;
})();

function sq(f: number, r: number): Square | null {
  if (f < 0 || f > 7 || r < 1 || r > 8) return null;
  return `${FILES[f]}${r}` as Square;
}

function decompose(s: Square): [number, number] {
  return [FILES.indexOf(s[0] as File), parseInt(s[1], 10)];
}

function emptyBoard(): Board {
  const b: Record<string, Piece | null> = {};
  for (const s of ALL_SQUARES) b[s] = null;
  return b as Board;
}

function setupBoard(): Board {
  const b = emptyBoard();
  const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let i = 0; i < 8; i++) {
    b[`${FILES[i]}2` as Square] = { type: "p", color: "w" };
    b[`${FILES[i]}7` as Square] = { type: "p", color: "b" };
    b[`${FILES[i]}1` as Square] = { type: back[i], color: "w" };
    b[`${FILES[i]}8` as Square] = { type: back[i], color: "b" };
  }
  return b;
}

export const INITIAL: GameState = {
  board: setupBoard(),
  turn: "w",
  history: [],
  check: false,
  checkmate: false,
  stalemate: false,
  enPassantTarget: null,
};

// ============ Raw piece movement (no legality check for own-king-check) ============

function pawnTargets(
  board: Board,
  from: Square,
  color: Color,
  enPassantTarget: Square | null,
): Square[] {
  const [f, r] = decompose(from);
  const dir = color === "w" ? 1 : -1;
  const startRank = color === "w" ? 2 : 7;
  const targets: Square[] = [];

  // forward 1
  const fwd1 = sq(f, r + dir);
  if (fwd1 && board[fwd1] === null) {
    targets.push(fwd1);
    // forward 2 from start
    if (r === startRank) {
      const fwd2 = sq(f, r + 2 * dir);
      if (fwd2 && board[fwd2] === null) targets.push(fwd2);
    }
  }
  // captures
  for (const df of [-1, 1]) {
    const cap = sq(f + df, r + dir);
    if (!cap) continue;
    const occ = board[cap];
    if (occ && occ.color !== color) targets.push(cap);
    else if (cap === enPassantTarget) targets.push(cap);
  }
  return targets;
}

function rideTargets(
  board: Board,
  from: Square,
  color: Color,
  deltas: ReadonlyArray<[number, number]>,
  slide: boolean,
): Square[] {
  const [f, r] = decompose(from);
  const targets: Square[] = [];
  for (const [df, dr] of deltas) {
    let nf = f + df;
    let nr = r + dr;
    while (true) {
      const t = sq(nf, nr);
      if (!t) break;
      const occ = board[t];
      if (occ === null) {
        targets.push(t);
      } else {
        if (occ.color !== color) targets.push(t);
        break;
      }
      if (!slide) break;
      nf += df;
      nr += dr;
    }
  }
  return targets;
}

const ROOK_DIRS: ReadonlyArray<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const BISHOP_DIRS: ReadonlyArray<[number, number]> = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const QUEEN_DIRS: ReadonlyArray<[number, number]> = [...ROOK_DIRS, ...BISHOP_DIRS];
const KING_DIRS = QUEEN_DIRS;
const KNIGHT_DELTAS: ReadonlyArray<[number, number]> = [
  [1, 2],
  [2, 1],
  [-1, 2],
  [-2, 1],
  [1, -2],
  [2, -1],
  [-1, -2],
  [-2, -1],
];

function pieceTargets(
  board: Board,
  from: Square,
  enPassantTarget: Square | null,
): Square[] {
  const piece = board[from];
  if (!piece) return [];
  switch (piece.type) {
    case "p":
      return pawnTargets(board, from, piece.color, enPassantTarget);
    case "n":
      return rideTargets(board, from, piece.color, KNIGHT_DELTAS, false);
    case "b":
      return rideTargets(board, from, piece.color, BISHOP_DIRS, true);
    case "r":
      return rideTargets(board, from, piece.color, ROOK_DIRS, true);
    case "q":
      return rideTargets(board, from, piece.color, QUEEN_DIRS, true);
    case "k":
      return rideTargets(board, from, piece.color, KING_DIRS, false);
  }
}

// ============ Check & legal-move filtering ============

function findKing(board: Board, color: Color): Square | null {
  for (const s of ALL_SQUARES) {
    const p = board[s];
    if (p && p.type === "k" && p.color === color) return s;
  }
  return null;
}

function isSquareAttacked(board: Board, target: Square, byColor: Color): boolean {
  for (const s of ALL_SQUARES) {
    const p = board[s];
    if (!p || p.color !== byColor) continue;
    // En-passant attacks don't matter for check detection.
    const targets = pieceTargets(board, s, null);
    if (targets.includes(target)) return true;
  }
  return false;
}

function isInCheck(board: Board, color: Color): boolean {
  const k = findKing(board, color);
  if (!k) return false;
  return isSquareAttacked(board, k, color === "w" ? "b" : "w");
}

function applyRaw(board: Board, move: Move, enPassantTarget: Square | null): Board {
  const next: Board = { ...board };
  const piece = next[move.from];
  if (!piece) return next;
  next[move.from] = null;
  // en-passant capture
  if (piece.type === "p" && move.to === enPassantTarget) {
    const [f, r] = decompose(move.to);
    const captured = sq(f, piece.color === "w" ? r - 1 : r + 1);
    if (captured) next[captured] = null;
  }
  // promotion
  if (piece.type === "p") {
    const [, rTo] = decompose(move.to);
    if (rTo === 8 || rTo === 1) {
      next[move.to] = { type: move.promotion ?? "q", color: piece.color };
      return next;
    }
  }
  next[move.to] = piece;
  return next;
}

export function legalMoves(state: GameState, from: Square): Square[] {
  const piece = state.board[from];
  if (!piece || piece.color !== state.turn) return [];
  const raw = pieceTargets(state.board, from, state.enPassantTarget);
  const legal: Square[] = [];
  for (const to of raw) {
    const next = applyRaw(state.board, { from, to }, state.enPassantTarget);
    if (!isInCheck(next, piece.color)) legal.push(to);
  }
  return legal;
}

export function allLegalMoves(state: GameState): Move[] {
  const out: Move[] = [];
  for (const s of ALL_SQUARES) {
    const p = state.board[s];
    if (!p || p.color !== state.turn) continue;
    const tos = legalMoves(state, s);
    for (const to of tos) {
      // generate promotion moves explicitly
      if (p.type === "p") {
        const [, r] = decompose(to);
        if ((p.color === "w" && r === 8) || (p.color === "b" && r === 1)) {
          for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
            out.push({ from: s, to, promotion: promo, pieceType: p.type });
          }
          continue;
        }
      }
      out.push({ from: s, to, pieceType: p.type });
    }
  }
  return out;
}

/**
 * Internal: applies a move without computing terminal flags. Used by minimax to keep
 * the AI tractable; the public `applyMove` wraps this and runs terminal detection.
 */
function applyMoveFast(state: GameState, move: Move): GameState {
  const piece = state.board[move.from];
  if (!piece) return state;

  const captured = state.board[move.to];
  const isEnPassant = piece.type === "p" && move.to === state.enPassantTarget;
  const enrich: Move = {
    ...move,
    pieceType: piece.type,
    capture: captured?.type ?? (isEnPassant ? "p" : undefined),
    enPassant: isEnPassant ? true : undefined,
  };
  const nextBoard = applyRaw(state.board, enrich, state.enPassantTarget);

  let newEP: Square | null = null;
  if (piece.type === "p") {
    const [f, rFrom] = decompose(move.from);
    const [, rTo] = decompose(move.to);
    if (Math.abs(rTo - rFrom) === 2) {
      newEP = sq(f, (rFrom + rTo) / 2);
    }
  }

  const nextTurn: Color = state.turn === "w" ? "b" : "w";
  const check = isInCheck(nextBoard, nextTurn);
  return {
    board: nextBoard,
    turn: nextTurn,
    history: [...state.history, enrich],
    check,
    checkmate: false,
    stalemate: false,
    enPassantTarget: newEP,
  };
}

export function applyMove(state: GameState, move: Move): GameState {
  const next = applyMoveFast(state, move);
  const moves = allLegalMoves(next);
  if (moves.length === 0) {
    if (next.check) next.checkmate = true;
    else next.stalemate = true;
  }
  return next;
}

// ============ AI ============

const VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const CENTER_BONUS: Record<string, number> = {
  d4: 8,
  e4: 8,
  d5: 8,
  e5: 8,
  c4: 4,
  f4: 4,
  c5: 4,
  f5: 4,
  d3: 4,
  e3: 4,
  d6: 4,
  e6: 4,
};

function evaluate(state: GameState): number {
  // From white's perspective.
  let score = 0;
  for (const s of ALL_SQUARES) {
    const p = state.board[s];
    if (!p) continue;
    const v = VALUES[p.type];
    score += p.color === "w" ? v : -v;
    const cb = CENTER_BONUS[s] ?? 0;
    if (cb) score += p.color === "w" ? cb : -cb;
  }
  if (state.checkmate) score += state.turn === "w" ? -100000 : 100000;
  if (state.check) score += state.turn === "w" ? -25 : 25;
  return score;
}

function minimax(state: GameState, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || state.checkmate || state.stalemate) return evaluate(state);
  const moves = allLegalMoves(state);
  if (moves.length === 0) return evaluate(state);
  const maximize = state.turn === "w";
  if (maximize) {
    let best = -Infinity;
    for (const m of moves) {
      const v = minimax(applyMoveFast(state, m), depth - 1, alpha, beta);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    const v = minimax(applyMoveFast(state, m), depth - 1, alpha, beta);
    if (v < best) best = v;
    if (best < beta) beta = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function pickAIMove(
  state: GameState,
  level: "easy" | "medium" = "medium",
): Move | null {
  const moves = allLegalMoves(state);
  if (moves.length === 0) return null;
  // depth 1 = greedy material; depth 2 = look at opponent's best response.
  // Medium uses depth 2 but limits root candidates to the top-N by depth-1 score
  // so we stay snappy in the browser. Easy is plain depth 1 with randomization.
  const playerIsMax = state.turn === "w";

  // First pass: depth-1 evaluation for each root move (cheap).
  const depth1Scored: { move: Move; score: number }[] = moves.map((m) => {
    const next = applyMoveFast(state, m);
    return { move: m, score: evaluate(next) };
  });
  depth1Scored.sort((a, b) =>
    playerIsMax ? b.score - a.score : a.score - b.score,
  );

  if (level === "easy") {
    // pick from top 5 randomly
    const top = depth1Scored.slice(0, 5);
    return top[Math.floor(Math.random() * top.length)].move;
  }

  // medium: take top 8 candidates, recurse with depth 1 (= 2 plies total).
  const candidates = depth1Scored.slice(0, 8);
  let bestMoves: Move[] = [];
  let bestScore = playerIsMax ? -Infinity : Infinity;
  for (const { move: m } of candidates) {
    const next = applyMoveFast(state, m);
    const score = minimax(next, 1, -Infinity, Infinity);
    if (playerIsMax) {
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [m];
      } else if (score === bestScore) {
        bestMoves.push(m);
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMoves = [m];
      } else if (score === bestScore) {
        bestMoves.push(m);
      }
    }
  }
  return bestMoves[Math.floor(Math.random() * Math.min(bestMoves.length, 3))];
}

// ============ Notation helpers ============

export function moveToSAN(move: Move): string {
  const p = move.pieceType ?? "p";
  const letter = p === "p" ? "" : p.toUpperCase();
  const capture = move.capture || move.enPassant ? "x" : "";
  // For pawn captures we include file of departure.
  const disambig = p === "p" && capture ? move.from[0] : "";
  const promo = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
  return `${letter}${disambig}${capture}${move.to}${promo}`;
}

export function pieceGlyph(piece: Piece): string {
  const map: Record<PieceType, [string, string]> = {
    k: ["♔", "♚"],
    q: ["♕", "♛"],
    r: ["♖", "♜"],
    b: ["♗", "♝"],
    n: ["♘", "♞"],
    p: ["♙", "♟"],
  };
  return piece.color === "w" ? map[piece.type][0] : map[piece.type][1];
}

export function undoLastTwo(state: GameState): GameState {
  if (state.history.length === 0) return state;
  const target = Math.max(0, state.history.length - 2);
  let s = INITIAL;
  for (let i = 0; i < target; i++) {
    s = applyMove(s, state.history[i]);
  }
  return s;
}

export function listCapturedFor(state: GameState, color: Color): PieceType[] {
  // Pieces of `color` that were captured during the game.
  // White moves at even history indices, black at odd. A move's capture is a piece of the OPPOSITE color of the mover.
  const caps: PieceType[] = [];
  for (let i = 0; i < state.history.length; i++) {
    const m = state.history[i];
    if (!m.capture) continue;
    const moverColor: Color = i % 2 === 0 ? "w" : "b";
    if (moverColor !== color) caps.push(m.capture);
  }
  return caps;
}

export function isSquareLight(s: Square): boolean {
  const [f, r] = decompose(s);
  return (f + r) % 2 === 1;
}
