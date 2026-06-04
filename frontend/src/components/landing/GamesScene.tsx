"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";

import GatedCanvas from "@/components/three/canvas/GatedCanvas";
import CouncilMember3D, {
  type CouncilMemberAnimation,
} from "@/components/three/CouncilMember3D";
import {
  COUNCIL_MEMBERS,
  councilColors,
  type CouncilMemberId,
} from "@/lib/design-tokens";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * GamesScene — scroll-pinned cinematic for the GAMES feature.
 *
 * Two members (Aria, Rex) play a game seated at a small round table; three
 * (Sage, Nova, Echo) stand behind and commentate. As the user scrolls, the
 * active commentator rotates through Sage → Nova → Echo, and the players
 * swap between "thinking" and "talking-sitting" states. A side chat overlay
 * stacks messages keyed to scroll progress, matching the live cadence on
 * screen. Warm amber + violet rim light differentiates this from the cooler
 * Debate scene.
 *
 * Scroll plumbing: a single rect-based listener (coalesced into one rAF)
 * writes progress into a ref. The R3F subtree reads that ref inside useFrame
 * and damps everything (spotlight focus, camera tilt) — never setState per
 * frame. Only discrete UI (revealed chat messages, phase index) lives in
 * React state, flipped on threshold crossings.
 */

// ---------------------------------------------------------------------------
// Static seating / role config
// ---------------------------------------------------------------------------

type Role = "player-l" | "player-r" | "spec-l" | "spec-c" | "spec-r";

interface SeatConfig {
  id: CouncilMemberId;
  role: Role;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  talkingVariant: 0 | 1 | 2;
  idleVariant: number;
  headBobPhase: number;
}

// The table sits at world [0, *, 1.2]. Players flank it; spectators stand
// behind it and are rotated to face it.
const TABLE_FOCUS = new THREE.Vector3(0, 0.95, 1.2);

const SEATS: ReadonlyArray<SeatConfig> = [
  {
    id: "aria",
    role: "player-l",
    position: [-1.0, 0, 1.2],
    rotation: [0, 0.6, 0],
    scale: 1.0,
    talkingVariant: 0,
    idleVariant: 0,
    headBobPhase: 0.0,
  },
  {
    id: "rex",
    role: "player-r",
    position: [1.0, 0, 1.2],
    rotation: [0, -0.6, 0],
    scale: 1.0,
    talkingVariant: 2,
    idleVariant: 1,
    headBobPhase: 1.6,
  },
  {
    id: "sage",
    role: "spec-l",
    position: [-2.6, 0, -0.6],
    rotation: [0, 0.62, 0],
    scale: 1.0,
    talkingVariant: 1,
    idleVariant: 2,
    headBobPhase: 3.1,
  },
  {
    id: "nova",
    role: "spec-c",
    position: [0, 0, -1.4],
    rotation: [0, 0, 0],
    scale: 1.0,
    talkingVariant: 2,
    idleVariant: 0,
    headBobPhase: 4.4,
  },
  {
    id: "echo",
    role: "spec-r",
    position: [2.6, 0, -0.6],
    rotation: [0, -0.62, 0],
    scale: 1.0,
    talkingVariant: 0,
    idleVariant: 1,
    headBobPhase: 5.7,
  },
] as const;

const MODEL_PATHS: Record<CouncilMemberId, string> = Object.fromEntries(
  COUNCIL_MEMBERS.map((m) => [m.id, m.modelPath]),
) as Record<CouncilMemberId, string>;

// ---------------------------------------------------------------------------
// Chat messages — staggered against scroll progress
// ---------------------------------------------------------------------------

interface ChatMessage {
  at: number;
  speaker: CouncilMemberId;
  text: string;
}

const MESSAGES: ReadonlyArray<ChatMessage> = [
  { at: 0.05, speaker: "sage", text: "Aria's overthinking again. Classic." },
  { at: 0.18, speaker: "rex", text: "Wait — what if I just go all-in?" },
  { at: 0.3, speaker: "nova", text: "Yes. Chaos. Always chaos." },
  { at: 0.45, speaker: "echo", text: "Rex. Breathe. The board's not going anywhere." },
  { at: 0.62, speaker: "aria", text: "Mate in two if he takes the pawn." },
  { at: 0.78, speaker: "rex", text: "He won't take the pawn. He's not that brave." },
  { at: 0.9, speaker: "sage", text: "He took the pawn." },
];

const PHASES = ["Opening", "Middlegame", "Endgame", "Reveal"] as const;

