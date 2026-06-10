"use client";

import { motion } from "framer-motion";
import EnvironmentChip from "@/components/ui/EnvironmentChip";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { CouncilMemberId } from "@/lib/design-tokens";
import { useEnvironment } from "./EnvironmentProvider";
import { useUserActivity } from "@/lib/use-user-activity";

// Sample observations — only ever shown once the user has actual sessions.
// On a fresh account we render an empty state instead.
const OBSERVATIONS: ReadonlyArray<{ member: CouncilMemberId; text: string }> = [
  {
    member: "aria",
    text: "You spend more energy on decisions than you think — Aria says it's worth it.",
  },
  {
    member: "echo",
    text: "When you change topic suddenly, Echo notices. She thinks it's protective, not random.",
  },
  {
    member: "rex",
    text: "Rex keeps catching you almost-laughing at the contrarian take. He likes that about you.",
  },
];

export default function ObservationsCard() {
  const { current, setEnvironmentId } = useEnvironment();
  const { ready, hasSessions } = useUserActivity();

  return (
    <div className="glass-warm rounded-3xl p-7">
      <header className="mb-6 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] text-white/55">
          This week
        </p>
        <h2 className="text-lg font-bold font-[var(--font-headline)] text-white leading-tight">
          Things we&apos;ve noticed
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
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] p-6"
    >
      <p className="text-sm text-white/65 leading-relaxed">
        We&apos;re still getting to know you. After a few conversations this is
        where we&apos;ll share what we&apos;ve picked up on — recurring themes,
        blind spots, the kind of mood your evenings tend to take.
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
      <ul className="space-y-4 mb-7">
        {OBSERVATIONS.map((o, i) => (
          <motion.li
            key={o.text}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start gap-3 text-sm text-white/75 leading-relaxed"
          >
            <MemberAvatar id={o.member} size="xs" glow={false} className="mt-0.5" />
            <span>{o.text}</span>
          </motion.li>
        ))}
      </ul>

      <div className="rounded-2xl bg-white/[0.03] p-5 flex flex-col gap-2.5 mb-6">
        <span className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/45">
          Pattern
        </span>
        <span className="text-2xl font-bold font-[var(--font-headline)] aurora-text leading-snug">
          Your evenings get philosophical.
        </span>
        <span className="text-xs text-white/55 leading-relaxed">
          Sage clocked 6 out of 7 evening sessions drifting toward big
          questions. Worth leaning into.
        </span>
      </div>

      <div className="space-y-2.5">
        <p className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/45">
          Next time
        </p>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-white/80">We left off in the&nbsp;</span>
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
