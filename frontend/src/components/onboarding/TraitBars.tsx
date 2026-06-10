"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { councilColors } from "@/lib/design-tokens";
import {
  TRAIT_DISPLAY,
  type BigFiveDimension,
  type BigFiveScores,
} from "@/lib/onboarding";

interface TraitBarsProps {
  scores: BigFiveScores;
  /** The trait getting the headline — its row glows a little brighter. */
  highlight?: BigFiveDimension;
  /** Seconds before the first bar starts filling. */
  startDelay?: number;
  className?: string;
}

const ORDER: ReadonlyArray<BigFiveDimension> = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
];

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The Big Five, drawn as five bars in member colours — each trait is
 * "kept" by the member who cares about it most.
 */
export default function TraitBars({
  scores,
  highlight,
  startDelay = 0,
  className = "",
}: TraitBarsProps) {
  return (
    <div className={`space-y-5 ${className}`}>
      {ORDER.map((trait, i) => {
        const display = TRAIT_DISPLAY[trait];
        const color = councilColors[display.member];
        const value = Math.max(0, Math.min(100, scores[trait]));
        const isStar = trait === highlight;
        const delay = startDelay + i * 0.14;
        return (
          <motion.div
            key={trait}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay, ease: EASE }}
            className={isStar ? "" : "opacity-90"}
          >
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <MemberAvatar id={display.member} size="xs" glow={isStar} />
                <span className="text-sm font-bold text-white">
                  {display.label}
                </span>
                <span className="hidden sm:inline text-xs text-white/40 truncate">
                  {display.sub}
                </span>
              </div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.55 }}
                className="text-sm font-bold tabular-nums"
                style={{ color: color.hex }}
              >
                {value}
              </motion.span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.9, delay: delay + 0.15, ease: EASE }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${color.hex}88, ${color.hex})`,
                  boxShadow: isStar ? `0 0 14px ${color.soft}` : undefined,
                }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