// ---------------------------------------------------------------------------
// Reduced-motion + viewport hooks
// ---------------------------------------------------------------------------

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);
  return isMobile;
}

// ---------------------------------------------------------------------------
// Top-level section
// ---------------------------------------------------------------------------

export default function GamesScene() {
  const containerRef = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  // Shared progress ref. Written once per rAF by the rect listener, read by
  // the R3F subtree inside useFrame. Never triggers React renders.
  const progressRef = useRef(0);

  // Discrete UI state derived from progress on threshold crossings only.
  const [revealedCount, setRevealedCount] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Rect-based scroll → progress, coalesced into one rAF. Lenis smooths the
  // wheel at the page root, so this reads buttery without per-event work.
  useEffect(() => {
    if (reduced || isMobile) {
      // Static frame: opening phase, full chat list.
      progressRef.current = 0;
      setRevealedCount(MESSAGES.length);
      setPhaseIndex(0);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    let raf = 0;
    let queued = false;

    const compute = () => {
      queued = false;
      const rect = el.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      // rect.top goes from 0 (pinned start) → -scrollable (pinned end).
      const p = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0;
      progressRef.current = p;

      // Discrete derivations — only setState when the integer actually moves.
      const rc = MESSAGES.reduce((n, m) => (p >= m.at ? n + 1 : n), 0);
      setRevealedCount((prev) => (prev === rc ? prev : rc));

      const pi = Math.min(
        PHASES.length - 1,
        Math.max(0, Math.floor(p * (PHASES.length - 0.001))),
      );
      setPhaseIndex((prev) => (prev === pi ? prev : pi));
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced, isMobile]);

  return (
    <section
      ref={containerRef}
      id="games"
      className="relative w-full md:h-[260vh] bg-[#0a0910]"
    >
      {/* Desktop / tablet: pinned cinematic */}
      <div className="hidden md:block sticky top-0 h-screen w-full overflow-hidden">
        <GatedCanvas
          className="absolute inset-0"
          camera={{ position: [0, 1.45, 6.8], fov: 42 }}
          fallback={<StageFallback />}
        >
          <GameStage progressRef={progressRef} reduced={reduced} />
        </GatedCanvas>
        <CanvasVignette />
        <SceneChrome phaseIndex={phaseIndex} />
        <ChatOverlay revealedCount={revealedCount} reduced={reduced} />
      </div>

      {/* Mobile fallback: static canvas + chat list */}
      <div className="md:hidden px-6 py-20 max-w-2xl mx-auto">
        <MobileHeader />
        <div className="mt-10 relative w-full h-[420px] rounded-2xl overflow-hidden border border-white/10 bg-[#0c0a14]">
          <GatedCanvas
            className="absolute inset-0"
            camera={{ position: [0, 1.45, 6.8], fov: 42 }}
            dprMax={1.5}
            fallback={<StageFallback />}
          >
            <GameStage progressRef={STATIC_HALF} reduced />
          </GatedCanvas>
          <CanvasVignette />
        </div>
        <div className="mt-8">
          <ChatListStatic />
        </div>
      </div>
    </section>
  );
}

// Frozen mid-game frame for the mobile/static canvas.
const STATIC_HALF = { current: 0.5 } as const;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// ---------------------------------------------------------------------------
// Loading shim
// ---------------------------------------------------------------------------

function StageFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 bg-[#0a0910]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-t-white animate-spin" />
        </div>
        <p className="text-neutral-500 font-[var(--font-label)] text-xs tracking-[0.25em] uppercase">
          Setting the board…
        </p>
      </div>
    </div>
  );
}

function CanvasVignette() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        background:
          "radial-gradient(ellipse 70% 80% at 50% 60%, transparent 40%, rgba(8,6,14,0.55) 80%, rgba(8,6,14,0.85) 100%)",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// R3F stage — characters, table, lights, camera
// ---------------------------------------------------------------------------

function damp(current: number, target: number, halfLife: number, dt: number): number {
  const k = 1 - Math.pow(0.5, dt / Math.max(halfLife, 0.001));
  return current + (target - current) * k;
}

interface GameStageProps {
  progressRef: { readonly current: number };
  reduced: boolean;
}

function GameStage({ progressRef, reduced }: GameStageProps) {
  // Camera tilt: gently look down onto the table.
  useFrame(({ camera }) => {
    camera.lookAt(0, 0.9, 0.6);
  });

  return (
    <>
      <BaseLights />
      <SpeakerSpot progressRef={progressRef} reduced={reduced} />

      {/* Floor + soft contact shadow under everyone. */}
      <ContactShadows
        position={[0, 0.01, 0.2]}
        opacity={0.55}
        scale={14}
        blur={2.6}
        far={3}
        resolution={512}
        color="#000000"
      />

      <Table />

      {SEATS.map((seat) => (
        <SeatedMember
          key={seat.id}
          seat={seat}
          progressRef={progressRef}
          reduced={reduced}
        />
      ))}
    </>
  );
}

function BaseLights() {
  return (
    <>
      {/* Cool fill so warm rims read */}
      <ambientLight intensity={0.45} color="#7d6fa0" />
      {/* Key — soft from above-front */}
      <directionalLight
        position={[3, 5, 4]}
        intensity={0.55}
        color="#fff3e0"
        castShadow={false}
      />
      {/* Amber rim from camera-right */}
      <pointLight
        position={[4.5, 2.4, 1.0]}
        intensity={1.4}
        distance={9}
        decay={2}
        color="#d49a7a"
      />
      {/* Violet rim from camera-left */}
      <pointLight
        position={[-4.5, 2.6, 0.6]}
        intensity={1.25}
        distance={9}
        decay={2}
        color="#9b87d8"
      />
      {/* Subtle under-table glow to anchor the focal point */}
      <pointLight
        position={[0, 0.7, 1.2]}
        intensity={0.7}
        distance={3.2}
        decay={2}
        color="#f3c98a"
      />
    </>
  );
}

// World-space position of whoever's "active" at this progress (spotlight aim).
//   Aria opening think → Sage → Rex → Sage → Nova → Echo → Rex → Sage.
function activeFocus(progress: number, out: THREE.Vector3): THREE.Vector3 {
  let id: CouncilMemberId | "aria-think";
  if (progress < 0.05) id = "aria-think";
  else if (progress < 0.2) id = "sage";
  else if (progress < 0.28) id = "rex";
  else if (progress < 0.35) id = "sage";
  else if (progress < 0.55) id = "nova";
  else if (progress < 0.7) id = "echo";
  else if (progress < 0.85) id = "rex";
  else id = "sage";

  if (id === "aria-think") return out.set(-1.0, 1.6, 1.2);
  const s = SEATS.find((x) => x.id === id);
  if (!s) return out.set(0, 1.6, 0);
  return out.set(s.position[0], 1.6, s.position[2]);
}

function SpeakerSpot({ progressRef, reduced }: GameStageProps) {
  const lightRef = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  const focus = useMemo(() => new THREE.Vector3(), []);
  const seeded = useRef(false);

  useFrame((_, dt) => {
    if (!lightRef.current) return;
    activeFocus(progressRef.current, focus);

    if (reduced && !seeded.current) {
      // Snap to a sensible static aim and stop drifting.
      target.position.copy(focus);
      seeded.current = true;
    } else if (!reduced) {
      // Camera/lighting half-life ≈ 0.22 for a stage-cue feel.
      target.position.x = damp(target.position.x, focus.x, 0.22, dt);
      target.position.y = damp(target.position.y, focus.y, 0.22, dt);
      target.position.z = damp(target.position.z, focus.z, 0.22, dt);
    }
    target.updateMatrixWorld();
    lightRef.current.target = target;
    lightRef.current.target.updateMatrixWorld();
  });

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={lightRef}
        position={[0, 5.2, 2.0]}
        angle={0.55}
        penumbra={0.85}
        intensity={1.6}
        distance={12}
        decay={2}
        color="#ffe2b3"
        castShadow={false}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Table — thin cylinder (radius 0.9, height 0.05, top at y≈0.55) + pedestal
// ---------------------------------------------------------------------------

function Table() {
  return (
    <group position={[0, 0.55, 1.2]}>
      {/* Tabletop */}
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.05, 48]} />
        <meshStandardMaterial
          color="#2a2230"
          roughness={0.55}
          metalness={0.12}
          emissive="#3a2a1a"
          emissiveIntensity={0.18}
        />
      </mesh>
      {/* Rim highlight */}
      <mesh position={[0, 0.027, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.86, 0.9, 64]} />
        <meshBasicMaterial color="#d49a7a" transparent opacity={0.35} />
      </mesh>
      {/* Pedestal stem */}
      <mesh position={[0, -0.32, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.6, 16]} />
        <meshStandardMaterial color="#1a1620" roughness={0.7} />
      </mesh>
      {/* Base */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.06, 24]} />
        <meshStandardMaterial color="#15121b" roughness={0.85} />
      </mesh>
      {/* Tiny "piece" on the board — a glow puck so the scene has focus */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.04, 24]} />
        <meshStandardMaterial
          color="#d8a3b8"
          emissive="#d8a3b8"
          emissiveIntensity={0.9}
          roughness={0.35}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Per-member animation logic driven by scroll progress
