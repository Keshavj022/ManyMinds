"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GameHeader from "@/components/games/GameHeader";
import CommentaryStrip, { CommentaryItem } from "@/components/games/CommentaryStrip";
import GlassCard from "@/components/ui/GlassCard";
import AuroraButton from "@/components/ui/AuroraButton";
import TypingDots from "@/components/ui/TypingDots";
import AmbientBackground from "@/components/ui/AmbientBackground";
import TurnIndicator from "@/components/games/TurnIndicator";
import {
  initialLudo,
  rollDice,
  legalTokens,
  applyTokenMove,
  skipTurn,
  pickAITokenMove,
  commentOnLudoEvent,
  COLOR_TO_MEMBER,
  SAFE_SQUARES,
  type LudoColor,
  type LudoState,
  type Token,
} from "@/lib/games/ludo";
import { recordGameResult } from "@/lib/games/storage";

// Player color -> display
const COLOR_HEX: Record<LudoColor, string> = {
  blue: "#7fb5d4",
  red: "#d49a7a",
  yellow: "#d8a3b8",
  green: "#d8a3b8",
};
const COLOR_SOFT: Record<LudoColor, string> = {
  blue: "rgba(127,181,212,0.18)",
  red: "rgba(212,154,122,0.18)",
  yellow: "rgba(216,163,184,0.18)",
  green: "rgba(216,163,184,0.18)",
};

