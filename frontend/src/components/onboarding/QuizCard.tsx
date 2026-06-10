"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import { SCALE_LABELS, type Question } from "@/lib/onboarding";

interface QuizCardProps {
  question: Question;
  /** 1-5 once picked. */
  value?: number;
  onPick: (v: number) => void;
  /** Slide direction: 1 = forward, -1 = back. */
  direction?: 1 | -1;
}

const EASE = [0.22, 1, 0.36, 1] as const;
// Orbs grow from "not me" to "very me" — magnitude you can feel.
const ORB_SIZES = [40, 46, 52, 58, 66];

// Direction-aware slide. `custom` (not a plain prop) keeps the exit
// animation correct when the deck reverses on back-navigation.
const cardVariants = {
  enter: (dir: number) => ({ opacity: 0, x: 56 * dir, scale: 0.98 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: -56 * dir, scale: 0.98 }),
};

/**
 * One card of the Big Five deck. A member asks in their voice; you answer
 * with one of five orbs. Built to be swapped inside
 * <AnimatePresence mode="wait" /> — slides in from the pick direction.
 */
export default function QuizCard({
  question,
  value,
  onPick,
  direction = 1,
}: QuizCardProps) {
  const color = councilColors[question.member];
  const member = COUNCIL_MEMBERS.find((m) => m.id === question.member);

  return (
    <motion.div
      custom={direction}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.38, ease: EASE }}
      className="w-full"
    >
      <GlassCard className="relative overflow-hidden rounded-3xl p-7 md:p-10">
        {/* the asker's soft glow bleeding in from a corner */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 -right-28 h-72 w-72 rounded-full blur-[100px]"
          style={{ background: color.soft, opacity: 0.8 }}
        />

        {/* who's asking */}
        <div className="relative mb-7 flex items-center gap-3">
          <span className="animate-pulse-soft inline-flex">
            <MemberAvatar id={question.member} size="md" status="talking" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">
              {member?.name ?? question.member}
            </p>
            <p
              className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-bold"
              style={{ color: color.hex }}
            >
              wants to know
            </p>
          </div>
        </div>

        {/* the question, in their voice */}
        <h2 className="relative font-[var(--font-headline)] text-xl md:text-2xl lg:text-[1.65rem] font-bold text-white leading-snug max-w-xl">
          {question.prompt}
        </h2>

        {/* five orbs — not me … very me */}
        <div className="relative mt-10">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {[1, 2, 3, 4, 5].map((v, i) => {
              const selected = value === v;
              const size = ORB_SIZES[i];
              return (
                <motion.button
                  key={v}
                  type="button"
                  onClick={() => onPick(v)}
                  aria-label={`${SCALE_LABELS[i]} (${v} of 5)`}
                  aria-pressed={selected}
                  whileHover={{ scale: 1.12, y: -3 }}
                  whileTap={{ scale: 0.85 }}
                  animate={{ scale: selected ? 1.18 : 1 }}
                  transition={{ type: "spring", stiffness: 460, damping: 22 }}
                  className="grid place-items-center rounded-full border"
                  style={{
                    width: size,
                    height: size,
                    background: selected ? color.hex : "rgba(255,255,255,0.035)",
                    borderColor: selected
                      ? color.hex
                      : `${color.hex}44`,
                    boxShadow: selected
                      ? `0 0 28px ${color.soft}, 0 0 12px ${color.hex}66`
                      : undefined,
                  }}
                >
                  {selected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className="material-symbols-outlined text-[20px]"
                      style={{ color: "#15121d" }}
                    >
                      favorite
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between max-w-md mx-auto text-[11px] tracking-[0.18em] uppercase font-[var(--font-label)] font-bold">
            <span className="text-white/40">not me</span>
            <span style={{ color: color.hex }}>very me</span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
