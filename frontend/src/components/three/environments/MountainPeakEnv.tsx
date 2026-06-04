"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Mountain Peak — crisp, alpine night.
 *
 * A snow-dusted summit above the clouds: falling snow, three aurora ribbons
 * rippling overhead, a flickering campfire with rising embers, a ring of
 * distant peaks and a slow sea of cloud drifting below the ridge.
 *
 * Everything is procedural (no textures shipped) — a couple of soft radial
 * sprite textures are generated on the client so snow / embers read as soft
 * round glows rather than hard squares.
 */
export default function MountainPeakEnv() {
  return (
    <>
      <color attach="background" args={["#070b1a"]} />
      <fog attach="fog" args={["#0c1430", 13, 36]} />

      {/* Gradient night sky + celestial bodies */}
      <GradientDome topColor="#05070f" bottomColor="#243a6e" />
      <Stars count={150} />
      <Moon position={[-8, 7.5, -15]} />

      {/* Lighting — cool moonlight balanced by warm fire bounce */}
      <ambientLight intensity={0.4} color="#9fb4e6" />
      <hemisphereLight args={["#46598f", "#e4ecff", 0.55]} />
      <directionalLight
        position={[-6, 9, -3]}
        intensity={0.75}
        color="#cfe0ff"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 1.5, 0]} intensity={1.7} color="#ff9a48" distance={9} decay={1.8} />

      {/* Snow ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[64, 64]} />
        <meshStandardMaterial color="#dbe4f5" roughness={0.96} metalness={0.02} />
      </mesh>

      {/* Soft snow mounds for relief */}
      {SNOW_MOUNDS.map((m, i) => (
        <mesh
          key={i}
          position={[m.x, m.y, m.z]}
          scale={[m.s, m.s * 0.32, m.s]}
          receiveShadow
          castShadow
        >
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#e7eefb" roughness={0.95} />
        </mesh>
      ))}

      {/* Faint aurora glow reflected on the snow */}
      <AuroraFloorGlow />

      {/* Distant summit ring + the cloud sea below the ridge */}
      <DistantPeaks />
      <CloudSea />

      {/* Aurora ribbons */}
      <Aurora />

      {/* Campfire at the centre */}
      <Campfire />

      {/* Snow-capped log seats around the fire */}
      {SEAT_ANGLES.map((angle, i) => {
        const r = 2.78;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const ry = Math.atan2(-x, -z);
        return <SnowLog key={i} position={[x, 0, z]} rotationY={ry} />;
      })}

      {/* Falling snow */}
      <Snowfall count={280} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

// 5 seats spread across a 240° arc, matching COUNCIL_POSITIONS_CIRCLE.
const SEAT_ANGLES: number[] = (() => {
  const span = (Math.PI * 4) / 3;
  const start = -Math.PI / 2 - span / 2;
  return [0, 1, 2, 3, 4].map((i) => start + (i / 4) * span);
})();

// Ember particle count for the campfire.
const EMBER_COUNT = 36;

