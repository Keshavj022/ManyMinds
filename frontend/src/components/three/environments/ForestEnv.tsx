"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Tree from "../props/Tree";

/**
 * Forest — peaceful, gentle. Green-tinted floor, soft fog, scattered trees,
 * tall thin grass, filtered sunlight from above, stumps to sit on, drifting
 * leaves.
 */
export default function ForestEnv() {
  return (
    <>
      <color attach="background" args={["#0d1410"]} />
      <fog attach="fog" args={["#1e2a20", 8, 22]} />

      <ambientLight intensity={0.55} color="#b8d4a8" />
      <directionalLight
        position={[3, 8, 2]}
        intensity={0.9}
        color="#e8f4d0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <hemisphereLight args={["#a8d090", "#2a2818", 0.45]} />
      <pointLight position={[0, 4, 0]} intensity={0.5} color="#fff0c8" distance={6} decay={2} />

      {/* Floor — mossy ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#3a4a2c" roughness={1} />
      </mesh>

      {/* Trees scattered around (leaving a clearing in the middle) */}
      <ScatteredTrees />

      {/* Tall grass clumps */}
      <Grass count={120} />

      {/* Stumps as seating */}
      {[0, 1, 2, 3, 4].map((i) => {
        const span = (Math.PI * 4) / 3;
        const start = -Math.PI / 2 - span / 2;
        const angle = start + (i / 4) * span;
        const r = 2.7;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        return <Stump key={i} position={[x, 0, z]} />;
      })}

      {/* Drifting leaves */}
      <Leaves count={28} />

      {/* Small lichen-stones for texture */}
      {[
        [-1.8, 0.18, 1.6],
        [1.5, 0.15, -1.7],
        [0.3, 0.1, 2.4],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <dodecahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial color="#4a5448" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

function ScatteredTrees() {
  const trees = useMemo(() => {
    const out: Array<{ pos: [number, number, number]; scale: number; variant: 0 | 1 }> = [];
    // Generate trees in a ring around the clearing
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2 + Math.random() * 0.2;
      const r = 5 + Math.random() * 9;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      out.push({
        pos: [x, 0, z],
        scale: 0.8 + Math.random() * 0.6,
        variant: Math.random() < 0.5 ? 0 : 1,
      });
    }
    return out;
  }, []);

  return (
    <group>
      {trees.map((t, i) => (
        <Tree
          key={i}
          position={t.pos}
          scale={t.scale}
          variant={t.variant}
          canopyColor={i % 3 === 0 ? "#345a32" : "#456b3a"}
        />
      ))}
    </group>
  );
}

function Grass({ count }: { count: number }) {
  const blades = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const r = 3.5 + Math.random() * 8;
        return {
          x: Math.cos(angle) * r,
          z: Math.sin(angle) * r,
          ry: Math.random() * Math.PI,
          tilt: (Math.random() - 0.5) * 0.25,
          h: 0.4 + Math.random() * 0.5,
        };
      }),
    [count],
  );

  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const b = blades[i];
      child.rotation.z = b.tilt + Math.sin(t * 1.5 + i) * 0.08;
    });
  });

  return (
    <group ref={groupRef}>
      {blades.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} rotation={[0, b.ry, b.tilt]}>
          <planeGeometry args={[0.05, b.h]} />
          <meshStandardMaterial
            color="#5a7a3a"
            side={THREE.DoubleSide}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

function Stump({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.34, 0.4, 0.36, 12]} />
        <meshStandardMaterial color="#5a3a22" roughness={0.95} />
      </mesh>
      {/* Top rings */}
      <mesh position={[0, 0.361, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.005, 16]} />
        <meshStandardMaterial color="#8a6240" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Leaves({ count }: { count: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const leaves = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 14,
        y: 1 + Math.random() * 4,
        z: (Math.random() - 0.5) * 14,
        speed: 0.15 + Math.random() * 0.2,
        spin: (Math.random() - 0.5) * 1.5,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() < 0.5 ? "#7a9a4a" : "#a88a45",
      })),
    [count],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const l = leaves[i];
      child.position.y = l.y - ((t * l.speed) % 5);
      child.position.x = l.x + Math.sin(t * 0.5 + l.phase) * 0.4;
      child.rotation.x = t * l.spin;
      child.rotation.z = t * l.spin * 0.7;
    });
  });

  return (
    <group ref={groupRef}>
      {leaves.map((l, i) => (
        <mesh key={i} position={[l.x, l.y, l.z]}>
          <planeGeometry args={[0.12, 0.08]} />
          <meshStandardMaterial
            color={l.color}
            side={THREE.DoubleSide}
            roughness={0.8}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}
