"use client";

import { motion } from "framer-motion";
import SectionHeader from "@/components/ui/SectionHeader";
import MemberAvatar from "@/components/ui/MemberAvatar";
import {
  COUNCIL_MEMBERS,
  councilColors,
  type CouncilMemberId,
} from "@/lib/design-tokens";

/**
 * "How it begins" — three steps as one straight vertical flow.
 *
 * No pinning, no scroll-jack: the page keeps moving down and each step
 * reveals in place with whileInView. Steps alternate illustration ↔ copy
 * per row on desktop and stack on mobile. A slim spine on the left edge
 * (desktop only) carries numbered dots and a per-step gradient fill so the
 * downward rhythm reads as one continuous line.
 *
 * Illustrations are self-driven: trait bars grow to their value on reveal,
 * environment/voice chips stagger in, and the mode montage fades up. No
 * MotionValues are threaded through — every animation is a whileInView
 * variant with the house easing.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const VIEWPORT = { once: true, margin: "-80px" } as const;

// ---------------------------------------------------------------------------
// Step copy
// ---------------------------------------------------------------------------

type Step = {
  index: number;
  kicker: string;
  title: string;
  subtitle: string;
  description: string;
  accentMember: CouncilMemberId;
};

const STEPS: ReadonlyArray<Step> = [
  {
    index: 1,
    kicker: "Step 01",
    title: "Tell us about you",
    subtitle: "Demographics + a quick Big-Five quiz.",
    description:
      "Your council isn't generic. The five of them calibrate to your tone, your patience, your pace — before a single conversation starts.",
    accentMember: "aria",
  },
  {
    index: 2,
    kicker: "Step 02",
    title: "Pick a room, find a voice",
    subtitle: "Seven worlds. Five voices that actually sound like them.",
    description:
      "Move them to a café, a rooftop, a quiet forest. Each one speaks with their own ElevenLabs voice — warm, sharp, playful — never a flat read.",
    accentMember: "echo",
  },
  {
    index: 3,
    kicker: "Step 03",
    title: "Talk, debate, play",
    subtitle: "One-on-one, a full table, or a game on the side.",
    description:
      "Chat with one of them or all five. Launch a debate and watch them spar. Play a round of something. Everything you do feeds their memory.",
    accentMember: "nova",
  },
];

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-32 px-6 max-w-7xl mx-auto">
      <SectionHeader
        kicker="08 · How it begins"
        title={
          <>
            Three steps to your <span className="aurora-text">friend group</span>
          </>
        }
        subtitle="A short story about meeting people — not a feature list."
      />

      <div className="relative mt-20 md:mt-24">
        {/* Vertical progress spine — static gradient hairline, desktop only. */}
        <div
          aria-hidden
          className="hidden lg:block absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-white/12 to-transparent"
        />

        <div className="space-y-24 md:space-y-32 lg:pl-16">
          {STEPS.map((step, i) => (
            <StepRow key={step.index} step={step} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// One step row — copy ↔ illustration, alternating sides on desktop.
// ---------------------------------------------------------------------------

function StepRow({ step, flip }: { step: Step; flip: boolean }) {
  const c = councilColors[step.accentMember];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center"
    >
      {/* Spine fill — grows downward as this step reveals. */}
      <motion.span
        aria-hidden
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
        className="hidden lg:block absolute -left-16 top-1 bottom-0 w-px -translate-x-1/2 origin-top"
        style={{ background: `linear-gradient(180deg, ${c.hex}66, transparent)` }}
      />

      {/* Numbered dot on the spine. */}
      <motion.span
        aria-hidden
        initial={{ scale: 0.6, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.5, ease: EASE }}
        className="hidden lg:grid absolute -left-16 top-1 -translate-x-1/2 w-9 h-9 place-items-center rounded-full border bg-[#0a0910] text-[11px] font-[var(--font-label)] font-bold"
        style={{
          borderColor: `${c.hex}55`,
          color: c.hex,
          boxShadow: `0 0 18px ${c.soft}`,
        }}
      >
        {String(step.index).padStart(2, "0")}
      </motion.span>

      <div className={flip ? "md:order-2" : ""}>
        <p
          className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-semibold mb-4"
          style={{ color: c.hex }}
        >
          {step.kicker}
        </p>
        <h3 className="font-[var(--font-headline)] text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.05] mb-5">
          {step.title}
        </h3>
        <p className="text-white/75 text-lg mb-3">{step.subtitle}</p>
        <p className="text-white/55 text-base leading-relaxed max-w-xl">
          {step.description}
        </p>
      </div>

      <div className={flip ? "md:order-1" : ""}>
        <StepIllustration step={step} />
      </div>
    </motion.div>
  );
}

function StepIllustration({ step }: { step: Step }) {
  if (step.index === 1) return <Step1BigFive />;
  if (step.index === 2) return <Step2RoomAndVoice />;
  return <Step3Modes />;
}

// --------- Step 1: Big-Five trait bars filling -----------------------------

const BIG_FIVE: ReadonlyArray<{
  label: string;
  value: number;
  member: CouncilMemberId;
}> = [
  { label: "Openness", value: 78, member: "nova" },
  { label: "Conscientiousness", value: 62, member: "aria" },
  { label: "Extraversion", value: 48, member: "rex" },
  { label: "Agreeableness", value: 65, member: "echo" },
  { label: "Neuroticism", value: 41, member: "sage" },
];

function Step1BigFive() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2.5rem] blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 30%, rgba(127,181,212,0.25), transparent 70%)",
        }}
      />
      <div className="relative rounded-3xl p-6 lg:p-8 glass-strong border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] tracking-[0.3em] uppercase font-[var(--font-label)] font-semibold text-white/55">
            Your profile
          </p>
          <span className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-white/35">
            Big Five
          </span>
        </div>
        <div className="space-y-3.5">
          {BIG_FIVE.map((t, i) => (
            <TraitRow key={t.label} trait={t} index={i} />
          ))}
        </div>
        <div className="mt-6 pt-5 border-t border-white/5 flex items-center gap-3">
          <MemberAvatar id="aria" size="md" status="thinking" />
          <p className="text-xs text-white/55 leading-snug">
            <span className="text-white">Aria is reading your profile…</span>{" "}
            They&apos;ll know how to talk to you.
          </p>
        </div>
      </div>
    </div>
  );
}

