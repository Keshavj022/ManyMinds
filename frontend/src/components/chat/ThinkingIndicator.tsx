"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import MemberAvatar from "@/components/ui/MemberAvatar";
import TypingDots from "@/components/ui/TypingDots";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";

interface ThinkingIndicatorProps {
  /** Who might answer — rotates through these while we wait. */
  candidates: ReadonlyArray<CouncilMemberId>;
}

/**
 * The "someone is about to say something" shimmer shown while the turn is
 * in flight. In a group it rotates — "Aria is thinking… Rex is thinking…" —
 * so the wait feels like the room mulling it over, not a spinner.
 */
export default function ThinkingIndicator({ candidates }: ThinkingIndicatorProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (candidates.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % candidates.length);
    }, 1500);
    return () => clearInterval(t);
  }, [candidates]);

  const id = candidates[index % Math.max(candidates.length, 1)] ?? "aria";
  const member = COUNCIL_MEMBERS.find((m) => m.id === id);
  const color = councilColors[id];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mt-5 flex items-center gap-3"
    >
      <div className="w-10 shrink-0 flex justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
          >
            <MemberAvatar id={id} size="md" status="thinking" />
          </motion.span>
        </AnimatePresence>
      </div>
      <div
        className="px-4 py-2.5 rounded-3xl rounded-tl-lg flex items-center gap-2.5"
        style={{
          background: color.soft,
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="text-xs font-semibold"
            style={{ color: color.hex }}
          >
            {member?.name ?? id} is thinking
          </motion.span>
        </AnimatePresence>
        <TypingDots memberId={id} />
      </div>
    </motion.div>
  );
}
