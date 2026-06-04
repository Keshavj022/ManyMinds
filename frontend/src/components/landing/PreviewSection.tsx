"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import { councilColors } from "@/lib/design-tokens";

const BULLETS: ReadonlyArray<{
  icon: string;
  title: string;
  body: string;
  member: keyof typeof councilColors;
}> = [
  {
    icon: "check_circle",
    title: "Real-time debate",
    body: "Members argue with each other, not just with you. You hear the disagreement and decide where you land.",
    member: "rex",
  },
  {
    icon: "check_circle",
    title: "Persistent recall",
    body: "Bring up that thing from three weeks ago. Echo remembers the feeling. Aria remembers the numbers.",
    member: "echo",
  },
];

export default function PreviewSection() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <p className="text-[11px] font-[var(--font-label)] font-semibold uppercase tracking-[0.32em] text-white/55">
            A different shape of AI
          </p>
          <h2 className="font-[var(--font-headline)] text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05]">
            A collective mind for your{" "}
            <span className="aurora-text">complex problems</span>.
          </h2>
          <p className="text-white/65 text-lg leading-relaxed max-w-xl">
            Why ask one AI when you can sit with five? ManyMinds gives you a
            council of distinct personalities who think differently, push back
            on each other, and arrive at answers you couldn&apos;t have reached
            alone.
          </p>

          <div className="pt-2 space-y-5">
            {BULLETS.map(({ icon, title, body, member }, i) => {
              const c = councilColors[member];
              return (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <span
                    className="material-symbols-outlined mt-0.5 shrink-0 drop-shadow-[0_0_10px_currentColor]"
                    style={{
                      fontVariationSettings: "'FILL' 1",
                      color: c.hex,
                      fontSize: "24px",
                    }}
                  >
                    {icon}
                  </span>
                  <div>
                    <h4 className="font-[var(--font-headline)] font-bold text-white text-lg leading-tight">
                      {title}
                    </h4>
                    <p className="text-sm text-white/55 mt-1 leading-relaxed">
                      {body}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Video preview placeholder */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="relative group"
        >
          {/* Animated gradient halo behind frame */}
          <motion.div
            aria-hidden
            className="absolute -inset-6 rounded-[2.5rem] blur-3xl opacity-60 pointer-events-none"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, rgba(155,135,216,0.4), rgba(216,163,184,0.4), rgba(212,154,122,0.4), rgba(127,181,212,0.4), rgba(155,135,216,0.4))",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          />

          <GlassCard
            variant="strong"
            className="relative rounded-[2rem] overflow-hidden aspect-video"
          >
            {/* Fake "screen" gradient */}
            <div className="absolute inset-0 hero-gradient" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(216,163,184,0.18), transparent 70%)",
              }}
            />
            <div className="absolute inset-0 dot-grid opacity-30" />

            {/* Play button */}
            <div className="absolute inset-0 grid place-items-center">
              <button
                aria-label="Play preview video"
                className="group/play relative w-20 h-20 md:w-24 md:h-24 rounded-full grid place-items-center text-white border border-white/15 backdrop-blur-md transition-all duration-300 hover:scale-110 cursor-pointer"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full animate-pulse-soft"
                  style={{
                    boxShadow: "0 0 0 0 rgba(216,163,184,0.6)",
                    background:
                      "radial-gradient(circle, rgba(216,163,184,0.18) 0%, transparent 70%)",
                  }}
                />
                <span
                  className="material-symbols-outlined text-4xl md:text-5xl relative z-10 translate-x-0.5"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </button>
            </div>

            {/* Bottom bar — fake "video chrome" */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/[0.06]">
              <span
                className="material-symbols-outlined text-white/70 text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_circle
              </span>
              <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full w-1/3 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, #9b87d8, #d8a3b8)",
                  }}
                />
              </div>
              <span className="text-[11px] font-[var(--font-label)] text-white/55 tabular-nums">
                1:24 / 3:42
              </span>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