function TraitRow({
  trait,
  index,
}: {
  trait: (typeof BIG_FIVE)[number];
  index: number;
}) {
  const c = councilColors[trait.member];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wider font-[var(--font-label)] font-semibold text-white/65">
          {trait.label}
        </span>
        <span
          className="text-[10px] tabular-nums font-bold"
          style={{ color: c.hex }}
        >
          {trait.value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: "0%" }}
          whileInView={{ width: `${trait.value}%` }}
          viewport={VIEWPORT}
          transition={{ duration: 0.9, ease: EASE, delay: 0.2 + index * 0.08 }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${c.hex}, ${c.hex}cc)`,
            boxShadow: `0 0 10px ${c.hex}55`,
          }}
        />
      </div>
    </div>
  );
}

// --------- Step 2: 7 environment chips + 5 voice chips ---------------------

const ENVS: ReadonlyArray<{ id: string; label: string; icon: string }> = [
  { id: "mountain", label: "Mountain", icon: "landscape" },
  { id: "zen", label: "Zen", icon: "self_improvement" },
  { id: "forest", label: "Forest", icon: "park" },
  { id: "rooftop", label: "Rooftop", icon: "nightlife" },
  { id: "beach", label: "Beach", icon: "beach_access" },
  { id: "library", label: "Library", icon: "menu_book" },
  { id: "cafe", label: "Café", icon: "local_cafe" },
];

// Each member's "voice" — a short character of how they sound.
const VOICES: ReadonlyArray<{ member: CouncilMemberId; tone: string }> = [
  { member: "aria", tone: "Crisp" },
  { member: "rex", tone: "Playful" },
  { member: "sage", tone: "Measured" },
  { member: "nova", tone: "Bright" },
  { member: "echo", tone: "Warm" },
];

function Step2RoomAndVoice() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2.5rem] blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, rgba(216,163,184,0.22), transparent 70%)",
        }}
      />
      <div className="relative rounded-3xl p-6 lg:p-8 glass-strong border border-white/10 space-y-7">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase font-[var(--font-label)] font-semibold text-white/55 mb-3">
            Pick a room — 7 worlds
          </p>
          <div className="flex flex-wrap gap-2">
            {ENVS.map((e, i) => (
              <EnvChip key={e.id} env={e} index={i} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase font-[var(--font-label)] font-semibold text-white/55 mb-3">
            Find a voice — 5 of them
          </p>
          <div className="space-y-2">
            {VOICES.map((v, i) => (
              <VoiceChip key={v.member} voice={v} index={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EnvChip({
  env,
  index,
}: {
  env: (typeof ENVS)[number];
  index: number;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.5, ease: EASE, delay: 0.1 + index * 0.05 }}
    >
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[12px] font-[var(--font-label)] text-white/80">
        <span className="material-symbols-outlined text-[16px] text-white/70">
          {env.icon}
        </span>
        {env.label}
      </span>
    </motion.span>
  );
}

function VoiceChip({
  voice,
  index,
}: {
  voice: (typeof VOICES)[number];
  index: number;
}) {
  const c = councilColors[voice.member];
  const name = COUNCIL_MEMBERS.find((m) => m.id === voice.member)?.name;
  const delay = 0.4 + index * 0.07;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.55, ease: EASE, delay }}
      className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] pl-1.5 pr-3 py-1.5"
    >
      <MemberAvatar id={voice.member} size="sm" status="talking" glow />
      <span className="text-[12px] font-[var(--font-label)] font-semibold text-white/85">
        {name}
      </span>
      <span
        className="text-[10px] uppercase tracking-wider font-[var(--font-label)]"
        style={{ color: c.hex }}
      >
        {voice.tone}
      </span>
      <span className="ml-auto flex items-end gap-[3px] h-4">
        <WaveBar peak={0.55} color={c.hex} delay={delay + 0.1} />
        <WaveBar peak={1} color={c.hex} delay={delay + 0.18} />
        <WaveBar peak={0.7} color={c.hex} delay={delay + 0.26} />
      </span>
    </motion.div>
  );
}

function WaveBar({
  peak,
  color,
  delay,
}: {
  peak: number;
  color: string;
  delay: number;
}) {
  return (
    <motion.span
      initial={{ height: "20%" }}
      whileInView={{ height: `${peak * 100}%` }}
      viewport={VIEWPORT}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className="w-[3px] rounded-full"
      style={{ background: color, opacity: 0.85 }}
    />
  );
}

// --------- Step 3: talk / debate / play mode trio --------------------------

const MODES: ReadonlyArray<{
  icon: string;
  title: string;
  line: string;
  member: CouncilMemberId;
}> = [
  {
    icon: "forum",
    title: "Talk",
    line: "One-on-one, or the whole table at once.",
    member: "echo",
  },
  {
    icon: "gavel",
    title: "Debate",
    line: "Set a topic. Watch them take sides and spar.",
    member: "rex",
  },
  {
    icon: "stadia_controller",
    title: "Play",
    line: "Truth or Dare, chess, a game on the side.",
    member: "nova",
  },
];

function Step3Modes() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2.5rem] blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 50%, rgba(200,155,196,0.25), transparent 70%)",
        }}
      />
      <div className="relative rounded-3xl p-5 lg:p-6 glass-strong border border-white/10 space-y-3">
        {MODES.map((m, i) => (
          <ModeRow key={m.title} mode={m} index={i} />
        ))}
      </div>
    </div>
  );
}

function ModeRow({
  mode,
  index,
}: {
  mode: (typeof MODES)[number];
  index: number;
}) {
  const c = councilColors[mode.member];

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.6, ease: EASE, delay: 0.15 + index * 0.12 }}
      className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
    >
      <span
        className="grid place-items-center w-12 h-12 rounded-2xl shrink-0"
        style={{
          background: `linear-gradient(135deg, ${c.hex}33, transparent 70%)`,
          border: `1px solid ${c.hex}40`,
        }}
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={{ color: c.hex }}
        >
          {mode.icon}
        </span>
      </span>
      <div className="min-w-0">
        <p className="font-[var(--font-headline)] font-bold text-white text-lg leading-tight">
          {mode.title}
        </p>
        <p className="text-white/55 text-[13px] leading-snug">{mode.line}</p>
      </div>
    </motion.div>
  );
}
