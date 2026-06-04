"use client";

/**
 * A simple stylized tree — cylinder trunk + 1-2 cone canopies.
 * Used in the Forest environment.
 */
interface TreeProps {
  position?: [number, number, number];
  scale?: number;
  trunkColor?: string;
  canopyColor?: string;
  variant?: 0 | 1;
}

export default function Tree({
  position = [0, 0, 0],
  scale = 1,
  trunkColor = "#3a2517",
  canopyColor = "#3d6b3a",
  variant = 0,
}: TreeProps) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 2.8, 8]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </mesh>
      {/* Canopy */}
      {variant === 0 ? (
        <mesh position={[0, 3.4, 0]} castShadow>
          <coneGeometry args={[1.2, 2.4, 10]} />
          <meshStandardMaterial color={canopyColor} roughness={0.85} />
        </mesh>
      ) : (
        <>
          <mesh position={[0, 3.0, 0]} castShadow>
            <coneGeometry args={[1.3, 1.7, 10]} />
            <meshStandardMaterial color={canopyColor} roughness={0.85} />
          </mesh>
          <mesh position={[0, 4.0, 0]} castShadow>
            <coneGeometry args={[0.95, 1.5, 10]} />
            <meshStandardMaterial color={canopyColor} roughness={0.85} />
          </mesh>
        </>
      )}
    </group>
  );
}