export default function LudoPage() {
  const [state, setState] = useState<LudoState>(() => initialLudo());
  const [comments, setComments] = useState<CommentaryItem[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const commentIdRef = useRef(0);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const pushComment = useCallback((memberId: CommentaryItem["memberId"], text: string) => {
    setComments((prev) => [{ id: `c${++commentIdRef.current}`, memberId, text, ts: Date.now() }, ...prev]);
  }, []);

  // ----- end detection -----
  useEffect(() => {
    if (state.winner && !showEnd) {
      const winEv = commentOnLudoEvent({ kind: "win", color: state.winner });
      if (winEv) pushComment(winEv.memberId, winEv.text);
      setShowEnd(true);
      recordGameResult({
        game: "ludo",
        outcome: state.winner === "blue" ? "win" : "loss",
        detail: state.winner === "blue" ? "Won the match" : `${capitalize(state.winner)} won`,
      });
    }
  }, [state.winner, showEnd, pushComment]);

  // ----- AI turn handler -----
  useEffect(() => {
    if (state.winner) return;
    if (state.turn === "blue") return; // user's turn
    if (aiThinking) return;
    if (state.dice !== null) return; // already mid-turn (e.g. waiting for next AI step)
    runAITurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turn, state.winner, state.dice, aiThinking]);

  const runAITurn = () => {
    setAiThinking(true);
    const memberId = COLOR_TO_MEMBER[state.turn]!;
    pushComment(memberId, `${capitalize(state.turn)} is thinking…`);
    window.setTimeout(() => {
      // roll
      const rolled = rollDice(stateRef.current);
      setState(rolled);
      const rollEv = commentOnLudoEvent({ kind: "roll", color: rolled.turn, value: rolled.dice! });
      if (rollEv) pushComment(rollEv.memberId, rollEv.text);

      window.setTimeout(() => {
        const after = rolled;
        const legals = legalTokens(after);
        if (legals.length === 0) {
          const sk = skipTurn(after);
          setState(sk);
          setAiThinking(false);
          return;
        }
        const pick = pickAITokenMove(after);
        if (!pick) {
          const sk = skipTurn(after);
          setState(sk);
          setAiThinking(false);
          return;
        }
        // detect home-out / six event
        const tok = after.tokens.find((t) => t.color === after.turn && t.id === pick.tokenId)!;
        const next = applyTokenMove(after, after.turn, pick.tokenId);
        setState(next);

        // generate commentary
        if (tok.kind === "home" && after.dice === 6) {
          const ev = commentOnLudoEvent({ kind: "home-out", color: after.turn });
          if (ev) pushComment(ev.memberId, ev.text);
        }
        if (after.dice === 6) {
          const ev = commentOnLudoEvent({ kind: "six", color: after.turn });
          if (ev) pushComment(ev.memberId, ev.text);
        }
        if (next.message.includes("captured")) {
          // figure out victim color from message
          const victimMatch = next.message.match(/captured (\w+)'s/i);
          if (victimMatch) {
            const victimName = victimMatch[1].toLowerCase();
            const victim = COLORS.find((c) => state.players.find((p) => p.color === c)?.name.toLowerCase() === victimName);
            if (victim) {
              const ev = commentOnLudoEvent({ kind: "capture", by: after.turn, victim });
              if (ev) pushComment(ev.memberId, ev.text);
            }
          }
        }

        setAiThinking(false);
      }, 600);
    }, 700 + Math.random() * 400);
  };

  // ----- user actions -----
  const onUserRoll = () => {
    if (state.winner || state.turn !== "blue" || state.dice !== null || diceRolling) return;
    setDiceRolling(true);
    window.setTimeout(() => {
      const rolled = rollDice(state);
      setState(rolled);
      setDiceRolling(false);
      const ev = commentOnLudoEvent({ kind: "roll", color: rolled.turn, value: rolled.dice! });
      if (ev) pushComment(ev.memberId, ev.text);
      if (rolled.dice === 6) {
        const six = commentOnLudoEvent({ kind: "six", color: rolled.turn });
        if (six) pushComment(six.memberId, six.text);
      }
      // if no legal moves, auto-skip
      const legals = legalTokens(rolled);
      if (legals.length === 0) {
        window.setTimeout(() => {
          setState(skipTurn(rolled));
        }, 700);
      }
    }, 800);
  };

  const onUserPickToken = (tokenId: number) => {
    if (state.winner || state.turn !== "blue" || state.dice === null || diceRolling || aiThinking) return;
    const tok = state.tokens.find((t) => t.color === "blue" && t.id === tokenId);
    if (!tok) return;
    const legals = legalTokens(state);
    if (!legals.some((t) => t.id === tokenId)) return;
    const before = state;
    const next = applyTokenMove(state, "blue", tokenId);
    setState(next);
    if (tok.kind === "home" && before.dice === 6) {
      const ev = commentOnLudoEvent({ kind: "home-out", color: "blue" });
      if (ev) pushComment(ev.memberId, ev.text);
    }
    if (next.message.includes("captured")) {
      const m = next.message.match(/captured (\w+)/i);
      if (m) {
        const victimName = m[1].toLowerCase();
        const victim = COLORS.find((c) => before.players.find((p) => p.color === c)?.name.toLowerCase() === victimName);
        if (victim) {
          const ev = commentOnLudoEvent({ kind: "capture", by: "blue", victim });
          if (ev) pushComment(ev.memberId, ev.text);
        }
      }
    }
  };

  const onNewGame = () => {
    setState(initialLudo());
    setComments([]);
    setShowEnd(false);
    setAiThinking(false);
    setDiceRolling(false);
    commentIdRef.current = 0;
  };

  // ----- derived -----
  const userLegalIds = useMemo(() => {
    if (state.turn !== "blue" || state.dice === null) return new Set<number>();
    return new Set(legalTokens(state).filter((t) => t.color === "blue").map((t) => t.id));
  }, [state]);

  const turnPlayer = state.players.find((p) => p.color === state.turn)!;
  const turnMemberId = COLOR_TO_MEMBER[state.turn];

  return (
    <>
      <AmbientBackground variant="rich" />
      <div className="space-y-6">
        <GameHeader
          backHref="/games"
          title="Ludo"
          subtitle="4-player chaos. Captures are personal. Sixes are mandatory."
          rightSlot={
            <div className="flex items-center gap-2 text-xs text-white/65">
              <span className="material-symbols-outlined text-[14px]">flag</span>
              First to 4 home wins
            </div>
          }
        />

        <CommentaryStrip items={comments} max={6} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* BOARD */}
          <GlassCard variant="default" className="rounded-3xl p-4 md:p-6">
            <LudoBoard
              state={state}
              legalIds={userLegalIds}
              onPickToken={onUserPickToken}
            />
          </GlassCard>

          {/* SIDE PANEL */}
          <div className="space-y-4">
            <GlassCard variant="default" className="rounded-3xl p-5 flex flex-col items-center">
              <TurnIndicator
                player={turnMemberId ?? "user"}
                name={turnPlayer.name}
                subtitle={state.winner ? "winner" : state.turn === "blue" ? "your turn" : "their turn"}
              />
              <div className="mt-5 w-full">
                <Die
                  value={state.dice}
                  rolling={diceRolling}
                />
                <div className="mt-3">
                  {state.turn === "blue" && state.dice === null && !state.winner && (
                    <AuroraButton variant="primary" fullWidth size="md" onClick={onUserRoll}>
                      Roll Die
                    </AuroraButton>
                  )}
                  {state.turn === "blue" && state.dice !== null && !state.winner && (
                    <div className="text-center text-xs text-white/55">
                      Pick a token to move ({state.dice})
                    </div>
                  )}
                  {state.turn !== "blue" && !state.winner && (
                    <div className="text-center text-xs text-white/55 flex items-center justify-center gap-2">
                      {aiThinking ? (
                        <>
                          <span>{turnPlayer.name} is moving</span>
                          {turnMemberId && <TypingDots memberId={turnMemberId} />}
                        </>
                      ) : (
                        <span>{turnPlayer.name}&apos;s turn</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="default" className="rounded-3xl p-5">
              <h3 className="text-sm font-bold text-white font-[var(--font-headline)] mb-3">Standings</h3>
              <ul className="space-y-2">
                {state.players.map((p) => {
                  const finished = state.tokens.filter((t) => t.color === p.color && t.kind === "finished").length;
                  const inHome = state.tokens.filter((t) => t.color === p.color && t.kind === "home").length;
                  const isTurn = state.turn === p.color && !state.winner;
                  return (
                    <li
                      key={p.color}
                      className="flex items-center gap-3 p-2 rounded-xl border"
                      style={{
                        background: isTurn ? COLOR_SOFT[p.color] : "rgba(255,255,255,0.02)",
                        borderColor: isTurn ? COLOR_HEX[p.color] : "rgba(255,255,255,0.06)",
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: COLOR_HEX[p.color], boxShadow: `0 0 10px ${COLOR_HEX[p.color]}` }}
                      />
                      <div className="flex-1">
                        <div className="text-sm text-white font-bold">{p.name}</div>
                        <div className="text-[10px] uppercase tracking-wider text-white/45">
                          {finished} home · {inHome} waiting
                        </div>
                      </div>
                      <div className="text-xs text-white/65 font-mono">{finished}/4</div>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>
          </div>
        </div>

        {/* END MODAL */}
        <AnimatePresence>
          {showEnd && state.winner && (
            <motion.div
              className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-md p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard variant="strong" className="rounded-3xl p-8 max-w-md w-full text-center">
                <div
                  className="mx-auto w-20 h-20 rounded-full mb-3"
                  style={{ background: `radial-gradient(circle, ${COLOR_HEX[state.winner]}, transparent 70%)` }}
                />
                <div className="text-[10px] uppercase tracking-[0.32em] text-white/55 font-bold">Game Over</div>
                <h2 className="aurora-text font-[var(--font-headline)] text-3xl font-bold mt-2">
                  {state.players.find((p) => p.color === state.winner)?.name} wins
                </h2>
                <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                  <AuroraButton variant="primary" onClick={onNewGame}>Play again</AuroraButton>
                  <AuroraButton variant="ghost" href="/games">Back to hub</AuroraButton>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ============== Board ==============
// 15x15 grid, cross shape. Track squares are walked in a fixed order;
// we map track index 0..39 to specific grid cells and stretch index 0..3 per color.

type Cell = { row: number; col: number; kind: "track" | "stretch" | "home" | "center" | "blank"; color?: LudoColor; trackIndex?: number; stretchIndex?: number; safe?: boolean };

function buildCells(): Cell[] {
  // 15x15. We'll define the cross visually but map track indices to a closed loop.
  const cells: Cell[][] = [];
  for (let r = 0; r < 15; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < 15; c++) row.push({ row: r, col: c, kind: "blank" });
    cells.push(row);
  }
  // home quadrants
  const setHome = (rs: number, cs: number, color: LudoColor) => {
    for (let r = rs; r < rs + 6; r++) {
      for (let c = cs; c < cs + 6; c++) {
        cells[r][c] = { row: r, col: c, kind: "home", color };
      }
    }
  };
  setHome(0, 0, "blue");
  setHome(0, 9, "red");
  setHome(9, 0, "green");
  setHome(9, 9, "yellow");

  // center 3x3
  for (let r = 6; r <= 8; r++) {
    for (let c = 6; c <= 8; c++) {
      cells[r][c] = { row: r, col: c, kind: "center" };
    }
  }

  // Track path — 40 cells around the cross. Define it explicitly.
  // We'll trace a typical ludo path starting from blue's entry square (just below blue's home, on the left arm).
  // For simplicity, the track is a clean rectangle around the cross.
  // Layout: rows 6..8 are horizontal strip, cols 6..8 are vertical strip.
  // The track follows the outer edge of the cross arms.
  const track: [number, number][] = [
    // Left arm — going down then right
    [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], // 0..4 blue start on idx 0
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6], // 5..10
    [0, 7], // 11
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], // 12..17
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], // 18..23
    [7, 14], // 24
    [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], // 25..30
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], // 31..36
    [14, 7], // 37
    [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], // 38..43
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], // 44..49
    [7, 0], // 50
    [6, 0], // 51
  ];

  // Wait, this is 52 cells. Our engine uses TRACK_LENGTH = 40. Let's redo with 40 cells.
  // Simpler approach: outer ring of cells just around the inner cross (rows 6-8 / cols 6-8).
  // Use a true 40-cell loop.
  const track40: [number, number][] = [];
  // Top: cols 6 -> 14 row 6 (9 cells)
  // Right: rows 6 -> 14 col 8 (excluding overlap)
  // Bottom: cols 14 -> 6 row 8
  // Left: rows 14 -> 6 col 6
  // That's a 28-cell rectangle — too small. We need 40 for game balance, so we'll just space them around
  // using a tighter loop around the cross. We'll use the 52-cell layout above but cap track to 40.
  // SIMPLER: map track-index → cell from the 52-cell path, scaled.
  for (let i = 0; i < 40; i++) {
    const t = Math.round((i / 40) * track.length);
    const idx = Math.min(track.length - 1, t);
    track40.push(track[idx]);
  }

  for (let i = 0; i < 40; i++) {
    const [r, c] = track40[i];
    if (cells[r][c].kind === "home" || cells[r][c].kind === "center") continue;
    cells[r][c] = { row: r, col: c, kind: "track", trackIndex: i, safe: SAFE_SQUARES.has(i) };
  }

  // Home stretches (visual hint): we'll mark a few cells as colored stretch for each color.
  // Blue stretch: row 7, cols 1-4 (toward center)
  const stretchPaths: Record<LudoColor, [number, number][]> = {
    blue: [[7, 1], [7, 2], [7, 3], [7, 4]],
    red: [[1, 7], [2, 7], [3, 7], [4, 7]],
    yellow: [[7, 13], [7, 12], [7, 11], [7, 10]],
    green: [[13, 7], [12, 7], [11, 7], [10, 7]],
  };
  for (const [color, path] of Object.entries(stretchPaths) as [LudoColor, [number, number][]][]) {
    path.forEach(([r, c], i) => {
      // Only override if not already track
      if (cells[r][c].kind !== "track") {
        cells[r][c] = { row: r, col: c, kind: "stretch", color, stretchIndex: i };
      } else {
        // Overlay: still treat as stretch visual but keep track index ref
        cells[r][c] = { ...cells[r][c], kind: "stretch", color, stretchIndex: i };
      }
    });
  }

  return cells.flat();
}

const CELLS = buildCells();

// Map track index -> {row, col}
const TRACK_INDEX_TO_CELL: Record<number, { row: number; col: number }> = (() => {
  const out: Record<number, { row: number; col: number }> = {};
  for (const c of CELLS) {
    if (c.kind === "track" && c.trackIndex != null) {
      out[c.trackIndex] = { row: c.row, col: c.col };
    }
  }
  return out;
})();

// Map (color, stretchIndex) -> cell
const STRETCH_TO_CELL: Record<LudoColor, Record<number, { row: number; col: number }>> = (() => {
  const out: Record<LudoColor, Record<number, { row: number; col: number }>> = {
    blue: {}, red: {}, yellow: {}, green: {},
  };
  for (const c of CELLS) {
    if (c.kind === "stretch" && c.color && c.stretchIndex != null) {
      out[c.color][c.stretchIndex] = { row: c.row, col: c.col };
    }
  }
  return out;
})();

// Home base positions for each color: 2x2 within the home quadrant.
const HOME_SLOTS: Record<LudoColor, [number, number][]> = {
  blue: [[1, 1], [1, 4], [4, 1], [4, 4]],
  red: [[1, 10], [1, 13], [4, 10], [4, 13]],
  green: [[10, 1], [10, 4], [13, 1], [13, 4]],
  yellow: [[10, 10], [10, 13], [13, 10], [13, 13]],
};

function tokenCell(tok: Token): { row: number; col: number } {
  if (tok.kind === "home") return { row: HOME_SLOTS[tok.color][tok.id][0], col: HOME_SLOTS[tok.color][tok.id][1] };
  if (tok.kind === "track") return TRACK_INDEX_TO_CELL[tok.pos] ?? { row: 7, col: 7 };
  if (tok.kind === "stretch") return STRETCH_TO_CELL[tok.color][tok.pos] ?? { row: 7, col: 7 };
  // finished
  const slot = tok.id;
  // arrange finished tokens around center
  const positions: Record<LudoColor, [number, number][]> = {
    blue: [[7, 6], [7, 7], [6, 7], [8, 7]],
    red: [[6, 8], [7, 8], [8, 8], [8, 7]],
    yellow: [[7, 8], [8, 8], [8, 7], [7, 7]],
    green: [[8, 7], [7, 7], [6, 7], [7, 6]],
  };
  return { row: positions[tok.color][slot][0], col: positions[tok.color][slot][1] };
}

function LudoBoard({
  state,
  legalIds,
  onPickToken,
}: {
  state: LudoState;
  legalIds: Set<number>;
  onPickToken: (id: number) => void;
}) {
  return (
    <div className="relative w-full max-w-[640px] aspect-square mx-auto">
      <div
        className="grid w-full h-full gap-[2px] bg-white/[0.03] rounded-2xl p-1 border border-white/10"
        style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))", gridTemplateRows: "repeat(15, minmax(0, 1fr))" }}
      >
        {CELLS.map((cell, i) => (
          <CellTile key={i} cell={cell} />
        ))}
      </div>
      {/* Tokens overlay */}
      <div className="absolute inset-1 grid"
        style={{
          gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
          gridTemplateRows: "repeat(15, minmax(0, 1fr))",
          gap: "2px",
          pointerEvents: "none",
        }}
      >
        {state.tokens.map((tok) => {
          const { row, col } = tokenCell(tok);
          const isLegal = tok.color === "blue" && legalIds.has(tok.id);
          return (
            <motion.button
              key={`${tok.color}-${tok.id}`}
              layoutId={`token-${tok.color}-${tok.id}`}
              onClick={() => isLegal && onPickToken(tok.id)}
              className="grid place-items-center"
              style={{
                gridColumn: col + 1,
                gridRow: row + 1,
                pointerEvents: isLegal ? "auto" : "none",
              }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <span
                className={`block rounded-full ${isLegal ? "cursor-pointer" : ""}`}
                style={{
                  width: "70%",
                  height: "70%",
                  aspectRatio: "1 / 1",
                  background: COLOR_HEX[tok.color],
                  boxShadow: isLegal
                    ? `0 0 0 2px #fff, 0 0 18px ${COLOR_HEX[tok.color]}, 0 2px 6px rgba(0,0,0,0.4)`
                    : `0 0 0 1.5px rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.4)`,
                  outline: isLegal ? "2px dashed rgba(255,255,255,0.8)" : "none",
                  outlineOffset: "2px",
                }}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function CellTile({ cell }: { cell: Cell }) {
  let bg = "transparent";
  if (cell.kind === "home" && cell.color) bg = COLOR_SOFT[cell.color];
  else if (cell.kind === "center") bg = "rgba(255,255,255,0.08)";
  else if (cell.kind === "stretch" && cell.color) bg = COLOR_SOFT[cell.color];
  else if (cell.kind === "track") bg = cell.safe ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)";
  return (
    <div
      className="rounded-[3px] relative"
      style={{ background: bg }}
    >
      {cell.kind === "track" && cell.safe && (
        <span className="absolute inset-0 grid place-items-center text-[8px] text-white/40">★</span>
      )}
    </div>
  );
}

// ============== Die ==============
function Die({ value, rolling }: { value: number | null; rolling: boolean }) {
  return (
    <div className="relative w-full grid place-items-center py-4">
      <motion.div
        className="w-20 h-20 rounded-2xl grid place-items-center"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
        animate={rolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.05, 1] } : { rotate: 0, scale: 1 }}
        transition={rolling ? { duration: 0.7, ease: "easeOut" } : { duration: 0.3 }}
      >
        {value === null ? (
          <span className="text-white/45 text-sm font-bold">—</span>
        ) : (
          <DieFace value={value} />
        )}
      </motion.div>
    </div>
  );
}

function DieFace({ value }: { value: number }) {
  // Render dots in 3x3 grid
  const DOTS: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  const active = new Set(DOTS[value] ?? []);
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 w-12 h-12">
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className={`rounded-full ${active.has(i) ? "bg-white" : "bg-transparent"}`}
          style={{ boxShadow: active.has(i) ? "0 0 6px rgba(255,255,255,0.6)" : undefined }}
        />
      ))}
    </div>
  );
}

// ============== helpers ==============

const COLORS: LudoColor[] = ["blue", "red", "yellow", "green"];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
