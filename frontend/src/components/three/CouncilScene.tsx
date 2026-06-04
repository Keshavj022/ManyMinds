"use client";

import { ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import CouncilMember3D, { CouncilMemberAnimation } from "./CouncilMember3D";
import useCouncilAnimation from "./useCouncilAnimation";
import {
  COUNCIL_IDS,
  COUNCIL_POSITIONS_CIRCLE,
  MODEL_PATHS,
  type CouncilMemberId,
} from "./positions";
import { HeroWorld, type WorldId } from "./worlds/HeroWorlds";

/**
 * Hero scene — a 6-stage cinematic on a single canvas. Scene CONTENTS only:
 * the parent shell wraps this in <GatedCanvas>.
 *
 *   BOOT      time 0 → 2.4s        characters materialize one-by-one on a CRT
 *   WAVE      time 2.4 → 3.6s      all five wave (talking_2)
 *   BREAK     scroll 0.00 → 0.15   CRT shatters; mountain (top of shaft) reveals
 *   FALLING   scroll 0.15 → 0.65   THE FALL — down a vertical shaft of 7 worlds
 *   STANDING  scroll 0.65 → 0.80   land in circle, auto-conversation
 *   SITTING   scroll 0.80 → 1.00   sit at table, conversation continues
 *
 * The 7 worlds are stacked vertically in a STATIC shaft: mountain at y=108,
 * café at y=0. The members and camera descend the shaft (member y is pure
 * scroll-driven; camera damps toward a target that tracks member y), so the
 * static worlds rush UP past view — reading as "falling through worlds".
 *
 * Unified character lighting is mounted ONCE at scene root and never changes.
 * Three directional lights are parallel, so members are lit identically at
 * y=108 and y=0 regardless of altitude.
 */

export type HeroStage =
  | "boot"
  | "wave"
  | "break"
  | "falling"
  | "standing"
  | "sitting";

export interface FallContext {
  worldId: WorldId;
  fallProgress: number;
}

interface CouncilSceneProps {
  scrollProgress: number;
  onStageChange?: (
    stage: HeroStage,
    bootElapsed: number,
    fall?: FallContext,
  ) => void;
}

// === Stage timing =====================================================
const BOOT_DURATION = 2.4;
const WAVE_DURATION = 1.2;
const T_BREAK_END = 0.15;
const T_FALL_END = 0.65;
const T_STAND_END = 0.8;

// === Vertical shaft of stacked worlds ================================
const WORLD_SEQUENCE = [
  "mountain",
  "zen",
  "forest",
  "rooftop",
  "beach",
  "library",
  "cafe",
] as const satisfies readonly WorldId[];

const N_WORLDS = WORLD_SEQUENCE.length; // 7
const WORLD_GAP = 18; // world-space vertical distance between worlds
// Members hover here (airborne) through the whole fall and settle to 0 on
// landing — they stay framed near the camera while the WORLD STACK rushes up
// past them, so nothing teleports and every world is visible at member level.
const FALL_HOVER_Y = 1.4;

/** Local altitude of world `i` within the stack: mountain (i=0) highest,
 *  café (i=6) at local 0. The whole stack is then translated by worldGroupY. */
function worldYFor(i: number): number {
  return (N_WORLDS - 1 - i) * WORLD_GAP;
}

// === Hero-line layout ================================================
const HERO_LINE_SPACING = 1.45;
const HERO_LINE_Z = 3.4;
const HERO_BOOT_Y = 0.3;
const HERO_MEMBER_SCALE = 1.45;
const SITTING_RADIUS_SCALE = 2.55 / 2.8;

const BOOT_STAGGER = 0.4;
const MATERIALIZE_DUR = 0.6;

const HL_MAIN = 0.28;
const HL_CAM = 0.32;
const HL_FALL_XZ = 0.5; // members spread during the fall, gather as they land

const HERO_LINE_POSITIONS: Record<CouncilMemberId, [number, number, number]> = (() => {
  const order: CouncilMemberId[] = ["aria", "rex", "sage", "nova", "echo"];
  const out = {} as Record<CouncilMemberId, [number, number, number]>;
  order.forEach((id, i) => {
    const x = (i - (order.length - 1) / 2) * HERO_LINE_SPACING;
    out[id] = [x, 0, HERO_LINE_Z];
  });
  return out;
})();

function damp(current: number, target: number, halfLife: number, dt: number): number {
  const k = 1 - Math.pow(0.5, dt / Math.max(halfLife, 0.001));
  return current + (target - current) * k;
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// =====================================================================
// CRT screen plane — procedural scan-line backdrop. Visible during
// BOOT/WAVE, fades + recedes during BREAK.
// =====================================================================

function useScreenTexture(): THREE.Texture {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.Texture();

    const grad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size * 0.7);
    grad.addColorStop(0, "rgba(10, 25, 35, 1)");
    grad.addColorStop(1, "rgba(2, 6, 12, 1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(80, 220, 255, 0.18)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= size; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(120, 240, 255, 0.06)";
    for (let y = 0; y < size; y += 3) ctx.fillRect(0, y, size, 1);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2.5);
    return tex;
  }, []);
}

