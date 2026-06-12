"use client";

import { motion } from "framer-motion";
import AuroraButton from "@/components/ui/AuroraButton";
import { useDashboard, relativeTime } from "@/lib/use-dashboard";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * "Where you stand" — only ever shows facts that actually exist.
 *
 * Real conversation count, real last-visit time, and the real dominant Big
 * Five trait from onboarding. New friends (zero sessions) get a warm empty
 * state rather than invented insights. Nothing here is fabricated.
 */
export default function InsightsPanel() {
  const { ready, sessionCount, lastSession, dominantTrait } = useDashboard();

  const hasSessions = sessionCount > 0;
  const lastTalked = relativeTime(lastSession?.started_at);

  // Build the honest stat list from whatever real data we actually have.
  const stats: { label: string; value: string }[] = [];
  if (hasSessions) {
    stats.push({
      label: "Conversations so far",
      value: `${sessionCount}`,
    });
    if (lastTalked) {
      stats.push({ label: "Last talked", value: lastTalked });
    }
  }
  if (dominantTrait) {
    stats.push({
      label: "Your council leans into your",
      value: dominantTrait,
    });
  }

  return (
    <div className="glass rounded-3xl p-7 h-full">
      <header className="mb-6 space-y-1">
        <p className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] text-white/55">
          Where you stand
        </p>
        <h2 className="text-lg font-bold font-[var(--font-headline)] text-white">
          The honest picture
        </h2>
      </header>

      {/* Until the fetch settles, hold the space — no flash of content. */}
      {!ready ? (
        <div className="h-32" aria-hidden />
      ) : stats.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.map((s, i) => (
            <StatCard key={s.label} label={s.label} value={s.value} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.07, duration: 0.45, ease: EASE }}
      className="rounded-2xl bg-white/[0.03] p-5 flex flex-col gap-1.5"
    >
      <span className="text-[10px] uppercase tracking-[0.18em] font-[var(--font-label)] font-semibold text-white/45 leading-snug">
        {label}
      </span>
      <span className="text-2xl font-bold font-[var(--font-headline)] aurora-text leading-tight">
        {value}
      </span>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] p-8 flex flex-col items-center text-center gap-5"
    >
      <span
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(155,135,216,0.18), rgba(224,176,131,0.12))",
        }}
      >
        <span className="material-symbols-outlined text-white/75 text-[26px]">
          waving_hand
        </span>
      </span>
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-base font-semibold text-white">
          Your patterns will surface here as you talk.
        </h3>
        <p className="text-sm text-white/55 leading-relaxed">
          Once you&apos;ve had a few conversations, this is where the real
          numbers live — how often you&apos;ve talked, when you last dropped in,
          and the trait we lean into for you.
        </p>
      </div>
      <AuroraButton
        href="/chat"
        size="sm"
        iconRight={
          <span className="material-symbols-outlined text-[15px]">
            arrow_forward
          </span>
        }
      >
        Start talking
      </AuroraButton>
    </motion.div>
  );
}
