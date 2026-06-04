"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Zen Garden — serene, dusk.
 *
 * A Japanese garden at golden hour: raked-sand rings around the council, a
 * koi pond crossed by a small vermillion bridge, drifting cherry blossom
 * petals, glowing stone + paper lanterns, swaying bamboo, a torii gate on
 * the horizon and fireflies waking up in the dusk.
 */
export default function ZenGardenEnv() {
  return (
    <>
      <color attach="background" args={["#1b1530"]} />
      <fog attach="fog" args={["#2c2440", 16, 40]} />

      {/* Dusk sky */}
      <GradientDome topColor="#241d44" bottomColor="#e6a06f" />

      {/* Lighting — warm low sun + soft fill */}
      <ambientLight intensity={0.5} color="#e7c79c" />
      <hemisphereLight args={["#caa0d8", "#c9b487", 0.5]} />
      <directionalLight
        position={[-7, 4.5, 3]}
        intensity={0.95}
        color="#ffce93"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[5, 6, -4]} intensity={0.3} color="#9aa6d8" />

      {/* Sand floor + raked rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial color="#d2c3a0" roughness={1} />
      </mesh>
      <RakedRings />

      {/* Feature rocks */}
      {FEATURE_ROCKS.map((r, i) => (
        <mesh
          key={i}
          position={[r.x, r.s * 0.32, r.z]}
          scale={[r.s, r.s * 0.7, r.s]}
          rotation={[0, r.ry, 0]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#5f5a52" roughness={0.97} flatShading />
        </mesh>
      ))}

      {/* Koi pond with bridge */}
      <KoiPond center={[-5.3, 0, 2.1]} />

      {/* Cherry blossom trees */}
      <BlossomTree position={[5.6, 0, -3.2]} scale={1.15} />
      <BlossomTree position={[-6.2, 0, -3.8]} scale={0.95} />
      <BlossomTree position={[4.6, 0, 4.4]} scale={1.0} />

      {/* Bamboo groves */}
      <BambooClump position={[7.6, 0, 0.6]} count={6} />
      <BambooClump position={[-8.2, 0, -0.8]} count={5} />
      <BambooClump position={[2.4, 0, -5.6]} count={4} />

      {/* Stone lanterns */}
      <StoneLantern position={[3.0, 0, 2.7]} />
      <StoneLantern position={[-2.9, 0, -3.4]} />
      <StoneLantern position={[6.4, 0, 1.6]} />

      {/* Hanging paper lanterns */}
      <PaperLanternString />

      {/* Stepping-stone path */}
      {STEPPING_STONES.map((s, i) => (
        <mesh key={i} position={[s.x, 0.04, s.z]} rotation={[0, s.ry, 0]} receiveShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.08, 14]} />
          <meshStandardMaterial color="#6b665d" roughness={0.95} />
        </mesh>
      ))}

      {/* Torii gate on the horizon */}
      <ToriiGate position={[1.5, 0, -9]} />

      {/* Council seating — stone discs with cushions */}
      {SEAT_ANGLES.map((angle, i) => {
        const r = 2.78;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const ry = Math.atan2(-x, -z);
        return <ZenSeat key={i} position={[x, 0, z]} rotationY={ry} />;
      })}

      {/* Drifting cherry blossom petals */}
      <Petals count={62} />

      {/* Fireflies waking up at dusk */}
      <Fireflies count={26} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

const SEAT_ANGLES: number[] = (() => {
  const span = (Math.PI * 4) / 3;
  const start = -Math.PI / 2 - span / 2;
  return [0, 1, 2, 3, 4].map((i) => start + (i / 4) * span);
})();

const FEATURE_ROCKS = [
  { x: 4.3, z: -0.6, s: 0.7, ry: 0.5 },
  { x: 4.9, z: -1.3, s: 0.42, ry: 1.4 },
  { x: -3.7, z: 4.6, s: 0.6, ry: 2.1 },
];

