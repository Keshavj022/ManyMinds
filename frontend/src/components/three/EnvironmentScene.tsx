"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, OrbitControls, Preload } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import CouncilMember3D from "./CouncilMember3D";
import useCouncilAnimation from "./useCouncilAnimation";
import {
  COUNCIL_POSITIONS_CIRCLE,
  MODEL_PATHS,
  type CouncilMemberId,
} from "./positions";
import CafeEnv from "./environments/CafeEnv";
import BeachEnv from "./environments/BeachEnv";
import LibraryEnv from "./environments/LibraryEnv";
import RooftopEnv from "./environments/RooftopEnv";
import ForestEnv from "./environments/ForestEnv";
import MountainPeakEnv from "./environments/MountainPeakEnv";
import ZenGardenEnv from "./environments/ZenGardenEnv";

export type EnvironmentId =
  | "cafe"
  | "beach"
  | "library"
  | "rooftop"
  | "forest"
  | "mountain"
  | "zen";
export type MoodId =
  | "calm"
  | "energetic"
  | "cozy"
  | "focused"
  | "peaceful"
  | "crisp"
  | "serene";
export type CameraPreset = "overview" | "closeup" | "profile";

export interface EnvironmentMemberSpec {
  id: CouncilMemberId;
  position?: [number, number, number];
  rotationY?: number;
}

export interface EnvironmentSceneProps {
  /** Which environment to render. */
  env: EnvironmentId;
  /** Members to spawn. Each may override default position. */
  members?: EnvironmentMemberSpec[];
  /** Member currently speaking — drives talking/listening labels. */
  activeMemberId?: CouncilMemberId | null;
  /** Member(s) currently thinking. */
  thinkingIds?: CouncilMemberId[];
  /** Light/colour bias hint (optional, reserved for future tweaks). */
  mood?: MoodId;
  /** Camera framing preset. */
  cameraPreset?: CameraPreset;
  /** Optional className applied to the wrapping `<Canvas>`. */
  className?: string;
}

const DEFAULT_MEMBERS: EnvironmentMemberSpec[] = [
  { id: "aria" },
  { id: "rex" },
  { id: "sage" },
  { id: "nova" },
  { id: "echo" },
];

const CAMERA_PRESETS: Record<
  CameraPreset,
  { position: [number, number, number]; fov: number }
> = {
  overview: { position: [0, 2.0, 7.5], fov: 42 },
  closeup:  { position: [0, 1.6, 4.5], fov: 38 },
  profile:  { position: [4.5, 1.7, 4.5], fov: 40 },
};

/**
 * Top-level scene composer. Owns the `<Canvas>`, picks the env, spawns members
 * with the right animation labels, and applies a sane camera preset.
 *
 * The actual env components handle their own lighting & background — this just
 * orchestrates members + perf controls.
 */
export default function EnvironmentScene({
  env,
  members = DEFAULT_MEMBERS,
  activeMemberId = null,
  thinkingIds = [],
  cameraPreset = "overview",
  className = "",
}: EnvironmentSceneProps) {
  const cameraCfg = CAMERA_PRESETS[cameraPreset];

  return (
    <Canvas
      className={className}
      // Explicit shadow type silences the PCFSoftShadowMap deprecation
      // spam from three v0.183+ while keeping cast shadows on.
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      dpr={[1, 1.75]}
      camera={{ position: cameraCfg.position, fov: cameraCfg.fov }}
      performance={{ min: 0.5 }}
    >
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <SceneContents
        env={env}
        members={members}
        activeMemberId={activeMemberId}
        thinkingIds={thinkingIds}
      />
      {/* Mouse drag + 2-finger touch to look around. Damping smooths the
          motion so it never feels jerky. Vertical clamp keeps you from
          flipping under the floor or over the sky. */}
      <OrbitControls
        target={[0, 1.0, 0]}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableZoom
        zoomSpeed={0.55}
        rotateSpeed={0.55}
        minDistance={3.5}
        maxDistance={14}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.52}
        makeDefault
      />
      <Preload all />
    </Canvas>
  );
}

interface SceneContentsProps {
  env: EnvironmentId;
  members: EnvironmentMemberSpec[];
  activeMemberId: CouncilMemberId | null;
  thinkingIds: CouncilMemberId[];
}

function SceneContents({ env, members, activeMemberId, thinkingIds }: SceneContentsProps) {
  // Every embedded scene defaults to a sitting council (you join them at the
  // table). When no manual speaker is set, run a self-driving conversation
  // so the room feels alive in demos.
  const { states, microOffsets } = useCouncilAnimation({
    activeMemberId,
    thinkingIds,
    posture: "sitting",
    conversation: !activeMemberId,
  });

  // Resolve each spawned member's final position + rotation.
  const resolvedMembers = useMemo(() => {
    return members.map((m) => {
      const fallback = COUNCIL_POSITIONS_CIRCLE[m.id];
      const s = states[m.id];
      return {
        id: m.id,
        position: m.position ?? fallback.position,
        rotationY: m.rotationY ?? fallback.rotationY,
        animation: s.animation,
        talkingVariant: s.talkingVariant,
        idleVariant: microOffsets[m.id].idleVariant,
        headBobPhase: microOffsets[m.id].headBobPhase,
      };
    });
  }, [members, states, microOffsets]);

  return (
    <>
      <EnvComponent env={env} />
      {resolvedMembers.map((m) => (
        <CouncilMember3D
          key={m.id}
          modelPath={MODEL_PATHS[m.id]}
          animation={m.animation}
          talkingVariant={m.talkingVariant}
          position={m.position}
          rotation={[0, m.rotationY, 0]}
          scale={1.7}
          idleVariant={m.idleVariant}
          headBobPhase={m.headBobPhase}
          groundShadow
        />
      ))}
    </>
  );
}

function EnvComponent({ env }: { env: EnvironmentId }) {
  switch (env) {
    case "cafe":     return <CafeEnv />;
    case "beach":    return <BeachEnv />;
    case "library":  return <LibraryEnv />;
    case "rooftop":  return <RooftopEnv />;
    case "forest":   return <ForestEnv />;
    case "mountain": return <MountainPeakEnv />;
    case "zen":      return <ZenGardenEnv />;
    default:         return <CafeEnv />;
  }
}
