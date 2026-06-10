"use client";

import { motion } from "framer-motion";
import AuroraButton from "@/components/ui/AuroraButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { DebateVerdict } from "@/lib/debate-fixtures";
import type { CouncilMemberId } from "@/lib/design-tokens";
import { SIDE, type SideKey } from "./palette";

interface VerdictProps {
  verdict: DebateVerdict;
  moderatorId: CouncilMemberId;
  onReset: () => void;
}

/** Averages arrive as 0..1 (fixtures) or 0..100 (live API) — normalise. */
function toPct(value: number): number {
  return Math.round(value <= 1 ? value * 100 : value);
}

export default function Verdict({ verdict, moderatorId, onReset }: VerdictProps) {
  const mod = COUNCIL_MEMBERS.find((m) => m.id === moderatorId);
  const modColor = councilColors[moderatorId];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-white/[0.06] p-7 md:p-9 backdrop-blur-md relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${modColor.soft}, rgba(26,22,32,0.85))`,
      }}
    >
      <div className="warm-glow absolute inset-0 -z-10" />

      <div className="flex items-center gap-4 mb-6">
        <MemberAvatar id={moderatorId} size="lg" status="talking" />
        <div>
          <p className="text-[11px] tracking-[0.32em] uppercase text-white/55 font-[var(--font-label)]">
            And the room settles
          </p>
          <h3
            className="font-[var(--font-headline)] font-bold text-2xl mt-0.5"
            style={{ color: modColor.hex }}
          >
            {mod?.name} calls it
          </h3>
        </div>
      </div>

      <p className="text-base text-white/90 leading-relaxed mb-7 max-w-prose">
        {verdict.summary}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
        <SideMeter side="pro" value={toPct(verdict.proAverage)} />
        <SideMeter side="con" value={toPct(verdict.conAverage)} />
      </div>

      <AuroraButton
        variant="primary"
        size="md"
        onClick={onReset}
        icon={
          <span className="material-symbols-outlined text-[18px]">
            restart_alt
          </span>
        }
      >
        Give them another one
      </AuroraButton>
    </motion.div>
  );
}

function SideMeter({ side, value }: { side: SideKey; value: number }) {
  const s = SIDE[side];
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.32em] font-[var(--font-label)]"
          style={{ color: s.hex }}
        >
          {s.label}
        </span>
        <span className="text-2xl font-bold text-white font-[var(--font-headline)]">
          {pct}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${s.hex}88, ${s.hex})`,
            boxShadow: `0 0 10px ${s.soft}`,
          }}
        />
      </div>
    </div>
  );
}
