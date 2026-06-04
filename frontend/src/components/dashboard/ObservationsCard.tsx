"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import EnvironmentChip from "@/components/ui/EnvironmentChip";
import { useEnvironment } from "./EnvironmentProvider";
import { useUserActivity } from "@/lib/use-user-activity";

// Sample observations — only ever shown once the user has actual sessions.
// On a fresh account we render an empty state instead.
const OBSERVATIONS = [
  "You spend more energy on decisions than you think — Aria says it's worth it.",
  "When you change topic suddenly, Echo notices. She thinks it's protective, not random.",
  "Rex keeps catching you almost-laughing at the contrarian take. He likes that about you.",
];

export default function ObservationsCard() {
  const { current, setEnvironmentId } = useEnvironment();
  const { ready, hasSessions } = useUserActivity();

  return (
    <GlassCard variant="aurora" className="rounded-3xl p-6">
      <header className="mb-5">
        <p className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/45 mb-2">
          This week
        </p>
        <h2 className="text-lg font-bold font-[var(--font-headline)] text-white leading-tight">
          What the council noticed about you
        </h2>
      </header>

      {!ready ? (
        // Avoid the flash of mock content before the activity check resolves.
        <div className="h-40" aria-hidden />
      ) : hasSessions ? (
        <PopulatedView
          envId={current.id}
          envName={current.name}
          envIcon={current.icon}
          envMood={current.mood}
          onPickEnv={() => setEnvironmentId(current.id)}
        />
      ) : (
        <EmptyState />
      )}
    </GlassCard>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5"
    >
      <p className="text-sm text-white/65 leading-relaxed">
        The council is still meeting you. After a few conversations this is
        where they&apos;ll share patterns they&apos;ve noticed — recurring
        themes, blind spots, the kind of mood your evenings tend to take.
      </p>
      <p className="mt-3 text-xs text-white/40">
        Nothing here yet. That&apos;s the right answer for a first visit.
      </p>
    </motion.div>
  );
}

function PopulatedView({
  envId,
  envName,
  envIcon,
  envMood,
  onPickEnv,
}: {
  envId: string;
  envName: string;
  envIcon: string;
  envMood: string;
  onPickEnv: () => void;
}) {
  return (
    <>
      <ul className="space-y-3 mb-6">
        {OBSERVATIONS.map((o, i) => (
          <motion.li
            key={o}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
            className="flex items-start gap-3 text-sm text-white/75 leading-relaxed"
          >
            <span
              className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: "linear-gradient(135deg, #9b87d8, #d8a3b8)",
                boxShadow: "0 0 8px rgba(155,135,216,0.55)",
              }}
            />
            <span>{o}</span>
          </motion.li>
        ))}
      </ul>

      <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-4 flex flex-col gap-3 mb-5">
        <span className="text-[10px] uppercase tracking-wider font-[var(--font-label)] font-semibold text-white/45">
          Pattern
        </span>
        <span className="text-2xl font-bold font-[var(--font-headline)] aurora-text">
          Your evenings get philosophical.
        </span>
        <span className="text-xs text-white/55 leading-snug">
          Sage clocked 6 out of 7 evening sessions drifting toward big
          questions. Worth leaning into.
        </span>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wider font-[var(--font-label)] font-semibold text-white/45 mb-2">
          Next session
        </p>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-white/80">Last left off in the&nbsp;</span>
          <EnvironmentChip
            id={envId}
            name={envName}
            icon={envIcon}
            mood={envMood}
            active
            onClick={onPickEnv}
          />
        </div>
      </div>
    </>
  );
}