const SNOW_MOUNDS = [
  { x: -4.6, y: 0.0, z: 2.6, s: 1.7 },
  { x: 5.2, y: 0.0, z: 1.4, s: 2.1 },
  { x: 3.4, y: 0.0, z: -3.8, s: 1.4 },
  { x: -5.4, y: 0.0, z: -2.2, s: 1.9 },
  { x: 0.6, y: 0.0, z: 4.6, s: 1.5 },
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
  g.addColorStop(0.45, "rgba(255,255,255,0.65)");
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
      tmp.copy(bot).lerp(top, Math.pow(t, 0.7));
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
/* Stars                                                               */
/* ------------------------------------------------------------------ */

function Stars({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const tex = useMemo(makeGlowTexture, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Random direction on the upper hemisphere.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.85 + 0.05);
      const r = 42;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.9 + 3;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.elapsedTime * 0.006;
    }
    if (matRef.current) {
      matRef.current.opacity = 0.7 + Math.sin(clock.elapsedTime * 0.8) * 0.2;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        ref={matRef}
        map={tex ?? undefined}
        color="#dce6ff"
        size={0.45}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Moon                                                                */
/* ------------------------------------------------------------------ */

function Moon({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[1.3, 28, 28]} />
        <meshStandardMaterial
          color="#f4f6ff"
          emissive="#dfe6ff"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.1, 22, 22]} />
        <meshBasicMaterial
          color="#aebfe8"
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Distant peaks                                                       */
/* ------------------------------------------------------------------ */

function DistantPeaks() {
  const peaks = useMemo(() => {
    const out: Array<{
      pos: [number, number, number];
      h: number;
      rad: number;
      ry: number;
    }> = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.18;
      const dist = 17 + Math.random() * 9;
      const h = 5.5 + Math.random() * 9;
      out.push({
        pos: [Math.cos(angle) * dist, h / 2 - 1.2, Math.sin(angle) * dist],
        h,
        rad: 2.6 + Math.random() * 2.6,
        ry: Math.random() * Math.PI,
      });
    }
    return out;
  }, []);

  return (
    <group>
      {peaks.map((p, i) => (
        <group key={i} position={p.pos} rotation={[0, p.ry, 0]}>
          {/* Rock body */}
          <mesh>
            <coneGeometry args={[p.rad, p.h, 5]} />
            <meshStandardMaterial color="#1c2640" roughness={1} flatShading />
          </mesh>
          {/* Snow cap */}
          <mesh position={[0, p.h * 0.32, 0]}>
            <coneGeometry args={[p.rad * 0.46, p.h * 0.36, 5]} />
            <meshStandardMaterial
              color="#e9f0ff"
              emissive="#7e93c8"
              emissiveIntensity={0.25}
              roughness={0.9}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cloud sea drifting below the ridge                                  */
/* ------------------------------------------------------------------ */

function CloudSea() {
  const groupRef = useRef<THREE.Group>(null);
  const clouds = useMemo(
    () =>
      Array.from({ length: 9 }, () => ({
        x: (Math.random() - 0.5) * 40,
        y: -1.7 + Math.random() * 1.5,
        z: -12 - Math.random() * 12,
        s: 3.5 + Math.random() * 4.5,
        speed: 0.12 + Math.random() * 0.18,
      })),
    [],
  );

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      child.position.x += clouds[i].speed * dt;
      if (child.position.x > 24) child.position.x = -24;
    });
  });

  return (
    <group ref={groupRef}>
      {clouds.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, c.z]} scale={[c.s, c.s * 0.32, c.s * 0.7]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial
            color="#c5d2ec"
            emissive="#9aaad2"
            emissiveIntensity={0.35}
            transparent
            opacity={0.62}
            depthWrite={false}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Aurora                                                              */
/* ------------------------------------------------------------------ */

function Aurora() {
  return (
    <group>
      <AuroraRibbon y={7.4} z={-10} width={20} height={5.4} color="#4dffb0" phase={0} speed={0.5} />
      <AuroraRibbon y={8.6} z={-12} width={24} height={6.2} color="#5ec8ff" phase={2.1} speed={0.36} />
      <AuroraRibbon y={6.4} z={-8.5} width={17} height={4.4} color="#a98bff" phase={4.2} speed={0.62} />
    </group>
  );
}

function AuroraRibbon({
  y,
  z,
  width,
  height,
  color,
  phase,
  speed,
}: {
  y: number;
  z: number;
  width: number;
  height: number;
  color: string;
  phase: number;
  speed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geo = useMemo(
    () => new THREE.PlaneGeometry(width, height, 44, 6),
    [width, height],
  );
  const base = useMemo(
    () => Float32Array.from(geo.attributes.position.array as Float32Array),
    [geo],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      const bx = base[i];
      const by = base[i + 1];
      // Ripple toward / away from the viewer.
      pos[i + 2] =
        Math.sin(bx * 0.5 + t * speed + phase) * 1.05 +
        Math.sin(bx * 0.95 - t * speed * 0.6 + by * 0.8) * 0.45;
      // Gentle horizontal sway.
      pos[i] = bx + Math.sin(by * 1.4 + t * 0.6 + phase) * 0.35;
    }
    geo.attributes.position.needsUpdate = true;

    if (meshRef.current) {
      const m = meshRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.13 + (Math.sin(t * 0.5 + phase) * 0.5 + 0.5) * 0.16;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geo} position={[0, y, z]} rotation={[-0.22, 0, 0.05]}>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

function AuroraFloorGlow() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.opacity = 0.05 + (Math.sin(clock.elapsedTime * 0.5) * 0.5 + 0.5) * 0.07;
    }
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2]}>
      <planeGeometry args={[26, 22]} />
      <meshBasicMaterial
        ref={matRef}
        color="#4fd9c0"
        transparent
        opacity={0.08}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Campfire                                                            */
/* ------------------------------------------------------------------ */

function Campfire() {
  const flameRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const emberRef = useRef<THREE.Points>(null);
  const tex = useMemo(makeGlowTexture, []);

  const logs = useMemo(
    () => [0, 1, 2, 3].map((i) => ({ angle: (i / 4) * Math.PI * 2, len: 0.62 })),
    [],
  );

  // Ember particle field rising from the fire.
  const emberGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(EMBER_COUNT * 3);
    for (let i = 0; i < EMBER_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 1] = Math.random() * 1.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  const emberData = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, () => ({
        speed: 0.5 + Math.random() * 0.7,
        sway: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      })),
    [],
  );

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (flameRef.current) {
      const s = 1 + Math.sin(t * 9) * 0.12 + Math.sin(t * 17) * 0.06;
      flameRef.current.scale.set(s, s + 0.14, s);
      flameRef.current.rotation.y = t * 0.6;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.9 + Math.sin(t * 11) * 0.45 + Math.sin(t * 23) * 0.2;
    }
    if (emberRef.current) {
      const pos = emberRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < EMBER_COUNT; i++) {
        const d = emberData[i];
        pos[i * 3 + 1] += d.speed * dt;
        pos[i * 3] += Math.sin(t * 1.6 + d.phase) * d.sway * dt;
        if (pos[i * 3 + 1] > 2.4) {
          pos[i * 3] = (Math.random() - 0.5) * 0.4;
          pos[i * 3 + 1] = 0.1;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
        }
      }
      emberRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Stone ring */}
      {Array.from({ length: 9 }).map((_, i) => {
        const a = (i / 9) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.6, 0.08, Math.sin(a) * 0.6]} castShadow>
            <dodecahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial color="#3a3f4d" roughness={0.95} />
          </mesh>
        );
      })}

      {/* Crossed logs */}
      {logs.map((l, i) => (
        <mesh
          key={i}
          position={[0, 0.12, 0]}
          rotation={[Math.PI / 2.6, l.angle, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.06, 0.07, l.len, 8]} />
          <meshStandardMaterial color="#2c1a10" roughness={0.95} />
        </mesh>
      ))}

      {/* Flame — stacked emissive cones */}
      <group ref={flameRef} position={[0, 0.3, 0]}>
        <mesh>
          <coneGeometry args={[0.26, 0.7, 12]} />
          <meshStandardMaterial
            color="#ff7a2e"
            emissive="#ff6a1e"
            emissiveIntensity={3}
            transparent
            opacity={0.92}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <coneGeometry args={[0.15, 0.5, 12]} />
          <meshStandardMaterial
            color="#ffd56a"
            emissive="#ffce5a"
            emissiveIntensity={3.4}
            transparent
            opacity={0.95}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Embers */}
      <points ref={emberRef} geometry={emberGeo}>
        <pointsMaterial
          map={tex ?? undefined}
          color="#ffb454"
          size={0.13}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <pointLight
        ref={lightRef}
        position={[0, 0.5, 0]}
        color="#ff8a3c"
        intensity={1.9}
        distance={8}
        decay={1.7}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Snow-capped log seat                                                */
