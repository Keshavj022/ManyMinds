"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ReactElement, useEffect, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import MemberAvatar from "@/components/ui/MemberAvatar";
import GradientOrb from "@/components/ui/GradientOrb";
import { councilColors, CouncilMemberId } from "@/lib/design-tokens";
import { gameHistorySummary, GameResultRecord, loadGameHistory } from "@/lib/games/storage";

// ---------- Mini previews ----------

function ChessPreview() {
  // 8x8 mini board CSS grid
  const squares: number[] = [];
  for (let i = 0; i < 64; i++) squares.push(i);
  return (
    <div className="relative w-40 h-40 rounded-2xl overflow-hidden border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
        {squares.map((i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const light = (row + col) % 2 === 0;
          return (
            <div
              key={i}
              className={light ? "bg-[rgba(245,244,250,0.08)]" : "bg-[rgba(155,135,216,0.18)]"}
            />
          );
        })}
      </div>
      {/* Mock pieces */}
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 text-white/85 text-sm font-bold">
        <div className="col-start-5 row-start-2 grid place-items-center text-violet-200">♟</div>
        <div className="col-start-4 row-start-7 grid place-items-center text-amber-200">♞</div>
        <div className="col-start-6 row-start-7 grid place-items-center text-amber-200">♛</div>
      </div>
    </div>
  );
}

function TODPreview() {
  // rotating cluster of member avatars
  const members: CouncilMemberId[] = ["aria", "rex", "sage", "nova", "echo"];
  return (
    <div className="relative w-40 h-40 grid place-items-center">
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        {members.map((m, i) => {
          const angle = (i / members.length) * Math.PI * 2;
          const r = 56;
          const x = Math.cos(angle - Math.PI / 2) * r;
          const y = Math.sin(angle - Math.PI / 2) * r;
          return (
            <motion.div
              key={m}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ transform: `translate(${x}px, ${y}px)` }}
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            >
              <MemberAvatar id={m} size="md" />
            </motion.div>
          );
        })}
      </motion.div>
      <div className="w-14 h-14 rounded-full grid place-items-center bg-white/[0.04] border border-white/10 backdrop-blur-md text-xs font-bold text-white/90 font-[var(--font-headline)]">
        T or D
      </div>
    </div>
  );
}

