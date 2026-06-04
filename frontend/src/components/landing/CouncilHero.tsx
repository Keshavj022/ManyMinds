"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GatedCanvas from "../three/canvas/GatedCanvas";
import CouncilScene, { type FallContext, type HeroStage } from "../three/CouncilScene";
import type { WorldId } from "../three/worlds/HeroWorlds";
import AuroraButton from "../ui/AuroraButton";

/**
 * Hero — a 6-stage cinematic on a single sticky 100vh canvas. BOOT + WAVE
 * auto-play on mount; BREAK, FALLING, STANDING, SITTING are scroll-driven
 * across a 620vh section.
 *
 *   • CRT bezel + scanlines + terminal log overlay the canvas during
 *     BOOT/WAVE; the bezel shatters into 12 wedge shards during BREAK.
 *   • A "Falling through · <World>" overlay crossfades the world name as the
 *     council drops down the vertical shaft of 7 worlds.
 *   • STANDING brings back the arrival headline; SITTING shows the final
 *     "Pull up a chair" glass-strong card + CTA.
 *
 * prefers-reduced-motion: the scrub is skipped — the council renders already
 * SEATED in the café with the CTA visible, no fall.
 */

// === Boot terminal log ================================================
const TERMINAL_LINES = [
  "> initializing council...",
  "> linking aria.glb ........ [OK]",
  "> linking rex.glb  ........ [OK]",
  "> linking sage.glb ........ [OK]",
  "> linking nova.glb ........ [OK]",
  "> linking echo.glb ........ [OK]",
  "> council online.",
];
const TERMINAL_INTERVAL = 0.35;

// === Per-world copy for the "Falling through" overlay ================
const WORLD_TITLES: Record<WorldId, string> = {
  mountain: "Mountain",
  zen: "Zen Garden",
  forest: "Forest",
  rooftop: "Rooftop",
  beach: "Beach",
  library: "Library",
  cafe: "Café",
};

const WORLD_SUBTITLES: Record<WorldId, string> = {
  mountain: "Falling from peak silence.",
  zen: "The garden wakes.",
  forest: "A canopy of hush.",
  rooftop: "Dusk on the city's shoulders.",
  beach: "Salt air, a horizon.",
  library: "Warm light and paper.",
  cafe: "And finally — a table.",
};

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
    delay: (i % 6) * 0.03,
    duration: 0.6 + ((i * 17) % 30) / 100,
  };
});

// === Scroll thresholds (mirror CouncilScene) =========================
const T_BREAK_END = 0.15;

