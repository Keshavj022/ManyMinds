"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { councilColors, CouncilMemberId } from "@/lib/design-tokens";
import type { MemberConfig } from "./types";

interface Props {
  memberId: CouncilMemberId;
  config: MemberConfig;
}

/**
 * Voice-preview waveform — a stylized representation of how the member
 * will *sound* given the trait sliders. Driven by the five values so the
 * user gets immediate visual feedback as they drag.
 *
 * The encoding (subjective but it lands):
 *   - extraversion       → amplitude (loudness)
 *   - openness           → variation (vertical jitter)
 *   - conscientiousness  → rhythm precision (less, not more — high =
 *                          metronomic; low = swaying)
 *   - agreeableness      → smoothness (warmth)
 *   - neuroticism        → density of high-frequency wobble
 */
export default function VoicePreview({ memberId, config }: Props) {
  const color = councilColors[memberId];

  const bars = useMemo(() => {
    const { traits } = config;
    const baseAmp = 0.25 + (traits.extraversion / 100) * 0.55; // 0.25..0.8
    const variance = 0.1 + (traits.openness / 100) * 0.45;
    const tightness = 0.35 + (traits.conscientiousness / 100) * 0.5;
    const wobble = traits.neuroticism / 100;

    // 22 bars across — deterministic shape based on a sine, perturbed by traits
    return Array.from({ length: 22 }, (_, i) => {
      const phase = (i / 22) * Math.PI * 2;
      const wave = Math.sin(phase * (1 + wobble * 2)) * variance;
      const detail = Math.sin(phase * 6 + i) * wobble * 0.18;
      const h = Math.max(0.08, baseAmp + wave + detail);
      // Animation period: tighter conscientiousness = faster, more uniform
      const period = 0.7 + (1 - tightness) * 1.4;
      return { h: Math.min(h, 1), period, i };
    });
  }, [config]);

  const warmth = config.traits.agreeableness / 100;

  return (
    <div
      className="flex items-center justify-center gap-1 h-20 rounded-2xl px-4 border border-white/8"
      style={{
        background: `linear-gradient(135deg, ${color.soft}, rgba(13,11,20,0.55))`,
        boxShadow: `inset 0 0 24px ${color.soft}`,
      }}
    >
      {bars.map((b) => (
        <motion.span
          key={b.i}
          className="rounded-full block"
          animate={{
            scaleY: [0.5, b.h, 0.55, b.h * 0.85, 0.6],
          }}
          transition={{
            duration: b.period,
            repeat: Infinity,
            ease: "easeInOut",
            delay: b.i * 0.04,
          }}
          style={{
            width: 4,
            height: 56,
            background: `linear-gradient(180deg, ${color.hex}, ${color.hex}88)`,
            opacity: 0.65 + warmth * 0.3,
            boxShadow: `0 0 6px ${color.soft}`,
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
}