function ScreenBackdrop({
  bootProgress,
  breakProgress,
}: {
  bootProgress: number;
  breakProgress: number;
}) {
  const tex = useScreenTexture();
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const offsetRef = useRef(0);

  useFrame((_, dt) => {
    if (matRef.current) {
      const bootIn = Math.min(1, bootProgress * 1.5);
      const breakOut = 1 - Math.min(1, breakProgress * 1.1);
      const targetOpacity = bootIn * breakOut * 0.95;
      matRef.current.opacity = damp(matRef.current.opacity, targetOpacity, 0.18, dt);
    }
    if (meshRef.current) {
      const z = HERO_LINE_Z + 0.4 - breakProgress * 4;
      meshRef.current.position.z = damp(meshRef.current.position.z, z, 0.22, dt);
      const scaleY = 1 + breakProgress * 0.4;
      meshRef.current.scale.y = damp(meshRef.current.scale.y, scaleY, 0.22, dt);
    }
    offsetRef.current += dt * 0.06;
    tex.offset.y = offsetRef.current;
  });

  return (
    <mesh ref={meshRef} position={[0, 1.8, HERO_LINE_Z + 0.4]} renderOrder={2}>
      <planeGeometry args={[14, 6.4]} />
      <meshBasicMaterial
        ref={matRef}
        map={tex}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// =====================================================================
// Hologram light — cyan PointLight bathing each character during BOOT/WAVE.
// =====================================================================

function HologramLight({
  position,
  intensity,
}: {
  position: [number, number, number];
  intensity: number;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame((_, dt) => {
    if (!lightRef.current) return;
    lightRef.current.intensity = damp(lightRef.current.intensity, intensity, 0.22, dt);
  });
  return (
    <pointLight
      ref={lightRef}
      position={[position[0], 1.8, position[2]]}
      color="#7fe9ff"
      intensity={0}
      distance={2.4}
      decay={2}
    />
  );
}

// =====================================================================
// World shaft — all 7 worlds pre-mounted at fixed altitudes; opacity is
// driven by the fall band so only the world near the members shows.
// =====================================================================

interface WorldShaftProps {
  /** bandPos 0..(N-1): which world is currently at member level. */
  bandPos: number;
  /** Vertical translation of the whole stack — damped each frame so the worlds
   *  glide up past the members rather than stepping. */
  groupY: number;
  /** "mountain"/"cafe" force a solid single world (pre/post fall); "band"
   *  crossfades neighbours during the fall. */
  mode: "mountain" | "band" | "cafe";
}

function WorldShaft({ bandPos, groupY, mode }: WorldShaftProps) {
  const opacities = useMemo(() => new Array(N_WORLDS).fill(0) as number[], []);
  const groupRef = useRef<THREE.Group>(null);

  if (mode === "mountain") {
    for (let i = 0; i < N_WORLDS; i++) opacities[i] = i === 0 ? 1 : 0;
  } else if (mode === "cafe") {
    for (let i = 0; i < N_WORLDS; i++) opacities[i] = i === N_WORLDS - 1 ? 1 : 0;
  } else {
    // Only the band near the members shows; neighbours blend across the gap.
    for (let i = 0; i < N_WORLDS; i++) {
      opacities[i] = Math.max(0, Math.min(1, 1 - Math.abs(bandPos - i) * 1.25));
    }
  }

  // Damp the stack toward groupY so the rush-up is buttery, not stepped.
  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.position.y = damp(groupRef.current.position.y, groupY, 0.3, dt);
    }
  });

  return (
    <group ref={groupRef}>
      {WORLD_SEQUENCE.map((id, i) => (
        <group key={id} position={[0, worldYFor(i), 0]}>
          <HeroWorld id={id} opacity={opacities[i]} />
        </group>
      ))}
    </group>
  );
}

