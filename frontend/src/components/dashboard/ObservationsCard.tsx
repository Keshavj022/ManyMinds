"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import EnvironmentChip from "@/components/ui/EnvironmentChip";
import { useEnvironment } from "./EnvironmentProvider";
import { useDashboard } from "@/lib/use-dashboard";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * "The room you're in" — the real, currently-selected 3D environment plus a
 * gentle prompt to step inside. Zero fabricated observations or stats: the
 * only data here is the environment the friend actually picked.
 */
export default function ObservationsCard() {
  const { current, setEnvironmentId } = useEnvironment();
  const { ready, sessionCount } = useDashboard();

  const returning = sessionCount > 0;

  return (
    <div className="glass-warm rounded-3xl p-7 h-full flex flex-col">
      <header className="mb-6 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] text-white/55">
          The room you&apos;re in
        </p>
        <h2 className="text-lg font-bold font-[var(--font-headline)] text-white leading-tight">
          {current.name}
        </h2>
        <p className="text-sm text-white/55 leading-relaxed">{current.hint}</p>
      </header>

      <div className="flex-1 flex flex-col justify-end gap-5">
        <div className="flex items-center gap-3">
          <EnvironmentChip
            id={current.id}
            name={current.name}
            icon={current.icon}
            mood={current.mood}
            active
            onClick={() => setEnvironmentId(current.id)}
          />
        </div>

        {/* Honest CTA: returning friends are invited back into the scene,
            new friends are invited to step in for the first time. */}
        {ready && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="rounded-2xl bg-white/[0.03] p-5 space-y-3"
          >
            <p className="text-sm text-white/65 leading-relaxed">
              {returning
                ? "Step back into the scene whenever you want — the council’s seats are always saved."
                : "Switch rooms from the header anytime. Each scene sets a different mood for the conversation."}
            </p>
            <Link
              href="/chat"
              className="text-xs font-semibold text-white/70 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              {returning ? "Head back in" : "Step inside"}
              <span className="material-symbols-outlined text-[16px]">
                arrow_forward
              </span>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
