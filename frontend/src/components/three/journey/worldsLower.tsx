"use client";

/**
 * worldsLower — the final three fall dioramas: beach, library, café.
 * Same rules as worldsUpper: local origin, thick floor, real 3D props,
 * particles, gradient back-sky, zero lights, zero React state.
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
  useFade,
  type V3,
  type XForm,
} from "./worldKit";
import { Particles, PottedPlant } from "./worldProps";

// ---------------------------------------------------------------------------
// Beach — sand, water with sliding foam, palms, parasol, distant sail
// ---------------------------------------------------------------------------

/** Direction of a cone tilted by `tilt` around z then yawed by `yaw`. */
function tiltedDir(yaw: number, tilt: number): V3 {
  const x = -Math.sin(tilt);
  const y = Math.cos(tilt);
  return [
    x * Math.cos(yaw),
    y,
    -x * Math.sin(yaw),
  ];
}

function palmParts(base: V3, lean: number): { trunk: XForm[]; fronds: XForm[] } {
  const pts: V3[] = [
    base,
    [base[0] + 0.28 * lean, base[1] + 1.1, base[2] + 0.1],
    [base[0] + 0.62 * lean, base[1] + 2.1, base[2] + 0.16],
    [base[0] + 1.02 * lean, base[1] + 2.9, base[2] + 0.2],
  ];
  const trunk: XForm[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    trunk.push(cylinderBetween(pts[i], pts[i + 1], 0.13 - i * 0.025));
  }
  const crown = pts[pts.length - 1];
  const fronds: XForm[] = [];
  for (let k = 0; k < 6; k++) {
    const yaw = (k / 6) * Math.PI * 2 + lean;
    const tilt = 1.25;
    const d = tiltedDir(yaw, tilt);
    fronds.push({
      p: [crown[0] + d[0] * 0.62, crown[1] + d[1] * 0.62, crown[2] + d[2] * 0.62],
      r: [0, yaw, tilt],
      s: [0.34, 1.5, 0.08],
    });
  }
  return { trunk, fronds };
}

