"use client";

import { motion } from "framer-motion";

interface RoundIndicatorProps {
  round: number;
  totalRounds: number;
  /** 0..1 progress within current round */
  progress: number;
  size?: number;
}

export default function RoundIndicator({
  round,
  totalRounds,
  progress,
  size = 96,
}: RoundIndicatorProps) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const dash = c * Math.max(0, Math.min(1, progress));

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={3}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#round-gradient)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - dash}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="round-gradient" gradientTransform="rotate(110)">
            <stop offset="0%" stopColor="#9b87d8" />
            <stop offset="50%" stopColor="#d8a3b8" />
            <stop offset="100%" stopColor="#7fb5d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center leading-tight">
        <div className="text-[9px] uppercase tracking-[0.3em] text-white/45 font-[var(--font-label)]">
          Round
        </div>
        <div className="text-2xl font-bold text-white font-[var(--font-headline)]">
          {round}
        </div>
        <div className="text-[10px] text-white/45 font-[var(--font-label)] uppercase tracking-wider">
          of {totalRounds}
        </div>
      </div>
    </div>
  );
}
