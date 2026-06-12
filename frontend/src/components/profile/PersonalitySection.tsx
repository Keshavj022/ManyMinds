"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import AuroraButton from "@/components/ui/AuroraButton";
import TraitBars from "@/components/onboarding/TraitBars";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import type { PersonalityProfile } from "@/lib/api";
import {
  getDominantTrait,
  TRAIT_DISPLAY,
  type BigFiveDimension,
  type BigFiveScores,
} from "@/lib/onboarding";

const EASE = [0.22, 1, 0.36, 1] as const;

const DIMENSIONS: ReadonlyArray<BigFiveDimension> = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
];

function isDimension(value: string | null | undefined): value is BigFiveDimension {
  return value != null && (DIMENSIONS as readonly string[]).includes(value);
}

/** One warm, in-fiction line about the dominant trait — high vs. low side. */
function dominantLine(dim: BigFiveDimension, value: number): string {
  const display = TRAIT_DISPLAY[dim];
  const high = value >= 50;
  switch (dim) {
    case "openness":
      return high
        ? "You wander far for ideas — Nova will happily wander with you."
        : "You like ideas that actually land — Sage respects the steadiness.";
    case "conscientiousness":
      return high
        ? "You like things done well and on time — Aria found her person."
        : "You improvise more than you plan — Nova respects the chaos.";
    case "extraversion":
      return high
        ? "Your energy comes from the room — Rex is ready when you are."
        : "Your energy comes from the quiet — Echo will keep it gentle.";
    case "agreeableness":
      return high
        ? "You lead with warmth — Echo felt it from the first hello."
        : "You keep it honest over easy — Rex is delighted to argue back.";
    case "neuroticism":
      return high
        ? "You feel the waves deeply — Echo will know when to check in."
        : "You stay steady through the waves — Sage trusts you with the hard ones.";
    default:
      return `${display.sub} — it's the loudest note in how you read.`;
  }
}

export default function PersonalitySection({
  personality,
}: {
  personality: PersonalityProfile | null;
}) {
  return (
    <section className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2.5">
        <span className="material-symbols-outlined text-[20px] text-[var(--color-warm)]">
          insights
        </span>
        <h2 className="text-sm uppercase tracking-[0.28em] font-[var(--font-label)] font-semibold text-white/70">
          How you tick
        </h2>
      </div>

      <GlassCard
        variant="strong"
        className="rounded-3xl p-6 lg:p-7 flex-1 flex flex-col"
      >
        {personality ? (
          <Filled personality={personality} />
        ) : (
          <Empty />
        )}
      </GlassCard>
    </section>
  );
}

function Filled({ personality }: { personality: PersonalityProfile }) {
  const scores: BigFiveScores = {
    openness: personality.openness,
    conscientiousness: personality.conscientiousness,
    extraversion: personality.extraversion,
    agreeableness: personality.agreeableness,
    neuroticism: personality.neuroticism,
  };

  const dominant: BigFiveDimension = isDimension(personality.dominant_trait)
    ? personality.dominant_trait
    : getDominantTrait(scores);

  const display = TRAIT_DISPLAY[dominant];

  return (
    <div className="flex flex-col gap-6 flex-1">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="flex items-start gap-3"
      >
        <MemberAvatar id={display.member} size="md" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/45">
            Your loudest note
          </p>
          <p className="text-base font-bold font-[var(--font-headline)] text-white">
            {display.label}
          </p>
          <p className="mt-1 text-sm text-white/65 leading-relaxed">
            {dominantLine(dominant, scores[dominant])}
          </p>
        </div>
      </motion.div>

      <TraitBars scores={scores} highlight={dominant} />
    </div>
  );
}

function Empty() {
  return (
    <div className="flex-1 grid place-items-center py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex flex-col items-center gap-5 text-center max-w-sm"
      >
        <div className="flex -space-x-2">
          {COUNCIL_MEMBERS.map((m) => (
            <MemberAvatar key={m.id} id={m.id} size="md" glow={false} />
          ))}
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold font-[var(--font-headline)] text-white">
            We&apos;re still reading you.
          </h3>
          <p className="text-sm text-white/55 leading-relaxed">
            Your personality map appears once you take the quiz — twenty quick
            cards, and the five start tuning to you.
          </p>
        </div>
        <AuroraButton href="/onboarding/quiz" size="md">
          Take the quiz
        </AuroraButton>
      </motion.div>
    </div>
  );
}
