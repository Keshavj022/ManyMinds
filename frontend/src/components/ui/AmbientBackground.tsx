"use client";

import GradientOrb from "./GradientOrb";

/**
 * AmbientBackground — one calm wash, max two orbs.
 *
 * Variants kept for prop compatibility but all converge on the same
 * restrained palette (lilac top, optional blush bottom). No drift,
 * no noise by default, no chromatic competition.
 */

interface AmbientBackgroundProps {
  variant?: "default" | "warm" | "cool" | "rich" | "minimal";
  showGrid?: boolean;
  showNoise?: boolean;
}

export default function AmbientBackground({
  variant = "default",
  showGrid = false,
  showNoise = false,
}: AmbientBackgroundProps) {
  // Single cool wash everywhere; warm variants get a quiet blush
  // secondary in the bottom corner.
  const useWarmSecondary = variant === "warm" || variant === "rich";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <GradientOrb
        color="violet"
        size="xl"
        intensity={variant === "minimal" ? 0.35 : 0.5}
        className="-top-40 left-1/4"
      />
      {useWarmSecondary && (
        <GradientOrb
          color="rose"
          size="lg"
          intensity={0.35}
          className="-bottom-32 -right-24"
        />
      )}
      {showGrid && (
        <div className="absolute inset-0 dot-grid opacity-30" />
      )}
      {showNoise && <div className="absolute inset-0 noise opacity-[0.25]" />}
    </div>
  );
}
