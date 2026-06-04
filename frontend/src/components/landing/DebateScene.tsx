"use client";

import { useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { AnimatePresence, motion } from "framer-motion";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";

import GatedCanvas from "@/components/three/canvas/GatedCanvas";
import CouncilMember3D from "@/components/three/CouncilMember3D";
import {
  COUNCIL_MEMBERS,
  councilColors,
  type CouncilMemberId,
} from "@/lib/design-tokens";

/**
 * Scroll-pinned "Debate" feature scene (Feature 01).
 *
 * 6 scripted rounds: moderator opens → pro → con → pro → con → moderator
 * closes. The active speaker swaps as a rect-based scroll progress crosses
 * round boundaries; their spotlight blooms (damped, not snapped), they lift +
 * scale, and a typewriter speech bubble fades in over the canvas.
 *
 * 3D is driven entirely from a single `progressRef` mutated by a coalesced
 * rAF scroll listener — useFrame reads that ref and damps lighting / posture
 * via object refs, so nothing re-renders React per frame. Only discrete UI
 * (active round index for the bubble + progress strip) lives in React state.
 *
 * Rendered through the shared GatedCanvas, so when this section scrolls off
 * screen its render loop drops to "demand" and costs zero per-frame GPU.
 */

// --------------------------------------------------------------------------
// Round script
// --------------------------------------------------------------------------

type Side = "moderator" | "pro" | "con";

interface Round {
  /** Lower bound on the scroll progress (0–1) at which this round is active. */
  threshold: number;
  /** Council member ID of the active speaker. */
  speaker: CouncilMemberId;
  /** Which debate side this round represents. */
  side: Side;
  /** Verbatim line displayed in the speech bubble. */
  line: string;
}

const ROUNDS: ReadonlyArray<Round> = [
  {
    threshold: 0.0,
    speaker: "sage",
    side: "moderator",
    line: "Topic: should AI hold opinions? Two minds for, two against.",
  },
  {
    threshold: 0.2,
    speaker: "aria",
    side: "pro",
    line: "An opinion is a hypothesis. We're already using them.",
  },
  {
    threshold: 0.35,
    speaker: "rex",
    side: "con",
    line: "An opinion you can't be talked out of isn't a hypothesis — it's a tic.",
  },
  {
    threshold: 0.5,
    speaker: "echo",
    side: "pro",
    line: "The user deserves a friend who'll say what they actually think.",
  },
  {
    threshold: 0.65,
    speaker: "nova",
    side: "con",
    line: "Sure, but then the room collapses to whoever yells loudest.",
  },
  {
    threshold: 0.8,
    speaker: "sage",
    side: "moderator",
    line: "Both sides argued well. The product picks five, not one — on purpose.",
  },
];

/** Resolve the active round index for a 0..1 progress value. */
function roundIndexForProgress(p: number): number {
  let next = 0;
  for (let i = 0; i < ROUNDS.length; i += 1) {
    if (p >= ROUNDS[i].threshold) next = i;
  }
  return next;
}

// Per-member tuning kept in sync with the rest of the landing surfaces.
const TALKING_VARIANTS: Record<CouncilMemberId, 0 | 1 | 2> = {
  aria: 0,
  rex: 2,
  sage: 1,
  nova: 2,
  echo: 0,
};

// Stage layout. Pro stage-left (negative x), Con stage-right (positive x),
// moderator slightly behind & centered. All standing on y=0.
interface StagePos {
  id: CouncilMemberId;
  x: number;
  z: number;
  /** Resting facing rotation around Y, so the side groups angle inward. */
  ry: number;
  side: Side;
}

const STAGE_POSITIONS: ReadonlyArray<StagePos> = [
  { id: "aria", x: -3.2, z: 0.0, ry: 0.32, side: "pro" },
  { id: "echo", x: -1.8, z: 0.0, ry: 0.22, side: "pro" },
  { id: "sage", x: 0.0, z: -0.5, ry: 0.0, side: "moderator" },
  { id: "nova", x: 1.8, z: 0.0, ry: -0.22, side: "con" },
  { id: "rex", x: 3.2, z: 0.0, ry: -0.32, side: "con" },
];

const MEMBER_SCALE = 1.25;

// Lighting tiers.
const IDLE_SPOT_INTENSITY = 0.4;
const DIM_SPOT_INTENSITY = 0.18;
const ACTIVE_SPOT_INTENSITY = 2.6;
const IDLE_HALO_OPACITY = 0.1;
const ACTIVE_HALO_OPACITY = 0.55;

// Damped lerp half-life for smooth lighting transitions (seconds).
const HALF_LIFE = 0.2;
function damp(current: number, target: number, dt: number): number {
  const k = 1 - Math.pow(0.5, dt / HALF_LIFE);
  return current + (target - current) * k;
}

const SIDE_LABEL: Record<Side, string> = {
  moderator: "Moderator",
  pro: "For",
  con: "Against",
};

// --------------------------------------------------------------------------
// Inner R3F scene
// --------------------------------------------------------------------------

interface DebateStageProps {
  /** Live scroll progress (0..1); read in useFrame, never triggers renders. */
  progressRef: MutableRefObject<number>;
  /** When true (reduced motion), pin to a fixed round and skip scrub. */
  staticIndex: number | null;
}

function DebateStage({ progressRef, staticIndex }: DebateStageProps) {
  return (
    <>
      {/* Soft global ambient so even dimmed members keep a silhouette. */}
      <ambientLight intensity={0.35} />

      {/* Cool blue key from above stage-left — pro-side mood. */}
      <directionalLight
        position={[-6, 8, 4]}
        intensity={0.85}
        color="#86b3d8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Warm amber rim from stage-right — con-side mood. */}
      <directionalLight position={[6, 5, -3]} intensity={0.55} color="#e0a378" />
      {/* Faint lilac backfill so the moderator doesn't read as a silhouette. */}
      <directionalLight position={[0, 4, -6]} intensity={0.18} color="#9b87d8" />

      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.55}
        scale={20}
        blur={2.6}
        far={3}
      />

      {STAGE_POSITIONS.map((pos) => (
        <DebateMember
          key={pos.id}
          pos={pos}
          progressRef={progressRef}
          staticIndex={staticIndex}
        />
      ))}
    </>
  );
}

