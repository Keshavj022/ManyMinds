"use client";

/**
 * GradientOrb — a single soft radial wash.
 *
 * The "calm edition" of this component: all colors collapse onto the
 * brand family (lilac + blush) so multiple orbs no longer fight each
 * other. The legacy color names are kept for prop compatibility but
 * map onto two underlying tones.
 *
 * Drift animation defaults to OFF; pass `drift` explicitly to enable.
 */

type OrbColor = "violet" | "magenta" | "coral" | "sky" | "rose" | "aurora";
type OrbSize = "sm" | "md" | "lg" | "xl";

interface GradientOrbProps {
  color?: OrbColor;
  size?: OrbSize;
  className?: string;
  intensity?: number; // 0-1
  drift?: boolean;
}

// Two underlying tones — cool (lilac) and warm (blush). Legacy color
// names map to one of them so existing call sites stay calm by default.
const COOL = "rgba(155, 135, 216, 0.32)";
const WARM = "rgba(216, 163, 184, 0.28)";

const colorMap: Record<OrbColor, string> = {
  violet:  COOL,
  sky:     COOL,
  aurora:  COOL,
  magenta: WARM,
  coral:   WARM,
  rose:    WARM,
};

const sizeMap: Record<OrbSize, string> = {
  sm: "w-64 h-64",
  md: "w-96 h-96",
  lg: "w-[36rem] h-[36rem]",
  xl: "w-[52rem] h-[52rem]",
};

export default function GradientOrb({
  color = "violet",
  size = "md",
  className = "",
  intensity = 0.6,
  drift = false,
}: GradientOrbProps) {
  return (
    <div
      aria-hidden
      className={`absolute rounded-full blur-[140px] pointer-events-none ${sizeMap[size]} ${
        drift ? "animate-drift-slow" : ""
      } ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 30%, ${colorMap[color]}, transparent 70%)`,
        opacity: Math.min(intensity, 0.7),
      }}
    />
  );
}
