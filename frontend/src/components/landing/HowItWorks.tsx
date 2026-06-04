"use client";

import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import MemberAvatar from "@/components/ui/MemberAvatar";
import {
  COUNCIL_MEMBERS,
  councilColors,
  type CouncilMemberId,
} from "@/lib/design-tokens";

/**
 * "How it works" — scroll-jacked horizontal panel runway.
 *
 * Outer container is 320vh tall on desktop; the inner row stays sticky and
 * pinned to the viewport while the user scrolls. As scrollYProgress goes
 * 0 → 1, the row translates from x=0 → -200vw, sliding three step panels
 * through the viewport. Each panel owns its own illustration that animates
 * to the section's scroll progress so everything feels reactive instead of
 * a screenshot.
 *
 * Three steps:
 *   1. Tell us about you      — Big-Five quiz illustration.
 *   2. Pick a room, find a voice — 7 environment chips + 5 voice chips.
 *   3. Talk, debate, play     — a small icon trio montage.
 *
 * On mobile (< md) the panels stack vertically and each illustration drives
 * itself off its own per-panel viewport progress.
 *
 * Lenis (mounted at the layout level via SmoothScrollProvider) interpolates
 * the underlying scroll, so transforms feel inertial. All useTransform calls
 * receive a real MotionValue unconditionally — never a conditional hook.
 */

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
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.4,
  });

  // Translate the horizontal runway. Width = 300vw, slide from 0 → -200vw.
  const x = useTransform(smooth, [0, 1], ["0vw", "-200vw"]);

  // Active step index (0..2) for the dot progress indicator.
  const [activeIndex, setActiveIndex] = useState(0);
  useMotionValueEvent(smooth, "change", (v) => {
    const i = Math.min(2, Math.max(0, Math.floor(v * 2.999)));
    if (i !== activeIndex) setActiveIndex(i);
  });

  return (
    <section
      id="how-it-works"
      ref={containerRef}
      className="relative md:h-[320vh]"
    >
      {/* Desktop: pinned horizontal runway */}
      <div className="hidden md:block sticky top-0 h-screen overflow-hidden">
        <DesktopHeader />
        <ProgressDots count={STEPS.length} active={activeIndex} />
        <ProgressRail progress={smooth} />

        <motion.div
          style={{ x, willChange: "transform" }}
          className="absolute inset-0 flex"
        >
          {STEPS.map((step, i) => (
            <PanelDesktop key={step.index} step={step} index={i} progress={smooth} />
          ))}
        </motion.div>

        <ScrollHint progress={smooth} />
      </div>

      {/* Mobile: vertical stack */}
      <div className="md:hidden px-6 py-24 max-w-2xl mx-auto">
        <SectionHeader
          kicker="How it works"
          title={
            <>
              Three steps to your{" "}
              <span className="aurora-text">friend group</span>
            </>
          }
          subtitle="A short story about meeting people — not a feature list."
        />
        <div className="mt-14 space-y-16">
          {STEPS.map((step) => (
            <PanelMobile key={step.index} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Desktop chrome
// ---------------------------------------------------------------------------

function DesktopHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="absolute top-12 left-1/2 -translate-x-1/2 z-20 text-center px-6 max-w-3xl"
    >
      <p className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-semibold text-white/55 mb-3">
        How it works
      </p>
      <h2 className="font-[var(--font-headline)] text-3xl lg:text-5xl font-bold text-white leading-[1.05]">
        Three steps to your <span className="aurora-text">friend group</span>
      </h2>
    </motion.div>
  );
}

function ProgressDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="absolute top-14 right-10 z-20 flex items-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="transition-all duration-500 rounded-full"
          style={{
            width: i === active ? 32 : 10,
            height: 4,
            background:
              i <= active
                ? "linear-gradient(90deg, #9b87d8, #d8a3b8)"
                : "rgba(255,255,255,0.18)",
            boxShadow:
              i === active ? "0 0 12px rgba(216,163,184,0.45)" : "none",
          }}
        />
      ))}
    </div>
  );
}

function ProgressRail({ progress }: { progress: MotionValue<number> }) {
  const w = useTransform(progress, [0, 1], ["0%", "100%"]);
  return (
    <div
      aria-hidden
      className="absolute bottom-0 inset-x-0 h-[3px] bg-white/5 z-10"
    >
      <motion.div style={{ width: w }} className="h-full origin-left">
        <div
          className="h-full w-full rounded-r-full"
          style={{
            background: "linear-gradient(90deg, #9b87d8, #d8a3b8)",
            boxShadow: "0 0 12px rgba(216,163,184,0.5)",
          }}
        />
      </motion.div>
    </div>
  );
}

