"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AuroraButton from "@/components/ui/AuroraButton";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/components/three/positions";
import {
  ACT_BOUNDS,
  COUNCIL_CHATTER,
  DEBATE_ROUNDS,
  GAME_CHAT,
  JOURNEY_WORLD_ORDER,
  N_WORLDS,
  WORLD_LABELS,
  type DebateRound,
} from "@/components/three/journey/timeline";

/**
 * HTML overlays for the journey — every piece of copy that floats above the
 * persistent 3D canvas. All fade bands are computed by JourneyHero from
 * timeline.ts ACT_BOUNDS and passed in as continuous opacities; components
 * here only own DISCRETE presentation state (typewriters, chatter cycling).
 */

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const ramp = (p: number, a: number, b: number) =>
  clamp01((p - a) / (b - a));

export type GroundAct = "council" | "debate" | "games" | "finale";

const MEMBER_NAME = Object.fromEntries(
  COUNCIL_MEMBERS.map((m) => [m.id, m.name]),
) as Record<CouncilMemberId, string>;

const KICKER_CLASS =
  "text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] text-white/55";

// ---------------------------------------------------------------------------
// b) Fall caption — "Falling through · <World>"
// ---------------------------------------------------------------------------

export function FallCaption({
  opacity,
  worldIndex,
}: {
  opacity: number;
  worldIndex: number;
}) {
  const worldId =
    JOURNEY_WORLD_ORDER[Math.min(Math.max(worldIndex, 0), N_WORLDS - 1)];
  const label = WORLD_LABELS[worldId];

  return (
    <div
      className="absolute inset-x-0 top-[13%] z-10 flex justify-center px-6 pointer-events-none"
      style={{ opacity }}
    >
      <div className="text-center max-w-3xl">
        <p className={`${KICKER_CLASS} mb-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]`}>
          Falling through
        </p>
        <AnimatePresence mode="wait">
          <motion.div
            key={worldIndex}
            initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="font-[var(--font-headline)] font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.85)]">
              <span className="aurora-text">{label.name}</span>
            </h2>
            <p className="mt-4 text-white/70 text-sm md:text-base lg:text-lg italic drop-shadow-[0_2px_18px_rgba(0,0,0,0.8)]">
              {label.line}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// c) Act title chips — the connective tissue between ground acts
// ---------------------------------------------------------------------------

const TITLE_CARDS: Record<GroundAct, string> = {
  council: "01 · The Council convenes",
  debate: "02 · They argue properly",
  games: "03 · Game night",
  finale: "04 · Your seat is open",
};

export function ActTitleChip({ act }: { act: GroundAct | null }) {
  return (
    <div className="absolute inset-x-0 top-[7%] z-10 flex justify-center px-6 pointer-events-none">
      <AnimatePresence mode="wait">
        {act && (
          <motion.div
            key={act}
            initial={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-full px-5 py-2"
          >
            <span className={`${KICKER_CLASS} text-white/70`}>
              {TITLE_CARDS[act]}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// d) Council chatter bubble — seated small-talk, one line per speaker turn
// ---------------------------------------------------------------------------

export function CouncilChatterBubble({
  speaker,
}: {
  speaker: CouncilMemberId | null;
}) {
  // Cycle through each member's lines per appearance — index ref per member.
  const lineIndex = useRef<Record<CouncilMemberId, number>>({
    aria: 0,
    rex: 0,
    sage: 0,
    nova: 0,
    echo: 0,
  });
  const [bubble, setBubble] = useState<{
    speaker: CouncilMemberId;
    line: string;
  } | null>(null);

  useEffect(() => {
    if (!speaker) {
      setBubble(null);
      return;
    }
    const lines = COUNCIL_CHATTER[speaker];
    const i = lineIndex.current[speaker];
    lineIndex.current[speaker] = i + 1;
    setBubble({ speaker, line: lines[i % lines.length] });
  }, [speaker]);

  return (
    <div className="absolute inset-x-0 top-[15%] z-10 flex justify-center px-6 pointer-events-none">
      <AnimatePresence mode="wait">
        {bubble && (
          <motion.div
            key={bubble.speaker}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong rounded-full pl-3.5 pr-5 py-2 inline-flex items-center gap-2.5 max-w-[90vw]"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: councilColors[bubble.speaker].hex,
                boxShadow: `0 0 10px ${councilColors[bubble.speaker].hex}`,
              }}
            />
            <span className="text-[12px] font-semibold text-white shrink-0">
              {MEMBER_NAME[bubble.speaker]}
            </span>
            <span className="text-[13px] text-white/75 truncate">
              {bubble.line}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// e) Debate bubbles + round dots
// ---------------------------------------------------------------------------

function Typewriter({ text, reduced }: { text: string; reduced: boolean }) {
  const [count, setCount] = useState(reduced ? text.length : 0);

  useEffect(() => {
    if (reduced) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const id = setInterval(() => {
      setCount((n) => {
        if (n >= text.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 18);
    return () => clearInterval(id);
  }, [text, reduced]);

  return <>{text.slice(0, count)}</>;
}

// Slot anchors are clamped so the card (max 22rem wide → 11rem half-width)
// can never overflow the viewport on phones: at 22% the centre anchor sits
// ~86px from the edge on a 390px screen, which would clip a third of the
// card under the sticky wrapper's overflow-hidden.
const DEBATE_SLOTS: Record<DebateRound["side"], CSSProperties> = {
  pro: { left: "max(3vw, calc(22% - 11rem))", top: "24%" },
  con: { right: "max(3vw, calc(22% - 11rem))", top: "24%" },
  mod: { left: "50%", top: "18%", transform: "translateX(-50%)" },
};

export function DebateBubbles({
  round,
  reduced,
}: {
  round: number;
  reduced: boolean;
}) {
  const current =
    round >= 0 && round < DEBATE_ROUNDS.length ? DEBATE_ROUNDS[round] : null;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={round}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute w-[min(86vw,22rem)]"
            style={DEBATE_SLOTS[current.side]}
          >
            <div className="glass-strong rounded-2xl py-4 pr-5 pl-6 relative overflow-hidden">
              {/* Member-coloured left rail */}
              <span
                aria-hidden
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{
                  background: councilColors[current.speaker].hex,
                  boxShadow: `0 0 14px ${councilColors[current.speaker].hex}`,
                }}
              />
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-[13px] font-semibold text-white">
                  {MEMBER_NAME[current.speaker]}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-[var(--font-label)] font-semibold uppercase tracking-[0.22em] border"
                  style={{
                    color: councilColors[current.speaker].hex,
                    borderColor: councilColors[current.speaker].hex + "55",
                    background: councilColors[current.speaker].soft,
                  }}
                >
                  Speaking
                </span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed min-h-[2.5rem]">
                <Typewriter text={current.line} reduced={reduced} />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round dots strip */}
      <div
        className="absolute inset-x-0 bottom-20 flex justify-center gap-2 transition-opacity duration-300"
        style={{ opacity: current ? 1 : 0 }}
      >
        {DEBATE_ROUNDS.map((r, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              background:
                i === round
                  ? councilColors[r.speaker].hex
                  : "rgba(255,255,255,0.18)",
              boxShadow:
                i === round
                  ? `0 0 8px ${councilColors[r.speaker].hex}`
                  : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// f) Games chat panel — "Council chat · Chess night"
// ---------------------------------------------------------------------------

export function GamesChatPanel({
  opacity,
  count,
}: {
  opacity: number;
  count: number;
}) {
  const rows = GAME_CHAT.slice(0, Math.max(0, Math.min(count, GAME_CHAT.length)));

  return (
    <div
      className="absolute top-24 right-6 z-10 w-[300px] max-w-[80vw] pointer-events-none"
      style={{ opacity }}
    >
      <div className="glass rounded-2xl p-4">
        <p className="text-[10px] tracking-[0.28em] uppercase font-[var(--font-label)] text-white/55">
          Council chat · Chess night
        </p>
        <ul className="mt-3 space-y-2.5">
          <AnimatePresence initial={false}>
            {rows.map((row, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.05,
                }}
                className="flex items-start gap-2"
              >
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: councilColors[row.speaker].hex,
                    boxShadow: `0 0 6px ${councilColors[row.speaker].hex}`,
                  }}
                />
                <p className="text-[12px] leading-snug text-white/75">
                  <span className="font-semibold text-white">
                    {MEMBER_NAME[row.speaker]}
                  </span>{" "}
                  {row.line}
                </p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// g) Finale CTA
// ---------------------------------------------------------------------------

export function FinaleCTA({ opacity }: { opacity: number }) {
  const interactive = opacity > 0.1;

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center px-6 pointer-events-none"
      style={{ opacity }}
    >
      <div
        className="glass-strong rounded-3xl p-8 md:p-12 max-w-2xl text-center"
        style={{ pointerEvents: interactive ? "auto" : "none" }}
      >
        <p className={`${KICKER_CLASS} mb-4`}>The Council</p>
        <h2 className="font-[var(--font-headline)] font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-white">
          Your seat is <span className="aurora-text">open</span>.
        </h2>
        <p className="mt-5 text-white/65 text-sm md:text-base leading-relaxed">
          Five minds. One table. They&apos;ll remember you tomorrow.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <AuroraButton href="/signup" variant="primary" size="lg">
            Take your seat
          </AuroraButton>
          <AuroraButton href="#about" variant="ghost" size="lg">
            Meet them first
          </AuroraButton>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// h) Journey progress rail
// ---------------------------------------------------------------------------

const RAIL_SEGMENTS: ReadonlyArray<{
  label: string;
  start: number;
  end: number;
}> = [
  { label: "Boot", start: 0, end: ACT_BOUNDS.breakoutEnd },
  { label: "Fall", start: ACT_BOUNDS.breakoutEnd, end: ACT_BOUNDS.landingEnd },
  { label: "Council", start: ACT_BOUNDS.landingEnd, end: ACT_BOUNDS.glide1End },
  { label: "Debate", start: ACT_BOUNDS.glide1End, end: ACT_BOUNDS.glide2End },
  { label: "Games", start: ACT_BOUNDS.glide2End, end: 1 },
];

export function ProgressRail({ progress }: { progress: number }) {
  return (
    <div className="absolute bottom-5 inset-x-0 z-10 flex justify-center pointer-events-none">
      <div className="flex items-end gap-4">
        {RAIL_SEGMENTS.map((seg) => {
          const fill = ramp(progress, seg.start, seg.end);
          const active =
            progress >= seg.start && (progress < seg.end || seg.end >= 1);
          return (
            <div key={seg.label} className="flex flex-col items-center gap-1.5">
              <span
                className={`text-[11px] tracking-[0.2em] uppercase font-[var(--font-label)] transition-colors duration-300 ${
                  active ? "text-white/85" : "text-white/30"
                }`}
              >
                {seg.label}
              </span>
              <span className="block h-[2px] w-12 md:w-16 rounded-full bg-white/10 overflow-hidden">
                <span
                  className="block h-full rounded-full bg-white/70"
                  style={{ width: `${fill * 100}%` }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
