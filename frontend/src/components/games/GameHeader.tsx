"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GameHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  score?: ReactNode;
  rightSlot?: ReactNode;
  backHref?: string;
}

export default function GameHeader({
  title,
  subtitle,
  score,
  rightSlot,
  backHref = "/games",
}: GameHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/5"
    >
      <div className="flex items-start gap-4">
        <Link
          href={backHref}
          className="shrink-0 w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors grid place-items-center text-white/70"
          aria-label="Back to games hub"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </Link>
        <div>
          <h1 className="font-[var(--font-headline)] text-2xl md:text-3xl font-bold text-white tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="text-white/55 text-sm mt-1">{subtitle}</p>}
          {score && <div className="mt-2 text-xs text-white/60 font-[var(--font-label)] tracking-wider uppercase">{score}</div>}
        </div>
      </div>
      {rightSlot && <div className="flex items-center gap-3">{rightSlot}</div>}
    </motion.div>
  );
}
