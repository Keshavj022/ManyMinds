"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import MemberAvatar from "@/components/ui/MemberAvatar";
import AuroraButton from "@/components/ui/AuroraButton";
import { useDashboard, relativeTime } from "@/lib/use-dashboard";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function WelcomeBlock() {
  const { ready, name, sessionCount, lastSession } = useDashboard();

  const returning = sessionCount > 0;
  // Real relative time of the last conversation — never fabricated.
  const lastTalked = relativeTime(lastSession?.started_at);

  return (
    <section className="space-y-9 pt-2">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="space-y-4"
      >
        <p className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] text-white/55">
          The room
        </p>
        <h1 className="font-[var(--font-headline)] text-4xl md:text-5xl lg:text-[3.4rem] font-bold tracking-tight text-white leading-[1.08]">
          {returning ? "Welcome back, " : "Hey, "}
          <span className="aurora-text">{name}</span>.
        </h1>
        <p
          className="text-white/55 text-base md:text-lg max-w-2xl leading-relaxed min-h-[1.6em]"
          aria-live="polite"
        >
          {/* Honest subline only — nothing claimed until the fetch settles. */}
          {!ready
            ? ""
            : returning
            ? "The five of us are around whenever you want to pick the conversation back up."
            : "First time here. The five of us are around whenever you are — say anything and we'll take it from there."}
        </p>
      </motion.div>

      {/* Primary action — honest, real-data CTA. */}
      {ready && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: EASE }}
          className="flex flex-wrap items-center gap-4"
        >
          {returning && lastSession ? (
            <>
              <AuroraButton
                href={`/chat?session=${lastSession.id}`}
                size="lg"
                iconRight={
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                }
              >
                Pick up where you left off
              </AuroraButton>
              {lastTalked && (
                <span className="text-sm text-white/45">
                  Last talked {lastTalked}
                </span>
              )}
            </>
          ) : (
            <AuroraButton
              href="/chat"
              size="lg"
              iconRight={
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              }
            >
              Start your first conversation
            </AuroraButton>
          )}
        </motion.div>
      )}

      {/* Council line-up — the five friends, each a real shortcut into the
          chat room. No fabricated "thinking"/"talking" presence; the avatars
          are an honest doorway into a conversation, not fake activity. */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 md:gap-5">
        {COUNCIL_MEMBERS.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: EASE }}
            whileHover={{
              y: -4,
              transition: { type: "spring", stiffness: 320, damping: 22 },
            }}
          >
            <Link
              href="/chat"
              aria-label={`Talk with the council — ${m.name}, ${m.role.replace(/^The /, "")}`}
              className="flex flex-col items-center text-center gap-2.5 group rounded-2xl py-3 transition-colors hover:bg-white/[0.03]"
            >
              <MemberAvatar id={m.id} size="lg" glow />
              <div>
                <p className="text-sm font-bold text-white">{m.name}</p>
                <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-white/40">
                  {m.role.replace(/^The /, "")}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
