"use client";

import { motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import TypingDots from "@/components/ui/TypingDots";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { DemographicStep } from "@/lib/onboarding";

interface ConvoStepProps {
  step: DemographicStep;
  /** Previously given answer (when navigating back). */
  initialValue?: string;
  onSubmit: (value: string) => void;
  onSkip?: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * One beat of the demographics conversation — a member asks in their voice
 * (typing dots first, like a real chat), then the answer input fades in.
 * Mount with a `key` per step so the typing beat replays on each question.
 */
export default function ConvoStep({
  step,
  initialValue = "",
  onSubmit,
  onSkip,
}: ConvoStepProps) {
  const [phase, setPhase] = useState<"typing" | "asked">("typing");
  const [draft, setDraft] = useState(initialValue);
  const [picked, setPicked] = useState<string | null>(null);

  const member = COUNCIL_MEMBERS.find((m) => m.id === step.member);
  const color = councilColors[step.member];

  // Typing beat — feels like the member is actually writing the question.
  useEffect(() => {
    const t = setTimeout(() => setPhase("asked"), 620);
    return () => clearTimeout(t);
  }, []);

  const canContinue =
    step.kind === "text"
      ? draft.trim().length >= (step.optional ? 1 : 2)
      : draft.length > 0;

  const handleText = (e: FormEvent) => {
    e.preventDefault();
    if (!canContinue) return;
    onSubmit(draft.trim());
  };

  // Choice chips auto-advance after a springy beat.
  const handlePick = (id: string) => {
    if (picked) return;
    setPicked(id);
    window.setTimeout(() => onSubmit(id), 300);
  };

  return (
    <div className="w-full">
      {/* The member asks */}
      <div className="flex items-end gap-4">
        <MemberAvatar
          id={step.member}
          size="lg"
          status={phase === "typing" ? "thinking" : "talking"}
        />
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="glass rounded-3xl rounded-bl-lg px-6 py-5 max-w-xl"
          style={{ borderColor: `${color.hex}33` }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.28em] font-[var(--font-label)] font-bold mb-1.5"
            style={{ color: color.hex }}
          >
            {member?.name ?? step.member}
          </p>
          {phase === "typing" ? (
            <TypingDots memberId={step.member} />
          ) : (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="font-[var(--font-headline)] text-lg md:text-xl font-semibold text-white leading-snug"
            >
              {step.prompt}
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* You answer */}
      {phase === "asked" && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: EASE }}
          className="mt-7 pl-0 sm:pl-[4.5rem]"
        >
          {step.kind === "choice" && step.options ? (
            <div className="flex flex-wrap gap-2.5">
              {step.options.map((opt) => {
                const active = picked === opt.id || (!picked && draft === opt.id);
                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    onClick={() => handlePick(opt.id)}
                    whileTap={{ scale: 0.94 }}
                    animate={{ scale: picked === opt.id ? 1.06 : 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 24 }}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors inline-flex items-center gap-2"
                    style={
                      active
                        ? {
                            background: color.soft,
                            borderColor: `${color.hex}88`,
                            color: "#ffffff",
                            boxShadow: `0 0 18px ${color.soft}`,
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            borderColor: "rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.75)",
                          }
                    }
                  >
                    {opt.flag && <span aria-hidden>{opt.flag}</span>}
                    <span>{opt.label}</span>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleText} className="flex flex-col gap-4">
              <input
                type={step.kind === "date" ? "date" : "text"}
                autoFocus
                value={draft}
                max={step.kind === "date" ? TODAY : undefined}
                maxLength={step.kind === "text" ? 64 : undefined}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={step.placeholder}
                aria-label={step.prompt}
                className="w-full max-w-md rounded-2xl px-5 py-4 text-base text-white placeholder:text-white/30 font-medium [color-scheme:dark]"
              />
              <div className="flex items-center gap-3">
                <AuroraButton
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={!canContinue}
                  className={!canContinue ? "opacity-40 pointer-events-none" : ""}
                  iconRight={
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  }
                >
                  That&rsquo;s me
                </AuroraButton>
              </div>
            </form>
          )}

          {step.optional && onSkip && !picked && (
            <div className="mt-4">
              <AuroraButton variant="ghost" size="sm" onClick={onSkip}>
                {step.skipLabel ?? "Skip"}
              </AuroraButton>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
