"use client";

import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useEffect, useRef } from "react";
import { councilColors } from "@/lib/design-tokens";

const STATS: ReadonlyArray<{
  value: number;
  suffix: string;
  label: string;
  icon: string;
  member: keyof typeof councilColors;
}> = [
  { value: 5, suffix: "", label: "Distinct Personalities", icon: "groups", member: "aria" },
  { value: 100, suffix: "%", label: "Persistent Memory", icon: "memory", member: "sage" },
  { value: 3, suffix: "D", label: "Immersive Worlds", icon: "public", member: "nova" },
  { value: 24, suffix: "/7", label: "Always Around", icon: "schedule", member: "echo" },
];

function AnimatedCounter({
  value,
  suffix,
  start,
}: {
  value: number;
  suffix: string;
  start: boolean;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (!start) return;
    const controls = animate(count, value, { duration: 2, ease: "easeOut" });
    return controls.stop;
  }, [value, count, start]);

  return (
    <span className="tabular-nums">
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-80px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 px-6 border-y border-white/[0.04]"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-4 relative">
          {STATS.map(({ value, suffix, label, icon, member }, i) => {
            const c = councilColors[member];
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative text-center px-2"
              >
                {/* Icon halo */}
                <div className="flex justify-center mb-4">
                  <div
                    className="relative w-12 h-12 rounded-full grid place-items-center border"
                    style={{
                      background: c.soft,
                      borderColor: c.hex + "55",
                      color: c.hex,
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-[22px]"
                      style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                      {icon}
                    </span>
                  </div>
                </div>

                {/* Number */}
                <div
                  className="font-[var(--font-headline)] text-5xl md:text-6xl font-bold mb-2"
                  style={{
                    color: c.hex,
                    textShadow: `0 0 24px ${c.soft}`,
                  }}
                >
                  <AnimatedCounter value={value} suffix={suffix} start={inView} />
                </div>

                {/* Label */}
                <p className="text-white/55 text-xs md:text-sm font-[var(--font-label)] uppercase tracking-[0.22em]">
                  {label}
                </p>

                {/* Vertical aurora divider between stats (desktop) */}
                {i < STATS.length - 1 && (
                  <span
                    aria-hidden
                    className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-0 w-px h-20"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent, rgba(255,255,255,0.18) 50%, transparent)",
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Horizontal aurora hairline */}
        <div
          aria-hidden
          className="mx-auto mt-16 h-px max-w-2xl"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(155,135,216,0.55), rgba(216,163,184,0.55), rgba(212,154,122,0.55), rgba(127,181,212,0.55), transparent)",
          }}
        />
      </div>
    </section>
  );
}