function BeachWorldInner(): React.JSX.Element {
  const fade = useFade();
  const M = React.useMemo(
    () => ({
      water: new THREE.MeshStandardMaterial({
        color: "#3e98ad",
        roughness: 0.35,
        metalness: 0.1,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
      foam: new THREE.MeshBasicMaterial({
        color: "#f4fbfd",
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        toneMapped: false,
      }),
      trunk: new THREE.MeshStandardMaterial({ color: "#7a5a40", roughness: 0.95 }),
      frond: new THREE.MeshStandardMaterial({ color: "#3f7a52", roughness: 1, side: THREE.DoubleSide }),
      shell: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85 }),
    }),
    [],
  );

  const palms = React.useMemo(() => {
    const a = palmParts([-6, 0, -3], 1);
    const b = palmParts([6.4, 0, -4.2], -0.8);
    return { trunk: [...a.trunk, ...b.trunk], fronds: [...a.fronds, ...b.fronds] };
  }, []);

  const shells = React.useMemo<XForm[]>(
    () => [
      { p: [-1.8, 0.05, 2.8], s: [0.12, 0.06, 0.1], r: [0, 1.1, 0], c: "#f2e3d0" },
      { p: [2.4, 0.05, 3.2], s: [0.09, 0.05, 0.09], r: [0, 2.6, 0], c: "#e8c8c0" },
      { p: [0.8, 0.05, 3.6], s: [0.14, 0.07, 0.11], r: [0, 0.4, 0], c: "#d8d2c4" },
    ],
    [],
  );

  const foamA = React.useRef<THREE.Mesh>(null);
  const foamB = React.useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!fade.visible) return;
    const t = clock.elapsedTime;
    const a = foamA.current;
    const b = foamB.current;
    if (a) a.position.z = -8.2 + Math.sin(t * 0.4) * 0.9;
    if (b) b.position.z = -10 + Math.sin(t * 0.32 + 1.8) * 1.1;
  });

  return (
    <>
      <Sky top="#aee0f2" bottom="#f3c98e" />
      <Floor radius={9} color="#ecd9b0" roughness={1} />

      {/* Water beyond the sand, slightly below it */}
      <mesh geometry={GEO.circle} material={M.water} rotation={[-Math.PI / 2, 0, 0]} scale={26} position={[0, -0.12, 0]} />
      <mesh ref={foamA} geometry={GEO.plane} material={M.foam} rotation={[-Math.PI / 2, 0, 0.06]} scale={[14, 0.5, 1]} position={[-1, -0.08, -8.2]} />
      <mesh ref={foamB} geometry={GEO.plane} material={M.foam} rotation={[-Math.PI / 2, 0, -0.04]} scale={[18, 0.65, 1]} position={[1.5, -0.09, -10]} />

      {/* Palms */}
      <StaticInstances geometry={GEO.cyl} material={M.trunk} xforms={palms.trunk} />
      <StaticInstances geometry={GEO.coneLo} material={M.frond} xforms={palms.fronds} />

      {/* Parasol + loungers */}
      <group position={[4.4, 0, 1.6]}>
        <mesh geometry={GEO.cyl} scale={[0.04, 2.3, 0.04]} position={[-0.05, 1.15, -0.05]} rotation={[0.04, 0, 0.06]}>
          <meshStandardMaterial color="#e8e2d4" roughness={0.8} />
        </mesh>
        <mesh geometry={GEO.coneLo} scale={[1.25, 0.5, 1.25]} position={[-0.14, 2.34, -0.14]}>
          <meshStandardMaterial color="#e86a6a" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={GEO.sphereLo} scale={0.07} position={[-0.16, 2.62, -0.16]}>
          <meshStandardMaterial color="#fdf6e8" roughness={0.7} />
        </mesh>
      </group>
      <mesh geometry={GEO.box} scale={[0.72, 0.16, 1.7]} position={[5.7, 0.14, 2.6]} rotation={[-0.14, 0.3, 0]}>
        <meshStandardMaterial color="#f0e6d2" roughness={0.9} />
      </mesh>
      <mesh geometry={GEO.box} scale={[0.72, 0.16, 1.7]} position={[3.3, 0.14, 3]} rotation={[-0.14, -0.2, 0]}>
        <meshStandardMaterial color="#7fb5d4" roughness={0.9} />
      </mesh>

      {/* Shells / stones */}
      <StaticInstances geometry={GEO.sphereLo} material={M.shell} xforms={shells} />

      {/* Distant sail on the water */}
      <mesh geometry={GEO.coneLo} scale={[0.55, 1.2, 0.07]} position={[-8.5, 0.5, -13]} rotation={[0, 0.5, 0]}>
        <meshBasicMaterial color="#fdfaf2" toneMapped={false} transparent />
      </mesh>

      <Particles count={40} color="#dff2fa" size={0.045} area={[15, 4.5, 11]} center={[0, 2, -2]} motion="drift" sway={0.7} opacity={0.7} additive seed={55} />
    </>
  );
}
export const BeachWorld = React.memo(BeachWorldInner);

// ---------------------------------------------------------------------------
// Library — arcing bookcases, ladder, reading desk, pendant, dust
// ---------------------------------------------------------------------------

const BOOK_COLOURS = ["#8a4a3c", "#5a6a4a", "#4a5a7a", "#9a7a4a", "#6a4a6a", "#7a5a44"];