function LudoPreview() {
  // Mini cross-shape ludo board
  const cellSize = "w-2 h-2";
  return (
    <div className="relative w-40 h-40 grid place-items-center">
      <div className="grid grid-cols-7 grid-rows-7 gap-1">
        {Array.from({ length: 49 }, (_, i) => {
          const r = Math.floor(i / 7);
          const c = i % 7;
          const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          const isVertical = c === 3 && (r < 2 || r > 4);
          const isHorizontal = r === 3 && (c < 2 || c > 4);
          const isCorner =
            (r < 2 && c < 2) ||
            (r < 2 && c > 4) ||
            (r > 4 && c < 2) ||
            (r > 4 && c > 4);

          let color = "bg-transparent";
          if (isCorner && r < 2 && c < 2) color = "bg-[rgba(127,181,212,0.35)]";  // blue (user) top-left
          else if (isCorner && r < 2 && c > 4) color = "bg-[rgba(212,154,122,0.35)]"; // red (Rex)
          else if (isCorner && r > 4 && c < 2) color = "bg-[rgba(216,163,184,0.35)]"; // yellow (Nova) — using magenta for vibrancy
          else if (isCorner && r > 4 && c > 4) color = "bg-[rgba(216,163,184,0.35)]"; // green/rose (Echo)
          else if (isCenter) color = "bg-white/15";
          else if (isVertical || isHorizontal) color = "bg-white/[0.06]";

          return <div key={i} className={`${cellSize} rounded-[2px] ${color}`} />;
        })}
      </div>
      {/* Tokens */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="w-3 h-3 rounded-full bg-[#7fb5d4] shadow-[0_0_8px_rgba(127,181,212,0.6)] -translate-x-7 -translate-y-2" />
        <div className="w-3 h-3 rounded-full bg-[#d49a7a] shadow-[0_0_8px_rgba(212,154,122,0.6)] translate-x-3 -translate-y-8" />
        <div className="w-3 h-3 rounded-full bg-[#d8a3b8] shadow-[0_0_8px_rgba(216,163,184,0.6)] translate-x-8 translate-y-5" />
      </div>
    </div>
  );
}

// ---------- Game card ----------

type GameDef = {
  id: "chess" | "truth-or-dare" | "ludo";
  title: string;
  blurb: string;
  preview: () => ReactElement;
  haloMember: CouncilMemberId;
  badge?: { memberId: CouncilMemberId; label: string };
};

const GAMES: GameDef[] = [
  {
    id: "chess",
    title: "Chess",
    blurb: "A tactical match. Aria sees four moves ahead. Sage may kibitz.",
    preview: ChessPreview,
    haloMember: "aria",
    badge: { memberId: "aria", label: "vs. Aria" },
  },
  {
    id: "truth-or-dare",
    title: "Truth or Dare",
    blurb: "The whole council plays. Probing questions. Dares with consequences.",
    preview: TODPreview,
    haloMember: "nova",
  },
  {
    id: "ludo",
    title: "Ludo",
    blurb: "4-player chaos with Rex, Nova, and Echo.",
    preview: LudoPreview,
    haloMember: "rex",
  },
];

// ---------- Page ----------

export default function GamesHub() {
  const [history, setHistory] = useState<GameResultRecord[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    wins: number;
    losses: number;
    draws: number;
    streak: number;
    last?: GameResultRecord | undefined;
  }>({ total: 0, wins: 0, losses: 0, draws: 0, streak: 0, last: undefined });

  useEffect(() => {
    setHistory(loadGameHistory());
    setSummary(gameHistorySummary());
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
    >
      {/* HEADER STRIP */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5 relative">
        <GradientOrb color="violet" size="lg" intensity={0.25} className="-top-20 -left-20" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/40" />
            <p className="text-[10px] tracking-[0.32em] uppercase font-bold font-[var(--font-label)] text-white/55">
              Council Games
            </p>
          </div>
          <h1 className="font-[var(--font-headline)] text-4xl font-bold text-white tracking-tight">
            Games Hub
          </h1>
          <p className="text-white/55 mt-2 max-w-xl">
            Play with your council. They keep score, they keep banter, and yes — they remember.
          </p>
        </div>
      </div>

      {/* GAME CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {GAMES.map((g, i) => {
          const c = councilColors[g.haloMember];
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link href={`/games/${g.id}`} className="block group h-full">
                <GlassCard
                  variant="default"
                  className="relative h-full rounded-3xl p-6 flex flex-col transition-all duration-500 group-hover:-translate-y-1 overflow-hidden"
                >
                  {/* halo */}
                  <div
                    aria-hidden
                    className="absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl opacity-40 group-hover:opacity-90 transition-opacity"
                    style={{ background: `radial-gradient(circle, ${c.hex}55, transparent 70%)` }}
                  />
                  {/* aurora border on hover */}
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      padding: "1px",
                      background: "linear-gradient(110deg, #9b87d8, #d8a3b8)",
                      WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                      pointerEvents: "none",
                    }}
                  />

                  {/* badge */}
                  {g.badge && (
                    <div
                      className="absolute top-4 right-4 inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border z-10"
                      style={{
                        background: councilColors[g.badge.memberId].soft,
                        borderColor: `${councilColors[g.badge.memberId].hex}66`,
                        color: councilColors[g.badge.memberId].hex,
                      }}
                    >
                      <MemberAvatar id={g.badge.memberId} size="xs" />
                      {g.badge.label}
                    </div>
                  )}

                  <div className="flex items-center justify-center py-2 z-10">
                    {g.preview()}
                  </div>

                  <h3 className="text-xl font-bold text-white font-[var(--font-headline)] tracking-tight mt-4 z-10">
                    {g.title}
                  </h3>
                  <p className="text-white/55 text-sm leading-relaxed mt-2 flex-1 z-10">
                    {g.blurb}
                  </p>

                  <div className="mt-6 z-10">
                    <span className="inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-200 px-4 py-2 text-sm aurora-gradient text-[#0d0b14] shadow-[0_8px_28px_-8px_rgba(155,135,216,0.65)] group-hover:shadow-[0_12px_40px_-8px_rgba(216,163,184,0.7)] group-hover:brightness-110">
                      Play
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </span>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* STATS ROW */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <GlassCard variant="soft" className="rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/45 font-bold">Total</div>
          <div className="text-2xl font-bold text-white font-[var(--font-headline)] mt-1">{summary.total}</div>
        </GlassCard>
        <GlassCard variant="soft" className="rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/45 font-bold">W / L / D</div>
          <div className="text-2xl font-bold text-white font-[var(--font-headline)] mt-1">
            <span className="text-emerald-300">{summary.wins}</span>
            <span className="text-white/30 mx-1">/</span>
            <span className="text-rose-300">{summary.losses}</span>
            <span className="text-white/30 mx-1">/</span>
            <span className="text-white/60">{summary.draws}</span>
          </div>
        </GlassCard>
        <GlassCard variant="soft" className="rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/45 font-bold">Streak</div>
          <div className="text-2xl font-bold font-[var(--font-headline)] mt-1" style={{
            color: summary.streak > 0 ? "#86efac" : summary.streak < 0 ? "#d8a3b8" : "#ffffff",
          }}>
            {summary.streak > 0 ? `+${summary.streak}` : summary.streak === 0 ? "—" : summary.streak}
          </div>
        </GlassCard>
        <GlassCard variant="soft" className="rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-white/45 font-bold">Last played</div>
          <div className="text-sm font-bold text-white mt-1 truncate font-[var(--font-headline)]">
            {summary.last ? labelGame(summary.last.game) : "Nothing yet"}
          </div>
          {summary.last && (
            <div className="text-[11px] text-white/45 mt-0.5">{formatRelative(summary.last.ts)} · {summary.last.outcome}</div>
          )}
        </GlassCard>
      </motion.div>

      {/* RECENT MATCHES (when present) */}
      {history.length > 0 && (
        <GlassCard variant="default" className="rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-[var(--font-headline)] text-lg font-bold text-white">Recent Matches</h2>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">last 5</span>
          </div>
          <ul className="divide-y divide-white/5">
            {history.map((h) => (
              <li key={h.id} className="py-2.5 flex items-center justify-between text-sm">
                <span className="text-white/85 font-bold">{labelGame(h.game)}</span>
                <span className="text-white/60 truncate max-w-md text-right">{h.detail ?? h.outcome}</span>
                <span className="text-[11px] text-white/40 w-20 text-right">{formatRelative(h.ts)}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* COMING SOON */}
      <GlassCard variant="soft" className="rounded-3xl p-6 border-dashed text-center">
        <span className="material-symbols-outlined text-white/35 text-3xl">videogame_asset_off</span>
        <h3 className="text-white font-bold font-[var(--font-headline)] mt-3">Poker, Soon™</h3>
        <p className="text-white/45 text-sm max-w-sm mx-auto mt-1">
          Rex has been promising to learn the rules for weeks. Aria has already memorized them.
        </p>
      </GlassCard>
    </motion.div>
  );
}

// ---------- helpers ----------

function labelGame(g: "chess" | "truth-or-dare" | "ludo"): string {
  if (g === "chess") return "Chess";
  if (g === "ludo") return "Ludo";
  return "Truth or Dare";
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
