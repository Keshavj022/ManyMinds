"use client";

import { motion as m } from "framer-motion";
import { FormEvent, useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import GlassCard from "@/components/ui/GlassCard";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import { PAST_DEBATES, QUICK_MOTIONS } from "@/lib/debate-fixtures";

interface SetupScreenProps {
  onBegin: (motion: string) => void;
}

export default function SetupScreen({ onBegin }: SetupScreenProps) {
  const [motionText, setMotionText] = useState("");
  const rex = COUNCIL_MEMBERS.find((c) => c.id === "rex");

  const submit = (text?: string) => {
    const value = (text ?? motionText).trim();
    if (!value) return;
    onBegin(value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-8 max-w-4xl mx-auto"
    >
      <GlassCard
        variant="aurora"
        className="rounded-3xl p-7 md:p-10 relative overflow-hidden"
      >
        <div className="warm-glow absolute inset-0 -z-10 rounded-3xl" />

        <p className="text-[11px] tracking-[0.32em] uppercase text-white/55 font-[var(--font-label)] mb-4">
          Debate night
        </p>
        <h1 className="font-[var(--font-headline)] text-3xl md:text-5xl font-bold tracking-tight aurora-text mb-4 leading-[1.08]">
          Give them something to fight about — kindly.
        </h1>
        <p className="text-white/65 max-w-xl text-sm md:text-base mb-7 leading-relaxed">
          Drop a question, a claim, an opinion you&rsquo;re not sure about.
          They&rsquo;ll pick sides, Sage will keep it civil, and you get the
          best seat in the room.
        </p>

        {/* The five, already warming up */}
        <div className="flex items-center gap-4 mb-7">
          <div className="flex -space-x-2">
            {COUNCIL_MEMBERS.map((c) => (
              <span key={c.id} className="animate-pulse-soft">
                <MemberAvatar id={c.id} size="sm" />
              </span>
            ))}
          </div>
          {rex && (
            <p className="text-xs text-white/55 italic">
              <span
                className="font-semibold not-italic"
                style={{ color: councilColors.rex.hex }}
              >
                {rex.name}:
              </span>{" "}
              &ldquo;{rex.signatureGreeting}&rdquo;
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row gap-3 mb-6"
        >
          <input
            type="text"
            value={motionText}
            onChange={(e) => setMotionText(e.target.value)}
            placeholder="e.g., Cats are better roommates than dogs."
            aria-label="Debate topic"
            className="flex-1 rounded-full px-5 py-3 text-sm font-medium placeholder:text-white/30"
          />
          <AuroraButton type="submit" size="md" disabled={!motionText.trim()}>
            Start the debate
          </AuroraButton>
        </form>

        <div className="flex flex-wrap gap-2">
          {QUICK_MOTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => submit(q)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-white/[0.06] bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.07] hover:scale-[1.02] transition-all"
            >
              <span className="material-symbols-outlined text-[14px] text-[var(--color-warm)]/80">
                local_fire_department
              </span>
              {q}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Past debates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[var(--font-headline)] font-bold text-xl text-white">
            Things they&rsquo;ve already argued about
          </h2>
          <p className="text-[11px] text-white/45 font-[var(--font-label)] uppercase tracking-[0.32em]">
            {PAST_DEBATES.length} settled-ish
          </p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {PAST_DEBATES.map((d) => (
            <div
              key={d.id}
              className="shrink-0 w-72 md:w-80 snap-start glass rounded-2xl p-6 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <h3 className="font-[var(--font-headline)] font-bold text-base mb-2 line-clamp-2 text-white">
                {d.title}
              </h3>
              <p className="text-white/55 text-xs mb-4 line-clamp-2 leading-relaxed">
                {d.conclusion}
              </p>
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-[var(--font-label)]">
                {d.meta}
              </span>
            </div>
          ))}
        </div>
      </section>
    </m.div>
  );
}
