"use client";

/**
 * Tower-floor dressings — scene fragments at their own local origin.
 * Agent B wraps them in <group>s positioned at the ZONE_Y floor offsets.
 *
 *   CouncilFurniture — café centrepiece: real table + five stools + pendant.
 *   DebateDressing   — dark stage with platforms, dais and light pillars.
 *   GamesDressing    — cosy lounge: chess table, two stools, string lights.
 *
 * Debate and Games each carry their own floor disc; CouncilFurniture carries
 * a "stage floor" hidden 1cm under the café floor, so every level reads as a
 * lit slab in the finale's dollhouse cutaway.
 *
 * No lights (emissive materials only). Stool seats top out at SEAT_TOP_Y and
 * are pulled 0.18 back from each member pose along its facing direction.
 */

import * as React from "react";
import * as THREE from "three";
import {
  COUNCIL_ARRANGEMENT,
  DEBATE_ARRANGEMENT,
  GAMES_ARRANGEMENT,
  GAMES_TABLE_CENTER,
  MEMBER_ORDER,
  SEAT_TOP_Y,
  type MemberPose,
} from "./timeline";
import { GEO, StaticInstances, pulledBack, type V3, type XForm } from "./worldKit";
import {
  Particles,
  PottedPlant,
  StoolSet,
  StringLights,
  makeCheckerTexture,
} from "./worldProps";

// ---------------------------------------------------------------------------
// CouncilFurniture — the café centrepiece (fixes "no chairs")
// ---------------------------------------------------------------------------

