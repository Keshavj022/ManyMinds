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
 * and the whole little cluster of candidates breathes, so the wait feels like
 * the room leaning in together, not a spinner.
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
  const isGroup = candidates.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mt-5 flex items-center gap-3"
    >
      <div className="w-10 shrink-0 flex justify-center">
        {isGroup ? (
          // A breathing huddle of whoever might speak — the room mulling it over.
          <span className="flex -space-x-2.5">
            {candidates.slice(0, 3).map((cid, i) => (
              <motion.span
                key={cid}
                animate={{ y: [0, -2.5, 0] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  delay: i * 0.18,
                  ease: "easeInOut",
                }}
                style={{ zIndex: cid === id ? 10 : 3 - i }}
              >
                <MemberAvatar
                  id={cid}
                  size="xs"
                  status={cid === id ? "thinking" : undefined}
                  glow={cid === id}
                />
              </motion.span>
            ))}
          </span>
        ) : (
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
        )}
      </div>
      <motion.div
        animate={{ borderColor: [`${color.hex}22`, `${color.hex}55`, `${color.hex}22`] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="px-4 py-2.5 rounded-3xl rounded-tl-md flex items-center gap-2.5"
        style={{
          background: color.soft,
          border: "1px solid",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-xs font-semibold"
            style={{ color: color.hex }}
          >
            {member?.name ?? id} is {isGroup ? "weighing in" : "thinking"}
          </motion.span>
        </AnimatePresence>
        <TypingDots memberId={id} />
      </motion.div>
    </motion.div>
  );
}
