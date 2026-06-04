"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

/**
 * Lenis-backed smooth-scroll wrapper. Drop this near the top of a route so
 * everything underneath it inherits inertia-smoothed scrolling.
 *
 * Tuning notes:
 * - `lerp` 0.10 is roughly the Studio Freight default; lower = stickier
 *   feel but lags scroll-linked Framer Motion transforms.
 * - `wheelMultiplier` 1.0 keeps native pointer-wheel scroll feeling 1:1
 *   while letting the inertia handle the tail-off.
 * - Touch devices stay on the platform's native momentum (smoothTouch:false)
 *   because iOS/Android already do this better than any JS approximation.
 * - We expose `window.lenis` so other scroll-listening components can call
 *   `lenis.scrollTo(anchorId)` instead of a hard-jump.
 */
export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect the user's accessibility preference.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1.0,
      smoothWheel: true,
      syncTouch: false,
    });
    lenisRef.current = lenis;
    // @ts-expect-error — exposed for inter-component scrollTo() use.
    window.lenis = lenis;

    let rafId = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      // @ts-expect-error — clean up the global hook.
      delete window.lenis;
    };
  }, []);

  return <>{children}</>;
}
