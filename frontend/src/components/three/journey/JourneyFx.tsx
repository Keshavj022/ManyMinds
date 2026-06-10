"use client";

/**
 * JourneyFx — the per-frame effect layers of the Journey.
 *
 * The scene owns one mutable FxBus object and writes plain numbers/vectors
 * into it every frame; each effect reads the bus in its own useFrame and
 * mutates only refs. Nothing here ever calls setState.
 */

import * as React from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "../positions";
import {
  COUNCIL_ARRANGEMENT,
  CYBER_Y,
  DEBATE_ARRANGEMENT,
  LINE_ARRANGEMENT,
  MEMBER_ORDER,
  ZONE_Y,
} from "./timeline";
import { clamp01, dampNum, easeOutCubic, seededRand } from "./journeyMath";

// ---------------------------------------------------------------------------
// FxBus — the scene→effects per-frame data channel (refs, not props)
// ---------------------------------------------------------------------------

export interface FxBus {
  /** Smoothed fall progress 0..1 (0 before the fall, 1 from landing on). */
  fallEase: number;
  /** Breakout shatter progress 0..1. */
  shatterP: number;
  /** Camera altitude anchor during the fall. */
  camY: number;
  /** Live (post-damp) camera world position. */
  camPos: THREE.Vector3;
  /** Per-member materialize progress 0..1 (boot stagger). */
  matP: number[];
  /** Clock time the landing dust burst fired; -1 = not fired. */
  dustStartT: number;
  /** Damped opacity of the glide afterimage streaks. */
  glideOpacity: number;
  /** Live member world positions (written by the scene each frame). */
  memberPos: THREE.Vector3[];
}

export function createFxBus(): FxBus {
  return {
    fallEase: 0,
    shatterP: 0,
    camY: CYBER_Y,
    camPos: new THREE.Vector3(0, CYBER_Y + 1.6, 9.5),
    matP: MEMBER_ORDER.map(() => 0),
    dustStartT: -1,
    glideOpacity: 0,
    memberPos: MEMBER_ORDER.map(
      (id) => new THREE.Vector3(LINE_ARRANGEMENT[id].x, CYBER_Y, LINE_ARRANGEMENT[id].z),
    ),
  };
}

// ---------------------------------------------------------------------------
// Tower shaft — 4 faint emissive guide lines + drifting motes between floors.
// The connective tissue that sells "one continuous tower" during the descents
// and the dollhouse finale. 5 draw calls total (4 lines + 1 points cloud).
// ---------------------------------------------------------------------------

const SHAFT_TOP = 1;
const SHAFT_BOTTOM = -45;
const SHAFT_CORNERS = [
  { x: 7.5, z: 5.5 },
  { x: -7.5, z: 5.5 },
  { x: -7.5, z: -5.5 },
  { x: 7.5, z: -5.5 },
] as const;
const N_MOTES = 8;

