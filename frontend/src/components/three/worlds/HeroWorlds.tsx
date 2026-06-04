"use client";

/**
 * HeroWorlds — 7 stylized backdrop scenes that crossfade behind the council
 * cinematic. Each world is a self-contained fragment of simple primitives
 * (gradient sky sphere, silhouette planes, ground plane, single mood disk)
 * with a single opacity input the parent toggles.
 *
 * Design rules enforced here:
 *   • NO geometry in front of z = 2.0 — characters live at HERO_LINE_Z = 3.4
 *     and must never be occluded by backdrop meshes.
 *   • NO lights inside worlds. Lighting is global (HeroLighting) so
 *     characters look identical across all 7 worlds.
 *   • NO shadow-casting from backdrop meshes. Only the ground plane
 *     receives shadows (from characters).
 *   • Draw-call budget per world: < 12. We stay well under by reusing
 *     primitives and avoiding sub-meshes.
 *   • All materials get transparent=true and a damped opacity so adjacent
 *     worlds can crossfade smoothly during the FALLING stage.
 */

import * as React from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Z plane the characters sit on. Worlds must stay behind LINE_Z - 1. */
const HERO_LINE_Z = 3.4;
/** Z behind which all backdrop meshes are anchored. */
const BACKDROP_FRONT_Z = HERO_LINE_Z - 1 - 0.4; // = 2.0
/** Sky-sphere radius — large enough to span every camera position. */
const SKY_RADIUS = 40;

/** Opacity damping half-life in seconds (matches the "smooth, not snapped"
 *  feel of the rest of the cinematic). */
const OPACITY_HALF_LIFE = 0.18;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WorldId =
  | "mountain"
  | "zen"
  | "forest"
  | "rooftop"
  | "beach"
  | "library"
  | "cafe";

export interface HeroWorldProps {
  /** Crossfade opacity 0–1; the scene mounts all 7 and toggles opacity. */
  opacity: number;
}

interface InternalProps extends HeroWorldProps {
  id: WorldId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertex-coloured sky-sphere helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a sky-sphere geometry whose vertex colours form a vertical gradient
 * from `topHex` (zenith) to `bottomHex` (horizon).
 */
function buildGradientSphere(topHex: string, bottomHex: string): THREE.SphereGeometry {
  const geo = new THREE.SphereGeometry(SKY_RADIUS, 32, 24);
  const top = new THREE.Color(topHex);
  const bottom = new THREE.Color(bottomHex);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / SKY_RADIUS; // -1..1
    const t = THREE.MathUtils.clamp((y + 1) / 2, 0, 1); // 0 horizon → 1 zenith
    tmp.copy(bottom).lerp(top, t);
    colours[i * 3 + 0] = tmp.r;
    colours[i * 3 + 1] = tmp.g;
    colours[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  return geo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface SkyProps {
  topHex: string;
  bottomHex: string;
}
function SkyDome({ topHex, bottomHex }: SkyProps) {
  const geo = React.useMemo(
    () => buildGradientSphere(topHex, bottomHex),
    [topHex, bottomHex],
  );
  return (
    <mesh geometry={geo} renderOrder={-10}>
      <meshBasicMaterial
        vertexColors
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
        transparent
        opacity={1}
      />
    </mesh>
  );
}

interface GroundProps {
  colour: string;
  /** Optional override for ground opacity-floor (used by interior worlds). */
  metalness?: number;
}
function Ground({ colour, metalness = 0 }: GroundProps) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.001, 0]}
      receiveShadow
      renderOrder={-5}
    >
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial
        color={colour}
        roughness={1}
        metalness={metalness}
        transparent
      />
    </mesh>
  );
}