interface DebateMemberProps {
  pos: StagePos;
  progressRef: MutableRefObject<number>;
  staticIndex: number | null;
}

function DebateMember({ pos, progressRef, staticIndex }: DebateMemberProps) {
  const c = councilColors[pos.id];

  const groupRef = useRef<THREE.Group>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const haloMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Discrete talking/listening swap — derive from progress in useFrame and
  // flip local state only when the active speaker actually changes (cheap, not
  // per-frame). Lighting / posture damping is fully ref-driven below.
  const [isActive, setIsActive] = useState<boolean>(() =>
    staticIndex === null
      ? ROUNDS[0].speaker === pos.id
      : ROUNDS[staticIndex].speaker === pos.id,
  );
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  useFrame((_, dt) => {
    // Resolve current active speaker from the live progress ref.
    const idx =
      staticIndex !== null
        ? staticIndex
        : roundIndexForProgress(progressRef.current);
    const active = ROUNDS[idx].speaker === pos.id;
    if (active !== isActiveRef.current) {
      isActiveRef.current = active;
      setIsActive(active);
    }

    // Per-frame damping so the lighting swap feels like a stage cue, not a flip.
    const spotTarget = active ? ACTIVE_SPOT_INTENSITY : DIM_SPOT_INTENSITY;
    if (spotRef.current) {
      spotRef.current.intensity = damp(spotRef.current.intensity, spotTarget, dt);
    }

    const haloTarget = active ? ACTIVE_HALO_OPACITY : IDLE_HALO_OPACITY;
    if (haloMaterialRef.current) {
      haloMaterialRef.current.opacity = damp(
        haloMaterialRef.current.opacity,
        haloTarget,
        dt,
      );
    }

    if (groupRef.current) {
      const targetY = active ? 0.05 : 0;
      const targetScale = MEMBER_SCALE * (active ? 1.04 : 1);
      groupRef.current.position.y = damp(groupRef.current.position.y, targetY, dt);
      const s = damp(groupRef.current.scale.x, targetScale, dt);
      groupRef.current.scale.setScalar(s);
    }
  });

  return (
    <>
      {/* Per-member top spot. Always mounted; intensity damped each frame. */}
      <spotLight
        ref={spotRef}
        position={[pos.x, 5.2, pos.z]}
        target-position={[pos.x, 0.9, pos.z]}
        intensity={IDLE_SPOT_INTENSITY}
        color={c.hex}
        angle={0.4}
        penumbra={0.55}
        distance={11}
        decay={2}
      />

      {/* Floor halo in the member's hue. */}
      <mesh
        position={[pos.x, 0.006, pos.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-1}
      >
        <circleGeometry args={[0.95, 36]} />
        <meshBasicMaterial
          ref={haloMaterialRef}
          color={c.hex}
          transparent
          opacity={IDLE_HALO_OPACITY}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <group ref={groupRef} position={[pos.x, 0, pos.z]} rotation={[0, pos.ry, 0]}>
        <CouncilMember3D
          modelPath={`/models/council/${pos.id}.glb`}
          animation={isActive ? "talking" : "listening"}
          talkingVariant={TALKING_VARIANTS[pos.id]}
          position={[0, 0, 0]}
          rotation={[0, 0, 0]}
          scale={1}
          headBobPhase={pos.x * 0.7}
          idleVariant={Math.abs(Math.round(pos.x)) % 3}
          groundShadow={false}
        />
      </group>
    </>
  );
}

// --------------------------------------------------------------------------
// Speech bubble overlay
// --------------------------------------------------------------------------

interface BubbleProps {
  round: Round;
  /** Normalized X position in the canvas viewport [-1, 1] for the speaker. */
  x: number;
  /** Skip the typewriter when reduced motion is preferred. */
  reduced: boolean;
}

function SpeechBubble({ round, x, reduced }: BubbleProps) {
  const c = councilColors[round.speaker];
  const memberName = COUNCIL_MEMBERS.find((m) => m.id === round.speaker)?.name;

  // Typewriter reveal (skipped under reduced motion — show the full line).
  const [shown, setShown] = useState(reduced ? round.line : "");
  useEffect(() => {
    if (reduced) {
      setShown(round.line);
      return;
    }
    setShown("");
    const full = round.line;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(full.slice(0, i));
      if (i >= full.length) window.clearInterval(id);
    }, 22);
    return () => window.clearInterval(id);
  }, [round.line, reduced]);

  // Map normalized x (-1..1) to a CSS left percentage and clamp so bubbles for
  // the outermost speakers don't slide off-screen.
  const leftPct = useMemo(() => {
    const raw = 50 + x * 32;
    return Math.max(14, Math.min(86, raw));
  }, [x]);

  // Edge speakers anchor their translateX so the bubble tucks inside the
  // viewport. Centered for the moderator + inner speakers.
  const translate = leftPct < 25 ? "0%" : leftPct > 75 ? "-100%" : "-50%";

  return (
    <motion.div
      key={round.speaker + round.threshold}
      initial={reduced ? false : { opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? undefined : { opacity: 0, y: 22, scale: 0.96 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="absolute"
      style={{
        left: `${leftPct}%`,
        top: "18%",
        transform: `translateX(${translate})`,
        maxWidth: "min(420px, 78vw)",
      }}
    >
      <div
        className="relative rounded-2xl p-4 md:p-5 border backdrop-blur-md"
        style={{
          background: `linear-gradient(135deg, ${c.soft}, rgba(20,18,27,0.78) 65%)`,
          borderColor: c.hex + "66",
          boxShadow: `0 24px 48px -22px ${c.hex}aa, 0 0 0 1px ${c.hex}22 inset`,
        }}
      >
        {/* Coloured rail */}
        <span
          aria-hidden
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{ background: c.hex, boxShadow: `0 0 12px ${c.hex}` }}
        />

        <div className="flex items-center gap-2 mb-2 pl-3">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: c.hex, boxShadow: `0 0 8px ${c.hex}` }}
          />
          <span className="text-[11px] font-semibold text-white">
            {memberName}
          </span>
          <span
            className="text-[9px] font-[var(--font-label)] uppercase tracking-[0.24em]"
            style={{ color: c.hex }}
          >
            {SIDE_LABEL[round.side]}
          </span>
          <span
            className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-[var(--font-label)] uppercase tracking-[0.22em]"
            style={{
              borderColor: c.hex + "66",
              color: c.hex,
              background: c.hex + "12",
            }}
          >
            <span
              className="w-1 h-1 rounded-full animate-pulse"
              style={{ background: c.hex }}
            />
            Speaking
          </span>
        </div>

        <p className="pl-3 text-[15px] md:text-[16px] leading-snug text-white/90">
          {shown}
          {!reduced && (
            <span
              aria-hidden
              className="inline-block w-[2px] h-[1em] align-[-2px] ml-0.5 animate-pulse"
              style={{ background: c.hex }}
            />
          )}
        </p>
      </div>
    </motion.div>
  );
}

