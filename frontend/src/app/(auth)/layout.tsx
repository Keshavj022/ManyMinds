"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import AmbientBackground from "@/components/ui/AmbientBackground";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Positions for the five members gathered in a loose circle (percentages of
 * the collage container). One slot per member, clockwise from the top.
 */
const CIRCLE_POSITIONS = [
  { top: "8%", left: "50%" },
  { top: "36%", left: "90%" },
  { top: "82%", left: "75%" },
  { top: "82%", left: "25%" },
  { top: "36%", left: "10%" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  // Which member is "speaking" right now — shared by the gathered circle,
  // the greeting bubble and the mobile avatar row.
  const [speakerIdx, setSpeakerIdx] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSpeakerIdx((i) => (i + 1) % COUNCIL_MEMBERS.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-[100dvh] text-white flex flex-col md:flex-row">
      <AmbientBackground variant="warm" />

      {/* LEFT — the room you're walking into (md+) */}
      <div className="hidden md:flex flex-col flex-1 p-12 relative overflow-hidden justify-between border-r border-white/[0.05]">
        {/* Warm gradient backdrop — lilac above, candle-light below */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 85% 60% at 30% -10%, rgba(155,135,216,0.14), transparent 60%), radial-gradient(ellipse 75% 55% at 70% 110%, rgba(224,176,131,0.10), transparent 65%)",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-baseline text-2xl font-black tracking-tighter font-[var(--font-headline)] transition-transform duration-300 hover:scale-[1.03]"
          >
            <span className="text-white">Many</span>
            <span className="aurora-text">Minds</span>
          </Link>
        </div>

        {/* The gathering — five avatars circled around whoever's speaking */}
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 py-8">
          <div className="relative w-full max-w-md aspect-square">
            {/* Soft warm halo behind the circle */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-full blur-3xl opacity-50"
              style={{
                background:
                  "radial-gradient(circle at 50% 42%, rgba(155,135,216,0.22), transparent 60%), radial-gradient(circle at 50% 75%, rgba(224,176,131,0.12), transparent 60%)",
              }}
            />

            {COUNCIL_MEMBERS.map((member, i) => {
              const pos = CIRCLE_POSITIONS[i];
              const isSpeaking = i === speakerIdx;
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{
                    opacity: isSpeaking ? 1 : 0.78,
                    scale: isSpeaking ? 1.14 : 1,
                  }}
                  transition={{ duration: 0.55, delay: 0.15 + i * 0.1, ease: EASE }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ top: pos.top, left: pos.left }}
                >
                  <div
                    className="animate-float flex flex-col items-center gap-2"
                    style={{ animationDelay: `${i * 0.9}s` }}
                  >
                    <MemberAvatar
                      id={member.id}
                      size="lg"
                      glow
                      status={isSpeaking ? "talking" : "online"}
                    />
                    <span
                      className="text-[11px] font-[var(--font-label)] uppercase tracking-[0.2em] transition-colors duration-500"
                      style={{
                        color: isSpeaking
                          ? councilColors[member.id].hex
                          : "rgba(255,255,255,0.45)",
                      }}
                    >
                      {member.name}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* The greeting bubble — center of the circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[68%]">
              <RotatingGreeting speakerIdx={speakerIdx} />
            </div>
          </div>
        </div>

        {/* Footer line — the seat they saved you */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: EASE }}
          className="relative z-10 max-w-md space-y-2"
        >
          <p className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] font-semibold text-white/55">
            The room is warm
          </p>
          <p className="text-xl font-[var(--font-headline)] font-medium leading-snug text-white/85">
            Five friends, already mid-conversation.{" "}
            <span className="aurora-text">They saved you a seat.</span>
          </p>
        </motion.div>
      </div>

      {/* RIGHT — the form pane, airy and centered */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-8 p-6 pt-20 pb-12 sm:p-12 md:pt-12 bg-[rgba(11,9,16,0.35)]">
        {/* Mobile header — logo pinned top-left */}
        <div className="absolute top-6 left-6 md:hidden">
          <Link
            href="/"
            className="inline-flex items-baseline text-2xl font-black tracking-tighter font-[var(--font-headline)]"
          >
            <span className="text-white">Many</span>
            <span className="aurora-text">Minds</span>
          </Link>
        </div>

        {/* Mobile — the council gathered in a row, one of them saying hi */}
        <div className="md:hidden w-full max-w-md flex flex-col items-center gap-5">
          <div className="flex items-center justify-center gap-3">
            {COUNCIL_MEMBERS.map((member, i) => {
              const isSpeaking = i === speakerIdx;
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{
                    opacity: isSpeaking ? 1 : 0.7,
                    y: 0,
                    scale: isSpeaking ? 1.18 : 1,
                  }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
                >
                  <MemberAvatar
                    id={member.id}
                    size="md"
                    glow
                    status={isSpeaking ? "talking" : "online"}
                  />
                </motion.div>
              );
            })}
          </div>
          <RotatingGreeting speakerIdx={speakerIdx} compact />
        </div>

        <div className="w-full max-w-md relative z-10">{children}</div>
      </div>
    </div>
  );
}

/* --------------------------- Rotating greeting ------------------------------ */

function RotatingGreeting({
  speakerIdx,
  compact = false,
}: {
  speakerIdx: number;
  compact?: boolean;
}) {
  const member = COUNCIL_MEMBERS[speakerIdx];
  const color = councilColors[member.id];

  return (
    <div className={compact ? "w-full" : ""}>
      <AnimatePresence mode="wait">
        <motion.div
          key={member.id}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.5, ease: EASE }}
          className={`glass-warm rounded-3xl text-center ${
            compact ? "px-5 py-3.5" : "px-6 py-5"
          }`}
        >
          <p
            className={`font-[var(--font-headline)] leading-snug text-white/90 ${
              compact ? "text-sm" : "text-base"
            }`}
          >
            &ldquo;{member.signatureGreeting}&rdquo;
          </p>
          <p
            className="mt-2 text-[10px] uppercase tracking-[0.28em] font-[var(--font-label)] font-semibold"
            style={{ color: color.hex }}
          >
            {member.name} · {member.role}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
