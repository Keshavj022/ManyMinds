"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import StrengthBar from "./StrengthBar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { DebateVerdict } from "@/lib/debate-fixtures";
import type { CouncilMemberId } from "@/lib/design-tokens";

interface VerdictProps {
  verdict: DebateVerdict;
  moderatorId: CouncilMemberId;
  onReset: () => void;
}

export default function Verdict({ verdict, moderatorId, onReset }: VerdictProps) {
  const mod = COUNCIL_MEMBERS.find((m) => m.id === moderatorId);
  const modColor = councilColors[moderatorId];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-white/8 p-6 md:p-8 backdrop-blur-md relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${modColor.soft}, rgba(18,16,26,0.85))`,
      }}
    >
      <div className="absolute inset-0 -z-10 hero-gradient opacity-50" />

      <div className="flex items-center gap-3 mb-5">
        <MemberAvatar id={moderatorId} size="lg" status="talking" />
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/45 font-[var(--font-label)]">
            Closing argument
          </p>
          <h3
            className="font-[var(--font-headline)] font-bold text-2xl"
            style={{ color: modColor.hex }}
          >
            {mod?.name}&rsquo;s verdict
          </h3>
        </div>
      </div>

      <p className="text-base text-white/90 leading-relaxed mb-6 max-w-prose">
        {verdict.summary}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
              Pro avg.
            </span>
            <span className="text-2xl font-bold text-white font-[var(--font-headline)]">
              {Math.round(verdict.proAverage * 100)}
            </span>
          </div>
          <StrengthBar value={verdict.proAverage} accent="#4ade80" />
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-red-300">
              Con avg.
            </span>
            <span className="text-2xl font-bold text-white font-[var(--font-headline)]">
              {Math.round(verdict.conAverage * 100)}
            </span>
          </div>
          <StrengthBar value={verdict.conAverage} accent="#f87171" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-white/10 bg-white/[0.04] text-white/85 hover:text-white hover:bg-white/[0.07] transition-all"
        >
          <span className="material-symbols-outlined text-[14px]">restart_alt</span>
          New motion
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-white/10 bg-white/[0.04] text-white/85 hover:text-white hover:bg-white/[0.07] transition-all"
        >
          <span className="material-symbols-outlined text-[14px]">save</span>
          Save transcript
        </button>
      </div>
    </motion.div>
  );
}
