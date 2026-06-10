"use client";

import { useAnimations, useFBX, useGLTF, ContactShadows } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

/**
 * Semantic animation states for a council member. Each label maps to one of
 * the 11 shared FBX clips, with optional time-scale and head-bob modulation.
 *
 * Standing repertoire:
 *   • idle              — Standing Idle (gentle breath)
 *   • talking           — Talking_0/1/2 (pick via `talkingVariant`)
 *   • listening         — Standing Idle, slowed slightly
 *
 * Sitting repertoire (used when the council is around the cafe table):
 *   • idle-sitting      — Sitting Idle
 *   • talking-sitting   — Sitting Talking (the big expressive seated talker)
 *   • listening-sitting — Sitting Idle
 *
 * Reactions (brief — fired by orchestration when something funny / shocking
 * happens; the hook automatically returns to idle after the clip plays):
 *   • laughing          — Laughing
 *   • angry             — Angry
 *   • sad               — Crying
 *   • shocked           — Terrified
 *
 * Special:
 *   • thinking          — Typing (sitting at desk, hands forward)
 *   • falling           — Falling Idle (used by the hero drop-in)
 */
export type CouncilMemberAnimation =
  | "idle"
  | "idle-sitting"
  | "talking"
  | "talking-sitting"
  | "listening"
  | "listening-sitting"
  | "thinking"
  | "falling"
  | "laughing"
  | "angry"
  | "sad"
  | "shocked";

export interface CouncilMember3DProps {
  /** Path to the GLB model (RPM / Wolf3D rig). */
  modelPath: string;
  /** High-level animation label. */
  animation: CouncilMemberAnimation;
  /** Pick one of three standing-talking variants (0–2). Defaults to 0. */
  talkingVariant?: 0 | 1 | 2;
  /** Optional target the member's head should rotate towards. */
  headFollow?: THREE.Vector3 | null;
  /** Optional explicit "look at" point (turns the whole spine). */
  lookAt?: THREE.Vector3 | null;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  /** Variant 0–2 — picks one of a few subtle idle pose modulations. */
  idleVariant?: number;
  /** Random phase 0–2π to de-sync head bobs between members. */
  headBobPhase?: number;
  /** Disable ground contact shadow if the env already renders one. */
  groundShadow?: boolean;
}

/**
 * Internal clip name resolution. We name the underlying FBX actions with
 * stable keys so the runtime can fade between them by string.
 */
type ClipKey =
  | "StandingIdle"
  | "SittingIdle"
  | "SittingTalking"
  | "Falling"
  | "Typing"
  | "Talking0"
  | "Talking1"
  | "Talking2"
  | "Laughing"
  | "Angry"
  | "Crying"
  | "Terrified";

interface ClipMeta {
  clip: ClipKey;
  timeScale: number;
  headBob: number;
  /** If set, this clip is a brief reaction that should fall back to idle after `holdSec`. */
  reactionHold?: number;
}

function resolveClip(
  animation: CouncilMemberAnimation,
  talkingVariant: 0 | 1 | 2,
): ClipMeta {
  switch (animation) {
    case "idle":              return { clip: "StandingIdle",  timeScale: 1.0,  headBob: 0.05 };
    case "idle-sitting":      return { clip: "SittingIdle",   timeScale: 1.0,  headBob: 0.04 };
    case "talking": {
      const k = (["Talking0", "Talking1", "Talking2"] as const)[talkingVariant];
      return { clip: k, timeScale: 1.0, headBob: 0.18 };
    }
    case "talking-sitting":   return { clip: "SittingTalking", timeScale: 1.0,  headBob: 0.16 };
    case "listening":         return { clip: "StandingIdle",  timeScale: 0.92, headBob: 0.08 };
    case "listening-sitting": return { clip: "SittingIdle",   timeScale: 0.92, headBob: 0.06 };
    case "thinking":          return { clip: "Typing",        timeScale: 0.85, headBob: 0.02 };
    case "falling":           return { clip: "Falling",       timeScale: 1.0,  headBob: 0.0  };
    case "laughing":          return { clip: "Laughing",      timeScale: 1.0,  headBob: 0.22, reactionHold: 2.0 };
    case "angry":             return { clip: "Angry",         timeScale: 1.0,  headBob: 0.20, reactionHold: 2.0 };
    case "sad":               return { clip: "Crying",        timeScale: 0.9,  headBob: 0.12, reactionHold: 2.5 };
    case "shocked":           return { clip: "Terrified",     timeScale: 1.0,  headBob: 0.0,  reactionHold: 1.8 };
  }
}