/* ------------------------------------------------------------------ */

function SnowLog({
  position,
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Log lying tangent to the circle */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.26, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.26, 1.35, 14]} />
        <meshStandardMaterial color="#3c2a1b" roughness={0.95} />
      </mesh>
      {/* Snow cap on top */}
      <mesh position={[0, 0.49, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.7]} castShadow>
        <capsuleGeometry args={[0.17, 1.0, 4, 12]} />
        <meshStandardMaterial color="#eef3fc" roughness={0.92} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Falling snow                                                        */
/* ------------------------------------------------------------------ */

function Snowfall({ count }: { count: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const tex = useMemo(makeGlowTexture, []);

  const BOUNDS = useMemo(
    () => ({ x: 22, yTop: 17, yBottom: -0.5, z: [-16, 12] as [number, number] }),
    [],
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * BOUNDS.x * 2;
      positions[i * 3 + 1] = Math.random() * BOUNDS.yTop;
      positions[i * 3 + 2] =
        BOUNDS.z[0] + Math.random() * (BOUNDS.z[1] - BOUNDS.z[0]);
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count, BOUNDS]);

  const flakes = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        speed: 0.5 + Math.random() * 1.0,
        swayAmp: 0.2 + Math.random() * 0.5,
        swaySpeed: 0.4 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
      })),
    [count],
  );

  useFrame(({ clock }, dt) => {
    if (!pointsRef.current) return;
    const t = clock.elapsedTime;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const f = flakes[i];
      pos[i * 3 + 1] -= f.speed * dt;
      pos[i * 3] += Math.sin(t * f.swaySpeed + f.phase) * f.swayAmp * dt;
      if (pos[i * 3 + 1] < BOUNDS.yBottom) {
        pos[i * 3] = (Math.random() - 0.5) * BOUNDS.x * 2;
        pos[i * 3 + 1] = BOUNDS.yTop;
        pos[i * 3 + 2] =
          BOUNDS.z[0] + Math.random() * (BOUNDS.z[1] - BOUNDS.z[0]);
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        map={tex ?? undefined}
        color="#ffffff"
        size={0.13}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}
