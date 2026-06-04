"use client";

/**
 * Reusable table primitive — built from a cylinder top + 3-4 simple legs.
 * Used by Cafe and Library environments.
 */
interface TableProps {
  position?: [number, number, number];
  radius?: number;
  height?: number;
  thickness?: number;
  color?: string;
  metalness?: number;
  roughness?: number;
  shape?: "round" | "rect";
  rectSize?: [number, number]; // [w, d] when shape === "rect"
}

export default function Table({
  position = [0, 0, 0],
  radius = 1.4,
  height = 0.85,
  thickness = 0.08,
  color = "#5b3a23",
  metalness = 0.1,
  roughness = 0.65,
  shape = "round",
  rectSize = [3, 1.6],
}: TableProps) {
  const topY = position[1] + height;

  return (
    <group position={position}>
      {/* Top */}
      <mesh position={[0, height, 0]} castShadow receiveShadow>
        {shape === "round" ? (
          <cylinderGeometry args={[radius, radius, thickness, 32]} />
        ) : (
          <boxGeometry args={[rectSize[0], thickness, rectSize[1]]} />
        )}
        <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
      </mesh>

      {/* Legs */}
      {shape === "round" ? (
        <mesh position={[0, height / 2, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.18, height, 12]} />
          <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
        </mesh>
      ) : (
        [
          [-rectSize[0] / 2 + 0.18, -rectSize[1] / 2 + 0.18],
          [ rectSize[0] / 2 - 0.18, -rectSize[1] / 2 + 0.18],
          [-rectSize[0] / 2 + 0.18,  rectSize[1] / 2 - 0.18],
          [ rectSize[0] / 2 - 0.18,  rectSize[1] / 2 - 0.18],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, height / 2, z]} castShadow>
            <boxGeometry args={[0.12, height, 0.12]} />
            <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
          </mesh>
        ))
      )}

      {/* visual hint so callers can place items at table top */}
      <group position={[0, topY - position[1], 0]} />
    </group>
  );
}
