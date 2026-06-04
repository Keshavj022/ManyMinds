"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Table from "../props/Table";
import Bookshelf from "../props/Bookshelf";
import Stool from "../props/Stool";

/**
 * Library — focused, warm. Tall bookshelves line the walls; a long table sits
 * in the centre with a warm desk lamp; dust motes drift through the light.
 */
export default function LibraryEnv() {
  return (
    <>
      <color attach="background" args={["#0d0807"]} />
      <ambientLight intensity={0.32} color="#d8c4a8" />
      <directionalLight position={[3, 6, 4]} intensity={0.4} color="#d8b48a" castShadow />
      <pointLight position={[0, 3.5, 0]} intensity={1.0} color="#ffc380" distance={7} decay={1.6} />
      <pointLight position={[-4, 2, 2]} intensity={0.4} color="#e89a55" distance={5} decay={2} />

      {/* Floor — dark hardwood */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color="#2c1d12" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Wood plank seams */}
      {[-4, -2, 0, 2, 4].map((x) => (
        <mesh
          key={x}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.001, 0]}
          receiveShadow
        >
          <planeGeometry args={[0.04, 22]} />
          <meshStandardMaterial color="#1a0e08" roughness={0.9} />
        </mesh>
      ))}

      {/* Back wall */}
      <mesh position={[0, 2.5, -6]} receiveShadow>
        <planeGeometry args={[14, 5]} />
        <meshStandardMaterial color="#1a120c" roughness={0.95} />
      </mesh>

      {/* Bookshelves lining the back + sides */}
      <Bookshelf position={[-5, 0, -5.7]} />
      <Bookshelf position={[-2.5, 0, -5.7]} />
      <Bookshelf position={[0, 0, -5.7]} />
      <Bookshelf position={[2.5, 0, -5.7]} />
      <Bookshelf position={[5, 0, -5.7]} />
      {/* Side wall shelves */}
      <Bookshelf position={[-6.6, 0, -2.5]} rotation={[0, Math.PI / 2, 0]} width={1.6} />
      <Bookshelf position={[-6.6, 0, 0.5]} rotation={[0, Math.PI / 2, 0]} width={1.6} />
      <Bookshelf position={[6.6, 0, -2.5]} rotation={[0, -Math.PI / 2, 0]} width={1.6} />
      <Bookshelf position={[6.6, 0, 0.5]} rotation={[0, -Math.PI / 2, 0]} width={1.6} />

      {/* Long central table */}
      <Table
        position={[0, 0, 0]}
        shape="rect"
        rectSize={[3.6, 1.8]}
        height={0.82}
        color="#3a2515"
      />

      {/* Desk lamp on the table */}
      <DeskLamp position={[1.4, 0.82, -0.6]} />

      {/* Books + papers on the table */}
      <mesh position={[-0.7, 0.86, 0.1]} rotation={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.35, 0.05, 0.24]} />
        <meshStandardMaterial color="#7a4a2e" roughness={0.7} />
      </mesh>
      <mesh position={[-0.65, 0.91, 0.12]} rotation={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.34, 0.04, 0.23]} />
        <meshStandardMaterial color="#f1e6cb" roughness={0.85} />
      </mesh>
      <mesh position={[0.2, 0.84, 0.3]} rotation={[0, -0.15, 0]} castShadow>
        <boxGeometry args={[0.25, 0.02, 0.18]} />
        <meshStandardMaterial color="#f1e6cb" roughness={0.85} />
      </mesh>

      {/* Hanging ceiling lights */}
      {[-2.5, 2.5].map((x) => (
        <group key={x} position={[x, 3.2, 0]}>
          <mesh>
            <cylinderGeometry args={[0.01, 0.01, 1.6, 6]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0, -0.85, 0]}>
            <coneGeometry args={[0.22, 0.3, 12, 1, true]} />
            <meshStandardMaterial color="#5a3a20" side={THREE.DoubleSide} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.95, 0]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color="#fff0c0" emissive="#ffc380" emissiveIntensity={2} />
          </mesh>
        </group>
      ))}

      {/* Stools around the long table */}
      {[0, 1, 2, 3, 4].map((i) => {
        const span = (Math.PI * 4) / 3;
        const start = -Math.PI / 2 - span / 2;
        const angle = start + (i / 4) * span;
        const r = 2.6;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const ry = Math.atan2(-x, -z);
        return (
          <Stool
            key={i}
            position={[x, 0, z]}
            rotation={[0, ry, 0]}
            color="#3a2818"
            seatRadius={0.32}
            height={0.5}
          />
        );
      })}

      {/* Dust motes */}
      <DustMotes count={50} />
    </>
  );
}

function DeskLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.04, 16]} />
        <meshStandardMaterial color="#2c2018" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[0, 0, 0.3]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.5, 6]} />
        <meshStandardMaterial color="#2c2018" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0.15, 0.5, 0]} rotation={[0, 0, -0.6]} castShadow>
        <coneGeometry args={[0.13, 0.18, 16, 1, true]} />
        <meshStandardMaterial
          color="#5a3a20"
          side={THREE.DoubleSide}
          roughness={0.5}
          metalness={0.5}
        />
      </mesh>
      <mesh position={[0.18, 0.46, 0]}>
        <sphereGeometry args={[0.04, 10, 10]} />
        <meshStandardMaterial color="#fff0c0" emissive="#ffaa55" emissiveIntensity={3} />
      </mesh>
      <pointLight position={[0.22, 0.46, 0]} intensity={0.9} color="#ffa850" distance={3} decay={2} />
    </group>
  );
}

function DustMotes({ count }: { count: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const motes = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 8,
        y: 1 + Math.random() * 2.5,
        z: (Math.random() - 0.5) * 6,
        speed: 0.04 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const m = motes[i];
      child.position.y = m.y + Math.sin(t * m.speed + m.phase) * 0.3;
      child.position.x = m.x + Math.cos(t * m.speed * 0.5 + m.phase) * 0.15;
    });
  });

  return (
    <group ref={groupRef}>
      {motes.map((m, i) => (
        <mesh key={i} position={[m.x, m.y, m.z]}>
          <sphereGeometry args={[0.015, 4, 4]} />
          <meshStandardMaterial
            color="#ffe0b0"
            emissive="#ffe0b0"
            emissiveIntensity={0.6}
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