export default function CouncilHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [stage, setStage] = useState<HeroStage>("boot");
  const [bootElapsed, setBootElapsed] = useState(0);
  const [fallContext, setFallContext] = useState<FallContext>({
    worldId: "mountain",
    fallProgress: 0,
  });
  const [reduced, setReduced] = useState(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Window-scroll listener — coalesced through one RAF. Lenis is mounted at
  // the page root, so its smoothing applies to window scroll automatically.
  useEffect(() => {
    if (reduced) return;
    let pending = false;
    const handleScroll = () => {
      if (!containerRef.current || pending) return;
      pending = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        pending = false;
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const scrollable = el.offsetHeight - window.innerHeight;
        if (scrollable <= 0) return;
        const p = Math.max(0, Math.min(1, -rect.top / scrollable));
        setScrollProgress(p);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  const handleStageChange = useCallback(
    (next: HeroStage, elapsed: number, ctx?: FallContext) => {
      setStage(next);
      setBootElapsed(elapsed);
      if (ctx) setFallContext(ctx);
    },
    [],
  );

  // === Overlay opacities (scroll-derived) ============================
  const breakProgress = Math.max(0, Math.min(1, scrollProgress / T_BREAK_END));
  const inBootOrWave = !reduced && (stage === "boot" || stage === "wave");
  const bezelVisible = !reduced && (inBootOrWave || breakProgress < 0.05);
  const bezelShattering = !reduced && !inBootOrWave && breakProgress >= 0.05;

  // "Falling through" overlay — across the entire fall window 0.15–0.65.
  const fallingOverlayOpacity = reduced
    ? 0
    : Math.max(0, Math.min(1, (scrollProgress - 0.15) * 12)) *
      Math.max(0, Math.min(1, (0.62 - scrollProgress) * 12));

  // STANDING band ~0.65–0.80.
  const introOpacity = reduced
    ? 0
    : Math.max(0, Math.min(1, (scrollProgress - 0.65) * 7)) *
      Math.max(0, 1 - Math.max(0, scrollProgress - 0.8) * 9);

  // SITTING band ~0.84+. With reduced motion, show it immediately.
  const seatedOpacity = reduced
    ? 1
    : Math.max(0, Math.min(1, (scrollProgress - 0.84) * 6));

  const visibleLineCount = useMemo(
    () => Math.min(TERMINAL_LINES.length, Math.floor(bootElapsed / TERMINAL_INTERVAL) + 1),
    [bootElapsed],
  );

  return (
    <section ref={containerRef} className="relative w-full h-[620vh]" id="council-hero">
      <div className="sticky top-0 w-full h-screen overflow-hidden">
        <GatedCanvas
          camera={{ position: [0, 1.55, 9.5], fov: 50 }}
          className="absolute inset-0"
          rootMargin="300px 0px"
        >
          <CouncilScene
            scrollProgress={scrollProgress}
            onStageChange={handleStageChange}
          />
        </GatedCanvas>

        {/* CRT bezel + scanlines + terminal + shatter shards */}
        <CRTBezel
          visible={bezelVisible}
          shattering={bezelShattering}
          stage={stage}
          visibleLineCount={visibleLineCount}
        />

        {/* "Falling through · <World>" overlay — crossfades per world */}
        <div
          className="absolute inset-x-0 top-[14%] flex justify-center px-6 z-10 pointer-events-none"
          style={{ opacity: fallingOverlayOpacity, transition: "opacity 200ms linear" }}
        >
          <div className="text-center max-w-3xl">
            <p className="text-[11px] tracking-[0.32em] uppercase text-white/55 font-[var(--font-label)] mb-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
              Falling through · {WORLD_TITLES[fallContext.worldId]}
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={fallContext.worldId}
                initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2 className="font-[var(--font-headline)] font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-white drop-shadow-[0_4px_28px_rgba(0,0,0,0.85)]">
                  <span className="aurora-text">{WORLD_TITLES[fallContext.worldId]}</span>
                </h2>
                <p className="mt-4 text-white/70 text-sm md:text-base lg:text-lg italic drop-shadow-[0_2px_18px_rgba(0,0,0,0.8)]">
                  {WORLD_SUBTITLES[fallContext.worldId]}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* STANDING overlay — they've landed */}
        <div
          className="absolute inset-x-0 top-[18%] flex justify-center px-6 z-10 pointer-events-none transition-opacity duration-500"
          style={{ opacity: introOpacity }}
        >
          <div className="text-center max-w-2xl">
            <p className="text-[11px] tracking-[0.32em] uppercase text-white/55 font-[var(--font-label)] mb-3">
              The arrival
            </p>
            <h2 className="font-[var(--font-headline)] font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.7)]">
              They land. <span className="aurora-text">The room comes together.</span>
            </h2>
          </div>
        </div>

        {/* SITTING overlay — pull up a chair */}
        <div
          className="absolute inset-0 flex items-end justify-center px-6 pb-28 md:pb-32 z-10 pointer-events-none transition-opacity duration-500"
          style={{ opacity: seatedOpacity }}
        >
          <div
            className="glass-strong rounded-2xl p-7 md:p-9 max-w-2xl text-center"
            style={{ pointerEvents: seatedOpacity > 0.05 ? "auto" : "none" }}
          >
            <h2 className="font-[var(--font-headline)] font-bold text-2xl md:text-4xl leading-[1.1] text-white mb-3">
              Pull up a <span className="aurora-text">chair</span>.
            </h2>
            <p className="text-white/65 text-sm md:text-base leading-relaxed mb-6">
              They&apos;ve already taken their seats. The conversation starts the moment you walk
              in — and they remember every one.
            </p>
            <AuroraButton href="/signup" variant="primary" size="lg">
              Pull up a chair
            </AuroraButton>
          </div>
        </div>
      </div>
    </section>
  );
}

// =====================================================================
// CRT bezel overlay — frame, scanlines, terminal log, scroll hint, shatter.
// =====================================================================

interface CRTBezelProps {
  visible: boolean;
  shattering: boolean;
  stage: HeroStage;
  visibleLineCount: number;
}

function CRTBezel({ visible, shattering, stage, visibleLineCount }: CRTBezelProps) {
  const showFrame = visible && !shattering;
  const inWave = stage === "wave";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="crt"
          className="absolute inset-0 z-20 pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Chunky CRT bezel frame */}
          {showFrame && (
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
          <motion.div
            className="absolute inset-[16px]"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: shattering ? 0 : 0.35 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(120, 240, 255, 0.06) 0px, rgba(120, 240, 255, 0.06) 1px, transparent 1px, transparent 3px)",
              mixBlendMode: "screen",
            }}
          />

          {/* CRT curvature / vignette */}
          <motion.div
            className="absolute inset-[16px] rounded-[8px]"
            initial={{ opacity: 0.55 }}
            animate={{ opacity: shattering ? 0 : 0.55 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              boxShadow:
                "inset 0 0 200px 40px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(120,240,255,0.08)",
            }}
          />

          {/* Terminal caption (top-left) */}
          <div className="absolute top-8 left-8 max-w-[60%] font-mono text-[12px] leading-relaxed select-none">
            {!inWave && (
              <div className="text-[#3dff8f] drop-shadow-[0_0_6px_rgba(60,255,140,0.5)]">
                {TERMINAL_LINES.slice(0, visibleLineCount).map((line, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {line}
                  </motion.div>
                ))}
                {visibleLineCount < TERMINAL_LINES.length && (
                  <motion.span
                    aria-hidden
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-2 h-3 bg-[#3dff8f] ml-1 align-middle"
                  />
                )}
              </div>
            )}
            {inWave && (
              <motion.div
                key="hello"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.85, 1] }}
                transition={{ duration: 1.0, times: [0, 0.2, 0.6, 1] }}
                className="text-[#9dffb6] text-base font-semibold drop-shadow-[0_0_10px_rgba(90,255,150,0.7)]"
              >
                &gt; hello.
              </motion.div>
            )}
          </div>

          {/* Scroll hint — during WAVE only */}
          <AnimatePresence>
            {inWave && (
              <motion.div
                key="hint"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
              >
                <p className="text-[#9dffb6] text-[10px] font-mono uppercase tracking-[0.35em] drop-shadow-[0_0_6px_rgba(90,255,150,0.5)]">
                  Scroll to enter the room
                </p>
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-px h-8 bg-gradient-to-b from-[#9dffb6] to-transparent"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Shatter shards — 12 wedge polygons fly outward */}
          {shattering && (
            <div className="absolute inset-0 overflow-hidden">
              {SHATTER_SHARDS.map((shard) => (
                <motion.div
                  key={shard.id}
                  className="absolute inset-0"
                  style={{
                    clipPath: shard.polygon,
                    background:
                      "radial-gradient(circle at 50% 50%, rgba(10,25,35,0.95), rgba(2,6,12,0.95))",
                    border: "1px solid rgba(120, 240, 255, 0.25)",
                  }}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{
                    x: shard.dx * 480,
                    y: shard.dy * 480,
                    rotate: shard.rot,
                    opacity: 0,
                  }}
                  transition={{
                    duration: shard.duration,
                    delay: shard.delay,
                    ease: [0.32, 0.72, 0.32, 1],
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
