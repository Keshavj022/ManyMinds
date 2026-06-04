"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AmbientBackground from "@/components/ui/AmbientBackground";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";

const QUOTE = {
  lead: "It stopped feeling like talking to an AI. It started feeling like talking to",
  highlight: "people who knew me",
  tail: ".",
  author: "Maya, Pioneer user",
};

// Pick 3 council members to feature in the collage
const FEATURED_IDS = ["sage", "nova", "echo"] as const;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen text-white flex flex-col md:flex-row">
      {/* Global ambient orbs — visible behind the left brand panel, masked by the right form column */}
      <AmbientBackground variant="minimal" />

      {/* LEFT — brand panel (md+) */}
      <div className="hidden md:flex flex-col flex-1 p-12 relative overflow-hidden justify-between border-r border-white/[0.05]">

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

        {/* Avatar collage center */}
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-0">
          <div className="relative w-full max-w-md aspect-square">
            {/* Soft halo */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-full blur-3xl opacity-40"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgba(155,135,216,0.25), transparent 65%)",
              }}
            />
            {/* Floating avatars */}
            {FEATURED_IDS.map((id, i) => {
              const member = COUNCIL_MEMBERS.find((m) => m.id === id);
              if (!member) return null;
              // Staggered positions for a friend-group feel
              const positions = [
                { top: "10%", left: "20%", delay: "0s" },
                { top: "40%", left: "55%", delay: "1.5s" },
                { top: "65%", left: "18%", delay: "0.8s" },
              ];
              const pos = positions[i];
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.2 + i * 0.15,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="absolute"
                  style={{ top: pos.top, left: pos.left }}
                >
                  <div
                    className="animate-float"
                    style={{ animationDelay: pos.delay }}
                  >
                    <MemberAvatar id={id} size="xl" glow />
                    <p className="mt-2 text-center text-[11px] font-[var(--font-label)] uppercase tracking-[0.2em] text-white/55">
                      {member.name}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="relative z-10 max-w-md"
        >
          <blockquote className="space-y-4">
            <p className="text-xl md:text-2xl font-[var(--font-headline)] font-medium leading-snug">
              &ldquo;{QUOTE.lead}{" "}
              <span className="aurora-text">{QUOTE.highlight}</span>
              {QUOTE.tail}&rdquo;
            </p>
            <footer className="text-white/55 text-xs font-[var(--font-label)] tracking-[0.22em] uppercase flex items-center gap-3">
              <span className="w-8 h-px bg-white/25" />
              {QUOTE.author}
            </footer>
          </blockquote>
        </motion.div>
      </div>

      {/* RIGHT — form column */}
      <div className="relative flex-1 flex items-center justify-center p-6 sm:p-12 bg-[#0a0910]">
        {/* Mobile header */}
        <div className="absolute top-6 left-6 md:hidden">
          <Link
            href="/"
            className="inline-flex items-baseline text-2xl font-black tracking-tighter font-[var(--font-headline)]"
          >
            <span className="text-white">Many</span>
            <span className="aurora-text">Minds</span>
          </Link>
        </div>

        <div className="w-full max-w-md relative z-10">{children}</div>
      </div>
    </div>
  );
}
