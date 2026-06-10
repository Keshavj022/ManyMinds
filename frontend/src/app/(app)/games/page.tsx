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
  const squares: number[] = [];
  for (let i = 0; i < 64; i++) squares.push(i);
  return (
    <div className="relative w-40 h-40 rounded-2xl overflow-hidden border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
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
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 text-white/85 text-sm font-bold">
        <div className="col-start-5 row-start-2 grid place-items-center text-violet-200">♟</div>
        <div className="col-start-4 row-start-7 grid place-items-center text-amber-200">♞</div>
        <div className="col-start-6 row-start-7 grid place-items-center text-amber-200">♛</div>
      </div>
    </div>
  );
}

function TODPreview() {
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
      <div className="w-14 h-14 rounded-full grid place-items-center bg-white/[0.04] border border-white/[0.06] backdrop-blur-md text-xs font-bold text-white/90 font-[var(--font-headline)]">
        T or D
      </div>
    </div>
  );
}

function LudoPreview() {
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
          if (isCorner && r < 2 && c < 2) color = "bg-[rgba(127,181,212,0.35)]";
          else if (isCorner && r < 2 && c > 4) color = "bg-[rgba(212,154,122,0.35)]";
          else if (isCorner && r > 4 && c < 2) color = "bg-[rgba(200,155,196,0.35)]";
          else if (isCorner && r > 4 && c > 4) color = "bg-[rgba(216,163,184,0.35)]";
          else if (isCenter) color = "bg-white/15";
          else if (isVertical || isHorizontal) color = "bg-white/[0.06]";

          return <div key={i} className={`${cellSize} rounded-[2px] ${color}`} />;
        })}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <div className="w-3 h-3 rounded-full bg-[#7fb5d4] shadow-[0_0_8px_rgba(127,181,212,0.6)] -translate-x-7 -translate-y-2" />
        <div className="w-3 h-3 rounded-full bg-[#c89bc4] shadow-[0_0_8px_rgba(200,155,196,0.6)] translate-x-3 -translate-y-8" />
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
  hosts: CouncilMemberId[];
  hostLabel: string;
};

