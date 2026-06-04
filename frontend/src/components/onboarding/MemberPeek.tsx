"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import MemberAvatar from "@/components/ui/MemberAvatar";
import TypingDots from "@/components/ui/TypingDots";
import { COUNCIL_MEMBERS, CouncilMemberId, councilColors } from "@/lib/design-tokens";

interface MemberPeekProps {
  memberId: CouncilMemberId;
  position?: "left" | "right";
  text: string;
  /** Total visible time before fading out (ms). */
  duration?: number;
  /** Optional key to retrigger the animation. */
  triggerKey?: string | number;
  /** Optional callback once the peek has fully faded out. */
  onComplete?: () => void;
  className?: string;
}

/**
 * A council member that peeks in from off-screen with a speech bubble.
 * - Slides in over ~280ms
 * - Shows typing dots briefly
 * - Reveals text
 * - Fades out after `duration`
 */
export default function MemberPeek({
  memberId,
  position = "right",
  text,
  duration = 3200,
  triggerKey,
  onComplete,
  className = "",
}: MemberPeekProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<"typing" | "speaking">("typing");

  useEffect(() => {
    setVisible(true);
    setPhase("typing");

    const typingTimer = setTimeout(() => setPhase("speaking"), 480);
    const hideTimer = setTimeout(() => setVisible(false), duration);

    return () => {
      clearTimeout(typingTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, triggerKey]);

  const member = COUNCIL_MEMBERS.find((m) => m.id === memberId);
  const color = councilColors[memberId];

  const slideFrom = position === "left" ? -60 : 60;
  const sideClass = position === "left" ? "left-4 md:left-10" : "right-4 md:right-10";

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed bottom-8 ${sideClass} z-30 max-w-sm ${className}`}
    >
      <AnimatePresence onExitComplete={onComplete}>
        {visible && (
          <motion.div
            key={`peek-${triggerKey ?? "k"}`}
            initial={{ opacity: 0, x: slideFrom, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: slideFrom * 0.6, y: 10 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className={`flex items-end gap-3 ${
              position === "left" ? "" : "flex-row-reverse"
            }`}
          >
            <MemberAvatar
              id={memberId}
              size="lg"
              status={phase === "speaking" ? "talking" : "thinking"}
            />
            <div
              className="glass-strong rounded-2xl px-4 py-3 max-w-[16rem] relative"
              style={{ borderColor: color.hex }}
            >
              <div
                className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-bold mb-1"
                style={{ color: color.hex }}
              >
                {member?.name ?? memberId}
              </div>
              {phase === "typing" ? (
                <TypingDots memberId={memberId} />
              ) : (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-sm text-white leading-snug"
                >
                  {text}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
