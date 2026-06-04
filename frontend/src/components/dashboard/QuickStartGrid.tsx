"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CouncilMemberId, councilColors } from "@/lib/design-tokens";

interface Tile {
  title: string;
  hint: string;
  href: string;
  icon: string;
  member: CouncilMemberId;
}

const TILES: ReadonlyArray<Tile> = [
  {
    // Phrasing is intentionally neutral — works for new users (open the
    // first thread) and returning ones (pick up where they left off).
    title: "Start a thread",
    hint: "Open the floor. The whole council is listening.",
    href: "/chat",
    icon: "forum",
    member: "aria",
  },
  {
    title: "Settle a debate",
    hint: "Five voices, one topic, no fence-sitting.",
    href: "/debate",
    icon: "balance",
    member: "rex",
  },
  {
    title: "Play a game",
    hint: "Chess, Truth or Dare, Ludo — your move.",
    href: "/games",
    icon: "extension",
    member: "nova",
  },
  {
    title: "Walk through your memory",
    hint: "See what the council remembers about you.",
    href: "/memory",
    icon: "hub",
    member: "echo",
  },
];

export default function QuickStartGrid() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {TILES.map((tile, i) => (
        <QuickStartTile key={tile.title} tile={tile} index={i} />
      ))}
    </section>
  );
}

function QuickStartTile({ tile, index }: { tile: Tile; index: number }) {
  const color = councilColors[tile.member];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.06, duration: 0.45 }}
    >
      <Link
        href={tile.href}
        className="group relative block h-full rounded-3xl p-6 glass border border-white/8 overflow-hidden transition-all duration-300 hover:-translate-y-1"
      >
        {/* Halo on hover */}
        <span
          aria-hidden
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${color.hex}, transparent 70%)`,
          }}
        />
        <div className="relative z-10 flex flex-col gap-4 h-full">
          <div
            className="w-12 h-12 rounded-2xl grid place-items-center transition-transform group-hover:scale-110"
            style={{
              background: color.soft,
              border: `1px solid ${color.soft}`,
              boxShadow: `inset 0 0 12px ${color.soft}`,
            }}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ color: color.hex }}
            >
              {tile.icon}
            </span>
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-[var(--font-headline)] font-bold text-lg text-white leading-tight">
              {tile.title}
            </h3>
            <p className="text-sm text-white/55 leading-snug">{tile.hint}</p>
          </div>
          <span
            className="text-[12px] font-semibold uppercase tracking-wider inline-flex items-center gap-1 transition-colors"
            style={{ color: color.hex }}
          >
            Open
            <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