function ScrollHint({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0, 0.18], [1, 0]);
  return (
    <motion.div
      style={{ opacity }}
      className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-[var(--font-label)] text-white/55"
    >
      <span>Keep scrolling</span>
      <span className="material-symbols-outlined text-[16px] animate-bounce">
        arrow_downward
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Desktop panel — each step is a 100vw slice in the horizontal runway.
// ---------------------------------------------------------------------------

function PanelDesktop({
  step,
  index,
  progress,
}: {
  step: Step;
  index: number;
  progress: MotionValue<number>;
}) {
  const start = index / STEPS.length;
  const end = (index + 1) / STEPS.length;
  // Local 0→1 progress = "how much of this panel's window have we entered".
  const local = useTransform(
    progress,
    [start - 0.07, start + 0.05, end - 0.05, end + 0.07],
    [0, 1, 1, 0],
  );
  const lift = useTransform(local, [0, 1], [40, 0]);
  const fade = useTransform(local, [0, 1], [0.3, 1]);

  const c = councilColors[step.accentMember];

  return (
    <div className="relative shrink-0 w-screen h-screen flex items-center px-8 lg:px-20">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 55% 60% at 30% 50%, ${c.soft}, transparent 70%)`,
        }}
      />

      <motion.div
        style={{ y: lift, opacity: fade }}
        className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full max-w-7xl mx-auto"
      >
        <div className="order-2 lg:order-1">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-semibold mb-4"
            style={{ color: c.hex }}
          >
            {step.kicker}
          </motion.p>
          <h3 className="font-[var(--font-headline)] text-4xl lg:text-6xl font-bold text-white leading-[1.05] mb-5">
            {step.title}
          </h3>
          <p className="text-white/75 text-lg mb-3">{step.subtitle}</p>
          <p className="text-white/55 text-base leading-relaxed max-w-xl">
            {step.description}
          </p>
        </div>

        <div className="order-1 lg:order-2">
          <StepIllustration step={step} local={local} />
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile panel — each step has its OWN viewport-scoped scroll progress so
// the per-panel illustration animates as the user scrolls past it.
// ---------------------------------------------------------------------------

function PanelMobile({ step }: { step: Step }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 30%"],
  });
  const local = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 24,
    mass: 0.4,
  });
  const c = councilColors[step.accentMember];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="space-y-5"
    >
      <p
        className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-semibold"
        style={{ color: c.hex }}
      >
        {step.kicker}
      </p>
      <h3 className="font-[var(--font-headline)] text-3xl font-bold text-white leading-tight">
        {step.title}
      </h3>
      <p className="text-white/75">{step.subtitle}</p>
      <p className="text-white/55 text-sm leading-relaxed">{step.description}</p>
      <div className="pt-3">
        <StepIllustration step={step} local={local} />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Illustration switch — every illustration ALWAYS receives a MotionValue,
// so internal useTransform calls are unconditional.
// ---------------------------------------------------------------------------

function StepIllustration({
  step,
  local,
}: {
  step: Step;
  local: MotionValue<number>;
}) {
  if (step.index === 1) return <Step1BigFive local={local} />;
  if (step.index === 2) return <Step2RoomAndVoice local={local} />;
  return <Step3Modes local={local} />;
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

function Step1BigFive({ local }: { local: MotionValue<number> }) {
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
          {BIG_FIVE.map((t) => (
            <TraitRow key={t.label} trait={t} local={local} />
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
  local,
}: {
  trait: (typeof BIG_FIVE)[number];
  local: MotionValue<number>;
}) {
  const c = councilColors[trait.member];
  const width = useTransform(local, [0, 0.6], ["0%", `${trait.value}%`]);
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
          className="h-full rounded-full"
          style={{
            width,
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

function Step2RoomAndVoice({ local }: { local: MotionValue<number> }) {
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
              <EnvChip key={e.id} env={e} index={i} local={local} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase font-[var(--font-label)] font-semibold text-white/55 mb-3">
            Find a voice — 5 of them
          </p>
          <div className="space-y-2">
            {VOICES.map((v, i) => (
              <VoiceChip key={v.member} voice={v} index={i} local={local} />
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
  local,
}: {
  env: (typeof ENVS)[number];
  index: number;
  local: MotionValue<number>;
}) {
  const appearAt = 0.12 + index * 0.045;
  const opacity = useTransform(local, [appearAt, appearAt + 0.04], [0, 1]);
  const lift = useTransform(local, [appearAt, appearAt + 0.12], [12, 0]);
  return (
    <motion.span style={{ opacity, y: lift }}>
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
  local,
}: {
  voice: (typeof VOICES)[number];
  index: number;
  local: MotionValue<number>;
}) {
  const c = councilColors[voice.member];
  const name = COUNCIL_MEMBERS.find((m) => m.id === voice.member)?.name;
  const appearAt = 0.42 + index * 0.07;
  const opacity = useTransform(local, [appearAt, appearAt + 0.05], [0, 1]);
  const slide = useTransform(local, [appearAt, appearAt + 0.14], [16, 0]);
  // Shared 0→1 waveform phase the three bars grow against.
  const wave = useTransform(local, [appearAt, appearAt + 0.16], [0, 1]);

  return (
    <motion.div
      style={{ opacity, x: slide }}
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
        <WaveBar wave={wave} peak={0.55} color={c.hex} />
        <WaveBar wave={wave} peak={1} color={c.hex} />
        <WaveBar wave={wave} peak={0.7} color={c.hex} />
      </span>
    </motion.div>
  );
}

function WaveBar({
  wave,
  peak,
  color,
}: {
  wave: MotionValue<number>;
  peak: number;
  color: string;
}) {
  const height = useTransform(wave, [0, 1], ["20%", `${peak * 100}%`]);
  return (
    <motion.span
      className="w-[3px] rounded-full"
      style={{ height, background: color, opacity: 0.85 }}
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

function Step3Modes({ local }: { local: MotionValue<number> }) {
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
          <ModeRow key={m.title} mode={m} index={i} local={local} />
        ))}
      </div>
    </div>
  );
}

function ModeRow({
  mode,
  index,
  local,
}: {
  mode: (typeof MODES)[number];
  index: number;
  local: MotionValue<number>;
}) {
  const c = councilColors[mode.member];
  const appearAt = 0.18 + index * 0.18;
  const opacity = useTransform(local, [appearAt, appearAt + 0.06], [0, 1]);
  const slide = useTransform(local, [appearAt, appearAt + 0.16], [24, 0]);

  return (
    <motion.div
      style={{ opacity, x: slide }}
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