// =====================================================================
// Speed lines — faint additive streaks during the fall to sell velocity.
// Cheap: 9 elongated planes, drifting downward, opacity scrubbed.
// =====================================================================

const SPEED_LINE_LAYOUT = Array.from({ length: 9 }, (_, i) => {
  const x = ((i * 73) % 100) / 100 - 0.5; // deterministic -0.5..0.5
  const z = -2 + ((i * 53) % 60) / 100; // -2 .. -1.4
  return { x: x * 7, z, h: 2.2 + ((i * 29) % 40) / 30, phase: (i * 0.37) % 1 };
});

function SpeedLines({ memberY, intensity }: { memberY: number; intensity: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const driftRef = useRef(0);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;
    g.position.y = memberY;
    g.visible = intensity > 0.01;
    if (!g.visible) return;
    driftRef.current = (driftRef.current + dt * 6) % 6;
    g.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const layout = SPEED_LINE_LAYOUT[i];
      // Streaks loop within a 6-unit band around the member.
      const yy = 3 - ((driftRef.current + layout.phase * 6) % 6);
      mesh.position.y = yy;
      mat.opacity = intensity * (0.35 + 0.3 * Math.sin((layout.phase + driftRef.current) * 3));
    });
  });

  return (
    <group ref={groupRef}>
      {SPEED_LINE_LAYOUT.map((l, i) => (
        <mesh key={i} position={[l.x, 0, l.z]}>
          <planeGeometry args={[0.05, l.h]} />
          <meshBasicMaterial
            color="#cfe6ff"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// =====================================================================
// Main scene
// =====================================================================

export default function CouncilScene({
  scrollProgress,
  onStageChange,
}: CouncilSceneProps) {
  const { camera, size } = useThree();

  const reduced = useMemo(prefersReducedMotion, []);

  // BOOT/WAVE elapsed — clock-driven from inside the canvas. When reduced
  // motion is on, the intro auto-completes (no scrubbed cinematic).
  const [bootElapsed, setBootElapsed] = useState(reduced ? 99 : 0);
  const bootTimeRef = useRef(reduced ? 99 : 0);

  // With reduced motion, pin to the seated cafe end-state and skip the scrub.
  const effProgress = reduced ? 1 : scrollProgress;

  // Resolve the effective stage.
  const stage: HeroStage = useMemo(() => {
    if (reduced) return "sitting";
    if (bootElapsed < BOOT_DURATION) return "boot";
    if (bootElapsed < BOOT_DURATION + WAVE_DURATION && scrollProgress < 0.005) return "wave";
    if (scrollProgress < T_BREAK_END) return "break";
    if (scrollProgress < T_FALL_END) return "falling";
    if (scrollProgress < T_STAND_END) return "standing";
    return "sitting";
  }, [reduced, bootElapsed, scrollProgress]);

  // Fall progress — eased 0..1 across the whole fall window.
  const fallRaw = Math.max(
    0,
    Math.min(1, (effProgress - T_BREAK_END) / (T_FALL_END - T_BREAK_END)),
  );
  const fallEase = smoothstep(fallRaw);
  const bandPos = fallEase * (N_WORLDS - 1); // 0..6 — which world is at member level

  // Members hover near the camera, settling to the floor only in the last 28%.
  const settle = smoothstep(Math.max(0, (fallEase - 0.72) / 0.28));
  const memberFallY = lerp(FALL_HOVER_Y, 0, settle);

  // World-stack offset brings world `bandPos` down to member level (y≈0).
  // fallEase saturates to 0 before the fall (→ mountain at members, behind the
  // CRT) and 1 after (→ café at members, for the landing), so this single
  // expression is correct in every stage. Travels -(N-1)*GAP → 0: the worlds
  // rush UPWARD past the hovering members — that is the "falling through" feel.
  const worldGroupY = (bandPos - (N_WORLDS - 1)) * WORLD_GAP;

  // Which world is "primary" for the HTML overlay.
  const primaryWorldIndex = useMemo(() => {
    if (stage === "boot" || stage === "wave" || stage === "break") return 0;
    if (stage === "standing" || stage === "sitting") return N_WORLDS - 1;
    return Math.min(N_WORLDS - 1, Math.max(0, Math.round(bandPos)));
  }, [stage, bandPos]);

  // Bubble stage + fall context up to the HTML shell.
  useEffect(() => {
    onStageChange?.(stage, bootElapsed, {
      worldId: WORLD_SEQUENCE[primaryWorldIndex],
      fallProgress: fallEase,
    });
  }, [stage, bootElapsed, primaryWorldIndex, fallEase, onStageChange]);

  // Aspect-aware z multiplier for portrait viewports.
  const aspect = size.width / Math.max(size.height, 1);
  const portraitBoost = aspect < 0.8 ? 1.55 : aspect < 1.1 ? 1.2 : 1.0;

  // === Conversation hook drives standing/sitting animations ============
  const posture = stage === "sitting" ? "sitting" : "standing";
  const wantConversation = stage === "standing" || stage === "sitting";
  const isWave = stage === "wave";

  const { states, microOffsets, currentSpeakerId } = useCouncilAnimation({
    falling: stage === "falling",
    posture,
    conversation: wantConversation,
    speakerRotateSec: stage === "sitting" ? 9 : 7,
    reactionChance: 0.55,
  });

  const speakerLookTarget = useMemo<THREE.Vector3 | null>(() => {
    if (!currentSpeakerId) return null;
    const p = COUNCIL_POSITIONS_CIRCLE[currentSpeakerId].position;
    return new THREE.Vector3(p[0], 1.5, p[2]);
  }, [currentSpeakerId]);

  // Progress ratios for screen + hologram fades.
  const breakProgress = Math.max(0, Math.min(1, effProgress / T_BREAK_END));
  const bootProgress = Math.max(0, Math.min(1, bootElapsed / (BOOT_DURATION + WAVE_DURATION)));

  // World shaft display mode.
  const shaftMode: WorldShaftProps["mode"] =
    stage === "standing" || stage === "sitting"
      ? "cafe"
      : stage === "falling"
        ? "band"
        : "mountain";

  // Faint speed-line intensity peaks mid-fall.
  const speedIntensity = reduced ? 0 : fallEase * (1 - fallEase) * 0.5;

  // Advance boot timer + camera path. Camera tracks the fall down the shaft.
  useFrame((state, dt) => {
    if (!reduced) {
      bootTimeRef.current += dt;
      if (bootElapsed < BOOT_DURATION + WAVE_DURATION + 0.2) {
        setBootElapsed(bootTimeRef.current);
      }
    }

    let tx = 0;
    let ty = 1.55;
    let tz = 9.5;
    let lx = 0;
    let ly = 1.1;
    let lz = HERO_LINE_Z;
    let rollZ = 0;

    if (stage === "boot" || stage === "wave" || stage === "break") {
      tx = 0;
      ty = 1.55;
      tz = 9.5;
      lx = 0;
      ly = 1.1;
      lz = HERO_LINE_Z;
    } else if (stage === "falling") {
      // The camera stays gently framed on the hovering members; the WORLD
      // STACK does the travelling (rushing up past them), so the camera needs
      // no big chase — just a slight push-in + faint roll for energy.
      tx = 0;
      ty = memberFallY + 2.0;
      tz = lerp(9.5, 7.8, fallEase);
      lx = 0;
      ly = memberFallY - 0.2;
      lz = 0;
      rollZ = Math.sin(state.clock.elapsedTime * 0.5) * 0.015;
    } else if (stage === "standing") {
      tx = 0;
      ty = 2.2;
      tz = 7.6;
      lx = 0;
      ly = 1.0;
      lz = 0;
    } else {
      // sitting
      tx = 0;
      ty = 1.35;
      tz = 5.8;
      lx = 0;
      ly = 0.75;
      lz = 0;
    }
    tz *= portraitBoost;

    camera.position.x = damp(camera.position.x, tx, HL_CAM, dt);
    camera.position.y = damp(camera.position.y, ty, HL_CAM, dt);
    camera.position.z = damp(camera.position.z, tz, HL_CAM, dt);
    camera.lookAt(lx, ly, lz);
    // Apply faint roll AFTER lookAt (lookAt resets rotation each frame).
    camera.rotation.z += rollZ;
  });

  return (
    <>
      {/* === Unified character lighting — mounted ONCE, never changes ==== */}
      <ambientLight color="#5a6b86" intensity={0.45} />
      <directionalLight
        color="#fff2d8"
        intensity={1.4}
        position={[5, 8, 6]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-2}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.0005}
      />
      <directionalLight color="#8aaee0" intensity={0.5} position={[-4, 4, -6]} />

      {/* === Ground plane + soft contact shadow. Dropped 5cm below y=0 so it
              never z-fights the active world's own ground plane. ============ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.95} metalness={0.0} />
      </mesh>
      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.55}
        scale={20}
        blur={2.4}
        far={6}
        resolution={512}
        color="#000000"
      />

      {/* === Vertical shaft of stacked worlds (the stack rushes up) ===== */}
      <WorldShaft bandPos={bandPos} groupY={worldGroupY} mode={shaftMode} />

      {/* === Speed-line streaks during the fall ========================= */}
      {!reduced && <SpeedLines memberY={memberFallY} intensity={speedIntensity} />}

      {/* === CRT screen plane (boot/wave/break only) ==================== */}
      {!reduced && <ScreenBackdrop bootProgress={bootProgress} breakProgress={breakProgress} />}

      {/* === Council members ============================================ */}
      {COUNCIL_IDS.map((id, i) => {
        const memberBootStart = i * BOOT_STAGGER;
        const memberBootT = Math.max(0, bootElapsed - memberBootStart);
        const materializeP = Math.min(1, memberBootT / MATERIALIZE_DUR);
        const holoIntensity =
          isWave || stage === "boot"
            ? 1.6 * materializeP
            : 1.6 * (1 - breakProgress);

        return (
          <group key={id}>
            {!reduced && (
              <HologramLight
                position={[HERO_LINE_POSITIONS[id][0], 0, HERO_LINE_POSITIONS[id][2]]}
                intensity={holoIntensity}
              />
            )}
            <AnimatedMember
              memberId={id}
              index={i}
              stage={stage}
              linePos={HERO_LINE_POSITIONS[id]}
              circlePos={COUNCIL_POSITIONS_CIRCLE[id].position}
              circleRotY={COUNCIL_POSITIONS_CIRCLE[id].rotationY}
              animation={
                stage === "wave"
                  ? "talking"
                  : stage === "boot"
                    ? "idle"
                    : states[id].animation
              }
              talkingVariant={stage === "wave" ? 2 : states[id].talkingVariant}
              idleVariant={microOffsets[id].idleVariant}
              headBobPhase={microOffsets[id].headBobPhase}
              materializeP={materializeP}
              bootY={stage === "boot" || stage === "wave" ? HERO_BOOT_Y : 0}
              breakProgress={breakProgress}
              memberY={memberFallY}
              fallEase={fallEase}
              lookAt={currentSpeakerId && currentSpeakerId !== id ? speakerLookTarget : null}
              reduced={reduced}
            />
          </group>
        );
      })}
    </>
  );
}

// =====================================================================
// Per-character group — handles position/rotation across all stages.
// =====================================================================

interface AnimatedMemberProps {
  memberId: CouncilMemberId;
  index: number;
  stage: HeroStage;
  linePos: [number, number, number];
  circlePos: [number, number, number];
  circleRotY: number;
  animation: CouncilMemberAnimation;
  talkingVariant: 0 | 1 | 2;
  idleVariant: number;
  headBobPhase: number;
  materializeP: number;
  bootY: number;
  breakProgress: number;
  /** Pure scroll-driven member altitude during the fall (108 → 0). */
  memberY: number;
  /** Eased 0..1 fall progress. */
  fallEase: number;
  lookAt: THREE.Vector3 | null;
  reduced: boolean;
}

function AnimatedMember({
  memberId,
  index,
  stage,
  linePos,
  circlePos,
  circleRotY,
  animation,
  talkingVariant,
  idleVariant,
  headBobPhase,
  materializeP,
  bootY,
  breakProgress,
  memberY,
  fallEase,
  lookAt,
  reduced,
}: AnimatedMemberProps) {
  const groupRef = useRef<THREE.Group>(null);

  const sittingPos = useMemo<[number, number, number]>(
    () => [circlePos[0] * SITTING_RADIUS_SCALE, 0, circlePos[2] * SITTING_RADIUS_SCALE],
    [circlePos],
  );

  // Small per-member x stagger so they don't overlap mid-shaft.
  const xStagger = (index - 2) * 0.28;

  const matScale = 0.85 + 0.15 * materializeP;
  const finalScale = HERO_MEMBER_SCALE * matScale;

  // Reduced-motion: snap the group to the sitting end-state once on mount.
  useEffect(() => {
    if (!reduced) return;
    const g = groupRef.current;
    if (!g) return;
    g.position.set(sittingPos[0], 0, sittingPos[2]);
    g.rotation.set(0, circleRotY, 0);
  }, [reduced, sittingPos, circleRotY]);

  useFrame((state, dt) => {
    const group = groupRef.current;
    if (!group || reduced) return;

    if (stage === "boot" || stage === "wave" || stage === "break") {
      const targetX = linePos[0];
      // As the CRT shatters they lift toward the fall hover height — reads as
      // being pulled out of the screen, and means the fall starts seamlessly.
      const targetY = lerp(bootY, FALL_HOVER_Y, breakProgress);
      const targetZ = linePos[2] - breakProgress * 0.6;
      group.position.x = damp(group.position.x, targetX, HL_MAIN, dt);
      group.position.y = damp(group.position.y, targetY, HL_MAIN, dt);
      group.position.z = damp(group.position.z, targetZ, HL_MAIN, dt);
      group.rotation.x = damp(group.rotation.x, 0, HL_MAIN, dt);
      group.rotation.y = damp(group.rotation.y, 0, HL_MAIN, dt);
      group.rotation.z = damp(group.rotation.z, 0, HL_MAIN, dt);
      return;
    }

    if (stage === "falling") {
      // y is pure scroll-driven (no damp) → deterministic descent.
      group.position.y = memberY;

      // x/z damp slowly toward the circle (half-life ~0.5) so members spread
      // during the fall and only converge near the landing. A tiny x stagger
      // keeps them from overlapping mid-shaft.
      group.position.x = damp(group.position.x, circlePos[0] + xStagger * (1 - fallEase), HL_FALL_XZ, dt);
      group.position.z = damp(group.position.z, circlePos[2], HL_FALL_XZ, dt);

      // Shallow continuous tumble that resolves as they near the floor.
      const t = state.clock.elapsedTime;
      group.rotation.x = 0.25 * (1 - fallEase) + Math.sin(t * 1.3 + index) * 0.04 * (1 - fallEase);
      group.rotation.z = (index - 2) * 0.08 * (1 - fallEase);
      group.rotation.y = damp(group.rotation.y, circleRotY, HL_MAIN, dt);
      return;
    }

    if (stage === "standing") {
      group.position.x = damp(group.position.x, circlePos[0], HL_MAIN, dt);
      group.position.y = damp(group.position.y, 0, HL_MAIN, dt);
      group.position.z = damp(group.position.z, circlePos[2], HL_MAIN, dt);
      group.rotation.x = damp(group.rotation.x, 0, HL_MAIN, dt);
      group.rotation.y = damp(group.rotation.y, circleRotY, HL_MAIN, dt);
      group.rotation.z = damp(group.rotation.z, 0, HL_MAIN, dt);
      return;
    }

    // sitting
    group.position.x = damp(group.position.x, sittingPos[0], HL_MAIN, dt);
    group.position.y = damp(group.position.y, 0, HL_MAIN, dt);
    group.position.z = damp(group.position.z, sittingPos[2], HL_MAIN, dt);
    group.rotation.x = damp(group.rotation.x, 0, HL_MAIN, dt);
    group.rotation.y = damp(group.rotation.y, circleRotY, HL_MAIN, dt);
    group.rotation.z = damp(group.rotation.z, 0, HL_MAIN, dt);
  });

  const visible = reduced || materializeP > 0.001 || stage !== "boot";

  return (
    <group
      ref={groupRef}
      position={
        reduced
          ? [sittingPos[0], 0, sittingPos[2]]
          : [linePos[0], bootY, linePos[2]]
      }
      rotation={reduced ? [0, circleRotY, 0] : [0, 0, 0]}
      visible={visible}
    >
      <CouncilMember3D
        modelPath={MODEL_PATHS[memberId]}
        animation={animation}
        talkingVariant={talkingVariant}
        scale={finalScale}
        idleVariant={idleVariant}
        headBobPhase={headBobPhase}
        lookAt={lookAt}
      />
    </group>
  );
}
