"use client";

/**
 * worldsUpper — the first four fall dioramas: mountain, zen, forest, rooftop.
 * Each is a scene fragment at its own local origin: thick floor, 6+ real 3D
 * props at varied depth, particles, gradient back-sky. No lights, no state.
 */

import * as React from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  Floor,
  GEO,
  Sky,
  StaticInstances,
  cylinderBetween,
  setLiveOpacity,
  useFade,
  type V3,
  type XForm,
} from "./worldKit";
import { Particles, StringLights } from "./worldProps";

// ---------------------------------------------------------------------------
// Mountain — snowy peaks, pines, aurora, falling snow
// ---------------------------------------------------------------------------

/** Rock cone + snow cap pair. */
function Peak({
  x,
  z,
  s,
  h,
  rock,
  snow,
}: {
  x: number;
  z: number;
  s: number;
  h: number;
  rock: THREE.Material;
  snow: THREE.Material;
}): React.JSX.Element {
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={GEO.cone} material={rock} scale={[s, h, s]} position={[0, h / 2, 0]} />
      <mesh
        geometry={GEO.cone}
        material={snow}
        scale={[s * 0.36, h * 0.32, s * 0.36]}
        position={[0, h * 0.84, 0]}
      />
    </group>
  );
}

function MountainWorldInner(): React.JSX.Element {
  const fade = useFade();
  const M = React.useMemo(
    () => ({
      rock: new THREE.MeshStandardMaterial({ color: "#3a4a63", roughness: 0.95 }),
      snow: new THREE.MeshStandardMaterial({ color: "#e8f1fb", roughness: 0.85 }),
      ice: new THREE.MeshStandardMaterial({
        color: "#bcd6ee",
        roughness: 0.3,
        metalness: 0.1,
      }),
      pine: new THREE.MeshStandardMaterial({ color: "#2c4a44", roughness: 1 }),
      aurora: new THREE.MeshBasicMaterial({
        color: "#7fe8b8",
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    }),
    [],
  );

  const pines = React.useMemo<XForm[]>(
    () =>
      [
        { x: 5.4, z: -0.6, s: 1.0 },
        { x: 6.4, z: 0.6, s: 1.4 },
        { x: 7.2, z: -1.2, s: 1.1 },
        { x: 5.9, z: 1.6, s: 0.8 },
        { x: 6.9, z: 2.1, s: 1.2 },
        { x: 7.8, z: 0.4, s: 0.9 },
      ].map((t) => ({
        p: [t.x, t.s * 1.1, t.z] as V3,
        s: [t.s * 0.55, t.s * 2.2, t.s * 0.55] as V3,
        r: [0, t.x * 2.1, 0] as V3,
      })),
    [],
  );

  const auroraRef = React.useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!fade.visible) return;
    const t = clock.elapsedTime;
    setLiveOpacity(M.aurora, 0.22 + Math.sin(t * 0.6) * 0.1 + Math.sin(t * 1.7) * 0.04, fade.eased);
    const m = auroraRef.current;
    if (m) {
      m.position.x = Math.sin(t * 0.13) * 1.2;
      m.scale.y = 1 + Math.sin(t * 0.4) * 0.12;
    }
  });

  return (
    <>
      <Sky top="#16294a" bottom="#5a86b5" />
      <Floor radius={10} color="#dbe7f5" roughness={0.85} />

      <Peak x={-6} z={-9} s={3.6} h={7.6} rock={M.rock} snow={M.snow} />
      <Peak x={2} z={-6.5} s={4.2} h={9.4} rock={M.rock} snow={M.snow} />
      <Peak x={7.2} z={-4.4} s={3} h={6.4} rock={M.rock} snow={M.snow} />

      <mesh geometry={GEO.ico} material={M.ice} scale={[0.95, 0.7, 0.85]} position={[-4.6, 0.4, 2.2]} rotation={[0.3, 0.8, 0.1]} />
      <mesh geometry={GEO.ico} material={M.ice} scale={[0.6, 0.5, 0.65]} position={[3.6, 0.28, 2.8]} rotation={[0.1, 2.1, 0.4]} />

      <StaticInstances geometry={GEO.coneLo} material={M.pine} xforms={pines} />

      <mesh ref={auroraRef} material={M.aurora} geometry={GEO.plane} scale={[17, 1.7, 1]} position={[0, 11, -9]} rotation={[-0.15, 0, 0.06]} renderOrder={-8} />

      <Particles count={150} color="#f4f9ff" size={0.05} area={[18, 11, 14]} center={[0, 5, -2]} motion="fall" speed={0.6} sway={0.35} tumble={1.2} opacity={0.9} seed={11} />
    </>
  );
}
export const MountainWorld = React.memo(MountainWorldInner);

