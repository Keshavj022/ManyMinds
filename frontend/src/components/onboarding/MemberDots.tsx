"use client";

import { motion } from "framer-motion";
import { CouncilMemberId, councilColors } from "@/lib/design-tokens";

interface MemberDotsProps {
  /** One entry per step — the member asking that step. */
  members: ReadonlyArray<CouncilMemberId>;
  /** 0-indexed current step; pass members.length when everything's done. */
  current: number;
  className?: string;
}

/**
 * Five member-coloured dots that fill as the conversation moves along.
 * Past dots glow in their member's colour, the current one breathes,
 * future ones wait quietly.
 */
export default function MemberDots({
  members,
  current,
  className = "",
}: MemberDotsProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={members.length}
      aria-valuenow={Math.max(0, Math.min(members.length, current))}
      className={`flex items-center justify-center gap-3 ${className}`}
    >
      {members.map((id, i) => {
        const c = councilColors[id];
        const filled = i < current;
        const isCurrent = i === current;
        return (
          <motion.span
            key={`${id}-${i}`}
            animate={{ scale: isCurrent ? 1.3 : 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              isCurrent ? "animate-pulse-soft" : ""
            }`}
            style={{
              background: filled || isCurrent ? c.hex : "rgba(255,255,255,0.10)",
              boxShadow:
                filled || isCurrent ? `0 0 12px ${c.soft}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
