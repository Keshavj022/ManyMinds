"use client";

import { useEffect, useRef, useState } from "react";

export interface UseInViewOptions {
  /** Margin around the root (viewport) that still counts as "in view".
   *  Generous default so a section warms up just before it scrolls on. */
  rootMargin?: string;
  /** Fraction of the element that must be visible to flip true. */
  threshold?: number;
  /** Once true, stay true forever (used for one-shot reveals — NOT for
   *  canvas gating, where we want it to flip back off when scrolled away). */
  once?: boolean;
}

/**
 * IntersectionObserver hook. Attach the returned `ref` to a DOM element;
 * `inView` reflects whether that element is intersecting the viewport
 * (expanded by `rootMargin`).
 *
 * This is the backbone of canvas gating — only the in-view section's WebGL
 * render loop runs, which is the single biggest scroll-smoothness win when a
 * page has several independent 3D sections.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {},
): { ref: React.RefObject<T | null>; inView: boolean } {
  const { rootMargin = "300px 0px", threshold = 0, once = false } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // No observer support (or SSR) — fail open so content still renders.
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  return { ref, inView };
}

export default useInView;
