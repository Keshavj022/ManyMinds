"use client";

import { motion } from "framer-motion";

interface StepProgressProps {
  total: number;
  current: number; // 0-indexed
  className?: string;
}

/**
 * Horizontal segmented progress bar.
 * Filled segments get aurora gradient, current shimmers, future are muted.
 */
export default function StepProgress({
  total,
  current,
  className = "",
}: StepProgressProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.max(0, Math.min(total, current + 1))}
      className={`flex items-center gap-1.5 w-full ${className}`}
    >
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < current;
        const isCurrent = i === current;
        return (
          <div
            key={i}
            className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/[0.06] relative"
          >
            {filled && (
              <motion.div
                layoutId={`step-fill-${i}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ originX: 0 }}
                className="absolute inset-0 aurora-gradient"
              />
            )}
            {isCurrent && (
              <>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 0.45 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  style={{ originX: 0 }}
                  className="absolute inset-0 aurora-gradient opacity-90"
                />
                <div className="absolute inset-0 animate-shimmer" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
