"use client";

/**
 * CyberSpace — the digital void where the council boots. Local origin is the
 * platform centre. `shatterP` (0→1) drives THE BREAKOUT: the platform splits
 * into 12 wedge shards that tilt outward, drop and fade; the screen cracks;
 * the rim flickers out. At shatterP = 1 nothing of the platform remains.
 */

import * as React from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  FadeGroup,
  GEO,
  Sky,
  mulberry32,
  setLiveOpacity,
  useFade,
} from "./worldKit";
import { Particles, makeGridTexture, makeScreenTexture } from "./worldProps";

const N_SHARDS = 12;
const PLATFORM_R = 6.5;
const PLATFORM_H = 0.4;

/** One pie-slice of the platform disc — all shards share this geometry. */
const wedgeGeo = new THREE.CylinderGeometry(
  PLATFORM_R,
  PLATFORM_R,
  PLATFORM_H,
  6,
  1,
  false,
  0,
  (Math.PI * 2) / N_SHARDS,
);

const rimGeo = new THREE.TorusGeometry(PLATFORM_R, 0.07, 10, 80);
const screenGeo = new THREE.PlaneGeometry(13, 6.5);

// ---------------------------------------------------------------------------
// Shattering platform
// ---------------------------------------------------------------------------

interface ShardSpec {
  angle: number;
  threshold: number;
  tilt: number;
  spin: number;
  drop: number;
  side: THREE.MeshStandardMaterial;
  top: THREE.MeshBasicMaterial;
}

function ShatterPlatform({ shatterP }: { shatterP: number }): React.JSX.Element {
  const fade = useFade();

  const shards = React.useMemo<ShardSpec[]>(() => {
    const gridTex = makeGridTexture(256, "#0a0f1a", "#1f8fab", 14, 2);
    const rnd = mulberry32(42);
    return Array.from({ length: N_SHARDS }, (_, i) => ({
      angle: (i * Math.PI * 2) / N_SHARDS,
      threshold: rnd() * 0.4,
      tilt: 0.55 + rnd() * 0.85,
      spin: (rnd() - 0.5) * 1.6,
      drop: 26 + rnd() * 10,
      side: new THREE.MeshStandardMaterial({
        color: "#0a0f1a",
        roughness: 0.55,
        metalness: 0.35,
        transparent: true,
      }),
      top: new THREE.MeshBasicMaterial({
        map: gridTex,
        toneMapped: false,
        transparent: true,
      }),
    }));
  }, []);

  const refs = React.useRef<Array<THREE.Mesh | null>>([]);

  useFrame(() => {
    if (!fade.visible) return;
    for (let i = 0; i < N_SHARDS; i++) {
      const mesh = refs.current[i];
      const s = shards[i];
      if (!mesh) continue;
      const local = THREE.MathUtils.clamp(
        (shatterP - s.threshold) / Math.max(0.05, 1 - s.threshold),
        0,
        1,
      );
      const ease = local * local;
      mesh.position.y = -PLATFORM_H / 2 - ease * s.drop;
      mesh.rotation.y = s.angle;
      mesh.rotation.x = ease * s.tilt;
      mesh.rotation.z = ease * s.spin * 0.4;
      const alpha = 1 - THREE.MathUtils.smoothstep(local, 0.3, 0.92);
      const visible = alpha > 0.02;
      if (mesh.visible !== visible) mesh.visible = visible;
      setLiveOpacity(s.side, alpha, fade.eased);
      setLiveOpacity(s.top, alpha, fade.eased);
    }
  });

  return (
    <>
      {shards.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
            if (el) el.rotation.order = "YXZ";
          }}
          geometry={wedgeGeo}
          material={[s.side, s.top, s.side]}
          position={[0, -PLATFORM_H / 2, 0]}
          rotation={[0, s.angle, 0]}
          receiveShadow
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Rim ring — flickers out as the platform breaks
// ---------------------------------------------------------------------------

function Rim({ shatterP }: { shatterP: number }): React.JSX.Element {
  const fade = useFade();
  const mat = React.useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#36e0ff",
        toneMapped: false,
        transparent: true,
        opacity: 0.9,
        fog: false,
      }),
    [],
  );
  const ref = React.useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!fade.visible) return;
    const t = clock.elapsedTime;
    const die = 1 - THREE.MathUtils.smoothstep(shatterP, 0, 0.55);
    const flicker =
      shatterP > 0.01
        ? Math.max(0.08, 0.55 + 0.45 * Math.sin(t * 38 + Math.sin(t * 13) * 5))
        : 0.92 + 0.08 * Math.sin(t * 2.2);
    const alpha = 0.9 * die * flicker;
    setLiveOpacity(mat, alpha, fade.eased);
    const m = ref.current;
    if (m) m.visible = alpha > 0.01;
  });

  return (
    <mesh
      ref={ref}
      geometry={rimGeo}
      material={mat}
      position={[0, -0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
}

// ---------------------------------------------------------------------------
// CRT screen backdrop — cracks open during the breakout
// ---------------------------------------------------------------------------

function Screen({ shatterP }: { shatterP: number }): React.JSX.Element {
  const fade = useFade();
  const mat = React.useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: makeScreenTexture(),
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    [],
  );
  const ref = React.useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!fade.visible) return;
    const crack = THREE.MathUtils.smoothstep(shatterP, 0.05, 0.8);
    const m = ref.current;
    if (m) {
      m.scale.set(1 + crack * 0.06, 1 + crack * 0.24, 1);
      m.visible = crack < 0.999;
    }
    const pulse = 0.8 + 0.06 * Math.sin(clock.elapsedTime * 9);
    setLiveOpacity(mat, pulse * (1 - crack), fade.eased);
  });

  return <mesh ref={ref} geometry={screenGeo} material={mat} position={[0, 3.1, -5]} renderOrder={-7} />;
}

