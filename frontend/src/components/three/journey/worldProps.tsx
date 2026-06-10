"use client";

/**
 * worldProps — recurring set pieces and effects built on worldKit:
 * StoolSet / StringLights / PottedPlant furniture, the animated Particles
 * field, and the CanvasTexture makers (grid, checker, CRT screen).
 * No lights live here — glow comes from emissive/basic materials only.
 */

import * as React from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { MemberPose } from "./timeline";
import { SEAT_TOP_Y } from "./timeline";
import {
  GEO,
  StaticInstances,
  cylinderBetween,
  mulberry32,
  sagPoints,
  useFade,
  type V3,
  type XForm,
} from "./worldKit";

// ---------------------------------------------------------------------------
// Furniture — stools, string lights, plants
// ---------------------------------------------------------------------------

/** Instanced stools: seat top at SEAT_TOP_Y, 4 slightly splayed legs each. */
export function StoolSet({
  poses,
  seatColor = "#6a4a36",
  legColor = "#3a2a20",
}: {
  poses: ReadonlyArray<MemberPose>;
  seatColor?: string;
  legColor?: string;
}): React.JSX.Element {
  const { seats, legs } = React.useMemo(() => {
    const seatXf: XForm[] = [];
    const legXf: XForm[] = [];
    for (const pose of poses) {
      seatXf.push({
        p: [pose.x, SEAT_TOP_Y - 0.035, pose.z],
        r: [0, pose.rotY, 0],
        s: [0.3, 0.07, 0.3],
      });
      for (let k = 0; k < 4; k++) {
        const a = pose.rotY + Math.PI / 4 + (k * Math.PI) / 2;
        const top: V3 = [
          pose.x + Math.sin(a) * 0.15,
          SEAT_TOP_Y - 0.06,
          pose.z + Math.cos(a) * 0.15,
        ];
        const bottom: V3 = [
          pose.x + Math.sin(a) * 0.26,
          0.01,
          pose.z + Math.cos(a) * 0.26,
        ];
        legXf.push(cylinderBetween(top, bottom, 0.024));
      }
    }
    return { seats: seatXf, legs: legXf };
  }, [poses]);

  const seatMat = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: seatColor, roughness: 0.8 }),
    [seatColor],
  );
  const legMat = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: legColor, roughness: 0.7 }),
    [legColor],
  );

  return (
    <>
      <StaticInstances geometry={GEO.cyl} material={seatMat} xforms={seats} castShadow />
      <StaticInstances geometry={GEO.cyl} material={legMat} xforms={legs} castShadow />
    </>
  );
}

/** Sagging wire with small emissive bulbs along it. 2 draw calls. */
export function StringLights({
  from,
  to,
  sag = 0.6,
  bulbs = 6,
  color = "#ffd9a0",
  wireColor = "#17110c",
}: {
  from: V3;
  to: V3;
  sag?: number;
  bulbs?: number;
  color?: string;
  wireColor?: string;
}): React.JSX.Element {
  const { segs, bulbXf } = React.useMemo(() => {
    const pts = sagPoints(from, to, sag, bulbs + 1);
    const segXf: XForm[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      segXf.push(cylinderBetween(pts[i], pts[i + 1], 0.012));
    }
    const bXf: XForm[] = pts
      .slice(1, -1)
      .map((p) => ({ p: [p[0], p[1] - 0.06, p[2]] as V3, s: 0.055 }));
    return { segs: segXf, bulbXf: bXf };
  }, [from, to, sag, bulbs]);

  const wireMat = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: wireColor, roughness: 0.9 }),
    [wireColor],
  );
  const bulbMat = React.useMemo(
    () => new THREE.MeshBasicMaterial({ color, toneMapped: false }),
    [color],
  );

  return (
    <>
      <StaticInstances geometry={GEO.cyl} material={wireMat} xforms={segs} />
      <StaticInstances geometry={GEO.sphereLo} material={bulbMat} xforms={bulbXf} />
    </>
  );
}

