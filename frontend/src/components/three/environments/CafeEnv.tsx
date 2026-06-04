"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Table from "../props/Table";
import Cup from "../props/Cup";
import Stool from "../props/Stool";

/**
 * Cafe — warm, cozy. Wooden floor, sunset wall behind, hanging lamp overhead,
 * round table in the middle with steaming cups. 5 stools in a loose circle.
 */
export default function CafeEnv() {
  return (
    <>
      {/* Lighting — warm tones */}
      <color attach="background" args={["#1a0e0a"]} />
      <ambientLight intensity={0.45} color="#ffb98a" />
      <directionalLight
        position={[4, 6, 3]}
        intensity={0.85}
        color="#ffd1a0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[0, 2.6, 0]} intensity={1.2} color="#ffaf6e" distance={8} decay={1.5} />
      <pointLight position={[-3, 1.6, -2]} intensity={0.6} color="#d49a7a" distance={6} decay={2} />

      {/* Floor — dark stained wood */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#2b1a10" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Sunset window/wall behind — emissive panel */}
      <mesh position={[0, 2.2, -6]} receiveShadow>
        <planeGeometry args={[12, 4.5]} />
        <meshStandardMaterial
          color="#1a0a05"
          emissive="#ff7d3a"
          emissiveIntensity={0.65}
          roughness={1}
        />
      </mesh>
      {/* Window frame slats */}
      {[-3.6, -1.2, 1.2, 3.6].map((x) => (
        <mesh key={x} position={[x, 2.2, -5.95]} receiveShadow>
          <boxGeometry args={[0.08, 4.5, 0.04]} />
          <meshStandardMaterial color="#1a0e08" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.0, -5.95]} receiveShadow>
        <boxGeometry args={[12, 0.08, 0.04]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.9} />
      </mesh>
      <mesh position={[0, 4.4, -5.95]} receiveShadow>
        <boxGeometry args={[12, 0.08, 0.04]} />
        <meshStandardMaterial color="#1a0e08" roughness={0.9} />
      </mesh>

      {/* Hanging warm lamp over the table */}
      <HangingLamp position={[0, 3.4, 0]} />

      {/* Round wooden table */}
      <Table position={[0, 0, 0]} radius={1.3} height={0.78} color="#6b4226" />

      {/* Cups on the table */}
      <Cup position={[0.55, 0.78, 0.35]} color="#e8dcc6" />
      <Cup position={[-0.4, 0.78, 0.45]} color="#c9b894" />
      <Cup position={[0.1, 0.78, -0.55]} color="#d8c4a2" />

      {/* Plate (flat disc) */}
      <mesh position={[-0.65, 0.815, -0.15]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.015, 24]} />
        <meshStandardMaterial color="#f0e6d3" roughness={0.55} />
      </mesh>

      {/* Stools loosely placed (matching circle layout but slightly back) */}
      {[0, 1, 2, 3, 4].map((i) => {
        const span = (Math.PI * 4) / 3;
        const start = -Math.PI / 2 - span / 2;
        const angle = start + (i / 4) * span;
        const x = Math.cos(angle) * 2.55;
        const z = Math.sin(angle) * 2.55;
        const ry = Math.atan2(-x, -z);
        return (
          <Stool
            key={i}
            position={[x, 0, z]}
            rotation={[0, ry, 0]}
            color="#3d281a"
            seatRadius={0.35}
            height={0.5}
          />
        );
      })}

      {/* Distant cafe ambience — abstract shelves on the side walls */}
      <mesh position={[-5.8, 1.6, -1]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[6, 1.4, 0.1]} />
        <meshStandardMaterial color="#3a2317" roughness={0.85} />
      </mesh>
      <mesh position={[5.8, 1.6, -1]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[6, 1.4, 0.1]} />
        <meshStandardMaterial color="#3a2317" roughness={0.85} />
      </mesh>
    </>
  );
}

function HangingLamp({ position }: { position: [number, number, number] }) {
  const lampRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!lampRef.current) return;
    // Very subtle sway
    lampRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.4) * 0.015;
  });
  return (
    <group ref={lampRef} position={position}>
      {/* Cord */}
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 2.8, 6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Shade */}
      <mesh position={[0, 0, 0]}>
        <coneGeometry args={[0.45, 0.6, 16, 1, true]} />
        <meshStandardMaterial color="#3a2317" side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
      {/* Bulb */}
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial
          color="#fff2c0"
          emissive="#ffaf6e"
          emissiveIntensity={2.5}
        />
      </mesh>
      <pointLight position={[0, -0.2, 0]} intensity={1.8} color="#ffc080" distance={5} decay={1.8} />
    </group>
  );
}