// ---------------------------------------------------------------------------
// Vertical data streams around the platform perimeter
// ---------------------------------------------------------------------------

const _stream = new THREE.Object3D();

function DataStreams(): React.JSX.Element {
  const fade = useFade();
  const ref = React.useRef<THREE.InstancedMesh>(null);

  const seeds = React.useMemo(() => {
    const rnd = mulberry32(7);
    return Array.from({ length: 10 }, (_, i) => ({
      a: (i / 10) * Math.PI * 2 + rnd() * 0.4,
      r: 8 + rnd() * 3.5,
      h: 2.5 + rnd() * 3.5,
      spd: 2.2 + rnd() * 3,
      ph: rnd() * 20,
      dir: rnd() > 0.5 ? 1 : -1,
    }));
  }, []);

  const mat = React.useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#1fc8e8",
        toneMapped: false,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const im = ref.current;
    if (!im || !fade.visible) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      const y = -7 + ((s.ph + (s.dir > 0 ? t : 1000 - t) * s.spd) % 18);
      _stream.position.set(Math.sin(s.a) * s.r, y, Math.cos(s.a) * s.r);
      _stream.rotation.set(0, 0, 0);
      _stream.scale.set(0.06, s.h, 0.06);
      _stream.updateMatrix();
      im.setMatrixAt(i, _stream.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[GEO.box, mat, seeds.length]} frustumCulled={false} />;
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function CyberSpace({
  opacity,
  shatterP,
}: {
  opacity: number;
  shatterP: number;
}): React.JSX.Element {
  return (
    <FadeGroup opacity={opacity}>
      <Sky top="#091322" bottom="#03060b" />
      <ShatterPlatform shatterP={shatterP} />
      <Rim shatterP={shatterP} />
      <Screen shatterP={shatterP} />
      <DataStreams />
      <Particles
        count={120}
        color="#7fe8ff"
        size={0.05}
        area={[30, 18, 30]}
        center={[0, 4, 0]}
        motion="drift"
        sway={0.6}
        opacity={0.7}
        additive
        seed={99}
      />
    </FadeGroup>
  );
}