const FADE_DURATION = 0.45;

const ANIMATION_FILES: Record<ClipKey, string> = {
  StandingIdle:   "/animations/Standing Idle.fbx",
  SittingIdle:    "/animations/Sitting Idle.fbx",
  SittingTalking: "/animations/Sitting Talking.fbx",
  Falling:        "/animations/Falling Idle.fbx",
  Typing:         "/animations/Typing.fbx",
  Talking0:       "/animations/Talking_0.fbx",
  Talking1:       "/animations/Talking_1.fbx",
  Talking2:       "/animations/Talking_2.fbx",
  Laughing:       "/animations/Laughing.fbx",
  Angry:          "/animations/Angry.fbx",
  Crying:         "/animations/Crying.fbx",
  Terrified:      "/animations/Terrified.fbx",
};

export default function CouncilMember3D({
  modelPath,
  animation,
  talkingVariant = 0,
  headFollow = null,
  lookAt = null,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  idleVariant = 0,
  headBobPhase = 0,
  groundShadow = false,
}: CouncilMember3DProps) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelPath);

  // Clone with SkeletonUtils so each instance has its own skeleton.
  //
  // CRITICAL: also unset `frustumCulled` on every (skinned)mesh below. RPM
  // models pre-compute their bounding sphere from the bind pose. Once we
  // play animations that move limbs / change the silhouette OR once we set
  // a `lookAt` on the spine (which rotates the upper body), the on-screen
  // bounds no longer match the pre-computed bounds and three.js will cull
  // the mesh — making the character vanish at certain camera angles. This
  // is the canonical fix used by RPM tutorials.
  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene);
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh || (obj as THREE.SkinnedMesh).isSkinnedMesh) {
        const m = obj as THREE.Mesh;
        m.frustumCulled = false;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  // Load every clip once — drei caches by URL so the second member's mount is free.
  const standingIdle    = useFBX(ANIMATION_FILES.StandingIdle);
  const sittingIdle     = useFBX(ANIMATION_FILES.SittingIdle);
  const sittingTalking  = useFBX(ANIMATION_FILES.SittingTalking);
  const falling         = useFBX(ANIMATION_FILES.Falling);
  const typing          = useFBX(ANIMATION_FILES.Typing);
  const talking0        = useFBX(ANIMATION_FILES.Talking0);
  const talking1        = useFBX(ANIMATION_FILES.Talking1);
  const talking2        = useFBX(ANIMATION_FILES.Talking2);
  const laughing        = useFBX(ANIMATION_FILES.Laughing);
  const angry           = useFBX(ANIMATION_FILES.Angry);
  const crying          = useFBX(ANIMATION_FILES.Crying);
  const terrified       = useFBX(ANIMATION_FILES.Terrified);

  // Name + clone the clips so multiple mixers can drive their own copies.
  const clips = useMemo(() => {
    function take(group: { animations: THREE.AnimationClip[] }, name: ClipKey) {
      const c = group.animations[0]?.clone();
      if (c) c.name = name;
      return c;
    }
    const all = [
      take(standingIdle,   "StandingIdle"),
      take(sittingIdle,    "SittingIdle"),
      take(sittingTalking, "SittingTalking"),
      take(falling,        "Falling"),
      take(typing,         "Typing"),
      take(talking0,       "Talking0"),
      take(talking1,       "Talking1"),
      take(talking2,       "Talking2"),
      take(laughing,       "Laughing"),
      take(angry,          "Angry"),
      take(crying,         "Crying"),
      take(terrified,      "Terrified"),
    ].filter(Boolean) as THREE.AnimationClip[];
    return all;
  }, [
    standingIdle, sittingIdle, sittingTalking,
    falling, typing,
    talking0, talking1, talking2,
    laughing, angry, crying, terrified,
  ]);

  const { actions } = useAnimations(clips, group);

  // Crossfade on animation change. We keep a ref to the active action so
  // overlapping changes don't pile up.
  const activeRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    const meta = resolveClip(animation, talkingVariant);
    const next = actions[meta.clip];
    if (!next) return;

    next.reset().setEffectiveTimeScale(meta.timeScale).fadeIn(FADE_DURATION).play();
    const prev = activeRef.current;
    if (prev && prev !== next) {
      prev.fadeOut(FADE_DURATION);
    }
    activeRef.current = next;

    return () => {
      // Don't fade the active out here — the next effect will handle it. But
      // do clear the ref if this *was* the active one (mount/unmount case).
      if (activeRef.current === next) {
        next.fadeOut(FADE_DURATION);
      }
    };
  }, [animation, talkingVariant, actions]);

  // Cache references to the head + spine bones once the scene is cloned.
  const bonesRef = useRef<{ head?: THREE.Object3D; spine?: THREE.Object3D }>({});
  useEffect(() => {
    const head = clonedScene.getObjectByName("Head");
    const spine = clonedScene.getObjectByName("Spine2") || clonedScene.getObjectByName("Spine1");
    bonesRef.current = { head: head ?? undefined, spine: spine ?? undefined };
  }, [clonedScene]);

  // Per-frame: head follow + subtle head-bob during talking/idle.
  const baseHeadEuler = useRef<THREE.Euler | null>(null);
  const baseSpineQuat = useRef<THREE.Quaternion | null>(null);
  const targetSpineQuat = useMemo(() => new THREE.Quaternion(), []);
  const prevSpineQuat = useMemo(() => new THREE.Quaternion(), []);
  // The clip metadata only changes with the animation props — don't rebuild
  // the object on every frame for every member (GC churn in the hot path).
  const clipMeta = useMemo(
    () => resolveClip(animation, talkingVariant),
    [animation, talkingVariant],
  );

  useFrame((state) => {
    const head = bonesRef.current.head;
    const spine = bonesRef.current.spine;
    if (!head) return;

    if (!baseHeadEuler.current) {
      baseHeadEuler.current = head.rotation.clone();
    }
    if (spine && !baseSpineQuat.current) {
      baseSpineQuat.current = spine.quaternion.clone();
    }

    const meta = clipMeta;
    const t = state.clock.elapsedTime;

    // Spine: lean toward the look target. The mixer rewrites this bone every
    // frame, so the slerp factor is a NON-accumulating lean fraction — a
    // constant is already frame-rate stable (dt-correcting it would make the
    // lean vary with fps). 0.25 gives a clearly visible torso turn toward
    // whoever is speaking, vs the old 0.08 which read as a faint incline.
    if (lookAt && spine && baseSpineQuat.current) {
      prevSpineQuat.copy(spine.quaternion);
      spine.lookAt(lookAt);
      targetSpineQuat.copy(spine.quaternion);
      spine.quaternion.copy(prevSpineQuat).slerp(targetSpineQuat, 0.25);
    }

    // Head: follow target (e.g. camera) with subtle bob modulation.
    if (headFollow) {
      head.lookAt(headFollow);
      if (meta.headBob > 0) {
        head.rotation.x = head.rotation.x + Math.sin(t * 2.4 + headBobPhase) * meta.headBob * 0.4;
        head.rotation.y = head.rotation.y + Math.sin(t * 1.7 + headBobPhase * 1.3) * meta.headBob * 0.25;
      }
    } else if (meta.headBob > 0 && baseHeadEuler.current) {
      // No follow target — just bob around the rig's default pose.
      head.rotation.set(
        baseHeadEuler.current.x + Math.sin(t * 2.4 + headBobPhase) * meta.headBob,
        baseHeadEuler.current.y + Math.sin(t * 1.7 + headBobPhase * 1.3) * meta.headBob * 0.4,
        baseHeadEuler.current.z,
      );
    }
  });

  // Idle pose variants: tiny static rotation tweaks so 5 members aren't identical.
  const variantTilt = useMemo(() => {
    switch (idleVariant % 3) {
      case 1:  return [0, 0.06, 0] as [number, number, number];
      case 2:  return [0, -0.04, 0.02] as [number, number, number];
      default: return [0, 0, 0] as [number, number, number];
    }
  }, [idleVariant]);

  return (
    <group
      ref={group}
      position={position}
      rotation={[rotation[0] + variantTilt[0], rotation[1] + variantTilt[1], rotation[2] + variantTilt[2]]}
      scale={scale}
      dispose={null}
    >
      <primitive object={clonedScene} />
      {groundShadow && (
        <ContactShadows
          opacity={0.45}
          scale={2.2}
          blur={2.4}
          far={2}
          resolution={256}
          color="#000000"
        />
      )}
    </group>
  );
}

// Preload all council member models + every animation clip once at module load.
[
  "/models/council/aria.glb",
  "/models/council/rex.glb",
  "/models/council/sage.glb",
  "/models/council/nova.glb",
  "/models/council/echo.glb",
].forEach((path) => useGLTF.preload(path));

Object.values(ANIMATION_FILES).forEach((f) => useFBX.preload(f));
