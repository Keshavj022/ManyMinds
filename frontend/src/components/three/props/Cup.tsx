"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A small cup / mug with optional drifting steam wisps.
 * Used in Cafe + Library environments.
 */
interface CupProps {
  position?: [number, number, number];
  color?: string;
  steam?: boolean;
  scale?: number;
}

export default function Cup({
  position = [0, 0, 0],
  color = "#e6e1d7",
  steam = true,
  scale = 1,
}: CupProps) {
  return (
    <group position={position} scale={scale}>
      {/* Cup body */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.085, 0.07, 0.16, 18]} />
        <meshStandardMaterial color={color} metalness={0.05} roughness={0.55} />
      </mesh>
      {/* Liquid surface */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.078, 0.078, 0.005, 18]} />
        <meshStandardMaterial color="#2a1810" metalness={0.2} roughness={0.4} />
      </mesh>
      {/* Handle */}
      <mesh position={[0.1, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.04, 0.012, 8, 16, Math.PI]} />
        <meshStandardMaterial color={color} metalness={0.05} roughness={0.55} />
      </mesh>
      {steam && <SteamWisps origin={[0, 0.18, 0]} />}
    </group>
  );
}

function SteamWisps({ origin }: { origin: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((child, i) => {
      const phase = i * 1.3;
      const cycle = (t * 0.4 + phase) % 1;
      child.position.y = origin[1] + cycle * 0.6;
      child.position.x = origin[0] + Math.sin((t + phase) * 1.4) * 0.04;
      child.position.z = origin[2] + Math.cos((t + phase) * 1.1) * 0.04;
      (child as THREE.Mesh).scale.setScalar(0.04 + cycle * 0.06);
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (mat) mat.opacity = 0.35 * (1 - cycle);
    });
  });

  return (
    <group ref={group}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.2}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
