"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { STARTER_PROMPTS } from "@/lib/chat-fixtures";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";

interface EmptyStateProps {
  onPick: (label: string) => void;
  /** When set, it's a 1:1 — greet with that member's voice. */
  member?: CouncilMemberId | null;
}

export default function EmptyState({ onPick, member = null }: EmptyStateProps) {
  const solo = member ? COUNCIL_MEMBERS.find((m) => m.id === member) : null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-7"
      >
        {solo ? (
          <MemberAvatar id={solo.id} size="xl" status="online" className="animate-pulse-soft" />
        ) : (
          <div className="flex -space-x-3.5">
            {COUNCIL_MEMBERS.map((m, i) => (
              <motion.span
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
              >
                <MemberAvatar id={m.id} size="lg" className="animate-pulse-soft" />
              </motion.span>
            ))}
          </div>
        )}
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="text-3xl md:text-4xl font-[var(--font-headline)] font-bold aurora-text tracking-tight"
      >
        {solo ? `Just you and ${solo.name}.` : "Hey, you made it."}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="mt-3 text-sm text-white/55 max-w-md leading-relaxed"
      >
        {solo ? (
          <span>
            <span style={{ color: councilColors[solo.id].hex }} className="font-semibold">
              &ldquo;{solo.signatureGreeting}&rdquo;
            </span>{" "}
            — the others can&rsquo;t hear you in here.
          </span>
        ) : (
          "The five of us are already here. Say anything — we'll take it from there."
        )}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="mt-8 flex flex-wrap justify-center gap-2 max-w-lg"
      >
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPick(p.label)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border border-white/[0.06] bg-white/[0.04] text-white/85 hover:text-white hover:bg-white/[0.07] hover:scale-[1.03] hover:-translate-y-0.5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-white/55">
              {p.icon}
            </span>
            {p.label}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
