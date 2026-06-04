"use client";

import { motion as m } from "framer-motion";
import { useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import GlassCard from "@/components/ui/GlassCard";
import { PAST_DEBATES, QUICK_MOTIONS } from "@/lib/debate-fixtures";

interface SetupScreenProps {
  onBegin: (motion: string) => void;
}

export default function SetupScreen({ onBegin }: SetupScreenProps) {
  const [motionText, setMotionText] = useState("");

  const submit = (text?: string) => {
    const value = (text ?? motionText).trim();
    if (!value) return;
    onBegin(value);
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-8"
    >
      <GlassCard
        variant="aurora"
        className="rounded-3xl p-8 md:p-10 relative overflow-hidden"
      >
        <div className="warm-glow absolute inset-0 -z-10 rounded-3xl" />

        <p className="text-[11px] tracking-[0.4em] uppercase text-white/45 font-[var(--font-label)] mb-3">
          New session
        </p>
        <h1 className="font-[var(--font-headline)] text-3xl md:text-5xl font-bold tracking-tight aurora-text mb-3">
          Pose a motion to your council.
        </h1>
        <p className="text-white/65 max-w-xl text-sm md:text-base mb-7 leading-relaxed">
          Drop a question, a claim, an unfinished argument. They&rsquo;ll split into Pro and Con, with Sage holding the floor. You watch it unfold.
        </p>

        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            type="text"
            value={motionText}
            onChange={(e) => setMotionText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="e.g., Equity for early teammates should always vest immediately."
            className="flex-1 rounded-full px-5 py-3 text-sm font-medium placeholder:text-white/30"
          />
          <AuroraButton onClick={() => submit()} size="md" disabled={!motionText.trim()}>
            Begin Debate
          </AuroraButton>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_MOTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => submit(m)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.07] hover:scale-[1.02] transition-all"
            >
              <span className="material-symbols-outlined text-[14px] text-white/55">flash_on</span>
              {m}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Past debates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[var(--font-headline)] font-bold text-xl text-white">
            Recently argued
          </h2>
          <p className="text-xs text-white/45 font-[var(--font-label)] uppercase tracking-wider">
            {PAST_DEBATES.length} archived
          </p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {PAST_DEBATES.map((d) => (
            <div
              key={d.id}
              className="shrink-0 w-72 md:w-80 snap-start glass rounded-2xl p-5 border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer"
            >
              <h3 className="font-[var(--font-headline)] font-bold text-base mb-2 line-clamp-2">
                {d.title}
              </h3>
              <p className="text-white/55 text-xs mb-4 line-clamp-2 leading-relaxed">
                {d.conclusion}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-[var(--font-label)]">
                  {d.meta}
                </span>
                <span className="text-xs text-white/85 inline-flex items-center gap-1 group">
                  Read
                  <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">
                    arrow_forward
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </m.div>
  );
}
