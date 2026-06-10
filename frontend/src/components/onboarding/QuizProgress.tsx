"use client";

import { motion } from "framer-motion";

interface QuizProgressProps {
  total: number;
  /** How many cards are behind you. */
  done: number;
  className?: string;
}

/**
 * One continuous lilac→blush bar that fills as the deck thins out.
 */
export default function QuizProgress({
  total,
  done,
  className = "",
}: QuizProgressProps) {
  const pct = total === 0 ? 0 : Math.max(0, Math.min(100, (done / total) * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className={`h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden ${className}`}
    >
      <motion.div
        className="h-full rounded-full aurora-gradient"
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ boxShadow: "0 0 12px rgba(155,135,216,0.35)" }}
      />
    </div>
  );
}
