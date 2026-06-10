"use client";

import { motion } from "framer-motion";
import { BOOT_LINES, WAVE_DURATION } from "@/components/three/journey/timeline";

/**
 * CRT boot frame — chunky bezel, cyan scanlines, the green boot terminal and
 * the scroll hint, ported from the original CouncilHero. One upgrade: the
 * shatter is now scroll-SCRUBBED — the 12 wedge shards fly out (and back in,
 * if the user scrolls up) as a pure function of breakout progress, so the
 * breakout reads as the user's own gesture rather than a canned animation.
 *
 * JourneyHero mounts this only while breakoutProgress < 1 and motion is on.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);

// === Shatter shards — deterministic, SSR-safe ========================
function shardPolygon(i: number): string {
  const cx = 50;
  const cy = 50;
  const total = 12;
  const a0 = (i / total) * Math.PI * 2 - Math.PI / 2;
  const a1 = ((i + 1) / total) * Math.PI * 2 - Math.PI / 2;
  const r = 80;
  const x0 = cx + Math.cos(a0) * r;
  const y0 = cy + Math.sin(a0) * r;
  const x1 = cx + Math.cos(a1) * r;
  const y1 = cy + Math.sin(a1) * r;
  return `polygon(${cx}% ${cy}%, ${x0}% ${y0}%, ${x1}% ${y1}%)`;
}

const SHATTER_SHARDS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  return {
    id: i,
    polygon: shardPolygon(i),
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    rot: ((i * 37) % 60) - 30,
    /** Stagger as a fraction of breakout progress — outer shards lag a beat. */
    delay: (i % 6) * 0.05,
  };
});

export interface JourneyBootFrameProps {
  /** Shell-owned boot phase: terminal types during "boot", hint during "wave". */
  phase: "boot" | "wave";
  /** How many BOOT_LINES are revealed. */
  visibleLineCount: number;
  /** scrollProgress / ACT_BOUNDS.breakoutEnd, clamped 0..1 — drives the shatter. */
  breakoutProgress: number;
}

export default function JourneyBootFrame({
  phase,
  visibleLineCount,
  breakoutProgress,
}: JourneyBootFrameProps) {
  const bp = breakoutProgress;
  const shattering = bp > 0.02;
  const inWave = phase === "wave" && !shattering;
  // Terminal + chrome fade fast once the user starts scrolling.
  const chromeOpacity = 1 - ramp(bp, 0.02, 0.16);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Chunky CRT bezel frame — replaced by the shards once shattering */}
      {!shattering && (
        <div
          className="absolute inset-0"
          style={{
            boxShadow:
              "inset 0 0 0 14px #0a0a0d, inset 0 0 0 16px #2a2a32, inset 0 0 120px 30px rgba(0,0,0,0.85)",
            borderRadius: "12px",
          }}
        />
      )}

      {/* Cyan-tinted scan-line overlay */}
      <div
        className="absolute inset-[16px]"
        style={{
          opacity: 0.35 * (1 - ramp(bp, 0.02, 0.3)),
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(120, 240, 255, 0.06) 0px, rgba(120, 240, 255, 0.06) 1px, transparent 1px, transparent 3px)",
          mixBlendMode: "screen",
        }}
      />

      {/* CRT curvature / vignette */}
      <div
        className="absolute inset-[16px] rounded-[8px]"
        style={{
          opacity: 0.55 * (1 - ramp(bp, 0.02, 0.28)),
          boxShadow:
            "inset 0 0 200px 40px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(120,240,255,0.08)",
        }}
      />

      {/* Terminal caption (top-left) */}
      <div
        className="absolute top-8 left-8 max-w-[60%] font-mono text-[12px] leading-relaxed select-none"
        style={{ opacity: chromeOpacity }}
      >
        {phase === "boot" && (
          <div className="text-[#3dff8f] drop-shadow-[0_0_6px_rgba(60,255,140,0.5)]">
            {BOOT_LINES.slice(0, visibleLineCount).map((line, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18 }}
              >
                {line}
              </motion.div>
            ))}
            {visibleLineCount < BOOT_LINES.length && (
              <motion.span
                aria-hidden
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-2 h-3 bg-[#3dff8f] ml-1 align-middle"
              />
            )}
          </div>
        )}
        {phase === "wave" && (
          <motion.div
            key="hello"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.85, 1] }}
            transition={{ duration: WAVE_DURATION * 0.7, times: [0, 0.2, 0.6, 1] }}
            className="text-[#9dffb6] text-base font-semibold drop-shadow-[0_0_10px_rgba(90,255,150,0.7)]"
          >
            &gt; hello.
          </motion.div>
        )}
      </div>

      {/* Scroll hint — once the council is online, until the bezel breaks */}
      {inWave && (
        <motion.div
          key="hint"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <p className="text-[#9dffb6] text-[10px] font-mono uppercase tracking-[0.35em] drop-shadow-[0_0_6px_rgba(90,255,150,0.5)]">
            Scroll to begin the journey
          </p>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-8 bg-gradient-to-b from-[#9dffb6] to-transparent"
          />
        </motion.div>
      )}

      {/* Shatter shards — 12 wedge polygons, position scrubbed by breakout.
          The fill fades IN across the early breakout (and the gradient stays
          translucent) so the first scrolled pixel never flashes the whole
          screen to opaque dark glass — the scene ghosts through the cracks. */}
      {shattering && (
        <div className="absolute inset-0 overflow-hidden">
          {SHATTER_SHARDS.map((shard) => {
            const local = smooth(ramp(bp, shard.delay, 1));
            const fillIn = ramp(bp, 0.02, 0.1);
            return (
              <div
                key={shard.id}
                className="absolute inset-0"
                style={{
                  clipPath: shard.polygon,
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(10,25,35,0.55), rgba(2,6,12,0.55))",
                  border: "1px solid rgba(120, 240, 255, 0.25)",
                  transform: `translate(${shard.dx * 480 * local}px, ${shard.dy * 480 * local}px) rotate(${shard.rot * local}deg)`,
                  opacity: (1 - local) * fillIn,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
