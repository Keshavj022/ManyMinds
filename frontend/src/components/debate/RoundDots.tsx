"use client";

interface RoundDotsProps {
  round: number;
  totalRounds: number;
  className?: string;
}

/**
 * Round progress as a calm row of dots — the current round stretches
 * into a warm dash, finished rounds stay lit, the rest wait quietly.
 */
export default function RoundDots({
  round,
  totalRounds,
  className = "",
}: RoundDotsProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: totalRounds }, (_, i) => {
          const n = i + 1;
          const done = n < round;
          const current = n === round;
          return (
            <span
              key={n}
              className={`rounded-full transition-all duration-500 ${
                current
                  ? "w-5 h-1.5 bg-[var(--color-warm)] animate-pulse-soft"
                  : done
                    ? "w-1.5 h-1.5 bg-[var(--color-warm)]/60"
                    : "w-1.5 h-1.5 bg-white/15"
              }`}
            />
          );
        })}
      </div>
      <span className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] text-white/55">
        round {round} of {totalRounds}
      </span>
    </div>
  );
}