// --------------------------------------------------------------------------
// Section
// --------------------------------------------------------------------------

export default function DebateScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Track viewport for the mobile branch — disables the pinned layout.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  // Reduced-motion preference — render a sensible static frame (round 1) and
  // skip the scroll scrub entirely.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  // Live scroll progress feeds the 3D scene without re-rendering React.
  const progressRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Discrete UI state — bubble + progress strip. Updated only when the active
  // round actually changes, never per scroll event.
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (reduced) {
      progressRef.current = 0;
      setActiveIndex(0);
      return;
    }
    let pending = false;
    const onScroll = () => {
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
        progressRef.current = p;
        const next = roundIndexForProgress(p);
        setActiveIndex((cur) => (cur === next ? cur : next));
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [reduced]);

  const activeRound = ROUNDS[activeIndex];
  const speakerPos = STAGE_POSITIONS.find((p) => p.id === activeRound.speaker)!;
  // Project the speaker's world-x onto a normalized -1..1 for the HTML overlay.
  // Stage roughly spans x ∈ [-3.5, 3.5]; clamp to keep bubbles on screen.
  const bubbleX = Math.max(-1, Math.min(1, speakerPos.x / 3.5));

  // staticIndex pins the 3D scene to round 1 under reduced motion.
  const staticIndex = reduced ? 0 : null;

  // --------------------- Mobile branch ---------------------
  if (isMobile) {
    return (
      <section id="debate" className="relative px-6 py-24 max-w-7xl mx-auto">
        <DebateHeader />
        <div className="relative mt-10 h-[420px] rounded-[1.5rem] overflow-hidden border border-white/[0.07]">
          <AuroraHalo />
          <GatedCanvas
            camera={{ position: [0, 1.55, 8.4], fov: 38 }}
            className="absolute inset-0"
          >
            <DebateStage progressRef={progressRef} staticIndex={0} />
          </GatedCanvas>
        </div>

        {/* Static transcript fallback for small screens. */}
        <ul className="mt-8 space-y-3">
          {ROUNDS.map((r) => {
            const c = councilColors[r.speaker];
            const name = COUNCIL_MEMBERS.find((m) => m.id === r.speaker)?.name;
            return (
              <li
                key={r.threshold}
                className="rounded-2xl p-4 border bg-white/[0.025]"
                style={{ borderColor: c.hex + "33" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: c.hex, boxShadow: `0 0 8px ${c.hex}` }}
                  />
                  <span className="text-[11px] font-semibold text-white">
                    {name}
                  </span>
                  <span
                    className="text-[9px] font-[var(--font-label)] uppercase tracking-[0.24em]"
                    style={{ color: c.hex }}
                  >
                    {SIDE_LABEL[r.side]}
                  </span>
                </div>
                <p className="text-[14px] text-white/85 leading-snug">{r.line}</p>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  // --------------------- Reduced-motion desktop branch ---------------------
  // No pin, no scrub — static round-1 stage + full transcript.
  if (reduced) {
    return (
      <section id="debate" className="relative px-6 py-32 max-w-7xl mx-auto">
        <DebateHeader />
        <div className="relative mt-10 h-[60vh] min-h-[440px] rounded-[1.5rem] overflow-hidden border border-white/[0.07]">
          <AuroraHalo />
          <GatedCanvas
            camera={{ position: [0, 1.55, 8.4], fov: 38 }}
            className="absolute inset-0"
          >
            <DebateStage progressRef={progressRef} staticIndex={0} />
          </GatedCanvas>
          <div className="pointer-events-none absolute inset-0 z-20">
            <SpeechBubble round={ROUNDS[0]} x={0} reduced />
          </div>
        </div>

        <ul className="mt-8 grid gap-3 md:grid-cols-2">
          {ROUNDS.map((r) => {
            const c = councilColors[r.speaker];
            const name = COUNCIL_MEMBERS.find((m) => m.id === r.speaker)?.name;
            return (
              <li
                key={r.threshold}
                className="rounded-2xl p-4 border bg-white/[0.025]"
                style={{ borderColor: c.hex + "33" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: c.hex, boxShadow: `0 0 8px ${c.hex}` }}
                  />
                  <span className="text-[11px] font-semibold text-white">
                    {name}
                  </span>
                  <span
                    className="text-[9px] font-[var(--font-label)] uppercase tracking-[0.24em]"
                    style={{ color: c.hex }}
                  >
                    {SIDE_LABEL[r.side]}
                  </span>
                </div>
                <p className="text-[14px] text-white/85 leading-snug">{r.line}</p>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  // --------------------- Desktop pinned branch ---------------------
  return (
    <section ref={containerRef} id="debate" className="relative h-[280vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <AuroraHalo />

        {/* Section chrome — header travels with the camera while scrolling. */}
        <div className="absolute inset-x-0 top-0 z-10 px-6 pt-10 md:pt-14">
          <div className="max-w-7xl mx-auto">
            <DebateHeader />
          </div>
        </div>

        {/* Canvas (shared GatedCanvas — self-pauses when off screen). */}
        <GatedCanvas
          camera={{ position: [0, 1.55, 8.4], fov: 38 }}
          className="absolute inset-0"
        >
          <DebateStage progressRef={progressRef} staticIndex={staticIndex} />
        </GatedCanvas>

        {/* Speech bubble overlay */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <AnimatePresence mode="wait">
            <SpeechBubble
              key={activeIndex}
              round={activeRound}
              x={bubbleX}
              reduced={false}
            />
          </AnimatePresence>
        </div>

        {/* Bottom progress strip */}
        <div className="absolute inset-x-0 bottom-8 z-10 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] font-[var(--font-label)] uppercase tracking-[0.28em] text-white/45">
                Round {activeIndex + 1} of {ROUNDS.length}
              </span>
              <span className="text-[10px] font-[var(--font-label)] uppercase tracking-[0.28em] text-white/45">
                Live debate
              </span>
            </div>
            <div className="relative h-[3px] w-full rounded-full bg-white/[0.07] overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                animate={{
                  width: `${Math.round(((activeIndex + 1) / ROUNDS.length) * 100)}%`,
                }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  background: "linear-gradient(90deg, #9b87d8, #c89bc4, #d8a3b8)",
                  boxShadow: "0 0 14px rgba(155,135,216,0.45)",
                }}
              />
            </div>
            <div className="mt-3 flex justify-between px-1">
              {ROUNDS.map((r, i) => {
                const c = councilColors[r.speaker];
                const filled = i <= activeIndex;
                return (
                  <span
                    key={r.threshold}
                    className="w-2.5 h-2.5 rounded-full border transition-all duration-300"
                    style={{
                      borderColor: filled ? c.hex : "rgba(255,255,255,0.15)",
                      background: filled ? c.hex : "transparent",
                      boxShadow: filled ? `0 0 10px ${c.hex}` : "none",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --------------------------------------------------------------------------
// Header & decoration helpers
// --------------------------------------------------------------------------

function DebateHeader() {
  return (
    <div className="text-center md:text-left">
      <p className="text-[11px] font-[var(--font-label)] uppercase tracking-[0.32em] text-white/55">
        Feature 01
      </p>
      <h2 className="mt-3 font-[var(--font-headline)] text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] text-white">
        They actually <span className="aurora-text">argue.</span>
      </h2>
      <p className="mt-3 text-white/65 text-sm md:text-base max-w-xl">
        Five voices, real disagreement, no fence-sitting.
      </p>
    </div>
  );
}

function AuroraHalo() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(155,135,216,0.18), transparent 70%), radial-gradient(ellipse 40% 30% at 18% 35%, rgba(127,181,212,0.16), transparent 70%), radial-gradient(ellipse 40% 30% at 82% 35%, rgba(212,154,122,0.14), transparent 70%), linear-gradient(180deg, #100e16 0%, #07060c 100%)",
      }}
    />
  );
}
