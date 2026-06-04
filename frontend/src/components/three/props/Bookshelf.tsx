"use client";

import { useMemo } from "react";

/**
 * Tall bookshelf — a series of vertical boxes with multi-color "books" sitting
 * on each shelf. Used in the Library environment.
 */
interface BookshelfProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  depth?: number;
  shelves?: number;
}

const BOOK_PALETTE = [
  "#7a4b2a",
  "#3d4f7a",
  "#883a3a",
  "#5b6738",
  "#7c5a8d",
  "#bc8a55",
  "#2c2c2c",
  "#a8634e",
  "#4e6a82",
];

export default function Bookshelf({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.8,
  height = 3.2,
  depth = 0.4,
  shelves = 5,
}: BookshelfProps) {
  // Pre-generate books per shelf so they don't re-randomize each frame
  const books = useMemo(() => {
    const out: Array<{ x: number; y: number; h: number; w: number; color: string }> = [];
    const shelfGap = (height - 0.2) / shelves;
    for (let s = 0; s < shelves; s++) {
      const shelfY = 0.1 + s * shelfGap + shelfGap * 0.55;
      let cursor = -width / 2 + 0.1;
      while (cursor < width / 2 - 0.1) {
        const w = 0.04 + Math.random() * 0.05;
        const h = 0.18 + Math.random() * 0.12;
        const color = BOOK_PALETTE[Math.floor(Math.random() * BOOK_PALETTE.length)];
        out.push({ x: cursor + w / 2, y: shelfY + h / 2, h, w, color });
        cursor += w + 0.005;
      }
    }
    return out;
  }, [width, height, shelves]);

  return (
    <group position={position} rotation={rotation}>
      {/* Back panel */}
      <mesh position={[0, height / 2, -depth / 2 + 0.02]} receiveShadow>
        <boxGeometry args={[width, height, 0.04]} />
        <meshStandardMaterial color="#33241a" roughness={0.85} />
      </mesh>
      {/* Side panels */}
      <mesh position={[-width / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.05, height, depth]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.85} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.05, height, depth]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.85} />
      </mesh>
      {/* Top + bottom */}
      <mesh position={[0, height, 0]} receiveShadow>
        <boxGeometry args={[width, 0.05, depth]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[width, 0.05, depth]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.85} />
      </mesh>
      {/* Shelves */}
      {Array.from({ length: shelves }).map((_, s) => {
        const y = 0.1 + ((s + 1) * (height - 0.2)) / shelves;
        return (
          <mesh key={s} position={[0, y, 0]} receiveShadow>
            <boxGeometry args={[width - 0.05, 0.03, depth - 0.05]} />
            <meshStandardMaterial color="#382518" roughness={0.85} />
          </mesh>
        );
      })}
      {/* Books */}
      {books.map((b, i) => (
        <mesh
          key={i}
          position={[b.x, b.y, -depth / 2 + 0.18]}
          castShadow
        >
          <boxGeometry args={[b.w, b.h, 0.14]} />
          <meshStandardMaterial color={b.color} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