const GAMES: GameDef[] = [
  {
    id: "chess",
    title: "Chess",
    blurb:
      "Aria has the openings memorized. Rex just wants to see chaos on the board. Pick a side — or take them both on.",
    preview: ChessPreview,
    haloMember: "aria",
    hosts: ["aria", "rex"],
    hostLabel: "Aria vs Rex",
  },
  {
    id: "ludo",
    title: "Ludo",
    blurb:
      "Four tokens, one die, zero mercy. Nova invented house rules nobody agreed to, and somehow they stuck.",
    preview: LudoPreview,
    haloMember: "nova",
    hosts: ["nova"],
    hostLabel: "Nova's chaos",
  },
  {
    id: "truth-or-dare",
    title: "Truth or Dare",
    blurb:
      "The whole circle plays. Echo opens with a gentle one. It does not stay gentle.",
    preview: TODPreview,
    haloMember: "echo",
    hosts: ["echo"],
    hostLabel: "Echo asks first",
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
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-10"
    >
      {/* HEADER */}
      <div className="relative pb-2">
        <GradientOrb color="violet" size="lg" intensity={0.25} className="-top-20 -left-20" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-white/40" />
            <p className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-semibold text-white/55">
              Game night
            </p>
          </div>
          <h1 className="font-[var(--font-headline)] text-4xl font-bold text-white tracking-tight">
            Pick a game.
          </h1>
          <p className="text-white/55 mt-3 max-w-xl leading-relaxed">
            They keep score, they talk a respectful amount of trash, and yes —
            they remember who won last time.
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
              whileHover={{ y: -4, scale: 1.01 }}
              className="h-full"
            >
              <Link href={`/games/${g.id}`} className="block group h-full">
                <GlassCard
                  variant="default"
                  className="relative h-full rounded-3xl p-7 flex flex-col overflow-hidden"
                >
                  {/* warm halo in the host's hue */}
                  <div
                    aria-hidden
                    className="absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl opacity-40 group-hover:opacity-80 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle, ${c.hex}55, transparent 70%)` }}
                  />

                  {/* host badge */}
                  <div
                    className="absolute top-5 right-5 inline-flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border z-10"
                    style={{
                      background: c.soft,
                      borderColor: `${c.hex}55`,
                      color: c.hex,
                    }}
                  >
                    <span className="flex -space-x-1.5">
                      {g.hosts.map((h) => (
                        <MemberAvatar key={h} id={h} size="xs" />
                      ))}
                    </span>
                    {g.hostLabel}
                  </div>

                  <div className="flex items-center justify-center py-3 z-10">
                    {g.preview()}
                  </div>

                  <h3 className="text-xl font-bold text-white font-[var(--font-headline)] tracking-tight mt-5 z-10">
                    {g.title}
                  </h3>
                  <p className="text-white/55 text-sm leading-relaxed mt-2 flex-1 z-10">
                    {g.blurb}
                  </p>

                  <div className="mt-7 z-10">
                    <span className="inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight px-5 py-2.5 text-sm bg-[var(--color-accent)] text-[#15121d] shadow-[0_4px_14px_-4px_rgba(155,135,216,0.5)] transition-all duration-200 group-hover:bg-[var(--color-accent-strong)] group-hover:shadow-[0_8px_24px_-6px_rgba(155,135,216,0.6)]">
                      Play
                      <span className="material-symbols-outlined text-[16px] transition-transform duration-200 group-hover:translate-x-0.5">
                        arrow_forward
                      </span>
                    </span>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* SCOREBOARD */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatCard label="Games played" value={String(summary.total)} />
        <GlassCard variant="soft" className="rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-[0.32em] text-white/45 font-[var(--font-label)] font-semibold">
            Wins · losses · draws
          </div>
          <div className="text-2xl font-bold text-white font-[var(--font-headline)] mt-1.5">
            <span className="text-[#7fb5d4]">{summary.wins}</span>
            <span className="text-white/30 mx-1">·</span>
            <span className="text-[#d8a3b8]">{summary.losses}</span>
            <span className="text-white/30 mx-1">·</span>
            <span className="text-white/60">{summary.draws}</span>
          </div>
        </GlassCard>
        <GlassCard variant="soft" className="rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-[0.32em] text-white/45 font-[var(--font-label)] font-semibold">
            Streak
          </div>
          <div
            className="text-2xl font-bold font-[var(--font-headline)] mt-1.5"
            style={{
              color:
                summary.streak > 0
                  ? "var(--color-warm)"
                  : summary.streak < 0
                    ? "#d8a3b8"
                    : "#ffffff",
            }}
          >
            {summary.streak > 0 ? `+${summary.streak}` : summary.streak === 0 ? "—" : summary.streak}
          </div>
        </GlassCard>
        <GlassCard variant="soft" className="rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-[0.32em] text-white/45 font-[var(--font-label)] font-semibold">
            Last played
          </div>
          <div className="text-sm font-bold text-white mt-1.5 truncate font-[var(--font-headline)]">
            {summary.last ? labelGame(summary.last.game) : "Nothing yet"}
          </div>
          {summary.last && (
            <div className="text-[11px] text-white/45 mt-0.5">
              {formatRelative(summary.last.ts)} · {summary.last.outcome}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* RECENT MATCHES */}
      {history.length > 0 && (
        <GlassCard variant="default" className="rounded-3xl p-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-[var(--font-headline)] text-lg font-bold text-white">
              Lately at the table
            </h2>
            <span className="text-[11px] text-white/40 uppercase tracking-[0.32em] font-[var(--font-label)]">
              last 5
            </span>
          </div>
          <ul className="divide-y divide-white/5">
            {history.map((h) => (
              <li key={h.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                <span className="text-white/85 font-bold shrink-0">{labelGame(h.game)}</span>
                <span className="text-white/60 truncate text-right flex-1">{h.detail ?? h.outcome}</span>
                <span className="text-[11px] text-white/40 w-20 text-right shrink-0">
                  {formatRelative(h.ts)}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* COMING SOON */}
      <GlassCard variant="soft" className="rounded-3xl p-7 border-dashed text-center">
        <span className="material-symbols-outlined text-white/35 text-3xl">style</span>
        <h3 className="text-white font-bold font-[var(--font-headline)] mt-3">Poker, soon™</h3>
        <p className="text-white/45 text-sm max-w-sm mx-auto mt-1.5 leading-relaxed">
          Rex has been promising to learn the rules for weeks. Aria has already
          memorized them.
        </p>
      </GlassCard>
    </motion.div>
  );
}

// ---------- helpers ----------

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard variant="soft" className="rounded-2xl p-5">
      <div className="text-[11px] uppercase tracking-[0.32em] text-white/45 font-[var(--font-label)] font-semibold">
        {label}
      </div>
      <div className="text-2xl font-bold text-white font-[var(--font-headline)] mt-1.5">
        {value}
      </div>
    </GlassCard>
  );
}

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