function LibraryWorldInner(): React.JSX.Element {
  const M = React.useMemo(
    () => ({
      bookcase: new THREE.MeshStandardMaterial({ color: "#3a281c", roughness: 0.9 }),
      books: new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: true }),
      wood: new THREE.MeshStandardMaterial({ color: "#54422e", roughness: 0.85 }),
      rail: new THREE.MeshStandardMaterial({ color: "#6a5234", roughness: 0.8 }),
      glow: new THREE.MeshBasicMaterial({ color: "#f8d889", toneMapped: false }),
    }),
    [],
  );

  const { cases, strips } = React.useMemo(() => {
    const cXf: XForm[] = [];
    const sXf: XForm[] = [];
    const yAxis = new THREE.Vector3(0, 1, 0);
    const angles = [-55, -33, -11, 11, 33, 55].map((d) => (d * Math.PI) / 180);
    angles.forEach((a, ci) => {
      const px = Math.sin(a) * 6.4;
      const pz = -Math.cos(a) * 6.4;
      cXf.push({ p: [px, 2.2, pz], r: [0, -a, 0], s: [1.9, 4.4, 0.5] });
      const rows = ci % 2 === 0 ? 3 : 4;
      for (let row = 0; row < rows; row++) {
        const local = new THREE.Vector3(0, 0, 0.3).applyAxisAngle(yAxis, -a);
        sXf.push({
          p: [px + local.x, 0.8 + row * 0.95, pz + local.z],
          r: [0, -a, 0],
          s: [1.5, 0.34, 0.12],
          c: BOOK_COLOURS[(ci + row) % BOOK_COLOURS.length],
        });
      }
    });
    return { cases: cXf, strips: sXf };
  }, []);

  const ladder = React.useMemo<XForm[]>(() => {
    const a = (11 * Math.PI) / 180;
    const radial: V3 = [Math.sin(a), 0, -Math.cos(a)];
    const tangent: V3 = [Math.cos(a), 0, Math.sin(a)];
    const base: V3 = [radial[0] * 5.1, 0.02, radial[2] * 5.1];
    const top: V3 = [radial[0] * 6.0, 3.5, radial[2] * 6.0];
    const xf: XForm[] = [];
    for (const side of [-0.19, 0.19]) {
      xf.push(
        cylinderBetween(
          [base[0] + tangent[0] * side, base[1], base[2] + tangent[2] * side],
          [top[0] + tangent[0] * side, top[1], top[2] + tangent[2] * side],
          0.032,
        ),
      );
    }
    for (let i = 0; i < 5; i++) {
      const f = 0.14 + i * 0.18;
      const px = base[0] + (top[0] - base[0]) * f;
      const py = base[1] + (top[1] - base[1]) * f;
      const pz = base[2] + (top[2] - base[2]) * f;
      xf.push(
        cylinderBetween(
          [px - tangent[0] * 0.19, py, pz - tangent[2] * 0.19],
          [px + tangent[0] * 0.19, py, pz + tangent[2] * 0.19],
          0.022,
        ),
      );
    }
    return xf;
  }, []);

  const { deskLegs, stacks } = React.useMemo(() => {
    const legs: XForm[] = [];
    for (const [dx, dz] of [
      [-0.62, -0.32],
      [0.62, -0.32],
      [-0.62, 0.32],
      [0.62, 0.32],
    ]) {
      legs.push({ p: [3.2 + dx, 0.36, -2.2 + dz], s: [0.05, 0.72, 0.05] });
    }
    const st: XForm[] = [];
    [
      { x: -3.0, z: -1.4, n: 4, ry: 0.3 },
      { x: -3.5, z: -0.8, n: 3, ry: 1.2 },
    ].forEach((stack, si) => {
      for (let i = 0; i < stack.n; i++) {
        st.push({
          p: [stack.x, 0.04 + i * 0.075, stack.z],
          r: [0, stack.ry + i * 0.5, 0],
          s: [0.34, 0.07, 0.26],
          c: BOOK_COLOURS[(si * 2 + i) % BOOK_COLOURS.length],
        });
      }
    });
    return { deskLegs: legs, stacks: st };
  }, []);

  return (
    <>
      <Sky top="#140c08" bottom="#2a1a12" />
      <Floor radius={9} color="#4a3424" roughness={0.85} />

      {/* Round rug */}
      <mesh geometry={GEO.cyl} scale={[2.6, 0.03, 2.6]} position={[0, 0.015, 0]}>
        <meshStandardMaterial color="#6a4a34" roughness={1} />
      </mesh>

      {/* Bookcases arcing behind, with book strips */}
      <StaticInstances geometry={GEO.box} material={M.bookcase} xforms={cases} />
      <StaticInstances geometry={GEO.box} material={M.books} xforms={strips} />

      {/* Leaning ladder */}
      <StaticInstances geometry={GEO.cyl} material={M.rail} xforms={ladder} />

      {/* Reading desk + lamp */}
      <group>
        <mesh geometry={GEO.box} material={M.wood} scale={[1.5, 0.06, 0.85]} position={[3.2, 0.75, -2.2]} castShadow />
        <StaticInstances geometry={GEO.box} material={M.wood} xforms={deskLegs} />
        <mesh geometry={GEO.cyl} scale={[0.025, 0.4, 0.025]} position={[3.6, 0.98, -2.4]}>
          <meshStandardMaterial color="#2a2018" roughness={0.7} />
        </mesh>
        <mesh geometry={GEO.sphereLo} material={M.glow} scale={0.14} position={[3.6, 1.2, -2.4]} />
        <mesh geometry={GEO.box} scale={[0.36, 0.03, 0.26]} position={[3, 0.8, -2.1]} rotation={[0, 0.4, 0]}>
          <meshStandardMaterial color="#d8cdb4" roughness={0.95} />
        </mesh>
      </group>

      {/* Near book stacks */}
      <StaticInstances geometry={GEO.box} material={M.books} xforms={stacks} />

      {/* Hanging pendant */}
      <mesh geometry={GEO.cyl} scale={[0.012, 1.7, 0.012]} position={[0, 4.25, -1.6]}>
        <meshStandardMaterial color="#1c130c" roughness={0.9} />
      </mesh>
      <mesh geometry={GEO.cyl} material={M.glow} scale={[0.38, 0.05, 0.38]} position={[0, 3.38, -1.6]} />

      <Particles count={60} color="#e8c898" size={0.035} area={[5, 3.2, 4]} center={[1.4, 1.7, -1.8]} motion="drift" sway={0.4} opacity={0.4} additive seed={66} />
    </>
  );
}
export const LibraryWorld = React.memo(LibraryWorldInner);