const STEPPING_STONES = [
  { x: -2.3, z: 3.5, ry: 0.3 },
  { x: -3.3, z: 3.0, ry: 0.9 },
  { x: -4.1, z: 2.6, ry: 0.2 },
  { x: 1.7, z: 4.4, ry: 1.1 },
  { x: 2.7, z: 5.0, ry: 0.6 },
];

/* ------------------------------------------------------------------ */
/* Soft sprite texture (client-only)                                   */
/* ------------------------------------------------------------------ */

function makeGlowTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Gradient sky dome                                                   */
/* ------------------------------------------------------------------ */

function GradientDome({
  topColor,
  bottomColor,
}: {
  topColor: string;
  bottomColor: string;
}) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 32, 24);
    const top = new THREE.Color(topColor);
    const bot = new THREE.Color(bottomColor);
    const tmp = new THREE.Color();
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const t = THREE.MathUtils.clamp((pos.getY(i) + 1) / 2, 0, 1);
      tmp.copy(bot).lerp(top, Math.pow(t, 0.8));
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [topColor, bottomColor]);

  return (
    <mesh geometry={geo} scale={[60, 60, 60]}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Raked sand rings                                                    */
/* ------------------------------------------------------------------ */

function RakedRings() {
  const rings = useMemo(() => {
    const out: number[] = [];
    for (let r = 3.5; r <= 8.2; r += 0.62) out.push(r);
    return out;
  }, []);

  return (
    <group position={[0, 0.03, 0]}>
      {rings.map((r, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <torusGeometry args={[r, 0.05, 6, 96]} />
          <meshStandardMaterial color="#e2d6b6" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Koi pond                                                            */
/* ------------------------------------------------------------------ */

function KoiPond({ center }: { center: [number, number, number] }) {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!waterRef.current) return;
    const mat = waterRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 0.8) * 0.12;
  });

  const rim = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        return {
          x: Math.cos(a) * 2.35,
          z: Math.sin(a) * 1.7,
          s: 0.16 + Math.random() * 0.12,
        };
      }),
    [],
  );

  return (
    <group position={center}>
      {/* Water surface (elliptical) */}
      <mesh
        ref={waterRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
        scale={[2.25, 1.6, 1]}
      >
        <circleGeometry args={[1, 48]} />
        <meshStandardMaterial
          color="#173a44"
          emissive="#2f7c8a"
          emissiveIntensity={0.32}
          roughness={0.25}
          metalness={0.5}
        />
      </mesh>

      {/* Stone rim */}
      {rim.map((r, i) => (
        <mesh key={i} position={[r.x, 0.06, r.z]} castShadow receiveShadow>
          <dodecahedronGeometry args={[r.s, 0]} />
          <meshStandardMaterial color="#615c54" roughness={0.96} flatShading />
        </mesh>
      ))}

      {/* Koi */}
      <Koi color="#e8742e" rx={1.55} rz={1.0} speed={0.42} phase={0} />
      <Koi color="#f1ece1" rx={1.2} rz={0.78} speed={0.55} phase={2.3} />
      <Koi color="#e8742e" rx={1.7} rz={1.1} speed={0.34} phase={4.1} />
      <Koi color="#2a2622" rx={0.95} rz={0.62} speed={0.62} phase={5.5} />

      {/* Arched bridge */}
      <ArchBridge rotationY={0.5} />
    </group>
  );
}

function Koi({
  color,
  rx,
  rz,
  speed,
  phase,
}: {
  color: string;
  rx: number;
  rz: number;
  speed: number;
  phase: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase;
    const g = groupRef.current;
    if (!g) return;
    const x = Math.cos(t) * rx;
    const z = Math.sin(t * 1.1) * rz;
    g.position.set(x, 0.12 + Math.sin(t * 2) * 0.015, z);
    // Face direction of travel.
    const nx = -Math.sin(t) * rx;
    const nz = Math.cos(t * 1.1) * 1.1 * rz;
    g.rotation.y = Math.atan2(nx, nz);
    if (bodyRef.current) {
      bodyRef.current.rotation.y = Math.sin(clock.elapsedTime * 6 + phase) * 0.22;
    }
  });

  return (
    <group ref={groupRef}>
      <group ref={bodyRef}>
        {/* Body */}
        <mesh scale={[0.13, 0.07, 0.32]}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
        {/* Tail */}
        <mesh position={[0, 0, -0.34]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.11, 0.2, 8]} />
          <meshStandardMaterial color={color} roughness={0.55} transparent opacity={0.92} />
        </mesh>
      </group>
    </group>
  );
}

