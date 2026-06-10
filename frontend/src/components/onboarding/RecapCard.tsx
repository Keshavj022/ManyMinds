"use client";

import { motion } from "framer-motion";
import AuroraButton from "@/components/ui/AuroraButton";
import GlassCard from "@/components/ui/GlassCard";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";

export interface RecapRow {
  key: string;
  member: CouncilMemberId;
  label: string;
  /** Empty/undefined renders as a friendly em-dash. */
  value?: string;
}

interface RecapCardProps {
  rows: RecapRow[];
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  /** Jump back to a specific question to fix it. */
  onEdit: (index: number) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The "here's what we caught — all good?" moment at the end of the
 * demographics conversation. Every row is tappable to go fix that answer.
 */
export default function RecapCard({
  rows,
  busy,
  error,
  onConfirm,
  onEdit,
}: RecapCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.985 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="w-full"
    >
      <GlassCard variant="strong" className="rounded-3xl p-7 md:p-9">
        <p className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-bold text-white/55">
          One quick look
        </p>
        <h2 className="mt-2 font-[var(--font-headline)] text-2xl md:text-3xl font-bold tracking-tight text-white">
          Here&rsquo;s what we caught — all good?
        </h2>
        <p className="mt-2 text-sm text-white/55">
          Tap any line to fix it. No pressure, we&rsquo;re patient.
        </p>

        <div className="mt-7 space-y-2.5">
          {rows.map((row, i) => {
            const c = councilColors[row.member];
            return (
              <motion.button
                key={row.key}
                type="button"
                onClick={() => onEdit(i)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.07, ease: EASE }}
                whileHover={{ y: -2 }}
                className="w-full flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.05]"
              >
                <MemberAvatar id={row.member} size="sm" glow={false} />
                <span
                  className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-bold w-24 shrink-0"
                  style={{ color: c.hex }}
                >
                  {row.label}
                </span>
                <span className="flex-1 text-sm font-medium text-white truncate">
                  {row.value?.trim() ? row.value : "—"}
                </span>
                <span className="material-symbols-outlined text-[16px] text-white/30">
                  edit
                </span>
              </motion.button>
            );
          })}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 text-sm text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/30 rounded-xl px-3 py-2"
          >
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <AuroraButton variant="ghost" size="md" onClick={() => onEdit(rows.length - 1)}>
            Wait, go back
          </AuroraButton>
          <AuroraButton
            variant="primary"
            size="lg"
            onClick={onConfirm}
            disabled={busy}
            iconRight={
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            }
          >
            {busy ? "Telling the others…" : "All good — keep going"}
          </AuroraButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}
