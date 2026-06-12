"use client";

import { motion as m } from "framer-motion";
import { FormEvent, useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import GlassCard from "@/components/ui/GlassCard";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";
import { QUICK_MOTIONS } from "@/lib/debate-fixtures";
import { SIDE } from "./palette";

interface SetupScreenProps {
  onBegin: (motion: string) => void;
}

// How the council lines up by default: Sage holds the gavel, the other
// four split into two corners. Mirrors the backend's default seating.
const PRO_PREVIEW: ReadonlyArray<CouncilMemberId> = ["aria", "echo"];
const CON_PREVIEW: ReadonlyArray<CouncilMemberId> = ["rex", "nova"];
const MOD_PREVIEW: CouncilMemberId = "sage";

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

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-white/40 font-[var(--font-label)] uppercase tracking-[0.24em] mr-1">
            Or try
          </span>
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

      {/* Honest empty state — no fabricated history. Just how it'll look. */}
      <section className="rounded-3xl border border-dashed border-white/[0.07] bg-white/[0.015] p-7 md:p-8">
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <h2 className="font-[var(--font-headline)] font-bold text-xl text-white">
            How a debate plays out
          </h2>
          <p className="text-[11px] text-white/40 font-[var(--font-label)] uppercase tracking-[0.32em]">
            No debates yet
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center mb-6">
          <SidePreview sideKey="pro" members={PRO_PREVIEW} />
          <ModPreview id={MOD_PREVIEW} />
          <SidePreview sideKey="con" members={CON_PREVIEW} align="right" />
        </div>

        <p className="text-sm text-white/55 leading-relaxed max-w-xl">
          Pick a motion above and watch them go at it — two corners trade
          arguments and rebuttals, round by round, until{" "}
          <span style={{ color: councilColors.sage.hex }}>Sage</span> reads the
          room and calls it. Nothing happens here until you start one.
        </p>
      </section>
    </m.div>
  );
}

function SidePreview({
  sideKey,
  members,
  align = "left",
}: {
  sideKey: "pro" | "con";
  members: ReadonlyArray<CouncilMemberId>;
  align?: "left" | "right";
}) {
  const s = SIDE[sideKey];
  return (
    <div
      className="rounded-2xl p-4 border border-white/[0.06]"
      style={{
        background: `linear-gradient(${align === "right" ? "225deg" : "135deg"}, ${s.soft}, rgba(26,22,32,0.6))`,
      }}
    >
      <div
        className={`flex items-center gap-1.5 mb-3 ${align === "right" ? "justify-end" : ""}`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: s.hex }}
        />
        <span
          className="text-[10px] tracking-[0.32em] uppercase font-[var(--font-label)] font-semibold"
          style={{ color: s.hex }}
        >
          {s.label}
        </span>
      </div>
      <div
        className={`flex items-center gap-3 ${align === "right" ? "justify-end" : ""}`}
      >
        {members.map((id) => (
          <span key={id} className="animate-pulse-soft">
            <MemberAvatar id={id} size="md" status="online" />
          </span>
        ))}
      </div>
    </div>
  );
}

function ModPreview({ id }: { id: CouncilMemberId }) {
  const member = COUNCIL_MEMBERS.find((c) => c.id === id);
  return (
    <div className="flex flex-col items-center gap-1.5 px-4 text-center">
      <span className="text-[10px] tracking-[0.28em] uppercase font-[var(--font-label)] text-white/45">
        Moderator
      </span>
      <span className="animate-pulse-soft">
        <MemberAvatar id={id} size="lg" status="online" />
      </span>
      <span
        className="text-xs font-bold"
        style={{ color: councilColors[id].hex }}
      >
        {member?.name}
      </span>
    </div>
  );
}