// ---------------------------------------------------------------------------
// Café — window light, counter, side tables, swaying bulbs, steam
// (centre stays clear — CouncilFurniture occupies it)
// ---------------------------------------------------------------------------

function CafeWorldInner(): React.JSX.Element {
  const fade = useFade();
  const M = React.useMemo(
    () => ({
      frame: new THREE.MeshStandardMaterial({ color: "#2a1a12", roughness: 0.85 }),
      pane: new THREE.MeshBasicMaterial({
        color: "#ffe9c8",
        transparent: true,
        opacity: 0.92,
        toneMapped: false,
        fog: false,
      }),
      counter: new THREE.MeshStandardMaterial({ color: "#3a2a20", roughness: 0.85 }),
      counterTop: new THREE.MeshStandardMaterial({ color: "#241a12", roughness: 0.6 }),
      menu: new THREE.MeshBasicMaterial({
        color: "#ffd9a0",
        transparent: true,
        opacity: 0.8,
        toneMapped: false,
      }),
      wood: new THREE.MeshStandardMaterial({ color: "#4a3326", roughness: 0.85 }),
      bulbCord: new THREE.MeshStandardMaterial({ color: "#17110c", roughness: 0.9 }),
      bulb: new THREE.MeshBasicMaterial({ color: "#ffd9a0", toneMapped: false }),
    }),
    [],
  );

  const { frame, mullions, menus, tableTops, tablePedestals, seats, seatPosts } =
    React.useMemo(() => {
      const f: XForm[] = [
        { p: [-2, 4.3, -6], s: [5.2, 0.22, 0.24] }, // header
        { p: [-2, 0.4, -6], s: [5.2, 0.22, 0.3] }, // sill
        { p: [-4.5, 2.35, -6], s: [0.2, 4.1, 0.24] }, // left post
        { p: [0.5, 2.35, -6], s: [0.2, 4.1, 0.24] }, // right post
      ];
      const m: XForm[] = [
        { p: [-2, 2.35, -5.98], s: [4.8, 0.1, 0.1] },
        { p: [-2, 2.35, -5.98], s: [0.1, 3.8, 0.1], r: [0, 0, Math.PI / 2] },
      ];
      const menu: XForm[] = [0, 1, 2].map((i) => ({
        p: [3.4 + i * 1.15, 3.1 - (i % 2) * 0.12, -6.05],
        s: [1.0, 0.3, 0.05],
      }));
      const spots: Array<{ x: number; z: number; ry: number }> = [
        { x: -6.2, z: 1.6, ry: 0.5 },
        { x: 6.4, z: -1.2, ry: -0.8 },
      ];
      const tops: XForm[] = spots.map((s) => ({ p: [s.x, 0.72, s.z], s: [0.45, 0.05, 0.45] }));
      const peds: XForm[] = spots.map((s) => ({ p: [s.x, 0.36, s.z], s: [0.07, 0.72, 0.07] }));
      const st: XForm[] = [];
      const sp: XForm[] = [];
      for (const s of spots) {
        const a = s.ry;
        const sx = s.x + Math.sin(a) * 0.75;
        const sz = s.z + Math.cos(a) * 0.75;
        st.push({ p: [sx, 0.45, sz], s: [0.26, 0.06, 0.26] });
        sp.push({ p: [sx, 0.22, sz], s: [0.05, 0.44, 0.05] });
      }
      return {
        frame: f,
        mullions: m,
        menus: menu,
        tableTops: tops,
        tablePedestals: peds,
        seats: st,
        seatPosts: sp,
      };
    }, []);

  const { cords, bulbXf } = React.useMemo(() => {
    const spots: V3[] = [
      [-3.2, 0, 2.2],
      [-1, 0, -3.4],
      [2.2, 0, 1.6],
      [4.6, 0, -2.2],
    ];
    const c: XForm[] = [];
    const b: XForm[] = [];
    spots.forEach((s, i) => {
      const len = 1.5 + (i % 2) * 0.5;
      c.push({ p: [s[0], 4.4 - len / 2, s[2]], s: [0.012, len, 0.012] });
      b.push({ p: [s[0], 4.4 - len - 0.07, s[2]], s: 0.07 });
    });
    return { cords: c, bulbXf: b };
  }, []);

  const bulbGroup = React.useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!fade.visible) return;
    const g = bulbGroup.current;
    if (g) g.rotation.z = Math.sin(clock.elapsedTime * 0.5) * 0.018;
  });

  return (
    <>
      <Sky top="#1b120c" bottom="#3a281e" />
      <Floor radius={10} color="#54382a" roughness={0.85} />

      {/* Window wall — glowing pane behind frame */}
      <mesh geometry={GEO.plane} material={M.pane} scale={[4.7, 3.7, 1]} position={[-2, 2.35, -6.08]} renderOrder={-7} />
      <StaticInstances geometry={GEO.box} material={M.frame} xforms={frame} />
      <StaticInstances geometry={GEO.box} material={M.frame} xforms={mullions} />

      {/* Counter + espresso machine + menu strips */}
      <mesh geometry={GEO.box} scale={[4.2, 3.2, 0.18]} position={[4.4, 1.6, -6.1]}>
        <meshStandardMaterial color="#2e211a" roughness={0.95} />
      </mesh>
      <mesh geometry={GEO.box} material={M.counter} scale={[3.6, 1.05, 1.1]} position={[4.4, 0.52, -4.6]} />
      <mesh geometry={GEO.box} material={M.counterTop} scale={[3.8, 0.07, 1.25]} position={[4.4, 1.08, -4.6]} />
      <mesh geometry={GEO.box} scale={[0.7, 0.5, 0.5]} position={[4, 1.37, -4.75]}>
        <meshStandardMaterial color="#52424a" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh geometry={GEO.box} scale={[0.34, 0.16, 0.3]} position={[4.8, 1.2, -4.7]}>
        <meshStandardMaterial color="#3c3038" roughness={0.5} metalness={0.4} />
      </mesh>
      <StaticInstances geometry={GEO.box} material={M.menu} xforms={menus} />

      {/* Side tables + simple seats at the edges (centre stays clear) */}
      <StaticInstances geometry={GEO.cyl} material={M.wood} xforms={tableTops} castShadow />
      <StaticInstances geometry={GEO.cyl} material={M.wood} xforms={tablePedestals} />
      <StaticInstances geometry={GEO.cyl} material={M.wood} xforms={seats} castShadow />
      <StaticInstances geometry={GEO.cyl} material={M.wood} xforms={seatPosts} />

      {/* Hanging bulbs, swaying gently */}
      <group ref={bulbGroup}>
        <StaticInstances geometry={GEO.cyl} material={M.bulbCord} xforms={cords} />
        <StaticInstances geometry={GEO.sphereLo} material={M.bulb} xforms={bulbXf} />
      </group>

      <PottedPlant position={[-5, 0, -4.2]} scale={1.2} />

      {/* Steam over the espresso machine + dust in the window light */}
      <Particles count={12} color="#f0e0d0" size={0.13} area={[0.5, 1.1, 0.4]} center={[4.1, 2.1, -4.7]} motion="rise" speed={0.3} sway={0.08} opacity={0.3} additive seed={77} />
      <Particles count={30} color="#ffe2b8" size={0.035} area={[4.2, 3, 3]} center={[-2, 1.8, -4.4]} motion="drift" sway={0.35} opacity={0.35} additive seed={88} />
    </>
  );
}
export const CafeWorld = React.memo(CafeWorldInner);
