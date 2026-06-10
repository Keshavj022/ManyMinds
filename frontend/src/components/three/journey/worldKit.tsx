"use client";

/**
 * worldKit — shared building blocks for the Journey dioramas.
 *
 *   • FadeGroup     — self-tweening opacity wrapper (half-life 0.18s) that
 *                     traverses materials, stashes authored opacity in
 *                     userData.baseOpacity and hides the group when faded.
 *   • useFade       — fade handle context so animated children early-return
 *                     when their world is invisible.
 *   • Sky / Floor   — gradient back-sphere + thick disc floor.
 *   • StaticInstances + XForm helpers — instanced repeats.
 *
 * Furniture, particles and canvas textures live in ./worldProps.
 * NO lights live here — worlds glow via emissive/basic materials only.
 */

import * as React from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MemberPose } from "./timeline";

export type V3 = readonly [number, number, number];

export const FADE_HALF_LIFE = 0.18;
export const SKY_RADIUS = 38;

// ---------------------------------------------------------------------------
// Deterministic PRNG (stable layouts, no hydration drift)
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Fade plumbing
// ---------------------------------------------------------------------------

export interface FadeHandle {
  visible: boolean;
  eased: number;
}

const FadeContext = React.createContext<FadeHandle>({ visible: true, eased: 1 });

/** Animated children read this and early-return when their world is hidden. */
export function useFade(): FadeHandle {
  return React.useContext(FadeContext);
}

interface FadeUD {
  baseOpacity?: number;
  baseTransparent?: boolean;
  baseDepthWrite?: boolean;
  fadeStashed?: boolean;
}

function applyFade(mat: THREE.Material, eased: number): void {
  const ud = mat.userData as FadeUD;
  if (!ud.fadeStashed) {
    ud.fadeStashed = true;
    if (ud.baseOpacity === undefined) ud.baseOpacity = mat.opacity;
    ud.baseTransparent = mat.transparent;
    ud.baseDepthWrite = mat.depthWrite;
  }
  const base = ud.baseOpacity ?? 1;
  if (eased >= 0.999) {
    mat.opacity = base;
    mat.transparent = (ud.baseTransparent ?? false) || base < 0.999;
    mat.depthWrite = ud.baseDepthWrite ?? true;
  } else {
    mat.opacity = base * eased;
    mat.transparent = true;
    if (mat.depthWrite) mat.depthWrite = false;
  }
}

/** Live-animated materials (aurora, neon, shards) set their own per-frame
 *  alpha through this so FadeGroup traversal and self-animation never fight:
 *  both write opacity = userData.baseOpacity × eased. */
export function setLiveOpacity(mat: THREE.Material, alpha: number, eased: number): void {
  const ud = mat.userData as FadeUD;
  ud.baseOpacity = alpha;
  mat.opacity = alpha * eased;
}

