"use client";

import { Canvas, type CameraProps } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, Preload } from "@react-three/drei";
import { Suspense, type ReactNode } from "react";
import * as THREE from "three";
import { useInView } from "./useInView";

export interface GatedCanvasProps {
  children: ReactNode;
  /** Positioning classes for the wrapper (e.g. "absolute inset-0"). */
  className?: string;
  /** R3F camera config. */
  camera?: CameraProps;
  /** IntersectionObserver margin — how early the render loop warms up. */
  rootMargin?: string;
  /** Pointer events on/off. Most cinematic scenes are non-interactive
   *  (pointer-events-none); the "Meet the council" hover stage sets true. */
  interactive?: boolean;
  /** DPR ceiling. Clamped to [1, dprMax] for consistent perf. */
  dprMax?: number;
  /** Optional fallback rendered while the scene's assets stream in. */
  fallback?: ReactNode;
}

/**
 * A self-pausing R3F Canvas.
 *
 * The wrapper element is watched by an IntersectionObserver. While the
 * section is on (or near) screen the canvas runs `frameloop="always"` so
 * useFrame animations play; the moment it scrolls away the loop drops to
 * `"demand"`, so an off-screen 3D section costs ZERO per-frame GPU work.
 * With several independent 3D sections on one page this is the difference
 * between buttery and janky scrolling.
 *
 * Every section inherits the same hardened GL defaults (no AA, clamped DPR,
 * high-performance power pref, PCF shadows) so we never re-tune per scene.
 */
export default function GatedCanvas({
  children,
  className = "absolute inset-0",
  camera,
  rootMargin = "300px 0px",
  interactive = false,
  dprMax = 1.75,
  fallback = null,
}: GatedCanvasProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin });

  return (
    <div
      ref={ref}
      className={className}
      style={interactive ? undefined : { pointerEvents: "none" }}
    >
      <Canvas
        // In view → animate every frame. Off screen → "demand" holds the last
        // frame and stops the render loop. (Initial mount under "demand" still
        // paints one correct frame, so below-the-fold sections look right.)
        frameloop={inView ? "always" : "demand"}
        camera={camera}
        shadows={{ type: THREE.PCFShadowMap }}
        className="!absolute inset-0"
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        dpr={[1, dprMax]}
        performance={{ min: 0.5 }}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <Suspense fallback={null}>{children}</Suspense>
        <Preload all />
      </Canvas>
      {fallback}
    </div>
  );
}
