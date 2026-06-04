/** Tiny class-merge helper — avoids pulling in clsx. */
export function cn(...inputs: Array<string | undefined | null | false>) {
  return inputs.filter(Boolean).join(" ");
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Sleep helper for staged demo animations. */
export function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}