export function CouncilFurniture(): React.JSX.Element {
  const stoolPoses = React.useMemo<MemberPose[]>(
    () => MEMBER_ORDER.map((id) => pulledBack(COUNCIL_ARRANGEMENT[id])),
    [],
  );

  const cups = React.useMemo<XForm[]>(
    () =>
      [
        { a: 0.6, c: "#d8d2c8" },
        { a: 2.7, c: "#9b87d8" },
        { a: 4.5, c: "#d8a3b8" },
      ].map(({ a, c }) => ({
        p: [Math.sin(a) * 0.52, 0.755, Math.cos(a) * 0.52] as V3,
        s: [0.05, 0.07, 0.05] as V3,
        c,
      })),
    [],
  );

  const cupMat = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.55 }),
    [],
  );

  return (
    <group>
      {/* Stage floor — TOP at y=-0.01: hidden 1cm under the café floor while
          the café world is up, it BECOMES the visible council floor once the
          café has faded (after councilEnd), so the top level of the tower
          still reads as a slab in the descents and the dollhouse finale. */}
      <mesh position={[0, -0.16, 0]} receiveShadow>
        <cylinderGeometry args={[8, 7.8, 0.3, 48]} />
        <meshStandardMaterial color="#2c211c" roughness={0.9} />
      </mesh>

      {/* Round table — top surface at y 0.72 */}
      <mesh geometry={GEO.cyl} scale={[0.95, 0.06, 0.95]} position={[0, 0.69, 0]} castShadow>
        <meshStandardMaterial color="#5e4232" roughness={0.7} />
      </mesh>
      <mesh geometry={GEO.cyl} scale={[0.13, 0.62, 0.13]} position={[0, 0.35, 0]} castShadow>
        <meshStandardMaterial color="#4a3326" roughness={0.8} />
      </mesh>
      <mesh geometry={GEO.cyl} scale={[0.42, 0.06, 0.42]} position={[0, 0.05, 0]}>
        <meshStandardMaterial color="#3c2a1e" roughness={0.85} />
      </mesh>

      {/* Subtle emissive centre coaster + cups */}
      <mesh geometry={GEO.cyl} scale={[0.24, 0.014, 0.24]} position={[0, 0.727, 0]}>
        <meshBasicMaterial color="#ffd9a0" toneMapped={false} transparent opacity={0.75} />
      </mesh>
      <StaticInstances geometry={GEO.cyl} material={cupMat} xforms={cups} />

      {/* Five stools — one per COUNCIL_ARRANGEMENT pose */}
      <StoolSet poses={stoolPoses} />

      {/* Warm pendant above the table (faux light cone — NOT a real light) */}
      <mesh geometry={GEO.cyl} scale={[0.012, 1.45, 0.012]} position={[0, 2.69, 0]}>
        <meshStandardMaterial color="#1c130c" roughness={0.9} />
      </mesh>
      <mesh geometry={GEO.coneLo} scale={[0.34, 0.26, 0.34]} position={[0, 2.02, 0]}>
        <meshStandardMaterial color="#3a2a22" roughness={0.6} />
      </mesh>
      <mesh geometry={GEO.cyl} scale={[0.15, 0.05, 0.15]} position={[0, 1.88, 0]}>
        <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
      </mesh>
      <mesh geometry={GEO.cone} scale={[1.12, 1.2, 1.12]} position={[0, 1.26, 0]}>
        <meshBasicMaterial
          color="#ffd9a0"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// DebateDressing — dark stage, two platforms, dais, light pillars
// ---------------------------------------------------------------------------

export function DebateDressing(): React.JSX.Element {
  const audience = React.useMemo<XForm[]>(
    () =>
      [-4.5, -1.5, 1.5, 4.5].map((x, i) => ({
        p: [x, 0.58 + (i % 2) * 0.1, -8] as V3,
        s: [0.52, 0.78 + (i % 2) * 0.12, 0.5] as V3,
      })),
    [],
  );
  const audienceMat = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0c0a14", roughness: 1 }),
    [],
  );

  // Pro pair stage-left (aria/echo), con pair stage-right (rex/nova).
  const proCentre = {
    x: (DEBATE_ARRANGEMENT.aria.x + DEBATE_ARRANGEMENT.echo.x) / 2,
    z: (DEBATE_ARRANGEMENT.aria.z + DEBATE_ARRANGEMENT.echo.z) / 2,
  };
  const conCentre = {
    x: (DEBATE_ARRANGEMENT.rex.x + DEBATE_ARRANGEMENT.nova.x) / 2,
    z: (DEBATE_ARRANGEMENT.rex.z + DEBATE_ARRANGEMENT.nova.z) / 2,
  };

  return (
    <group>
      {/* Reflective-ish stage floor */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[8, 7.8, 0.3, 48]} />
        <meshStandardMaterial color="#15121d" metalness={0.4} roughness={0.3} />
      </mesh>

      {/* Low platforms under the pro / con pairs */}
      <mesh geometry={GEO.box} scale={[2.6, 0.18, 1.6]} position={[proCentre.x, 0.09, proCentre.z]} castShadow>
        <meshStandardMaterial color="#241f30" roughness={0.7} />
      </mesh>
      <mesh geometry={GEO.box} scale={[2.6, 0.18, 1.6]} position={[conCentre.x, 0.09, conCentre.z]} castShadow>
        <meshStandardMaterial color="#241f30" roughness={0.7} />
      </mesh>

      {/* Moderator dais behind Sage */}
      <mesh
        geometry={GEO.box}
        scale={[1.1, 1.0, 0.55]}
        position={[DEBATE_ARRANGEMENT.sage.x, 0.5, DEBATE_ARRANGEMENT.sage.z - 0.75]}
        castShadow
      >
        <meshStandardMaterial color="#1d1828" roughness={0.6} />
      </mesh>

      {/* Vertical light pillars — cool stage-left, warm stage-right */}
      <mesh geometry={GEO.box} scale={[0.35, 4.6, 0.35]} position={[-6.4, 2.3, -1]}>
        <meshBasicMaterial color="#7fb5d4" toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <mesh geometry={GEO.box} scale={[0.35, 4.6, 0.35]} position={[6.4, 2.3, -1]}>
        <meshBasicMaterial color="#d49a7a" toneMapped={false} transparent opacity={0.85} />
      </mesh>

      {/* Hanging emissive bar above centre */}
      <mesh geometry={GEO.cyl} scale={[0.012, 1.3, 0.012]} position={[-2, 5.35, -0.4]}>
        <meshStandardMaterial color="#15101e" roughness={0.9} />
      </mesh>
      <mesh geometry={GEO.cyl} scale={[0.012, 1.3, 0.012]} position={[2, 5.35, -0.4]}>
        <meshStandardMaterial color="#15101e" roughness={0.9} />
      </mesh>
      <mesh geometry={GEO.box} scale={[5.2, 0.08, 0.16]} position={[0, 4.7, -0.4]}>
        <meshBasicMaterial color="#d8e2ff" toneMapped={false} transparent opacity={0.9} />
      </mesh>

      {/* Faint audience silhouettes far behind */}
      <StaticInstances geometry={GEO.sphereLo} material={audienceMat} xforms={audience} />

      <Particles count={40} color="#9a90c8" size={0.035} area={[10, 4, 7]} center={[0, 2.2, -1]} motion="drift" sway={0.3} opacity={0.3} additive seed={111} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// GamesDressing — chess table at seat height, two player stools, lounge props
// ---------------------------------------------------------------------------

const TC = GAMES_TABLE_CENTER;

export function GamesDressing(): React.JSX.Element {
  const checkerTex = React.useMemo(() => makeCheckerTexture("#e8d8c0", "#3a2a22"), []);

  const stoolPoses = React.useMemo<MemberPose[]>(
    () =>
      (["aria", "rex"] as const).map((id) => {
        const { x, z, rotY } = GAMES_ARRANGEMENT[id];
        return pulledBack({ x, z, rotY });
      }),
    [],
  );

  // Mid-game pieces — light cylinders vs dark cones on board squares.
  const { pawns, majors } = React.useMemo(() => {
    const sq = (file: number, rank: number): V3 => [
      TC.x - 0.34 + 0.0425 + file * 0.085,
      0.668,
      TC.z - 0.34 + 0.0425 + rank * 0.085,
    ];
    const pawnXf: XForm[] = [
      { p: sq(1, 2), c: "#e3d4b4" },
      { p: sq(3, 3), c: "#e3d4b4" },
      { p: sq(6, 2), c: "#e3d4b4" },
      { p: sq(2, 5), c: "#46302a" },
      { p: sq(5, 4), c: "#46302a" },
      { p: sq(6, 6), c: "#46302a" },
    ].map((x) => ({ ...x, s: [0.022, 0.055, 0.022] as V3 }));
    const majorXf: XForm[] = [
      { p: sq(4, 1), c: "#e3d4b4" },
      { p: sq(0, 3), c: "#e3d4b4" },
      { p: sq(3, 6), c: "#46302a" },
      { p: sq(7, 5), c: "#46302a" },
    ].map((x) => ({
      p: [x.p[0], 0.682, x.p[2]] as V3,
      s: [0.026, 0.085, 0.026] as V3,
      c: x.c,
    }));
    // A captured pawn lying beside the board.
    pawnXf.push({
      p: [TC.x + 0.41, 0.633, TC.z - 0.18],
      r: [Math.PI / 2, 0, 0.6],
      s: [0.022, 0.055, 0.022],
      c: "#46302a",
    });
    return { pawns: pawnXf, majors: majorXf };
  }, []);

  const pieceMat = React.useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6 }),
    [],
  );
  const boardMat = React.useMemo(
    () => new THREE.MeshStandardMaterial({ map: checkerTex, roughness: 0.7 }),
    [checkerTex],
  );

  return (
    <group>
      {/* Lounge floor + rug */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[8, 7.8, 0.3, 48]} />
        <meshStandardMaterial color="#241a20" roughness={0.9} />
      </mesh>
      <mesh geometry={GEO.cyl} scale={[2.9, 0.03, 2.9]} position={[TC.x, 0.015, TC.z - 0.4]}>
        <meshStandardMaterial color="#3a2531" roughness={1} />
      </mesh>

      {/* Seat-height games table (top at SEAT_TOP_Y) */}
      <mesh geometry={GEO.box} scale={[0.9, 0.05, 0.9]} position={[TC.x, SEAT_TOP_Y - 0.025, TC.z]} castShadow>
        <meshStandardMaterial color="#4a3328" roughness={0.75} />
      </mesh>
      <mesh geometry={GEO.cyl} scale={[0.1, SEAT_TOP_Y - 0.05, 0.1]} position={[TC.x, (SEAT_TOP_Y - 0.05) / 2, TC.z]}>
        <meshStandardMaterial color="#3a281f" roughness={0.85} />
      </mesh>
      <mesh geometry={GEO.cyl} scale={[0.3, 0.04, 0.3]} position={[TC.x, 0.03, TC.z]}>
        <meshStandardMaterial color="#2e2019" roughness={0.9} />
      </mesh>

      {/* Chessboard + pieces mid-game */}
      <mesh geometry={GEO.box} material={boardMat} scale={[0.72, 0.02, 0.72]} position={[TC.x, SEAT_TOP_Y + 0.01, TC.z]} />
      <StaticInstances geometry={GEO.cyl} material={pieceMat} xforms={pawns} castShadow />
      <StaticInstances geometry={GEO.coneLo} material={pieceMat} xforms={majors} castShadow />

      {/* Two player stools (aria & rex poses, pulled back) */}
      <StoolSet poses={stoolPoses} seatColor="#5e4452" legColor="#2c1f28" />

      {/* String lights sagging across the lounge */}
      <StringLights from={[-3.6, 3.3, -2.8]} to={[3.8, 3.05, -1.4]} sag={0.85} bulbs={8} />

      {/* Floor cushions near the spectators */}
      <mesh geometry={GEO.sphereLo} scale={[0.55, 0.2, 0.55]} position={[-3.1, 0.14, -0.1]} castShadow>
        <meshStandardMaterial color="#7a4a56" roughness={1} />
      </mesh>
      <mesh geometry={GEO.sphereLo} scale={[0.5, 0.18, 0.5]} position={[3.2, 0.13, -0.3]} castShadow>
        <meshStandardMaterial color="#4a5a72" roughness={1} />
      </mesh>

      <PottedPlant position={[-4.6, 0, -3.2]} scale={1.6} />

      <Particles count={30} color="#ffd9b0" size={0.035} area={[8, 3.5, 6]} center={[0, 1.9, -0.5]} motion="drift" sway={0.35} opacity={0.35} additive seed={123} />
    </group>
  );
}