// ---------------------------------------------------------------------------

function animationFor(
  id: CouncilMemberId,
  progress: number,
): CouncilMemberAnimation {
  switch (id) {
    case "aria":
      // Thinking during the early game; brief seated talk around 0.6 when
      // she calls "mate in two".
      if (progress >= 0.58 && progress <= 0.72) return "talking-sitting";
      if (progress < 0.5) return "thinking";
      return "idle-sitting";
    case "rex":
      // Thinking later; brief seated talk around the chaos moment + bluff.
      if (progress >= 0.13 && progress <= 0.24) return "talking-sitting";
      if (progress >= 0.74 && progress <= 0.86) return "talking-sitting";
      if (progress >= 0.5) return "thinking";
      return "idle-sitting";
    case "sage":
      if (progress < 0.35) return "talking";
      if (progress >= 0.85) return "talking";
      return "listening";
    case "nova":
      if (progress >= 0.35 && progress < 0.7) return "talking";
      return "listening";
    case "echo":
      if (progress >= 0.7 && progress < 0.95) return "talking";
      return "listening";
  }
}

function SeatedMember({
  seat,
  progressRef,
  reduced,
}: {
  seat: SeatConfig;
  progressRef: { readonly current: number };
  reduced: boolean;
}) {
  // animationFor is a pure derivation of progress; reading it on each frame is
  // cheap, but swapping the React prop must stay discrete or CouncilMember3D
  // would re-render every frame. So we track the resolved label in state and
  // only flip it when it actually changes.
  const [animation, setAnimation] = useState<CouncilMemberAnimation>(() =>
    animationFor(seat.id, reduced ? 0 : progressRef.current),
  );
  const animRef = useRef(animation);
  animRef.current = animation;

  useFrame(() => {
    if (reduced) return;
    const next = animationFor(seat.id, progressRef.current);
    if (next !== animRef.current) {
      animRef.current = next;
      setAnimation(next);
    }
  });

  // Spectators gaze at the table; players gaze at each other.
  const lookAt = useMemo<THREE.Vector3>(() => {
    if (seat.role === "player-l") return new THREE.Vector3(1.0, 1.2, 1.2);
    if (seat.role === "player-r") return new THREE.Vector3(-1.0, 1.2, 1.2);
    return TABLE_FOCUS.clone();
  }, [seat.role]);

  return (
    <group position={seat.position} rotation={seat.rotation}>
      <CouncilMember3D
        modelPath={MODEL_PATHS[seat.id]}
        animation={animation}
        talkingVariant={seat.talkingVariant}
        scale={seat.scale}
        idleVariant={seat.idleVariant}
        headBobPhase={seat.headBobPhase}
        lookAt={lookAt}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Section chrome — header, phase strip
// ---------------------------------------------------------------------------

function SceneChrome({ phaseIndex }: { phaseIndex: number }) {
  return (
    <>
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 w-full px-6 max-w-3xl pointer-events-none">
        <SectionHeader
          align="center"
          className="drop-shadow-[0_2px_18px_rgba(0,0,0,0.7)]"
          kicker="Feature 02"
          title={
            <>
              They actually <span className="aurora-text">play.</span>
            </>
          }
          subtitle="Server-side game logic, real persona reactions between moves."
        />
      </div>

      <PhaseStrip phaseIndex={phaseIndex} />
    </>
  );
}

function PhaseStrip({ phaseIndex }: { phaseIndex: number }) {
  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
      {PHASES.map((label, i) => {
        const isActive = i <= phaseIndex;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="transition-all duration-500 rounded-full"
              style={{
                width: i === phaseIndex ? 30 : 8,
                height: 4,
                background: isActive
                  ? "linear-gradient(90deg, #d49a7a, #9b87d8)"
                  : "rgba(255,255,255,0.18)",
                boxShadow:
                  i === phaseIndex ? "0 0 12px rgba(212,154,122,0.55)" : "none",
              }}
            />
            <span
              className="text-[10px] tracking-[0.3em] uppercase font-[var(--font-label)]"
              style={{
                color: isActive
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(255,255,255,0.32)",
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat overlay — messages revealed as progress crosses each `at` threshold
// ---------------------------------------------------------------------------

function ChatOverlay({
  revealedCount,
  reduced,
}: {
  revealedCount: number;
  reduced: boolean;
}) {
  return (
    <div className="absolute top-28 right-6 lg:right-10 z-20 w-[320px] lg:w-[360px] pointer-events-none">
      <div className="glass-strong rounded-2xl border border-white/10 overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
        <ChatHeader />
        <div className="px-4 py-4 max-h-[60vh] overflow-hidden flex flex-col gap-2.5 bg-gradient-to-b from-white/[0.02] to-transparent">
          {MESSAGES.map((msg, i) => (
            <ChatMessageRow
              key={`${msg.at}-${msg.speaker}`}
              msg={msg}
              shown={i < revealedCount}
              reduced={reduced}
            />
          ))}
          <TypingIndicator
            shown={!reduced && revealedCount > 0 && revealedCount < MESSAGES.length}
          />
        </div>
      </div>
    </div>
  );
}

function ChatHeader() {
  return (
    <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 bg-white/[0.025]">
      <div className="flex -space-x-1.5">
        {(["aria", "rex", "sage"] as CouncilMemberId[]).map((id) => (
          <span
            key={id}
            className="w-5 h-5 rounded-full border border-[#0a0910]"
            style={{ background: councilColors[id].hex }}
          />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-[var(--font-label)] font-semibold text-white/85 tracking-wide">
          Council chat
        </p>
        <p className="text-[10px] tracking-[0.25em] uppercase text-white/45">
          Truth or Dare
        </p>
      </div>
      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
    </div>
  );
}

function ChatMessageRow({
  msg,
  shown,
  reduced,
}: {
  msg: ChatMessage;
  shown: boolean;
  reduced: boolean;
}) {
  const member = COUNCIL_MEMBERS.find((m) => m.id === msg.speaker);
  const c = councilColors[msg.speaker];
  const initial = member?.name.charAt(0) ?? "?";

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={
        reduced
          ? undefined
          : { opacity: shown ? 1 : 0, y: shown ? 0 : 10 }
      }
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-start gap-2.5"
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={{
          background: c.soft,
          color: c.hex,
          border: `1px solid ${c.hex}55`,
        }}
      >
        {initial}
      </span>
      <div
        className="flex-1 min-w-0 rounded-xl px-3 py-2 border-l-2"
        style={{ borderColor: c.hex, background: "rgba(255,255,255,0.025)" }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.18em] font-[var(--font-label)] font-semibold mb-0.5"
          style={{ color: c.hex }}
        >
          {member?.name ?? msg.speaker}
        </p>
        <p className="text-[12.5px] text-white/85 leading-snug">{msg.text}</p>
      </div>
    </motion.div>
  );
}

function TypingIndicator({ shown }: { shown: boolean }) {
  return (
    <motion.div
      animate={{ opacity: shown ? 0.55 : 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-1.5 pl-9 pt-1"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Mobile chrome
// ---------------------------------------------------------------------------

function MobileHeader() {
  return (
    <SectionHeader
      align="center"
      kicker="Feature 02"
      title={
        <>
          They actually <span className="aurora-text">play.</span>
        </>
      }
      subtitle="Server-side game logic, real persona reactions between moves."
    />
  );
}

function ChatListStatic() {
  return (
    <div className="glass-strong rounded-2xl border border-white/10 overflow-hidden">
      <ChatHeader />
      <div className="px-4 py-4 flex flex-col gap-2.5">
        {MESSAGES.map((msg) => {
          const member = COUNCIL_MEMBERS.find((m) => m.id === msg.speaker);
          const c = councilColors[msg.speaker];
          const initial = member?.name.charAt(0) ?? "?";
          return (
            <div key={`${msg.at}-${msg.speaker}`} className="flex items-start gap-2.5">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{
                  background: c.soft,
                  color: c.hex,
                  border: `1px solid ${c.hex}55`,
                }}
              >
                {initial}
              </span>
              <div
                className="flex-1 rounded-xl px-3 py-2 border-l-2"
                style={{ borderColor: c.hex, background: "rgba(255,255,255,0.025)" }}
              >
                <p
                  className="text-[10px] uppercase tracking-[0.18em] font-[var(--font-label)] font-semibold mb-0.5"
                  style={{ color: c.hex }}
                >
                  {member?.name ?? msg.speaker}
                </p>
                <p className="text-[12.5px] text-white/85 leading-snug">{msg.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
