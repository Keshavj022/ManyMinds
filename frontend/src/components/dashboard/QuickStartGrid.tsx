"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CouncilMemberId, councilColors } from "@/lib/design-tokens";

interface Tile {
  title: string;
  hint: string;
  verb: string;
  href: string;
  icon: string;
  member: CouncilMemberId;
}

const TILES: ReadonlyArray<Tile> = [
  {
    title: "Talk it out",
    hint: "Open the floor — all five of us are listening.",
    verb: "Talk",
    href: "/chat",
    icon: "forum",
    member: "aria",
  },
  {
    title: "Settle a debate",
    hint: "Pick a topic. We'll take sides — no fence-sitting.",
    verb: "Debate",
    href: "/debate",
    icon: "balance",
    member: "rex",
  },
  {
    title: "Play a game",
    hint: "Chess, Truth or Dare, Ludo — your move.",
    verb: "Play",
    href: "/games",
    icon: "extension",
    member: "nova",
  },
  {
    title: "See what we remember",
    hint: "Your memory wall — every thread we're holding.",
    verb: "Look",
    href: "/memory",
    icon: "hub",
    member: "echo",
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function QuickStartGrid() {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.07, duration: 0.5, ease: EASE }}
      whileHover={{
        y: -4,
        scale: 1.02,
        transition: { type: "spring", stiffness: 320, damping: 22 },
      }}
      whileTap={{
        scale: 0.99,
        transition: { type: "spring", stiffness: 400, damping: 24 },
      }}
      className="h-full"
    >
      <Link
        href={tile.href}
        className="group relative block h-full rounded-3xl p-6 glass-warm overflow-hidden"
      >
        {/* Member-coloured halo on hover */}
        <span
          aria-hidden
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${color.soft}, transparent 70%)`,
          }}
        />
        <div className="relative z-10 flex flex-col gap-5 h-full">
          <div
            className="w-12 h-12 rounded-2xl grid place-items-center transition-transform duration-300 group-hover:scale-110"
            style={{ background: color.soft }}
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
            className="text-[12px] font-semibold uppercase tracking-wider inline-flex items-center gap-1"
            style={{ color: color.hex }}
          >
            {tile.verb}
            <span className="material-symbols-outlined text-[16px] transition-transform duration-300 group-hover:translate-x-1">
              arrow_forward
            </span>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