export function PottedPlant({
  position,
  scale = 1,
}: {
  position: V3;
  scale?: number;
}): React.JSX.Element {
  return (
    <group position={[position[0], position[1], position[2]]} scale={scale}>
      <mesh geometry={GEO.cyl} scale={[0.22, 0.28, 0.22]} position={[0, 0.14, 0]} castShadow>
        <meshStandardMaterial color="#7a4a38" roughness={0.85} />
      </mesh>
      <mesh geometry={GEO.cyl} scale={[0.035, 0.62, 0.035]} position={[0, 0.55, 0]}>
        <meshStandardMaterial color="#4a3526" roughness={0.9} />
      </mesh>
      <mesh geometry={GEO.sphereLo} scale={[0.34, 0.3, 0.34]} position={[0, 0.95, 0]}>
        <meshStandardMaterial color="#3f6a48" roughness={1} />
      </mesh>
      <mesh geometry={GEO.sphereLo} scale={[0.24, 0.22, 0.24]} position={[0.2, 1.12, 0.06]}>
        <meshStandardMaterial color="#477751" roughness={1} />
      </mesh>
      <mesh geometry={GEO.sphereLo} scale={[0.2, 0.18, 0.2]} position={[-0.18, 1.1, -0.08]}>
        <meshStandardMaterial color="#36593e" roughness={1} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Animated particles (one instancedMesh of tiny planes)
// ---------------------------------------------------------------------------

const _obj = new THREE.Object3D();

export interface ParticlesProps {
  count: number;
  color: string;
  size: number;
  /** Box extents [w, h, d] the particles live in. */
  area: V3;
  /** Box centre. */
  center?: V3;
  motion?: "fall" | "rise" | "drift";
  /** Units/sec along the main axis (fall/rise). */
  speed?: number;
  /** Lateral sine sway amplitude. */
  sway?: number;
  /** Tumble rotation rate (rad/s scale). */
  tumble?: number;
  opacity?: number;
  additive?: boolean;
  seed?: number;
}

export function Particles({
  count,
  color,
  size,
  area,
  center = [0, 0, 0],
  motion = "drift",
  speed = 0.5,
  sway = 0.3,
  tumble = 0,
  opacity = 0.8,
  additive = false,
  seed = 1,
}: ParticlesProps): React.JSX.Element {
  const fade = useFade();
  const ref = React.useRef<THREE.InstancedMesh>(null);

  const data = React.useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: count }, () => ({
      x: (rnd() - 0.5) * area[0],
      y0: rnd() * area[1],
      z: (rnd() - 0.5) * area[2],
      spd: 0.6 + rnd() * 0.8,
      ph: rnd() * Math.PI * 2,
      ph2: rnd() * Math.PI * 2,
      rspd: (rnd() - 0.5) * 2,
      scl: 0.7 + rnd() * 0.6,
    }));
  }, [count, area, seed]);

  const mat = React.useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    [color, opacity, additive],
  );

  useFrame(({ clock }) => {
    const im = ref.current;
    if (!im || !fade.visible) return;
    const t = clock.elapsedTime;
    const h = area[1];
    for (let i = 0; i < count; i++) {
      const p = data[i];
      let y: number;
      if (motion === "fall") {
        y = center[1] + h / 2 - ((p.y0 + t * speed * p.spd) % h);
      } else if (motion === "rise") {
        y = center[1] - h / 2 + ((p.y0 + t * speed * p.spd) % h);
      } else {
        y = center[1] - h / 2 + p.y0 + Math.sin(t * 0.4 * p.spd + p.ph) * 0.4;
      }
      _obj.position.set(
        center[0] + p.x + Math.sin(t * 0.5 * p.spd + p.ph) * sway,
        y,
        center[2] + p.z + Math.cos(t * 0.4 * p.spd + p.ph2) * sway * 0.7,
      );
      if (tumble > 0) {
        _obj.rotation.set(
          t * p.rspd * tumble + p.ph,
          t * p.rspd * tumble * 0.8 + p.ph2,
          0,
        );
      } else {
        _obj.rotation.set(0, 0, 0);
      }
      _obj.scale.setScalar(size * p.scl);
      _obj.updateMatrix();
      im.setMatrixAt(i, _obj.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[GEO.plane, mat, count]} frustumCulled={false} />;
}

// ---------------------------------------------------------------------------
// Canvas textures (call from useMemo — client only)
// ---------------------------------------------------------------------------

export function makeGridTexture(
  size: number,
  bg: string,
  line: string,
  cells: number,
  lineWidth = 2,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = line;
    ctx.lineWidth = lineWidth;
    const step = size / cells;
    for (let i = 0; i <= cells; i++) {
      const o = Math.min(size - lineWidth / 2, Math.max(lineWidth / 2, i * step));
      ctx.beginPath();
      ctx.moveTo(o, 0);
      ctx.lineTo(o, size);
      ctx.moveTo(0, o);
      ctx.lineTo(size, o);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeCheckerTexture(light: string, dark: string): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) {
    const margin = 10;
    const cell = (size - margin * 2) / 8;
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, size, size);
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        ctx.fillStyle = (r + f) % 2 === 0 ? light : dark;
        ctx.fillRect(margin + f * cell, margin + r * cell, cell, cell);
      }
    }
    ctx.strokeStyle = light;
    ctx.lineWidth = 2;
    ctx.strokeRect(margin - 3, margin - 3, size - margin * 2 + 6, size - margin * 2 + 6);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeScreenTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#02060c";
    ctx.fillRect(0, 0, w, h);
    // scanlines
    ctx.fillStyle = "rgba(60, 220, 255, 0.14)";
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    // vertical grid
    ctx.fillStyle = "rgba(60, 220, 255, 0.22)";
    for (let x = 0; x < w; x += 24) ctx.fillRect(x, 0, 1, h);
    // data blocks
    const rnd = mulberry32(9);
    ctx.fillStyle = "rgba(130, 240, 255, 0.55)";
    for (let i = 0; i < 26; i++) {
      ctx.fillRect(
        Math.floor(rnd() * (w - 10)),
        Math.floor(rnd() * (h - 4)),
        4 + Math.floor(rnd() * 9),
        3,
      );
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
