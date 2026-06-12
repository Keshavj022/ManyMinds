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
  const soloHex = solo ? councilColors[solo.id].hex : null;
  const soloSoft = solo ? councilColors[solo.id].soft : null;

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
      {/* Warm lamp-light halo behind the friends — the lounge glow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background: soloSoft
            ? `radial-gradient(ellipse 45% 40% at 50% 38%, ${soloSoft}, transparent 70%)`
            : "radial-gradient(ellipse 55% 42% at 50% 38%, rgba(224,176,131,0.10), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mb-7"
      >
        {solo ? (
          <motion.span
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block"
          >
            <MemberAvatar
              id={solo.id}
              size="xl"
              status="online"
              className="animate-pulse-soft"
            />
          </motion.span>
        ) : (
          <div className="flex -space-x-3.5">
            {COUNCIL_MEMBERS.map((m, i) => (
              <motion.span
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{
                  opacity: 1,
                  y: [0, i % 2 === 0 ? -4 : -7, 0],
                }}
                transition={{
                  opacity: { duration: 0.5, delay: 0.08 * i },
                  y: {
                    duration: 4.5 + i * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.12 * i,
                  },
                }}
              >
                <MemberAvatar id={m.id} size="lg" />
              </motion.span>
            ))}
          </div>
        )}
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative text-3xl md:text-4xl font-[var(--font-headline)] font-bold aurora-text tracking-tight"
      >
        {solo ? `Just you and ${solo.name}.` : "Hey, you made it."}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="relative mt-3 text-sm text-white/55 max-w-md leading-relaxed"
      >
        {solo ? (
          <span>
            <span style={{ color: soloHex ?? undefined }} className="font-semibold">
              &ldquo;{solo.signatureGreeting}&rdquo;
            </span>{" "}
            — the others can&rsquo;t hear you in here.
          </span>
        ) : (
          "The five of us are already here, settled in. Say anything — we'll take it from there."
        )}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="relative mt-8 flex flex-wrap justify-center gap-2 max-w-lg"
      >
        {STARTER_PROMPTS.map((p, i) => (
          <motion.button
            key={p.label}
            type="button"
            onClick={() => onPick(p.label)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.42 + i * 0.06 }}
            whileHover={{ y: -2, scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border border-white/[0.07] bg-white/[0.04] text-white/85 hover:text-white hover:bg-white/[0.08] hover:border-white/15 transition-colors"
            style={
              solo
                ? { borderColor: `${soloHex}33` }
                : undefined
            }
          >
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ color: soloHex ?? "rgba(255,255,255,0.5)" }}
            >
              {p.icon}
            </span>
            {p.label}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
