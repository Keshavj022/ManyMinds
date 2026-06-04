"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Stool from "../props/Stool";

/**
 * Rooftop — energetic, night. Concrete floor, perimeter railing, distant city
 * silhouette with emissive windows, big neon signs (magenta + cyan), steam
 * curling up from a rooftop vent.
 */
export default function RooftopEnv() {
  return (
    <>
      <color attach="background" args={["#070512"]} />
      <SkyDome />

      <ambientLight intensity={0.4} color="#7c5cf0" />
      <directionalLight position={[5, 6, -2]} intensity={0.45} color="#a0a0d0" castShadow />
      <pointLight position={[-3, 2.5, -3]} intensity={1.6} color="#d8a3b8" distance={9} decay={1.8} />
      <pointLight position={[3.5, 2.5, -3.5]} intensity={1.6} color="#7fb5d4" distance={9} decay={1.8} />
      <pointLight position={[0, 3, 3]} intensity={0.6} color="#ffaf6e" distance={6} decay={2} />

      {/* Concrete floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Floor seam grid */}
      <gridHelper args={[20, 8, "#2a2030", "#1f1828"]} position={[0, 0.001, 0]} />

      {/* Perimeter railing — 4 strips at edges */}
      <Railing position={[0, 0, -8]} length={16} />
      <Railing position={[0, 0, 8]} length={16} />
      <Railing position={[-8, 0, 0]} length={16} rotation={[0, Math.PI / 2, 0]} />
      <Railing position={[8, 0, 0]} length={16} rotation={[0, Math.PI / 2, 0]} />

      {/* City silhouette — strips of varying-height boxes in 4 distance bands */}
      <CityStrip z={-12} count={18} minH={2.5} maxH={6} color="#0a0815" emissiveColor="#7fb5d4" />
      <CityStrip z={-15} count={14} minH={3.5} maxH={9} color="#080612" emissiveColor="#d8a3b8" />
      <CityStrip z={-18} count={10} minH={4.5} maxH={11} color="#050410" emissiveColor="#9b87d8" />

      {/* Neon signs */}
      <NeonSign
        position={[-5, 2.6, -7]}
        rotation={[0, 0.3, 0]}
        color="#d8a3b8"
        size={[2.2, 0.6]}
      />
      <NeonSign
        position={[5.5, 3.4, -8]}
        rotation={[0, -0.2, 0]}
        color="#7fb5d4"
        size={[1.8, 0.9]}
      />
      <NeonSign
        position={[3, 1.2, -7.5]}
        rotation={[0, -0.1, 0]}
        color="#9b87d8"
        size={[1.2, 0.4]}
      />

      {/* Standing positions for members — keep area between -2..2 X / Z clear,
          but place a few stools loosely around */}
      {[0, 1, 2, 3, 4].map((i) => {
        const span = (Math.PI * 4) / 3;
        const start = -Math.PI / 2 - span / 2;
        const angle = start + (i / 4) * span;
        const r = 2.8;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const ry = Math.atan2(-x, -z);
        return (
          <Stool
            key={i}
            position={[x, 0, z]}
            rotation={[0, ry, 0]}
            color="#1a1a24"
            seatRadius={0.32}
            height={0.5}
          />
        );
      })}

      {/* Rooftop vent emitting steam */}
      <VentWithSteam position={[-3.5, 0, 4]} />

      {/* A planter / box on the side */}
      <mesh position={[3.5, 0.3, 4.5]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.6, 0.4]} />
        <meshStandardMaterial color="#251d2e" roughness={0.85} />
      </mesh>
    </>
  );
}

function SkyDome() {
  return (
    <mesh scale={[60, 60, 60]}>
      <sphereGeometry args={[1, 24, 12]} />
      <meshBasicMaterial color="#0a0820" side={THREE.BackSide} />
    </mesh>
  );
}

function Railing({
  position,
  length,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  length: number;
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Bottom rail */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[length, 0.08, 0.08]} />
        <meshStandardMaterial color="#2a2030" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Top rail */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[length, 0.06, 0.06]} />
        <meshStandardMaterial color="#3a3040" metalness={0.5} roughness={0.45} />
      </mesh>
      {/* Vertical bars */}
      {Array.from({ length: Math.floor(length / 0.8) }).map((_, i) => {
        const x = -length / 2 + 0.4 + i * 0.8;
        return (
          <mesh key={i} position={[x, 0.55, 0]}>
            <boxGeometry args={[0.04, 1.1, 0.04]} />
            <meshStandardMaterial color="#2a2030" metalness={0.4} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function CityStrip({
  z,
  count,
  minH,
  maxH,
  color,
  emissiveColor,
}: {
  z: number;
  count: number;
  minH: number;
  maxH: number;
  color: string;
  emissiveColor: string;
}) {
  const buildings = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (i - count / 2) * (28 / count) + (Math.random() - 0.5) * 0.6,
        w: 1.1 + Math.random() * 0.8,
        h: minH + Math.random() * (maxH - minH),
        d: 0.8 + Math.random() * 0.6,
        winRows: 4 + Math.floor(Math.random() * 8),
      })),
    [count, minH, maxH],
  );

  return (
    <group>
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2, z]}>
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
          {/* Window grid as emissive plane */}
          <mesh position={[0, 0, b.d / 2 + 0.005]}>
            <planeGeometry args={[b.w * 0.85, b.h * 0.85]} />
            <meshStandardMaterial
              color="#000000"
              emissive={emissiveColor}
              emissiveIntensity={0.35}
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function NeonSign({
  position,
  rotation,
  color,
  size,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  size: [number, number];
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!matRef.current) return;
    // Subtle flicker
    const f = 1 + Math.sin(clock.elapsedTime * 7.3) * 0.08 + (Math.random() < 0.005 ? -0.3 : 0);
    matRef.current.emissiveIntensity = 2.4 * f;
  });
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={color}
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 0, 0.4]} color={color} intensity={0.8} distance={4} decay={2} />
    </group>
  );
}

function VentWithSteam({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      if (child.userData.kind !== "puff") return;
      const phase = i * 0.4;
      const cycle = (t * 0.3 + phase) % 1;
      child.position.y = 0.5 + cycle * 1.8;
      child.position.x = position[0] + Math.sin((t + phase) * 0.6) * 0.2;
      child.position.z = position[2] + Math.cos((t + phase) * 0.5) * 0.2;
      (child as THREE.Mesh).scale.setScalar(0.1 + cycle * 0.6);
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) mat.opacity = 0.32 * (1 - cycle);
    });
  });

  return (
    <group ref={groupRef}>
      {/* Vent box */}
      <mesh position={position} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.45, 0.5]} />
        <meshStandardMaterial color="#1a1820" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Vent grill */}
      <mesh position={[position[0], position[1] + 0.235, position[2]]}>
        <boxGeometry args={[0.5, 0.02, 0.3]} />
        <meshStandardMaterial color="#0e0c14" />
      </mesh>
      {/* Steam puffs */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[position[0], position[1] + 0.3, position[2]]}
          userData={{ kind: "puff" }}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color="#cfcfdc"
            emissive="#9090a8"
            emissiveIntensity={0.4}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