function ArchBridge({ rotationY }: { rotationY: number }) {
  const planks = 9;
  const span = 3.4;
  const archH = 0.6;

  return (
    <group position={[0, 0, 0]} rotation={[0, rotationY, 0]}>
      {/* Deck planks following a shallow arch */}
      {Array.from({ length: planks }).map((_, i) => {
        const u = i / (planks - 1);
        const x = (u - 0.5) * span;
        const y = 0.34 + Math.sin(u * Math.PI) * archH;
        const tilt = Math.cos(u * Math.PI) * 0.62;
        return (
          <mesh key={i} position={[x, y, 0]} rotation={[0, 0, tilt]} castShadow>
            <boxGeometry args={[(span / planks) * 1.2, 0.09, 1.15]} />
            <meshStandardMaterial color="#a83f30" roughness={0.7} />
          </mesh>
        );
      })}
      {/* Railing posts */}
      {[-0.5, 0.5].map((side) =>
        [0.12, 0.37, 0.63, 0.88].map((u, j) => {
          const x = (u - 0.5) * span;
          const y = 0.34 + Math.sin(u * Math.PI) * archH;
          return (
            <mesh key={`${side}-${j}`} position={[x, y + 0.27, side]} castShadow>
              <boxGeometry args={[0.08, 0.5, 0.08]} />
              <meshStandardMaterial color="#8d3527" roughness={0.7} />
            </mesh>
          );
        }),
      )}
      {/* Top rails */}
      {[-0.5, 0.5].map((side) => (
        <mesh key={side} position={[0, 0.92, side]} castShadow>
          <boxGeometry args={[span * 0.96, 0.07, 0.07]} />
          <meshStandardMaterial color="#9a3b2e" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cherry blossom tree                                                 */
/* ------------------------------------------------------------------ */

function BlossomTree({
  position,
  scale,
}: {
  position: [number, number, number];
  scale: number;
}) {
  const canopyRef = useRef<THREE.Group>(null);

  const blossoms = useMemo(
    () =>
      Array.from({ length: 11 }, () => ({
        x: (Math.random() - 0.5) * 2.2,
        y: 2.6 + Math.random() * 1.4,
        z: (Math.random() - 0.5) * 2.2,
        s: 0.55 + Math.random() * 0.55,
        pink: Math.random() < 0.5 ? "#f7c2d8" : "#fbd9e6",
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (canopyRef.current) {
      canopyRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.7 + position[0]) * 0.035;
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.26, 2.6, 8]} />
        <meshStandardMaterial color="#4a3526" roughness={0.95} />
      </mesh>
      {/* Branches */}
      {[
        [0.5, 2.3, 0.2, 0.5],
        [-0.5, 2.5, -0.3, -0.6],
        [0.1, 2.7, -0.5, 0.2],
      ].map((b, i) => (
        <mesh
          key={i}
          position={[b[0], b[1], b[2]]}
          rotation={[0, 0, b[3]]}
          castShadow
        >
          <cylinderGeometry args={[0.06, 0.1, 1.4, 6]} />
          <meshStandardMaterial color="#4a3526" roughness={0.95} />
        </mesh>
      ))}
      {/* Blossom canopy */}
      <group ref={canopyRef}>
        {blossoms.map((b, i) => (
          <mesh key={i} position={[b.x, b.y, b.z]} castShadow>
            <sphereGeometry args={[b.s, 12, 10]} />
            <meshStandardMaterial
              color={b.pink}
              emissive="#e98fb4"
              emissiveIntensity={0.22}
              roughness={0.85}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Bamboo                                                              */
/* ------------------------------------------------------------------ */

function BambooClump({
  position,
  count,
}: {
  position: [number, number, number];
  count: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const stalks = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 1.4,
        z: (Math.random() - 0.5) * 1.4,
        h: 3.4 + Math.random() * 2.4,
        rad: 0.07 + Math.random() * 0.04,
        tilt: (Math.random() - 0.5) * 0.12,
        phase: Math.random() * Math.PI * 2,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const s = stalks[i];
      child.rotation.z = s.tilt + Math.sin(t * 0.9 + s.phase) * 0.05;
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {stalks.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, 0, s.tilt]}>
          <mesh position={[0, s.h / 2, 0]} castShadow>
            <cylinderGeometry args={[s.rad, s.rad * 1.15, s.h, 8]} />
            <meshStandardMaterial color="#6f8a3c" roughness={0.8} />
          </mesh>
          {/* Leaf tuft at the top */}
          <mesh position={[0, s.h + 0.2, 0]}>
            <coneGeometry args={[0.5, 1.0, 6]} />
            <meshStandardMaterial color="#5d7d33" roughness={0.85} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Stone lantern (ishidoro)                                            */
/* ------------------------------------------------------------------ */

function StoneLantern({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (lightRef.current) {
      lightRef.current.intensity = 0.9 + Math.sin(clock.elapsedTime * 3.5 + position[0]) * 0.18;
    }
  });

  const stone = "#807a70";
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.32, 0.38, 0.24, 8]} />
        <meshStandardMaterial color={stone} roughness={0.95} />
      </mesh>
      {/* Post */}
      <mesh position={[0, 0.52, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.6, 8]} />
        <meshStandardMaterial color={stone} roughness={0.95} />
      </mesh>
      {/* Light housing */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.42, 0.4, 0.42]} />
        <meshStandardMaterial color={stone} roughness={0.95} />
      </mesh>
      {/* Glowing core */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.24, 0.26, 0.24]} />
        <meshStandardMaterial
          color="#fff0c0"
          emissive="#ffb84d"
          emissiveIntensity={2.6}
          toneMapped={false}
        />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.26, 0]} castShadow>
        <coneGeometry args={[0.42, 0.34, 6]} />
        <meshStandardMaterial color={stone} roughness={0.95} flatShading />
      </mesh>
      {/* Finial */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.95, 0]}
        color="#ffba55"
        intensity={0.95}
        distance={5}
        decay={2}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Hanging paper lanterns                                              */
/* ------------------------------------------------------------------ */

function PaperLanternString() {
  const groupRef = useRef<THREE.Group>(null);

  const lanterns = useMemo(
    () =>
      [-4, -2, 0, 2, 4].map((x, i) => ({
        x,
        y: 3.5 - Math.cos((i / 4 - 0.5) * Math.PI) * 0.6,
        color: i % 2 === 0 ? "#ff8f6a" : "#ffd27a",
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={[0.5, 0, -4.5]}>
      {/* Cord */}
      <mesh position={[0, 3.55, 0]}>
        <boxGeometry args={[9, 0.025, 0.025]} />
        <meshStandardMaterial color="#2a2018" />
      </mesh>
      {lanterns.map((l, i) => (
        <group key={i} position={[l.x, l.y, 0]}>
          {/* Drop string */}
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.36, 5]} />
            <meshStandardMaterial color="#2a2018" />
          </mesh>
          {/* Lantern body */}
          <mesh scale={[1, 1.15, 1]}>
            <sphereGeometry args={[0.28, 16, 14]} />
            <meshStandardMaterial
              color={l.color}
              emissive={l.color}
              emissiveIntensity={1.5}
              toneMapped={false}
            />
          </mesh>
          {/* Caps */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 8]} />
            <meshStandardMaterial color="#2a2018" />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 8]} />
            <meshStandardMaterial color="#2a2018" />
          </mesh>
        </group>
      ))}
      {/* One representative warm light for the string */}
      <pointLight position={[0, 3.0, 0.5]} color="#ffb070" intensity={0.7} distance={7} decay={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Torii gate                                                          */
/* ------------------------------------------------------------------ */

function ToriiGate({ position }: { position: [number, number, number] }) {
  const vermillion = "#c5392b";
  return (
    <group position={position}>
      {/* Pillars */}
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} position={[x, 2.0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.26, 4.0, 12]} />
          <meshStandardMaterial color={vermillion} roughness={0.7} emissive="#5a1410" emissiveIntensity={0.25} />
        </mesh>
      ))}
      {/* Lower tie beam */}
      <mesh position={[0, 3.0, 0]} castShadow>
        <boxGeometry args={[4.2, 0.26, 0.34]} />
        <meshStandardMaterial color={vermillion} roughness={0.7} />
      </mesh>
      {/* Top beam (kasagi) — slight upward sweep via two angled spans */}
      <mesh position={[0, 4.05, 0]} castShadow>
        <boxGeometry args={[5.2, 0.34, 0.5]} />
        <meshStandardMaterial color="#3a1410" roughness={0.7} />
      </mesh>
      <mesh position={[0, 3.78, 0]} castShadow>
        <boxGeometry args={[4.7, 0.2, 0.4]} />
        <meshStandardMaterial color={vermillion} roughness={0.7} />
      </mesh>
      {/* Centre strut */}
      <mesh position={[0, 3.45, 0]} castShadow>
        <boxGeometry args={[0.3, 0.7, 0.3]} />
        <meshStandardMaterial color={vermillion} roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Council seat — stone disc + cushion                                 */
/* ------------------------------------------------------------------ */

function ZenSeat({
  position,
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Stone disc */}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.44, 0.32, 18]} />
        <meshStandardMaterial color="#6c665c" roughness={0.96} />
      </mesh>
      {/* Cushion (zabuton) */}
      <mesh position={[0, 0.37, 0]} castShadow>
        <boxGeometry args={[0.62, 0.12, 0.62]} />
        <meshStandardMaterial color="#7d2f3a" roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Drifting cherry blossom petals                                      */
/* ------------------------------------------------------------------ */

function Petals({ count }: { count: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const tex = useMemo(makeGlowTexture, []);

  const petals = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 20,
        y: 1 + Math.random() * 8,
        z: (Math.random() - 0.5) * 18,
        fall: 0.3 + Math.random() * 0.5,
        sway: 0.4 + Math.random() * 0.7,
        swaySpeed: 0.5 + Math.random() * 0.9,
        spin: (Math.random() - 0.5) * 2,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.5 ? "#f9c4da" : "#fbdbe8",
      })),
    [count],
  );

  useFrame(({ clock }, dt) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const p = petals[i];
      child.position.y -= p.fall * dt;
      child.position.x = p.x + Math.sin(t * p.swaySpeed + p.phase) * p.sway;
      child.rotation.x = t * p.spin;
      child.rotation.z = t * p.spin * 0.7 + p.phase;
      if (child.position.y < 0.1) {
        child.position.y = 8 + Math.random() * 2;
        p.x = (Math.random() - 0.5) * 20;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {petals.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <planeGeometry args={[0.17, 0.11]} />
          <meshBasicMaterial
            map={tex ?? undefined}
            color={p.color}
            transparent
            opacity={0.92}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Fireflies                                                           */
/* ------------------------------------------------------------------ */

function Fireflies({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const tex = useMemo(makeGlowTexture, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = 0.6 + Math.random() * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);

  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        ax: 0.3 + Math.random() * 0.6,
        ay: 0.2 + Math.random() * 0.4,
        sx: 0.2 + Math.random() * 0.5,
        sy: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      })),
    [count],
  );

  const base = useMemo(
    () => Float32Array.from(geometry.attributes.position.array as Float32Array),
    [geometry],
  );

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.elapsedTime;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const d = data[i];
      pos[i * 3] = base[i * 3] + Math.sin(t * d.sx + d.phase) * d.ax;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * d.sy + d.phase) * d.ay;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * d.sx * 0.8 + d.phase) * d.ax;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    if (matRef.current) {
      matRef.current.opacity = 0.55 + Math.sin(t * 2.2) * 0.35;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        map={tex ?? undefined}
        color="#eaff9e"
        size={0.22}
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
