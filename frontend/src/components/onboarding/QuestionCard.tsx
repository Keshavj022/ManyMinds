"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import MemberChip from "@/components/ui/MemberChip";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { Question } from "@/lib/onboarding";

interface QuestionCardProps {
  question: Question;
  value: number; // 0-100
  onChange: (v: number) => void;
  className?: string;
}

/**
 * A single quiz question — center-stage glass card with breathing border.
 * Built to be swapped inside <AnimatePresence mode="wait" />.
 */
export default function QuestionCard({
  question,
  value,
  onChange,
  className = "",
}: QuestionCardProps) {
  const color = councilColors[question.vibeColor];
  const member = COUNCIL_MEMBERS.find((m) => m.id === question.vibeColor);

  const leftActive = value < 40;
  const rightActive = value > 60;

  // Slider fill in the asker's signature color
  const trackBackground = `linear-gradient(to right, ${color.hex} 0%, ${color.hex} ${value}%, rgba(255,255,255,0.08) ${value}%, rgba(255,255,255,0.08) 100%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.985 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full ${className}`}
    >
      <GlassCard
        variant="aurora"
        className="rounded-[2rem] p-8 md:p-12 relative overflow-hidden"
      >
        {/* member soft glow behind card */}
        <div
          aria-hidden
          className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-[100px] pointer-events-none"
          style={{ background: color.soft, opacity: 0.7 }}
        />

        {/* asker chip */}
        <div className="relative flex items-center justify-between mb-8">
          <MemberChip
            id={question.vibeColor}
            name={member?.name ?? question.vibeColor}
            role="asks"
            active
          />
          <span className="text-[10px] uppercase tracking-[0.28em] font-[var(--font-label)] font-bold text-white/40">
            {question.dimension}
          </span>
        </div>

        {/* prompt */}
        <h2 className="relative font-[var(--font-headline)] text-2xl md:text-3xl lg:text-[2rem] font-bold text-white leading-[1.2] mb-10 max-w-2xl">
          {question.prompt}
        </h2>

        {/* slider */}
        <div className="relative">
          <div className="relative h-6 flex items-center">
            {/* Custom track behind native input */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[6px] rounded-full"
              style={{ background: trackBackground }}
            />
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={value}
              onChange={(e) => onChange(parseInt(e.target.value, 10))}
              className="relative w-full cursor-pointer z-10"
              aria-label={question.prompt}
              style={{ background: "transparent" }}
            />
          </div>

          {/* labels */}
          <div className="mt-6 flex items-start justify-between gap-6 text-sm font-[var(--font-label)] tracking-wide">
            <span
              className={`transition-all duration-300 ${
                leftActive ? "opacity-100 scale-[1.02]" : "opacity-45"
              }`}
              style={{ color: leftActive ? color.hex : "rgba(255,255,255,0.6)" }}
            >
              {question.leftLabel}
            </span>
            <span
              className={`transition-all duration-300 text-right ${
                rightActive ? "opacity-100 scale-[1.02]" : "opacity-45"
              }`}
              style={{ color: rightActive ? color.hex : "rgba(255,255,255,0.6)" }}
            >
              {question.rightLabel}
            </span>
          </div>

          {/* keyboard hint */}
          <p className="mt-8 text-center text-[11px] tracking-[0.22em] uppercase font-[var(--font-label)] font-semibold text-white/30">
            Slide with ← → · Enter to continue
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}