interface DiskProps {
  colour: string;
  position: [number, number, number];
  radius?: number;
}
/** Flat camera-facing disk — sun, moon, lamp glow. */
function MoodDisk({ colour, position, radius = 2.4 }: DiskProps) {
  return (
    <mesh position={position} renderOrder={-8}>
      <circleGeometry args={[radius, 48]} />
      <meshBasicMaterial
        color={colour}
        transparent
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// World fragments
// ─────────────────────────────────────────────────────────────────────────────

function MountainWorld() {
  // Snow-capped triangles on a dark-blue alpine sky.
  const peakGeo = React.useMemo(() => {
    // A simple wide triangle, recoloured per instance via material.
    const g = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -6, 0, 0,
      6, 0, 0,
      0, 5.4, 0,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  const snowGeo = React.useMemo(() => {
    // Small snow cap glued to the top portion of the peak triangle.
    const g = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -2.2, 3.3, 0,
      2.2, 3.3, 0,
      0, 5.4, 0,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <>
      <SkyDome topHex="#1b3050" bottomHex="#4a78a8" />
      <Ground colour="#2d4868" />

      {/* Back ridge */}
      <group position={[-7, 0, -12]}>
        <mesh geometry={peakGeo} renderOrder={-7}>
          <meshBasicMaterial color="#21385a" transparent toneMapped={false} />
        </mesh>
        <mesh geometry={snowGeo} renderOrder={-6}>
          <meshBasicMaterial color="#c8dffb" transparent toneMapped={false} />
        </mesh>
      </group>

      <group position={[0, 0.4, -10]} scale={[1.2, 1.15, 1]}>
        <mesh geometry={peakGeo} renderOrder={-7}>
          <meshBasicMaterial color="#1d3252" transparent toneMapped={false} />
        </mesh>
        <mesh geometry={snowGeo} renderOrder={-6}>
          <meshBasicMaterial color="#c8dffb" transparent toneMapped={false} />
        </mesh>
      </group>

      <group position={[7.5, 0, -11]} scale={[1.05, 1, 1]}>
        <mesh geometry={peakGeo} renderOrder={-7}>
          <meshBasicMaterial color="#23395d" transparent toneMapped={false} />
        </mesh>
        <mesh geometry={snowGeo} renderOrder={-6}>
          <meshBasicMaterial color="#c8dffb" transparent toneMapped={false} />
        </mesh>
      </group>

      {/* Cold sun disk far back */}
      <MoodDisk colour="#dfeaff" position={[5, 6.5, -18]} radius={1.4} />
    </>
  );
}

function ZenWorld() {
  // Warm contemplative dusk with an oversized moon and abstract stones.
  const stoneGeo = React.useMemo(() => new THREE.CircleGeometry(1, 36), []);
  return (
    <>
      <SkyDome topHex="#f1c4a0" bottomHex="#c87a6e" />
      <Ground colour="#a87a64" />

      {/* Oversized moon */}
      <MoodDisk colour="#fde6c8" position={[0, 5.5, -14]} radius={4.6} />

      {/* Zen stones — abstract circles laid behind the line */}
      <group position={[-4, 0.05, -3]}>
        <mesh
          geometry={stoneGeo}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1.6, 1.6, 1]}
          renderOrder={-6}
        >
          <meshBasicMaterial color="#d8b59a" transparent toneMapped={false} />
        </mesh>
      </group>
      <group position={[-1.4, 0.05, -2.2]}>
        <mesh
          geometry={stoneGeo}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1.0, 1.0, 1]}
          renderOrder={-6}
        >
          <meshBasicMaterial color="#caa088" transparent toneMapped={false} />
        </mesh>
      </group>
      <group position={[3.8, 0.05, -3.2]}>
        <mesh
          geometry={stoneGeo}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[2.0, 2.0, 1]}
          renderOrder={-6}
        >
          <meshBasicMaterial color="#bf957c" transparent toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}

function ForestWorld() {
  // Vertical tree silhouettes through teal mist.
  const trunkGeo = React.useMemo(() => new THREE.PlaneGeometry(0.7, 9), []);
  const trees = React.useMemo(
    () => [
      { x: -8, z: -8, scale: 1.1 },
      { x: -5, z: -6, scale: 0.95 },
      { x: -2.4, z: -7.5, scale: 1.2 },
      { x: 1.2, z: -6.8, scale: 1.0 },
      { x: 4.3, z: -7.2, scale: 1.15 },
      { x: 7, z: -6.5, scale: 0.9 },
    ],
    [],
  );
  return (
    <>
      <SkyDome topHex="#1d3a32" bottomHex="#3a6a5c" />
      <Ground colour="#244a40" />

      {/* Tree trunks (silhouettes) */}
      {trees.map((t, i) => (
        <mesh
          key={i}
          geometry={trunkGeo}
          position={[t.x, 4.5 * t.scale, t.z]}
          scale={[1, t.scale, 1]}
          renderOrder={-7}
        >
          <meshBasicMaterial color="#0a1d1a" transparent toneMapped={false} />
        </mesh>
      ))}

      {/* Mist plane in front of trees, behind the line */}
      <mesh position={[0, 0.9, 0.5]} renderOrder={-6}>
        <planeGeometry args={[40, 2.2]} />
        <meshBasicMaterial
          color="#6da08a"
          transparent
          opacity={0.55}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

function RooftopWorld() {
  // Dusk skyline silhouette + low warm sun.
  const buildings = React.useMemo(
    () => [
      { x: -10, h: 5, w: 2.6 },
      { x: -7, h: 6.4, w: 2.2 },
      { x: -4.4, h: 4.2, w: 2.0 },
      { x: -1.8, h: 7.2, w: 2.4 },
      { x: 1.0, h: 5.6, w: 2.0 },
      { x: 3.6, h: 8.2, w: 2.6 },
      { x: 6.4, h: 6.0, w: 2.2 },
      { x: 9.2, h: 4.8, w: 2.4 },
    ],
    [],
  );
  return (
    <>
      <SkyDome topHex="#3a1f4a" bottomHex="#d97a5a" />
      <Ground colour="#2a1a2e" />

      {/* Sun disk low on the horizon */}
      <MoodDisk colour="#ffa873" position={[2.4, 2.6, -15]} radius={2.4} />

      {/* Skyline silhouette */}
      {buildings.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, b.h / 2, -10]}
          renderOrder={-7}
        >
          <planeGeometry args={[b.w, b.h]} />
          <meshBasicMaterial color="#110a18" transparent toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

function BeachWorld() {
  // Open sunset sky + horizon water strip + warm sun.
  return (
    <>
      <SkyDome topHex="#b8e1f0" bottomHex="#f3c98e" />
      <Ground colour="#e8c78a" />

      {/* Sun disk */}
      <MoodDisk colour="#fff8d8" position={[-1.6, 3.2, -14]} radius={2.0} />

      {/* Water horizon strip — far behind characters */}
      <mesh position={[0, 1.4, -8]} renderOrder={-7}>
        <planeGeometry args={[44, 1.6]} />
        <meshBasicMaterial color="#4ea2b5" transparent toneMapped={false} />
      </mesh>
    </>
  );
}

function LibraryWorld() {
  // Warm interior, two bookshelf silhouettes flanking, hanging lamp glow.
  return (
    <>
      <SkyDome topHex="#2a1a18" bottomHex="#6b4630" />
      <Ground colour="#3d2820" />

      {/* Left bookshelf — behind line, off to the side */}
      <mesh position={[-8.5, 3.8, -6]} renderOrder={-7}>
        <planeGeometry args={[5, 7.6]} />
        <meshBasicMaterial color="#1d100c" transparent toneMapped={false} />
      </mesh>
      {/* Subtle shelf lines, baked as one striped plane in front of shelf */}
      <mesh position={[-8.5, 3.8, -5.95]} renderOrder={-6}>
        <planeGeometry args={[4.6, 7.2]} />
        <meshBasicMaterial
          color="#3a221a"
          transparent
          opacity={0.35}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Right bookshelf */}
      <mesh position={[8.5, 3.8, -6]} renderOrder={-7}>
        <planeGeometry args={[5, 7.6]} />
        <meshBasicMaterial color="#1d100c" transparent toneMapped={false} />
      </mesh>
      <mesh position={[8.5, 3.8, -5.95]} renderOrder={-6}>
        <planeGeometry args={[4.6, 7.2]} />
        <meshBasicMaterial
          color="#3a221a"
          transparent
          opacity={0.35}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* Hanging lamp glow */}
      <MoodDisk colour="#f8d889" position={[0, 4.2, -7]} radius={1.6} />
    </>
  );
}

function CafeWorld() {
  // Warm café interior — bright window pane behind left wall + counter behind.
  return (
    <>
      <SkyDome topHex="#2c1f1a" bottomHex="#4a342b" />
      <Ground colour="#3a2a22" />

      {/* Soft warm window pane behind the left side */}
      <mesh position={[-6.4, 3.6, -7]} renderOrder={-7}>
        <planeGeometry args={[6.4, 5.2]} />
        <meshBasicMaterial
          color="#fff0d8"
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>
      {/* Window mullions — a thin cross over the pane */}
      <mesh position={[-6.4, 3.6, -6.97]} renderOrder={-6}>
        <planeGeometry args={[6.4, 0.18]} />
        <meshBasicMaterial color="#2a1a14" transparent toneMapped={false} />
      </mesh>
      <mesh position={[-6.4, 3.6, -6.97]} renderOrder={-6}>
        <planeGeometry args={[0.18, 5.2]} />
        <meshBasicMaterial color="#2a1a14" transparent toneMapped={false} />
      </mesh>

      {/* Counter silhouette behind characters */}
      <mesh position={[4, 1.3, -6]} renderOrder={-7}>
        <planeGeometry args={[9, 2.6]} />
        <meshBasicMaterial color="#1c1209" transparent toneMapped={false} />
      </mesh>

      {/* Warm ambient mood disk (overhead bulb) */}
      <MoodDisk colour="#ffd28a" position={[3.2, 4.6, -7.2]} radius={1.0} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HeroWorld renders one of the 7 stylized backdrops and damps every material
 * inside it toward the provided opacity. The parent mounts all 7 worlds and
 * toggles opacities — adjacent worlds will crossfade automatically.
 */
export function HeroWorld({ id, opacity }: InternalProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  // Track current eased opacity so we can hide the group when fully faded.
  const eased = React.useRef(opacity);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;

    const k = 1 - Math.pow(0.5, dt / OPACITY_HALF_LIFE);
    eased.current += (opacity - eased.current) * k;

    // Skip work entirely once fully faded — saves traversal cost.
    const visible = eased.current > 0.01;
    if (g.visible !== visible) g.visible = visible;
    if (!visible) return;

    const target = eased.current;
    g.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (!mat) return;

      if (Array.isArray(mat)) {
        for (const m of mat) applyOpacity(m, target);
      } else {
        applyOpacity(mat, target);
      }
    });
  });

  // Render the matching fragment.
  let content: React.ReactNode;
  switch (id) {
    case "mountain":
      content = <MountainWorld />;
      break;
    case "zen":
      content = <ZenWorld />;
      break;
    case "forest":
      content = <ForestWorld />;
      break;
    case "rooftop":
      content = <RooftopWorld />;
      break;
    case "beach":
      content = <BeachWorld />;
      break;
    case "library":
      content = <LibraryWorld />;
      break;
    case "cafe":
      content = <CafeWorld />;
      break;
  }

  return (
    <group ref={groupRef} visible={opacity > 0.01}>
      {content}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────────

/** Push a material's opacity toward `target` in a way that respects the
 *  material's "base" opacity baked at author time (mist plane, window pane,
 *  etc.). We treat the author-time opacity as the ceiling so faded layers
 *  still read correctly when fully revealed. */
function applyOpacity(mat: THREE.Material, target: number): void {
  // Stash the original authored opacity once.
  const stash = mat as THREE.Material & { __baseOpacity?: number };
  if (stash.__baseOpacity === undefined) {
    stash.__baseOpacity = mat.opacity ?? 1;
  }
  mat.transparent = true;
  mat.opacity = stash.__baseOpacity * target;
  // Avoid z-fight artefacts during crossfade — disable depthWrite while
  // partially transparent, restore when fully opaque.
  // (We only flip if the user didn't explicitly set depthWrite=false.)
  if (target < 0.999) {
    if (mat.depthWrite !== false) mat.depthWrite = false;
  }
}

/** Static, exported just for parent code that wants to know the ordering
 *  used by the FALLING crossfade timeline. */
export const HERO_WORLD_ORDER: ReadonlyArray<WorldId> = [
  "mountain",
  "zen",
  "forest",
  "rooftop",
  "beach",
  "library",
  "cafe",
];
