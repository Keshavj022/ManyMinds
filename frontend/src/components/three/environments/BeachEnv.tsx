"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Beach — calm, open. Sand floor, animated ocean plane, sun in the distance,
 * 5 driftwood logs as seating, optional bonfire centrepiece.
 */
export default function BeachEnv() {
  return (
    <>
      <color attach="background" args={["#0c1830"]} />
      {/* Sky gradient — fake it with two large hemisphere-ish disks */}
      <SkyGradient />

      {/* Light: warm sun + cool ambient */}
      <ambientLight intensity={0.45} color="#a8c8ff" />
      <directionalLight
        position={[6, 5, -8]}
        intensity={1.3}
        color="#ffcfa0"
        castShadow
      />
      <hemisphereLight args={["#7ab8ff", "#3a2a18", 0.6]} />

      {/* Sand floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 30, 32, 32]} />
        <meshStandardMaterial color="#c9a878" roughness={1} />
      </mesh>

      {/* Ocean — animated tilted plane */}
      <Ocean />

      {/* Distant sun */}
      <group position={[5, 3.5, -14]}>
        <mesh>
          <sphereGeometry args={[1.2, 24, 24]} />
          <meshStandardMaterial
            color="#fff0c8"
            emissive="#ffb968"
            emissiveIntensity={2.8}
          />
        </mesh>
        {/* halo */}
        <mesh>
          <sphereGeometry args={[1.9, 20, 20]} />
          <meshStandardMaterial
            color="#ffcf80"
            emissive="#ffa850"
            emissiveIntensity={0.6}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Driftwood logs in a loose circle */}
      {[0, 1, 2, 3, 4].map((i) => {
        const span = (Math.PI * 4) / 3;
        const start = -Math.PI / 2 - span / 2;
        const angle = start + (i / 4) * span;
        const r = 2.7;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const ry = Math.atan2(-x, -z);
        return (
          <mesh
            key={i}
            position={[x, 0.18, z]}
            rotation={[0, ry + Math.PI / 2, 0]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.18, 0.2, 1.4, 12]} />
            <meshStandardMaterial color="#6a4a2c" roughness={0.95} />
          </mesh>
        );
      })}

      {/* Bonfire centrepiece */}
      <Bonfire position={[0, 0, 0]} />

      {/* A couple of distant rocks for silhouette */}
      <mesh position={[-7, 0.4, -3.5]} castShadow>
        <dodecahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial color="#3a2e26" roughness={0.95} />
      </mesh>
      <mesh position={[-9, 0.6, -2]} castShadow>
        <dodecahedronGeometry args={[1.4, 0]} />
        <meshStandardMaterial color="#2e2620" roughness={0.95} />
      </mesh>
    </>
  );
}

function SkyGradient() {
  // Big sphere shell behind everything, gradient-ish via emissive ramp.
  return (
    <mesh scale={[60, 60, 60]} position={[0, 0, 0]}>
      <sphereGeometry args={[1, 24, 12]} />
      <meshBasicMaterial color="#1a2548" side={THREE.BackSide} />
    </mesh>
  );
}

function Ocean() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    // Animate emissive shimmer to fake wave glints
    mat.emissiveIntensity = 0.35 + Math.sin(clock.elapsedTime * 0.7) * 0.08;
    // Subtle bob of the whole plane
    meshRef.current.position.y = -0.05 + Math.sin(clock.elapsedTime * 0.5) * 0.02;
  });
  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.05, -10]}
      receiveShadow
    >
      <planeGeometry args={[60, 18, 32, 12]} />
      <meshStandardMaterial
        color="#1a3a5e"
        emissive="#3a6fa8"
        emissiveIntensity={0.35}
        roughness={0.3}
        metalness={0.4}
      />
    </mesh>
  );
}

function Bonfire({ position }: { position: [number, number, number] }) {
  const flameRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (flameRef.current) {
      const s = 1 + Math.sin(t * 8) * 0.08 + Math.sin(t * 13) * 0.04;
      flameRef.current.scale.set(s, s + 0.1, s);
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.5 + Math.sin(t * 9) * 0.4;
    }
  });

  const logs = useMemo(
    () => [0, 1, 2, 3].map((i) => ({ angle: (i / 4) * Math.PI * 2, len: 0.55 + i * 0.03 })),
    [],
  );

  return (
    <group position={position}>
      {/* Crossed logs */}
      {logs.map((l, i) => (
        <mesh
          key={i}
          position={[0, 0.08, 0]}
          rotation={[Math.PI / 2.6, l.angle, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.05, 0.06, l.len, 8]} />
          <meshStandardMaterial color="#3a2014" roughness={0.95} />
        </mesh>
      ))}
      {/* Flame sphere */}
      <mesh ref={flameRef} position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial
          color="#ffb86a"
          emissive="#ff7d3a"
          emissiveIntensity={3}
          transparent
          opacity={0.95}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.3, 0]}
        color="#ff8c4a"
        intensity={1.5}
        distance={6}
        decay={1.8}
      />
    </group>
  );
}