export function FadeGroup({
  opacity,
  children,
}: {
  opacity: number;
  children: React.ReactNode;
}): React.JSX.Element {
  const group = React.useRef<THREE.Group>(null);
  const eased = React.useRef(opacity);
  const lastApplied = React.useRef(-1);
  const handle = React.useRef<FadeHandle>({ visible: opacity > 0.01, eased: opacity }).current;

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.pow(0.5, dt / FADE_HALF_LIFE);
    let e = eased.current + (opacity - eased.current) * k;
    if (Math.abs(opacity - e) < 0.002) e = opacity;
    eased.current = e;
    handle.eased = e;

    const visible = e > 0.01;
    handle.visible = visible;
    if (g.visible !== visible) g.visible = visible;
    if (!visible) {
      lastApplied.current = -1; // force re-apply when we come back
      return;
    }
    if (e === lastApplied.current) return; // settled — skip traversal
    lastApplied.current = e;

    g.traverse((obj) => {
      const mat = (obj as THREE.Mesh).material as
        | THREE.Material
        | THREE.Material[]
        | undefined;
      if (!mat) return;
      if (Array.isArray(mat)) {
        for (const m of mat) applyFade(m, e);
      } else {
        applyFade(mat, e);
      }
    });
  });

  return (
    <group ref={group} visible={opacity > 0.01}>
      <FadeContext.Provider value={handle}>{children}</FadeContext.Provider>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Sky + floor
// ---------------------------------------------------------------------------

const skyCache = new Map<string, THREE.SphereGeometry>();

function getSkyGeometry(top: string, bottom: string): THREE.SphereGeometry {
  const key = `${top}|${bottom}`;
  const hit = skyCache.get(key);
  if (hit) return hit;
  const geo = new THREE.SphereGeometry(SKY_RADIUS, 32, 24);
  const t = new THREE.Color(top);
  const b = new THREE.Color(bottom);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const f = THREE.MathUtils.clamp((pos.getY(i) / SKY_RADIUS + 1) / 2, 0, 1);
    tmp.copy(b).lerp(t, f);
    colours[i * 3 + 0] = tmp.r;
    colours[i * 3 + 1] = tmp.g;
    colours[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  skyCache.set(key, geo);
  return geo;
}

export function Sky({ top, bottom }: { top: string; bottom: string }): React.JSX.Element {
  const geo = React.useMemo(() => getSkyGeometry(top, bottom), [top, bottom]);
  return (
    <mesh geometry={geo} renderOrder={-10}>
      <meshBasicMaterial
        vertexColors
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}

export function Floor({
  radius,
  color,
  height = 0.5,
  roughness = 0.95,
  metalness = 0,
}: {
  radius: number;
  color: string;
  height?: number;
  roughness?: number;
  metalness?: number;
}): React.JSX.Element {
  return (
    <mesh position={[0, -height / 2, 0]} receiveShadow>
      <cylinderGeometry args={[radius, radius * 0.97, height, 48]} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Shared unit geometries (scaled per instance/mesh — never mutated)
// ---------------------------------------------------------------------------

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cylLo: new THREE.CylinderGeometry(1, 0.92, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 16),
  coneLo: new THREE.ConeGeometry(1, 1, 8),
  sphere: new THREE.SphereGeometry(1, 16, 12),
  sphereLo: new THREE.SphereGeometry(1, 10, 8),
  ico: new THREE.IcosahedronGeometry(1, 0),
  plane: new THREE.PlaneGeometry(1, 1),
  circle: new THREE.CircleGeometry(1, 40),
  torusFlat: new THREE.TorusGeometry(1, 0.022, 6, 64),
} as const;

// ---------------------------------------------------------------------------
// Static instancing
// ---------------------------------------------------------------------------

export interface XForm {
  p: V3;
  r?: V3;
  q?: THREE.Quaternion;
  s?: number | V3;
  /** Optional per-instance colour (material should be white). */
  c?: string;
}

export function StaticInstances({
  geometry,
  material,
  xforms,
  castShadow = false,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  xforms: ReadonlyArray<XForm>;
  castShadow?: boolean;
}): React.JSX.Element {
  const ref = React.useRef<THREE.InstancedMesh>(null);

  React.useLayoutEffect(() => {
    const im = ref.current;
    if (!im) return;
    const obj = new THREE.Object3D();
    const col = new THREE.Color();
    let hasColor = false;
    xforms.forEach((x, i) => {
      obj.position.set(x.p[0], x.p[1], x.p[2]);
      if (x.q) {
        obj.quaternion.copy(x.q);
      } else {
        const r = x.r ?? [0, 0, 0];
        obj.rotation.set(r[0], r[1], r[2]);
        obj.quaternion.setFromEuler(obj.rotation);
      }
      const s = x.s ?? 1;
      if (typeof s === "number") obj.scale.setScalar(s);
      else obj.scale.set(s[0], s[1], s[2]);
      obj.updateMatrix();
      im.setMatrixAt(i, obj.matrix);
      if (x.c) {
        im.setColorAt(i, col.set(x.c));
        hasColor = true;
      }
    });
    im.instanceMatrix.needsUpdate = true;
    if (hasColor && im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [xforms]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, xforms.length]}
      castShadow={castShadow}
      frustumCulled={false}
    />
  );
}

/** XForm placing a unit cylinder (r=1, h=1, y-axis) between two points. */
export function cylinderBetween(a: V3, b: V3, radius: number): XForm {
  const av = new THREE.Vector3(a[0], a[1], a[2]);
  const bv = new THREE.Vector3(b[0], b[1], b[2]);
  const dir = bv.clone().sub(av);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.normalize(),
  );
  const mid = av.add(bv).multiplyScalar(0.5);
  return { p: [mid.x, mid.y, mid.z], q, s: [radius, len, radius] };
}

/** Points along a sagging line (parabolic approximation of a catenary). */
export function sagPoints(a: V3, b: V3, sag: number, segments: number): V3[] {
  const pts: V3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    pts.push([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t),
      a[2] + (b[2] - a[2]) * t,
    ]);
  }
  return pts;
}

/** Stool centre pulled back from a member pose along its facing direction
 *  so hips land on the seat (contract rule: pose − 0.18 × facing). */
export function pulledBack(pose: MemberPose, d = 0.18): MemberPose {
  return {
    x: pose.x - Math.sin(pose.rotY) * d,
    z: pose.z - Math.cos(pose.rotY) * d,
    rotY: pose.rotY,
  };
}

