"use client";

/**
 * journeyMath — tiny frame-rate-independent damping + easing helpers shared
 * by the Journey scene and its effects. Everything here is allocation-free.
 */

import * as THREE from "three";

/** Exponential damping factor for a given half-life (frame-rate independent). */
export function dampK(halfLife: number, dt: number): number {
  return 1 - Math.pow(2, -dt / Math.max(1e-6, halfLife));
}

export function dampNum(current: number, target: number, halfLife: number, dt: number): number {
  return current + (target - current) * dampK(halfLife, dt);
}

/** Angle damping along the shortest arc (radians). */
export function dampAngle(current: number, target: number, halfLife: number, dt: number): number {
  let d = (target - current) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return current + d * dampK(halfLife, dt);
}

export function dampV3(current: THREE.Vector3, target: THREE.Vector3, halfLife: number, dt: number): void {
  current.lerp(target, dampK(halfLife, dt));
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep01(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 3);
}

/** Deterministic pseudo-random in [0,1) from an integer seed (SSR-stable). */
export function seededRand(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