export function TowerShaft() {
  const points = React.useRef<THREE.Points>(null);
  const data = React.useMemo(() => {
    const positions = new Float32Array(N_MOTES * 3);
    const speeds = new Float32Array(N_MOTES);
    for (let i = 0; i < N_MOTES; i++) {
      positions[i * 3] = (seededRand(i * 11 + 2) - 0.5) * 12;
      positions[i * 3 + 1] = SHAFT_BOTTOM + seededRand(i * 11 + 5) * (SHAFT_TOP - SHAFT_BOTTOM);
      positions[i * 3 + 2] = (seededRand(i * 11 + 7) - 0.5) * 9;
      speeds[i] = 0.25 + seededRand(i * 11 + 13) * 0.35;
    }
    return { positions, speeds };
  }, []);

  useFrame((state, delta) => {
    const pts = points.current;
    if (!pts) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < N_MOTES; i++) {
      let y = arr[i * 3 + 1] + data.speeds[i] * dt;
      if (y > SHAFT_TOP) y = SHAFT_BOTTOM;
      arr[i * 3 + 1] = y;
      arr[i * 3] += Math.sin(t * 0.4 + i * 2.3) * 0.12 * dt; // lazy sway
    }
    attr.needsUpdate = true;
  });

  return (
    <group>
      {SHAFT_CORNERS.map((c, i) => (
        <mesh key={i} position={[c.x, (SHAFT_TOP + SHAFT_BOTTOM) / 2, c.z]}>
          <boxGeometry args={[0.06, SHAFT_TOP - SHAFT_BOTTOM, 0.06]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? "#9b87d8" : "#36e0ff"}
            transparent
            opacity={0.16}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      <points ref={points} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#bcaee8"
          size={0.14}
          sizeAttenuation
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Fall — speed streaks parented near the camera
// ---------------------------------------------------------------------------

const N_STREAKS = 10;

export function SpeedStreaks({ fx }: { fx: FxBus }) {
  const group = React.useRef<THREE.Group>(null);
  const seeds = React.useMemo(
    () =>
      Array.from({ length: N_STREAKS }, (_, i) => ({
        x: (seededRand(i) - 0.5) * 9,
        z: -3.5 - seededRand(i + 31) * 6,
        speed: 10 + seededRand(i + 67) * 8,
        phase: seededRand(i + 97) * 14,
      })),
    [],
  );

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    // Bell curve over the fall: invisible at both ends, 0.6 at terminal velocity.
    const op = clamp01(4 * fx.fallEase * (1 - fx.fallEase)) * 0.6;
    g.visible = op > 0.01;
    if (!g.visible) return;
    g.position.copy(fx.camPos);
    const t = state.clock.elapsedTime;
    for (let i = 0; i < g.children.length; i++) {
      const mesh = g.children[i] as THREE.Mesh;
      const s = seeds[i];
      // The world rushes UP past the falling council — streaks scroll upward fast.
      mesh.position.y = ((t * s.speed + s.phase) % 14) - 7;
      (mesh.material as THREE.MeshBasicMaterial).opacity = op;
    }
  });

  return (
    <group ref={group} visible={false}>
      {seeds.map((s, i) => (
        <mesh key={i} position={[s.x, 0, s.z]}>
          <planeGeometry args={[0.05, 5.5]} />
          <meshBasicMaterial
            color="#cfe6ff"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Fall — wind particles streaming upward around the members
// ---------------------------------------------------------------------------

const N_WIND = 60;

export function WindParticles({ fx }: { fx: FxBus }) {
  const points = React.useRef<THREE.Points>(null);
  const mat = React.useRef<THREE.PointsMaterial>(null);
  const data = React.useMemo(() => {
    const positions = new Float32Array(N_WIND * 3);
    const speeds = new Float32Array(N_WIND);
    for (let i = 0; i < N_WIND; i++) {
      positions[i * 3] = (seededRand(i * 3 + 1) - 0.5) * 8;
      positions[i * 3 + 1] = (seededRand(i * 3 + 2) - 0.5) * 12;
      positions[i * 3 + 2] = (seededRand(i * 3 + 3) - 0.5) * 8;
      speeds[i] = 9 + seededRand(i * 7 + 5) * 9;
    }
    return { positions, speeds };
  }, []);

  useFrame((_, delta) => {
    const p = points.current;
    if (!p) return;
    const bell = clamp01(4 * fx.fallEase * (1 - fx.fallEase));
    p.visible = bell > 0.02;
    if (mat.current) mat.current.opacity = bell * 0.55;
    if (!p.visible) return;
    p.position.set(0, fx.camY - 1, 0);
    const dt = Math.min(delta, 0.05);
    const attr = p.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < N_WIND; i++) {
      let y = arr[i * 3 + 1] + data.speeds[i] * dt;
      if (y > 6) y -= 12;
      arr[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} visible={false} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        color="#cfe6ff"
        size={0.07}
        sizeAttenuation
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Landing — one-shot radial dust burst at each member's touchdown spot
// ---------------------------------------------------------------------------

const DUST_PER_MEMBER = 24;
const DUST_COUNT = MEMBER_ORDER.length * DUST_PER_MEMBER;
const DUST_LIFETIME = 1.1;

export function DustBursts({ fx }: { fx: FxBus }) {
  const mesh = React.useRef<THREE.InstancedMesh>(null);
  const mat = React.useRef<THREE.MeshBasicMaterial>(null);
  const dummy = React.useMemo(() => new THREE.Object3D(), []);
  const seeds = React.useMemo(
    () =>
      Array.from({ length: DUST_COUNT }, (_, i) => ({
        angle: seededRand(i * 5 + 3) * Math.PI * 2,
        radius: seededRand(i * 5 + 11) * 0.6,
        size: 0.6 + seededRand(i * 5 + 17) * 0.9,
        lift: 0.08 + seededRand(i * 5 + 23) * 0.3,
      })),
    [],
  );

  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    if (fx.dustStartT < 0) {
      m.visible = false;
      return;
    }
    const e = state.clock.elapsedTime - fx.dustStartT;
    if (e < 0 || e > DUST_LIFETIME) {
      m.visible = false;
      return;
    }
    m.visible = true;
    const k = e / DUST_LIFETIME;
    const expand = easeOutCubic(k);
    if (mat.current) mat.current.opacity = (1 - k) * 0.5;
    let idx = 0;
    for (let mi = 0; mi < MEMBER_ORDER.length; mi++) {
      const pose = COUNCIL_ARRANGEMENT[MEMBER_ORDER[mi]];
      for (let j = 0; j < DUST_PER_MEMBER; j++) {
        const s = seeds[idx];
        const r = 0.25 + expand * (0.8 + s.radius);
        dummy.position.set(
          pose.x + Math.cos(s.angle) * r,
          0.05 + Math.sin(Math.min(1, k) * Math.PI) * s.lift,
          pose.z + Math.sin(s.angle) * r,
        );
        dummy.rotation.set(-Math.PI / 2, 0, s.angle);
        const sc = s.size * (0.6 + 0.6 * (1 - k));
        dummy.scale.setScalar(sc);
        dummy.updateMatrix();
        m.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, DUST_COUNT]}
      visible={false}
      frustumCulled={false}
    >
      <planeGeometry args={[0.16, 0.16]} />
      <meshBasicMaterial
        ref={mat}
        color="#9a948e"
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------------------
// Descent — additive afterimage streak hanging above each falling member
// ---------------------------------------------------------------------------

export function GlideStreaks({ fx }: { fx: FxBus }) {
  const group = React.useRef<THREE.Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const op = fx.glideOpacity;
    g.visible = op > 0.02;
    if (!g.visible) return;
    for (let i = 0; i < g.children.length; i++) {
      const mesh = g.children[i] as THREE.Mesh;
      const p = fx.memberPos[i];
      // The members drop straight down — the afterimage hangs where they
      // just were: a thin vertical ribbon trailing UPWARD above the head.
      mesh.position.set(p.x, p.y + 2.8, p.z);
      (mesh.material as THREE.MeshBasicMaterial).opacity = op;
    }
  });

  return (
    <group ref={group} visible={false}>
      {MEMBER_ORDER.map((id) => (
        <mesh key={id}>
          <planeGeometry args={[0.9, 2.6]} />
          <meshBasicMaterial
            color={councilColors[id].hex}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Boot — cyan materialize glow hovering at each member's chest
// ---------------------------------------------------------------------------

export function MaterializeLights({ fx }: { fx: FxBus }) {
  const lights = React.useRef<Array<THREE.PointLight | null>>(MEMBER_ORDER.map(() => null));

  useFrame(() => {
    for (let i = 0; i < MEMBER_ORDER.length; i++) {
      const l = lights.current[i];
      if (!l) continue;
      // Bright while materializing, gone as the platform shatters.
      l.intensity = 1.6 * fx.matP[i] * (1 - fx.shatterP);
      l.visible = l.intensity > 0.02;
    }
  });

  return (
    <group>
      {MEMBER_ORDER.map((id, i) => (
        <pointLight
          key={id}
          ref={(l) => {
            lights.current[i] = l;
          }}
          position={[LINE_ARRANGEMENT[id].x, CYBER_Y + 1.45, LINE_ARRANGEMENT[id].z]}
          color="#7fe9ff"
          intensity={0}
          distance={2.4}
        />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Debate — per-member accent spotlight, hot on the current speaker
// ---------------------------------------------------------------------------

export function DebateSpots({ speaker }: { speaker: CouncilMemberId | null }) {
  const lights = React.useRef<Array<THREE.SpotLight | null>>(MEMBER_ORDER.map(() => null));
  const targets = React.useMemo(
    () =>
      MEMBER_ORDER.map((id) => {
        const o = new THREE.Object3D();
        const pose = DEBATE_ARRANGEMENT[id];
        o.position.set(pose.x, ZONE_Y.debate + 1.0, pose.z);
        return o;
      }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < MEMBER_ORDER.length; i++) {
      const l = lights.current[i];
      if (!l) continue;
      const id = MEMBER_ORDER[i];
      const target = speaker === null ? 0 : speaker === id ? 2.4 : 0.25;
      l.intensity = dampNum(l.intensity, target, 0.2, dt);
      l.visible = l.intensity > 0.02;
    }
  });

  return (
    <group>
      {MEMBER_ORDER.map((id, i) => {
        const pose = DEBATE_ARRANGEMENT[id];
        return (
          <group key={id}>
            <spotLight
              ref={(l) => {
                lights.current[i] = l;
              }}
              // ~4 above the debate FLOOR (y=-22), riding the floor offset.
              position={[pose.x, ZONE_Y.debate + 4.2, pose.z + 0.6]}
              color={councilColors[id].hex}
              intensity={0}
              angle={0.55}
              penumbra={0.7}
              distance={10}
              target={targets[i]}
            />
            <primitive object={targets[i]} />
          </group>
        );
      })}
    </group>
  );
}