// ---------------------------------------------------------------------------
// Zen — torii, lanterns, moon, raked sand, tumbling petals
// ---------------------------------------------------------------------------

function ZenWorldInner(): React.JSX.Element {
  const M = React.useMemo(
    () => ({
      ring: new THREE.MeshStandardMaterial({ color: "#d4bfa4", roughness: 1 }),
      torii: new THREE.MeshStandardMaterial({ color: "#b5483a", roughness: 0.75 }),
      stone: new THREE.MeshStandardMaterial({ color: "#9a8a78", roughness: 0.95 }),
      window: new THREE.MeshBasicMaterial({ color: "#ffd9a0", toneMapped: false }),
      rock: new THREE.MeshStandardMaterial({ color: "#8a7a6c", roughness: 0.9 }),
      moon: new THREE.MeshBasicMaterial({
        color: "#fde6c8",
        toneMapped: false,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    }),
    [],
  );

  // Three lanterns — instanced part-by-part (base / body / window / roof).
  const lanterns = React.useMemo(() => {
    const spots: Array<{ p: V3; ry: number; s: number }> = [
      { p: [-3.6, 0, 0.8], ry: 0.4, s: 1.1 },
      { p: [3.4, 0, -1.6], ry: 1.9, s: 1.0 },
      { p: [-1.9, 0, -6.2], ry: 0.9, s: 1.5 },
    ];
    const base: XForm[] = [];
    const body: XForm[] = [];
    const win: XForm[] = [];
    const roof: XForm[] = [];
    for (const l of spots) {
      const [x, , z] = l.p;
      base.push({ p: [x, 0.05 * l.s, z], r: [0, l.ry, 0], s: [0.17 * l.s, 0.1 * l.s, 0.17 * l.s] });
      body.push({ p: [x, 0.27 * l.s, z], r: [0, l.ry, 0], s: [0.21 * l.s, 0.24 * l.s, 0.21 * l.s] });
      win.push({ p: [x, 0.28 * l.s, z], r: [0, l.ry, 0], s: [0.23 * l.s, 0.09 * l.s, 0.11 * l.s] });
      roof.push({ p: [x, 0.47 * l.s, z], r: [0, l.ry + 0.4, 0], s: [0.21 * l.s, 0.15 * l.s, 0.21 * l.s] });
    }
    return { base, body, win, roof };
  }, []);

  return (
    <>
      <Sky top="#f0c2a0" bottom="#c87a6e" />
      <Floor radius={9.5} color="#e8d8c2" roughness={1} />

      {/* Raked sand rings */}
      <mesh geometry={GEO.torusFlat} material={M.ring} rotation={[-Math.PI / 2, 0, 0]} scale={1.4} position={[0, 0.012, 0]} />
      <mesh geometry={GEO.torusFlat} material={M.ring} rotation={[-Math.PI / 2, 0, 0]} scale={2.3} position={[0, 0.014, 0]} />
      <mesh geometry={GEO.torusFlat} material={M.ring} rotation={[-Math.PI / 2, 0, 0]} scale={3.3} position={[0, 0.016, 0]} />

      {/* Torii gate */}
      <group position={[0, 0, -5]}>
        <mesh geometry={GEO.cyl} material={M.torii} scale={[0.13, 2.7, 0.13]} position={[-1.35, 1.35, 0]} rotation={[0, 0, 0.04]} />
        <mesh geometry={GEO.cyl} material={M.torii} scale={[0.13, 2.7, 0.13]} position={[1.35, 1.35, 0]} rotation={[0, 0, -0.04]} />
        <mesh geometry={GEO.box} material={M.torii} scale={[3.6, 0.2, 0.26]} position={[0, 2.72, 0]} />
        <mesh geometry={GEO.box} material={M.torii} scale={[2.9, 0.14, 0.2]} position={[0, 2.28, 0]} />
      </group>

      {/* Stone lanterns */}
      <StaticInstances geometry={GEO.cyl} material={M.stone} xforms={lanterns.base} />
      <StaticInstances geometry={GEO.box} material={M.stone} xforms={lanterns.body} />
      <StaticInstances geometry={GEO.box} material={M.window} xforms={lanterns.win} />
      <StaticInstances geometry={GEO.coneLo} material={M.stone} xforms={lanterns.roof} />

      {/* Big low moon */}
      <mesh geometry={GEO.circle} material={M.moon} scale={4} position={[3.5, 4.4, -11.5]} renderOrder={-8} />

      {/* Rounded boulders */}
      <mesh geometry={GEO.ico} material={M.rock} scale={[0.55, 0.4, 0.5]} position={[-2.4, 0.24, 2]} rotation={[0.2, 1.2, 0.1]} />
      <mesh geometry={GEO.ico} material={M.rock} scale={[0.4, 0.3, 0.42]} position={[2, 0.18, 2.6]} rotation={[0.5, 0.3, 0.2]} />

      {/* Bonsai-ish tree */}
      <group position={[5.4, 0, -2.6]}>
        <mesh geometry={GEO.cyl} scale={[0.09, 0.85, 0.09]} position={[-0.08, 0.42, 0.05]} rotation={[0.08, 0, 0.22]}>
          <meshStandardMaterial color="#4a3526" roughness={0.95} />
        </mesh>
        <mesh geometry={GEO.cyl} scale={[0.06, 0.6, 0.06]} position={[0.14, 1.0, -0.04]} rotation={[-0.05, 0, -0.45]}>
          <meshStandardMaterial color="#4a3526" roughness={0.95} />
        </mesh>
        <mesh geometry={GEO.sphereLo} scale={[0.62, 0.42, 0.58]} position={[0.28, 1.42, -0.06]}>
          <meshStandardMaterial color="#4a6a4a" roughness={1} />
        </mesh>
        <mesh geometry={GEO.sphereLo} scale={[0.4, 0.3, 0.4]} position={[-0.32, 1.18, 0.12]}>
          <meshStandardMaterial color="#55795a" roughness={1} />
        </mesh>
        <mesh geometry={GEO.sphereLo} scale={[0.3, 0.22, 0.3]} position={[0.02, 1.66, 0.1]}>
          <meshStandardMaterial color="#43603f" roughness={1} />
        </mesh>
      </group>

      <Particles count={80} color="#e8a8b8" size={0.06} area={[16, 9, 13]} center={[0, 4, -1]} motion="fall" speed={0.32} sway={0.8} tumble={2.2} opacity={0.95} seed={22} />
    </>
  );
}
export const ZenWorld = React.memo(ZenWorldInner);

// ---------------------------------------------------------------------------
// Forest — instanced trees, ferns, fallen log, light shafts, fireflies
// ---------------------------------------------------------------------------

const FOREST_TREES: Array<{ x: number; z: number; s: number }> = [
  { x: -6.5, z: -7, s: 2.2 },
  { x: -4, z: -5.5, s: 1.4 },
  { x: -7.5, z: -2, s: 1.8 },
  { x: -2.5, z: -7.8, s: 2.4 },
  { x: 0.5, z: -6.5, s: 1.7 },
  { x: 3, z: -7.5, s: 2.2 },
  { x: 5.5, z: -6, s: 1.5 },
  { x: 7.5, z: -3.5, s: 2.0 },
  { x: 6.5, z: -0.5, s: 1.2 },
  { x: -6.8, z: 1.5, s: 1.0 },
  { x: 7, z: 1.8, s: 1.3 },
  { x: -4.6, z: 2.6, s: 1.0 },
];

function ForestWorldInner(): React.JSX.Element {
  const M = React.useMemo(
    () => ({
      trunk: new THREE.MeshStandardMaterial({ color: "#3a2c22", roughness: 1 }),
      canopy: new THREE.MeshStandardMaterial({ color: "#1d4a3a", roughness: 1 }),
      fern: new THREE.MeshStandardMaterial({ color: "#2e6a4c", roughness: 1 }),
      shaft: new THREE.MeshBasicMaterial({
        color: "#9adbb8",
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    }),
    [],
  );

  const { trunks, canopies } = React.useMemo(() => {
    const tXf: XForm[] = [];
    const cXf: XForm[] = [];
    for (const t of FOREST_TREES) {
      tXf.push({
        p: [t.x, 0.8 * t.s, t.z],
        s: [0.14 * t.s, 1.6 * t.s, 0.14 * t.s],
        r: [0, t.x * 1.7, 0],
      });
      cXf.push({
        p: [t.x, 2.4 * t.s, t.z],
        s: [0.95 * t.s, 2.4 * t.s, 0.95 * t.s],
        r: [0, t.z * 1.3, 0],
      });
    }
    return { trunks: tXf, canopies: cXf };
  }, []);

  return (
    <>
      <Sky top="#122e27" bottom="#3a6a5c" />
      <Floor radius={10} color="#2a4a3c" roughness={1} />

      <StaticInstances geometry={GEO.cylLo} material={M.trunk} xforms={trunks} />
      <StaticInstances geometry={GEO.coneLo} material={M.canopy} xforms={canopies} />

      {/* Near ferns — flattened cone clusters */}
      <group position={[-2.6, 0, 2.4]}>
        <mesh geometry={GEO.coneLo} material={M.fern} scale={[0.5, 0.4, 0.5]} position={[0, 0.2, 0]} />
        <mesh geometry={GEO.coneLo} material={M.fern} scale={[0.34, 0.3, 0.34]} position={[0.4, 0.15, 0.2]} rotation={[0, 1.2, 0.1]} />
      </group>
      <group position={[3.4, 0, 2]}>
        <mesh geometry={GEO.coneLo} material={M.fern} scale={[0.44, 0.36, 0.44]} position={[0, 0.18, 0]} rotation={[0, 2.4, 0]} />
        <mesh geometry={GEO.coneLo} material={M.fern} scale={[0.3, 0.26, 0.3]} position={[-0.36, 0.13, 0.22]} rotation={[0.06, 0.7, 0]} />
      </group>

      {/* Fallen log */}
      <mesh geometry={GEO.cyl} scale={[0.26, 2.3, 0.26]} position={[2.6, 0.24, 1.2]} rotation={[0.1, 0.5, Math.PI / 2]}>
        <meshStandardMaterial color="#43332a" roughness={1} />
      </mesh>

      {/* Slanting light shafts */}
      <mesh geometry={GEO.plane} material={M.shaft} scale={[1.7, 7.5, 1]} position={[-2.2, 3.6, -3.6]} rotation={[0, 0.35, 0.42]} renderOrder={-7} />
      <mesh geometry={GEO.plane} material={M.shaft} scale={[1.2, 6.5, 1]} position={[2.8, 3.2, -4.2]} rotation={[0, -0.3, 0.36]} renderOrder={-7} />

      <Particles count={60} color="#d8f0a0" size={0.045} area={[13, 3.5, 11]} center={[0, 1.6, -1.5]} motion="drift" sway={0.85} opacity={0.85} additive seed={33} />
    </>
  );
}
export const ForestWorld = React.memo(ForestWorldInner);

// ---------------------------------------------------------------------------
// Rooftop — dusk skyline, water tower, neon, embers
// ---------------------------------------------------------------------------

const ROOF_BUILDINGS: Array<{ x: number; z: number; w: number; h: number; d: number }> = [
  { x: -11, z: -10, w: 2.8, h: 9, d: 2.6 },
  { x: -7.5, z: -11.5, w: 2.4, h: 12, d: 2.4 },
  { x: -4, z: -10.5, w: 3, h: 7.5, d: 2.8 },
  { x: -0.5, z: -12.5, w: 2.6, h: 13.5, d: 2.6 },
  { x: 3, z: -10, w: 2.4, h: 8.5, d: 2.4 },
  { x: 6.5, z: -11.5, w: 3.2, h: 11, d: 3 },
  { x: 10.5, z: -10, w: 2.6, h: 9.5, d: 2.6 },
  { x: -11.5, z: -6, w: 2.4, h: 7, d: 2.6 },
  { x: 11.5, z: -6.5, w: 2.8, h: 8, d: 2.6 },
  { x: 1.5, z: -14, w: 3.4, h: 15, d: 3 },
];

function RooftopWorldInner(): React.JSX.Element {
  const fade = useFade();
  const M = React.useMemo(
    () => ({
      building: new THREE.MeshStandardMaterial({ color: "#141020", roughness: 0.95 }),
      window: new THREE.MeshBasicMaterial({ color: "#ffb070", toneMapped: false }),
      parapet: new THREE.MeshStandardMaterial({ color: "#241e2c", roughness: 0.95 }),
      metal: new THREE.MeshStandardMaterial({ color: "#4a3a44", roughness: 0.6, metalness: 0.3 }),
      vent: new THREE.MeshStandardMaterial({ color: "#3a3342", roughness: 0.8 }),
      neon: new THREE.MeshBasicMaterial({
        color: "#e86a9a",
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
        fog: false,
      }),
    }),
    [],
  );

  const { buildings, windows, parapets, vents, towerLegs } = React.useMemo(() => {
    const bXf: XForm[] = ROOF_BUILDINGS.map((b) => ({
      p: [b.x, b.h / 2 - 4.5, b.z] as V3,
      s: [b.w, b.h, b.d] as V3,
    }));
    const wXf: XForm[] = [];
    for (let bi = 0; bi < ROOF_BUILDINGS.length; bi++) {
      const b = ROOF_BUILDINGS[bi];
      for (let k = 0; k < 4; k++) {
        wXf.push({
          p: [
            b.x + ((k % 2) - 0.5) * b.w * 0.42,
            b.h - 5.4 - k * 1.15 - (bi % 3) * 0.4,
            b.z + b.d / 2 + 0.04,
          ],
          s: [b.w * 0.3, 0.12, 0.05],
        });
      }
    }
    const pXf: XForm[] = [
      { p: [0, 0.26, -6.35], s: [17, 0.52, 0.3] },
      { p: [-8.35, 0.26, 0], s: [0.3, 0.52, 12.4] },
      { p: [8.35, 0.26, 0], s: [0.3, 0.52, 12.4] },
      { p: [-6, 0.26, 6.35], s: [4.7, 0.52, 0.3] },
      { p: [6, 0.26, 6.35], s: [4.7, 0.52, 0.3] },
    ];
    const vXf: XForm[] = [
      { p: [-5.2, 0.27, -3.6], s: [1.1, 0.54, 0.75], r: [0, 0.2, 0] },
      { p: [-6.6, 0.21, -1.7], s: [0.8, 0.42, 0.6], r: [0, -0.3, 0] },
    ];
    const legs: XForm[] = [];
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      legs.push(
        cylinderBetween(
          [5.5 + Math.sin(a) * 0.72, 0, -4 + Math.cos(a) * 0.72],
          [5.5 + Math.sin(a) * 0.45, 1.35, -4 + Math.cos(a) * 0.45],
          0.05,
        ),
      );
    }
    return { buildings: bXf, windows: wXf, parapets: pXf, vents: vXf, towerLegs: legs };
  }, []);

  const neonRef = React.useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!fade.visible) return;
    const t = clock.elapsedTime;
    const dip = Math.sin(t * 23) * Math.sin(t * 7.3 + 1.4);
    setLiveOpacity(M.neon, 0.72 + 0.2 * dip, fade.eased);
    const m = neonRef.current;
    if (m) m.visible = true;
  });

  return (
    <>
      <Sky top="#2a1b3a" bottom="#d97a5a" />

      {/* Concrete roof slab with thickness */}
      <mesh position={[0, -0.25, 0]} receiveShadow>
        <boxGeometry args={[17, 0.5, 13]} />
        <meshStandardMaterial color="#2c2733" roughness={0.95} />
      </mesh>
      <StaticInstances geometry={GEO.box} material={M.parapet} xforms={parapets} />

      {/* Skyline + lit windows */}
      <StaticInstances geometry={GEO.box} material={M.building} xforms={buildings} />
      <StaticInstances geometry={GEO.box} material={M.window} xforms={windows} />

      {/* Water tower */}
      <group>
        <StaticInstances geometry={GEO.cyl} material={M.metal} xforms={towerLegs} />
        <mesh geometry={GEO.cyl} material={M.metal} scale={[0.8, 1.4, 0.8]} position={[5.5, 2.05, -4]} />
        <mesh geometry={GEO.coneLo} material={M.metal} scale={[0.88, 0.5, 0.88]} position={[5.5, 3, -4]} />
      </group>

      {/* Roof vents */}
      <StaticInstances geometry={GEO.box} material={M.vent} xforms={vents} />

      {/* String of bulbs from corner pole to the water tower */}
      <mesh geometry={GEO.cyl} scale={[0.04, 2.6, 0.04]} position={[-7.8, 1.3, -5.9]}>
        <meshStandardMaterial color="#241e2c" roughness={0.9} />
      </mesh>
      <StringLights from={[-7.8, 2.6, -5.9]} to={[5.5, 2.75, -4.2]} sag={0.9} bulbs={6} />

      {/* Neon sign on the back parapet */}
      <mesh geometry={GEO.box} scale={[2.5, 1.1, 0.1]} position={[-4.6, 1.5, -6.3]}>
        <meshStandardMaterial color="#171221" roughness={0.9} />
      </mesh>
      <mesh ref={neonRef} geometry={GEO.plane} material={M.neon} scale={[2.2, 0.85, 1]} position={[-4.6, 1.5, -6.22]} />

      <Particles count={50} color="#ffaa70" size={0.04} area={[14, 7, 10]} center={[0, 3.2, -2]} motion="rise" speed={0.5} sway={0.4} opacity={0.8} additive seed={44} />
    </>
  );
}
export const RooftopWorld = React.memo(RooftopWorldInner);
