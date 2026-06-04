"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GameHeader from "@/components/games/GameHeader";
import CommentaryStrip, { CommentaryItem } from "@/components/games/CommentaryStrip";
import GlassCard from "@/components/ui/GlassCard";
import AuroraButton from "@/components/ui/AuroraButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import TypingDots from "@/components/ui/TypingDots";
import AmbientBackground from "@/components/ui/AmbientBackground";
import {
  INITIAL,
  type GameState,
  type Move,
  type PieceType,
  type Square,
  ALL_SQUARES,
  legalMoves,
  applyMove,
  pickAIMove,
  pieceGlyph,
  moveToSAN,
  undoLastTwo,
  isSquareLight,
  listCapturedFor,
} from "@/lib/games/chess";
import { commentOnMove, ariaThinkingLine, outroLine } from "@/components/games/chess-commentary";
import { recordGameResult } from "@/lib/games/storage";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

const PROMO_PIECES: PieceType[] = ["q", "r", "b", "n"];

type PendingPromotion = { from: Square; to: Square } | null;

export default function ChessPage() {
  const [state, setState] = useState<GameState>(INITIAL);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [comments, setComments] = useState<CommentaryItem[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion>(null);
  const [showEndModal, setShowEndModal] = useState(false);
  const [endResult, setEndResult] = useState<"userWin" | "aiWin" | "draw" | null>(null);
  const [resigned, setResigned] = useState(false);
  const commentIdRef = useRef(0);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const pushComment = useCallback((memberId: CommentaryItem["memberId"], text: string) => {
    setComments((prev) => [{ id: `c${++commentIdRef.current}`, memberId, text, ts: Date.now() }, ...prev]);
  }, []);

  // ----- handle endgame detection -----
  useEffect(() => {
    if (state.checkmate || state.stalemate) {
      const userPlaysAs: "w" | "b" = "w";
      let res: "userWin" | "aiWin" | "draw" = "draw";
      if (state.checkmate) {
        // current turn is the loser
        res = state.turn === userPlaysAs ? "aiWin" : "userWin";
      }
      setEndResult(res);
      const o = outroLine(res);
      pushComment(o.memberId, o.text);
      setShowEndModal(true);
      recordGameResult({
        game: "chess",
        outcome: res === "userWin" ? "win" : res === "aiWin" ? "loss" : "draw",
        detail: res === "userWin" ? "Beat Aria" : res === "aiWin" ? "Aria won" : "Stalemate",
      });
    }
  }, [state.checkmate, state.stalemate, state.turn, pushComment]);

  // ----- AI move -----
  const runAIMove = useCallback(() => {
    setAiThinking(true);
    const think = ariaThinkingLine();
    pushComment(think.memberId, think.text);
    const delay = 500 + Math.random() * 350;
    window.setTimeout(() => {
      const cur = stateRef.current;
      if (cur.turn !== "b" || cur.checkmate || cur.stalemate) {
        setAiThinking(false);
        return;
      }
      const ai = pickAIMove(cur, "medium");
      if (!ai) {
        setAiThinking(false);
        return;
      }
      const before = cur;
      const after = applyMove(before, ai);
      setState(after);
      const c = commentOnMove(before, ai, after);
      if (c) pushComment(c.memberId, c.text);
      setAiThinking(false);
    }, delay);
  }, [pushComment]);

  useEffect(() => {
    if (state.turn === "b" && !state.checkmate && !state.stalemate && !aiThinking && !showEndModal) {
      runAIMove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.turn, state.checkmate, state.stalemate]);

  // ----- user clicks -----
  const onSquareClick = (sq: Square) => {
    if (aiThinking || state.turn !== "w" || state.checkmate || state.stalemate || pendingPromotion) return;
    const piece = state.board[sq];
    if (selected) {
      if (legalTargets.includes(sq)) {
        const movingPiece = state.board[selected];
        // detect promotion: pawn reaching last rank
        if (movingPiece?.type === "p") {
          const rank = parseInt(sq[1], 10);
          if (rank === 8) {
            setPendingPromotion({ from: selected, to: sq });
            return;
          }
        }
        commitMove({ from: selected, to: sq });
        return;
      }
      // clicked on own piece -> reselect
      if (piece && piece.color === "w") {
        setSelected(sq);
        setLegalTargets(legalMoves(state, sq));
        return;
      }
      setSelected(null);
      setLegalTargets([]);
      return;
    }
    if (piece && piece.color === "w") {
      setSelected(sq);
      setLegalTargets(legalMoves(state, sq));
    }
  };

  const commitMove = (m: Move) => {
    const before = state;
    const after = applyMove(before, m);
    setState(after);
    setSelected(null);
    setLegalTargets([]);
    const c = commentOnMove(before, m, after);
    if (c) pushComment(c.memberId, c.text);
  };

  const onPromote = (p: PieceType) => {
    if (!pendingPromotion) return;
    commitMove({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: p });
    setPendingPromotion(null);
  };

  // ----- buttons -----
  const onUndo = () => {
    if (state.history.length < 2 || aiThinking) return;
    setState(undoLastTwo(state));
    setSelected(null);
    setLegalTargets([]);
  };
  const onResign = () => {
    setResigned(true);
    setEndResult("aiWin");
    pushComment("rex", "Tapping out? Bold honest energy. Respect.");
    setShowEndModal(true);
    recordGameResult({ game: "chess", outcome: "loss", detail: "Resigned" });
  };
  const onOfferDraw = () => {
    // Aria accepts roughly proportional to material balance
    const evalScore = evaluateBalance(state);
    const accepted = Math.abs(evalScore) < 200 && Math.random() < 0.6;
    if (accepted) {
      setEndResult("draw");
      pushComment("aria", "Draw accepted. Even keel.");
      setShowEndModal(true);
      recordGameResult({ game: "chess", outcome: "draw", detail: "Draw by agreement" });
    } else {
      pushComment("aria", "I decline. The position is interesting.");
    }
  };
  const onPlayAgain = () => {
    setState(INITIAL);
    setSelected(null);
    setLegalTargets([]);
    setComments([]);
    setShowEndModal(false);
    setEndResult(null);
    setResigned(false);
    commentIdRef.current = 0;
  };

  // ----- derived -----
  const moveHistorySAN = useMemo(() => state.history.map(moveToSAN), [state.history]);
  const capturedByWhite = useMemo(() => listCapturedFor(state, "b"), [state]); // pieces white captured (i.e., black pieces gone)
  const capturedByBlack = useMemo(() => listCapturedFor(state, "w"), [state]);

  return (
    <>
      <AmbientBackground variant="cool" />
      <div className="space-y-6">
        <GameHeader
          backHref="/games"
          title={<>Chess <span className="text-white/40">vs.</span> Aria</>}
          subtitle={`Move ${Math.floor(state.history.length / 2) + 1}${state.history.length % 2 === 1 ? " (Aria to move)" : " (your move)"}`}
          score={state.check ? <span className="text-amber-300">⚠ CHECK</span> : null}
          rightSlot={
            <div className="flex items-center gap-2">
              <AuroraButton variant="soft" size="sm" onClick={onUndo}>Undo</AuroraButton>
              <AuroraButton variant="ghost" size="sm" onClick={onOfferDraw}>Offer Draw</AuroraButton>
              <AuroraButton variant="member" memberColor="rex" size="sm" onClick={onResign}>Resign</AuroraButton>
            </div>
          }
        />

        {/* COMMENTARY STRIP */}
        <CommentaryStrip items={comments} max={6} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* ----- BOARD ----- */}
          <GlassCard variant="default" className="rounded-3xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <CapturedRow caps={capturedByBlack} side="white" />
              <div className="text-[10px] uppercase tracking-wider text-white/45 font-bold">Captured by Aria</div>
            </div>
            <Board
              state={state}
              selected={selected}
              legalTargets={legalTargets}
              onSquareClick={onSquareClick}
            />
            <div className="flex items-center justify-between mt-3">
              <CapturedRow caps={capturedByWhite} side="black" />
              <div className="text-[10px] uppercase tracking-wider text-white/45 font-bold">Captured by You</div>
            </div>
          </GlassCard>

          {/* ----- SIDE PANEL ----- */}
          <div className="space-y-4">
            <GlassCard variant="default" className="rounded-3xl p-5">
              <div className="flex items-center gap-3">
                <MemberAvatar id="aria" size="lg" status={aiThinking ? "thinking" : "online"} />
                <div>
                  <div className="text-white font-bold font-[var(--font-headline)]">Aria</div>
                  <div className="text-[11px] text-white/50 uppercase tracking-wider">The Analyst</div>
                  <div className="text-xs mt-1 flex items-center gap-2">
                    {aiThinking ? (
                      <>
                        <span className="text-amber-300">thinking</span>
                        <TypingDots memberId="aria" />
                      </>
                    ) : state.checkmate || state.stalemate || resigned ? (
                      <span className="text-white/40">game over</span>
                    ) : state.turn === "b" ? (
                      <span className="text-amber-300">her move</span>
                    ) : (
                      <span className="text-white/50">waiting for you</span>
                    )}
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="default" className="rounded-3xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white font-[var(--font-headline)]">Move History</h3>
                <span className="text-[10px] text-white/40 uppercase tracking-wider">{state.history.length} plies</span>
              </div>
              <MoveList sans={moveHistorySAN} />
            </GlassCard>
          </div>
        </div>

        {/* Promotion modal */}
        <AnimatePresence>
          {pendingPromotion && (
            <motion.div
              className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard variant="strong" className="rounded-3xl p-6 text-center">
                <h3 className="text-white font-bold font-[var(--font-headline)] text-xl mb-1">Promote your pawn</h3>
                <p className="text-white/50 text-sm mb-5">Pick a piece.</p>
                <div className="flex gap-3">
                  {PROMO_PIECES.map((p) => (
                    <button
                      key={p}
                      onClick={() => onPromote(p)}
                      className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-3xl text-white transition-all"
                    >
                      {pieceGlyph({ type: p, color: "w" })}
                    </button>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* End-game modal */}
        <AnimatePresence>
          {showEndModal && endResult && (
            <motion.div
              className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-md p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <GlassCard variant="strong" className="rounded-3xl p-8 max-w-md w-full text-center relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                  <MemberAvatar id="aria" size="xl" />
                </div>
                <div className="mt-8">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/50 font-bold">Result</p>
                  <h2 className="aurora-text font-[var(--font-headline)] text-3xl font-bold mt-2">
                    {endResult === "userWin" ? "You Won" : endResult === "aiWin" ? "Aria Wins" : "Draw"}
                  </h2>
                  <p className="text-white/65 mt-3 text-sm">
                    {state.checkmate
                      ? "Checkmate."
                      : state.stalemate
                      ? "Stalemate. No legal moves."
                      : resigned
                      ? "You resigned."
                      : "Draw by agreement."}
                  </p>
                  <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                    <AuroraButton variant="primary" onClick={onPlayAgain}>Play again</AuroraButton>
                    <AuroraButton variant="ghost" href="/games">Back to hub</AuroraButton>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ============== Sub-components ==============

function Board({
  state,
  selected,
  legalTargets,
  onSquareClick,
}: {
  state: GameState;
  selected: Square | null;
  legalTargets: Square[];
  onSquareClick: (sq: Square) => void;
}) {
  const lastMove = state.history.at(-1);
  return (
    <div className="relative w-full aspect-square max-w-[640px] mx-auto rounded-2xl overflow-hidden border border-white/10 shadow-[0_24px_60px_-20px_rgba(155,135,216,0.5)]">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {RANKS.map((r) =>
          FILES.map((f) => {
            const sq = `${f}${r}` as Square;
            const piece = state.board[sq];
            const light = isSquareLight(sq);
            const isSelected = selected === sq;
            const isTarget = legalTargets.includes(sq);
            const isLastFrom = lastMove?.from === sq;
            const isLastTo = lastMove?.to === sq;

            return (
              <button
                key={sq}
                onClick={() => onSquareClick(sq)}
                className="relative grid place-items-center transition-colors duration-150"
                style={{
                  background: light
                    ? "rgba(245,244,250,0.07)"
                    : "rgba(155,135,216,0.22)",
                  boxShadow: isSelected
                    ? "inset 0 0 0 3px rgba(127,181,212,0.65)"
                    : isLastFrom || isLastTo
                    ? "inset 0 0 0 2px rgba(216,163,184,0.45)"
                    : undefined,
                }}
              >
                {/* file/rank labels in corners */}
                {f === "a" && (
                  <span className="absolute top-0.5 left-1 text-[9px] text-white/30 font-bold">{r}</span>
                )}
                {r === 1 && (
                  <span className="absolute bottom-0.5 right-1 text-[9px] text-white/30 font-bold">{f}</span>
                )}

                {/* Legal move dot */}
                {isTarget && !piece && (
                  <span
                    className="absolute w-3 h-3 rounded-full"
                    style={{ background: "rgba(127,181,212, 0.55)", boxShadow: "0 0 10px rgba(127,181,212,0.55)" }}
                  />
                )}
                {isTarget && piece && (
                  <span
                    className="absolute inset-1 rounded-full border-2"
                    style={{ borderColor: "rgba(216,163,184, 0.65)" }}
                  />
                )}

                {piece && (
                  <span
                    className="relative z-10 grid place-items-center w-[78%] h-[78%] rounded-full text-[clamp(18px,4vw,38px)] leading-none select-none"
                    style={{
                      background:
                        piece.color === "w"
                          ? "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.7))"
                          : "linear-gradient(135deg, rgba(13,11,20,0.9), rgba(13,11,20,0.7))",
                      color: piece.color === "w" ? "#1a1a2a" : "#f5f4fa",
                      boxShadow:
                        piece.color === "w"
                          ? "0 0 0 2px rgba(155,135,216,0.4), 0 2px 6px rgba(0,0,0,0.35)"
                          : "0 0 0 2px rgba(251,191,36,0.4), 0 2px 6px rgba(0,0,0,0.55)",
                    }}
                  >
                    {pieceGlyph(piece)}
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}

function MoveList({ sans }: { sans: string[] }) {
  const pairs: Array<[string, string | null]> = [];
  for (let i = 0; i < sans.length; i += 2) {
    pairs.push([sans[i], sans[i + 1] ?? null]);
  }
  return (
    <div className="max-h-72 overflow-y-auto pr-1 space-y-1">
      {pairs.length === 0 && <p className="text-xs text-white/40">No moves yet. Make one.</p>}
      {pairs.map((pair, i) => (
        <div key={i} className="grid grid-cols-[28px_1fr_1fr] gap-2 text-xs">
          <div className="text-white/35 font-mono">{i + 1}.</div>
          <div className="text-white/90 font-mono">{pair[0]}</div>
          <div className="text-white/60 font-mono">{pair[1] ?? "…"}</div>
        </div>
      ))}
    </div>
  );
}

function CapturedRow({ caps, side }: { caps: PieceType[]; side: "white" | "black" }) {
  if (caps.length === 0) return <div className="h-5" />;
  return (
    <div className="flex items-center gap-1">
      {caps.map((p, i) => (
        <span
          key={i}
          className="text-base leading-none opacity-80"
          style={{ color: side === "white" ? "#1a1a2a" : "#f5f4fa" }}
        >
          {pieceGlyph({ type: p, color: side === "white" ? "b" : "w" })}
        </span>
      ))}
    </div>
  );
}

// helper: rough material balance (positive = white advantage)
function evaluateBalance(state: GameState): number {
  const V: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  let s = 0;
  for (const sq of ALL_SQUARES) {
    const p = state.board[sq];
    if (!p) continue;
    s += p.color === "w" ? V[p.type] : -V[p.type];
  }
  return s;
}
