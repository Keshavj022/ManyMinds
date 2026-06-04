"use client";

/**
 * A simple stool — cylindrical seat on a single post.
 * Used as seating across multiple environments.
 */
interface StoolProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  seatRadius?: number;
  height?: number;
}

export default function Stool({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = "#3a2f24",
  seatRadius = 0.32,
  height = 0.45,
}: StoolProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat */}
      <mesh position={[0, height, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[seatRadius, seatRadius * 0.95, 0.07, 20]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Post */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, height, 10]} />
        <meshStandardMaterial color={color} roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Foot */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[seatRadius * 0.6, seatRadius * 0.6, 0.04, 16]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}
