"use client";

/**
 * JourneyScene — one persistent world, one camera, five persistent members.
 *
 * The camera physically travels: cyber platform (boot/wave/breakout, y=154) →
 * plunges down a shaft of 7 stacked diorama worlds (fall) → touches down in
 * the café (landing) → orbits the council table → the floor opens and it
 * DESCENDS the tower: debate hall one floor below (y=-22), then the games den
 * below that (y=-44) → the finale pulls back to a dollhouse cutaway of all
 * three lit floors. Members never unmount; every section is one continuous
 * shot, and scroll-down always means go-down.
 *
 * Discipline: React state only for discrete changes (boot phase, act, round,
 * chat count, speakers). ALL continuous motion mutates refs inside useFrame.
 * Scroll progress arrives as a prop, so world opacities and animation labels
 * are pure render-time derivations of it — never per-frame setState.
 */

import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

import CouncilMember3D from "../CouncilMember3D";
import { MODEL_PATHS, type CouncilMemberId } from "../positions";
import useCouncilAnimation from "../useCouncilAnimation";
import {
  ACT_BOUNDS,
  BOOT_DURATION,
  COUNCIL_ARRANGEMENT,
  CYBER_Y,
  DEBATE_ARRANGEMENT,
  DEBATE_ROUNDS,
  GAME_CHAT,
  GAMES_ARRANGEMENT,
  GAMES_TABLE_CENTER,
  GLIDE_HOLD,
  JOURNEY_WORLD_ORDER,
  LINE_ARRANGEMENT,
  MEMBER_ORDER,
  N_WORLDS,
  WAVE_DURATION,
  WORLD_FOG,
  ZONE_Y,
  actLocal,
  worldYFor,
  type JourneyActState,
  type JourneyWorldId,
} from "./timeline";
import {
  CouncilFurniture,
  CyberSpace,
  DebateDressing,
  GamesDressing,
  JourneyWorld,
} from "./JourneyWorlds";
import {
  DebateSpots,
  DustBursts,
  GlideStreaks,
  MaterializeLights,
  SpeedStreaks,
  TowerShaft,
  WindParticles,
  createFxBus,
} from "./JourneyFx";
import {
  deriveJourney,
  landingY,
  resolveMemberAnim,
  type LookMode,
} from "./choreography";
import {
  clamp01,
  dampAngle,
  dampK,
  dampNum,
  dampV3,
  easeOutCubic,
  lerp,
  smoothstep01,
} from "./journeyMath";

// Memoized wrappers — the scene re-renders on every scroll tick (progress is
// a prop), so anything whose props change only discretely must skip its own
// re-render to keep reconciliation cheap.
const MWorld = memo(JourneyWorld);
const MCyber = memo(CyberSpace);
const MCouncilFurniture = memo(CouncilFurniture);
const MDebateDressing = memo(DebateDressing);
const MGamesDressing = memo(GamesDressing);
const MMember = memo(CouncilMember3D);

const MEMBER_SCALE = 1.45;
const BOOT_TOTAL = BOOT_DURATION + WAVE_DURATION;
/** Reduced-motion still frame: mid-council, table shot. */
const COUNCIL_FIXED_P = (ACT_BOUNDS.landingEnd + ACT_BOUNDS.councilEnd) / 2;

// Council orbit sweep — glide1's camera picks up exactly where it ends.
const ORBIT_END_ANGLE = 0.7;
const ORBIT_END_X = Math.sin(ORBIT_END_ANGLE) * 7.0; // ≈ 4.51
const ORBIT_END_Z = Math.cos(ORBIT_END_ANGLE) * 7.0; // ≈ 5.36

/** Hold-then-descend remap shared by the glide cameras and the member y. */
function glideDescent(lp: number): number {
  return smoothstep01(Math.max(0, lp - GLIDE_HOLD) / (1 - GLIDE_HOLD));
}

/**
 * Wraps a floor dressing and scales every material's opacity by `factor`
 * (damped, half-life 0.15s). This is how "the floor opens" during the tower
 * descents: the departure floor's slab + furniture dissolve while the members
 * drop through, then restore — the dollhouse finale needs every floor lit.
 * Points are skipped so self-animating dust never fights the fade.
 */
function FadeDressing({ factor, children }: { factor: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const eased = useRef(1);
  const restored = useRef(true);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    eased.current = dampNum(eased.current, factor, 0.15, dt);
    const f = eased.current;
    if (f > 0.999 && factor >= 1) {
      if (restored.current) return; // fully solid + already reset — skip work
      restored.current = true;
    } else {
      restored.current = false;
    }
    g.traverse((o) => {
      if ((o as THREE.Points).isPoints) return;
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (!mat || typeof mat.opacity !== "number") continue;
        const ud = mat.userData as { baseOp?: number; baseTransparent?: boolean };
        if (ud.baseOp === undefined) {
          ud.baseOp = mat.opacity;
          ud.baseTransparent = mat.transparent;
        }
        if (restored.current) {
          mat.opacity = ud.baseOp;
          mat.transparent = ud.baseTransparent ?? mat.transparent;
        } else {
          mat.opacity = ud.baseOp * f;
          mat.transparent = true;
        }
      }
    });
  });

  return <group ref={ref}>{children}</group>;
}

export interface JourneySceneProps {
  /** Master scroll progress 0..1 across the journey section. */
  progress: number;
  /** Fired ONLY when a discrete piece of journey state changes. */
  onActState?: (s: JourneyActState) => void;
}

export default function JourneyScene({ progress, onActState }: JourneySceneProps) {
  const reduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  // ── Boot machine (time-driven; per-frame in refs, booleans for React) ────
  const [bootDone, setBootDone] = useState(reduced);
  const [waveActive, setWaveActive] = useState(false);
  const bootRef = useRef({
    elapsed: reduced ? BOOT_TOTAL + 1 : 0,
    done: reduced,
    wave: false,
  });

  const p = reduced ? COUNCIL_FIXED_P : clamp01(progress);
  const d = deriveJourney(p, bootDone);
  const act = d.act;

  // ── Conversation engines (discrete React state) ──────────────────────────
  // Reduced-motion shows a CALM seated council (idle-sitting + head-bob only),
  // honouring the preference instead of rotating speakers/reactions forever.
  const council = useCouncilAnimation({
    posture: "sitting",
    conversation: !reduced && act === "council",
    speakerRotateSec: 5.5,
    reactionChance: 0.85,
    falling: false,
  });
  const councilSpeaker = act === "council" ? council.currentSpeakerId : null;
  const debateSpeaker: CouncilMemberId | null =
    d.debateRound >= 0 ? DEBATE_ROUNDS[d.debateRound].speaker : null;

  // Games banter: whoever spoke the latest GAME_CHAT line talks for ~2s; a
  // spectator cracks up when one of Rex's lines lands (chat indices 1 and 5).
  const [gameSpeaker, setGameSpeaker] = useState<CouncilMemberId | null>(null);
  const [gameLaugher, setGameLaugher] = useState<CouncilMemberId | null>(null);
  useEffect(() => {
    if (act !== "games" || d.gameChatCount === 0) {
      setGameSpeaker(null);
      setGameLaugher(null);
      return;
    }
    const idx = d.gameChatCount - 1;
    setGameSpeaker(GAME_CHAT[idx].speaker);
    const t1 = window.setTimeout(() => setGameSpeaker(null), 2000);
    let t2: number | null = null;
    if (idx === 1 || idx === 5) {
      setGameLaugher(idx === 1 ? "nova" : "echo");
      t2 = window.setTimeout(() => setGameLaugher(null), 2200);
    }
    return () => {
      window.clearTimeout(t1);
      if (t2 !== null) window.clearTimeout(t2);
    };
  }, [act, d.gameChatCount]);

  // ── onActState — fire ONLY on discrete change ─────────────────────────────
  const prevActState = useRef<JourneyActState | null>(null);
  useEffect(() => {
    const s: JourneyActState = {
      act,
      worldIndex: d.worldIndex,
      debateRound: d.debateRound,
      gameChatCount: d.gameChatCount,
      councilSpeaker,
    };
    const prev = prevActState.current;
    if (
      prev &&
      prev.act === s.act &&
      prev.worldIndex === s.worldIndex &&
      prev.debateRound === s.debateRound &&
      prev.gameChatCount === s.gameChatCount &&
      prev.councilSpeaker === s.councilSpeaker
    ) {
      return;
    }
    prevActState.current = s;
    onActState?.(s);
  }, [act, d.worldIndex, d.debateRound, d.gameChatCount, councilSpeaker, onActState]);

  // ── Render-time derivations (pure functions of the progress prop) ────────
  const worldOpacity = (i: number): number => {
    if (reduced) return i === N_WORLDS - 1 ? 1 : 0;
    if (act === "boot" || act === "breakout") return i === 0 ? 1 : 0;
    if (act === "fall") return clamp01(1 - Math.abs(d.bandPos - i) * 1.25);
    if (i !== N_WORLDS - 1) return 0;
    // Café carries the landing + council acts, then dissolves in the FIRST
    // ~30% of glide1 — the descent holds the members at the table for the
    // first 22% (GLIDE_HOLD), so the floor must be gone by the time they
    // drop through it. Also keeps its fog-immune sky dome / window pane out
    // of the debate/games/finale frames.
    return clamp01(
      1 -
        (d.p - ACT_BOUNDS.councilEnd) /
          ((ACT_BOUNDS.glide1End - ACT_BOUNDS.councilEnd) * 0.3),
    );
  };

  // "The floor opens": during each descent the DEPARTURE floor's dressing
  // dissolves (down to 8%) while the members hold, stays open while they pass
  // through, then restores — every floor must be lit for the dollhouse finale.
  const glideDip = (a: "glide1" | "glide2"): number => {
    if (reduced || act !== a) return 1;
    const lp = actLocal(d.p, a);
    if (lp < 0.18) return 1 - smoothstep01(lp / 0.18) * 0.92;
    if (lp < 0.6) return 0.08;
    return 0.08 + smoothstep01((lp - 0.6) / 0.4) * 0.92;
  };
  const councilDressFactor = glideDip("glide1");
  const debateDressFactor = glideDip("glide2");
  const cyberOpacity = reduced
    ? 0
    : act === "boot" || act === "breakout"
      ? 1
      : act === "fall"
        ? clamp01(1 - d.fallLocal / 0.3)
        : 0;

  const anims = MEMBER_ORDER.map((id) =>
    resolveMemberAnim(
      {
        bootDone,
        waveActive,
        d,
        councilStates: council.states,
        councilSpeaker,
        debateSpeaker,
        gameSpeaker,
        gameLaugher,
      },
      id,
    ),
  );

  // Where the current speaker's head is (world space) — listeners turn to it.
  const speakerHead = useMemo(() => {
    if (act === "council" && councilSpeaker) {
      const pose = COUNCIL_ARRANGEMENT[councilSpeaker];
      return new THREE.Vector3(pose.x, ZONE_Y.council + 1.35, pose.z);
    }
    if (act === "debate" && debateSpeaker) {
      const pose = DEBATE_ARRANGEMENT[debateSpeaker];
      return new THREE.Vector3(pose.x, ZONE_Y.debate + 2.0, pose.z);
    }
    return null;
  }, [act, councilSpeaker, debateSpeaker]);

  // ── Per-frame refs ────────────────────────────────────────────────────────
  const memberRefs = useRef<Array<THREE.Group | null>>(MEMBER_ORDER.map(() => null));
  const keyLightRef = useRef<THREE.DirectionalLight>(null);
  const rimLightRef = useRef<THREE.DirectionalLight>(null);
  const lightTarget = useMemo(() => new THREE.Object3D(), []);
  const lookVecs = useMemo(() => MEMBER_ORDER.map(() => new THREE.Vector3()), []);
  const fx = useMemo(createFxBus, []);
  const tPos = useMemo(() => new THREE.Vector3(), []);
  const tLook = useMemo(() => new THREE.Vector3(), []);
  const tFocus = useMemo(() => new THREE.Vector3(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const rig = useRef({
    camPos: new THREE.Vector3(0, CYBER_Y + 1.6, 9.5),
    camLook: new THREE.Vector3(0, CYBER_Y + 1.1, 0),
    focus: new THREE.Vector3(0, CYBER_Y, 0),
    fogColor: new THREE.Color(WORLD_FOG.cyber),
    fogFar: 46,
    fov: 50,
    debateDrift: 0,
    prevAct: "boot" as JourneyActState["act"],
    touched: false,
    init: false,
  });

  useEffect(() => {
    if (keyLightRef.current) keyLightRef.current.target = lightTarget;
    if (rimLightRef.current) rimLightRef.current.target = lightTarget;
  }, [lightTarget]);

  // ── THE frame loop — camera rig + member choreography (refs only) ────────
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const r = rig.current;
    const b = bootRef.current;

    // Boot/wave timers (time-driven; forced complete if the user scrolls early).
    const pNow = reduced ? COUNCIL_FIXED_P : clamp01(progress);
    if (b.elapsed < BOOT_TOTAL + 0.2) {
      b.elapsed += dt;
      if (pNow > 0.5 * ACT_BOUNDS.breakoutEnd) b.elapsed = BOOT_TOTAL + 0.2;
    }
    const bootDoneNow = b.elapsed >= BOOT_DURATION || pNow > 0.5 * ACT_BOUNDS.breakoutEnd;
    const waveNow = bootDoneNow && b.elapsed < BOOT_TOTAL && pNow < 0.005;
    if (bootDoneNow !== b.done) {
      b.done = bootDoneNow;
      setBootDone(bootDoneNow); // discrete
    }
    if (waveNow !== b.wave) {
      b.wave = waveNow;
      setWaveActive(waveNow); // discrete
    }

    const dd = deriveJourney(pNow, bootDoneNow);
    const actNow = dd.act;
    const camY = lerp(CYBER_Y - 2, 2.2, dd.fallEase);

    // FX bus — plain numbers for the effect layers.
    for (let i = 0; i < MEMBER_ORDER.length; i++) {
      fx.matP[i] = reduced ? 1 : clamp01((b.elapsed - 0.3 - i * 0.4) / 0.5);
    }
    fx.shatterP = dd.shatterP;
    fx.fallEase = dd.fallEase;
    fx.camY = camY;
    const glideActive = actNow === "glide1" || actNow === "glide2";
    fx.glideOpacity = dampNum(fx.glideOpacity, glideActive ? 0.35 : 0, 0.15, dt);
    if (actNow !== r.prevAct) {
      // Re-arm the touchdown burst whenever the members go airborne again.
      if (actNow === "fall" || actNow === "breakout" || actNow === "boot") {
        fx.dustStartT = -1;
        r.touched = false;
      }
    }
    // One-shot dust burst on the RISING EDGE of touchdown — i.e. when feet
    // actually reach the floor, not when the landing act begins (the members
    // are still up to ~2 units airborne at act entry).
    if (dd.touchedDown && !r.touched) {
      r.touched = true;
      fx.dustStartT = t;
    }

    // ── Camera targets per act ──────────────────────────────────────────────
    let noiseAmp = 0;
    let roll = 0;
    let fovTarget = 50;
    /** Member mid-altitude during a descent (the lerp WITHOUT the billow). */
    let glideY: number | null = null;
    switch (actNow) {
      case "boot":
        tPos.set(0, CYBER_Y + 1.6, 9.5);
        tLook.set(0, CYBER_Y + 1.1, 0);
        break;
      case "breakout":
        if (waveNow) {
          tPos.set(0, CYBER_Y + 1.6, 9.5);
          tLook.set(0, CYBER_Y + 1.1, 0);
        } else {
          tPos.set(0, CYBER_Y + 1.7, 8.6);
          tLook.set(0, CYBER_Y + 1.0 - dd.shatterP * 1.2, 0);
          noiseAmp = 0.03 * dd.shatterP;
        }
        break;
      case "fall":
        tPos.set(0, camY + 1.6, lerp(10.2, 8.2, dd.fallEase));
        tLook.set(0, camY - 0.8, 0);
        fovTarget = 50 + 7 * Math.sin(Math.PI * dd.fallEase); // 50 → 57 → 50
        roll = Math.sin(t * 0.5) * 0.015;
        break;
      case "landing": {
        const lp = actLocal(pNow, "landing");
        tPos.set(0, lerp(2.6, 2.0, lp), lerp(8.4, 7.4, lp));
        tLook.set(0, 1.0, 0);
        break;
      }
      case "council": {
        // Orbit starts at angle 0 (continuous with the landing shot at x=0)
        // and sweeps one direction only, so the glide1 exit needs no reversal.
        const lp = reduced ? 0.5 : actLocal(pNow, "council");
        const angle = lerp(0, ORBIT_END_ANGLE, lp);
        tPos.set(Math.sin(angle) * 7.0, 1.9, Math.cos(angle) * 7.0);
        tLook.set(0, 0.95, 0);
        break;
      }
      case "glide1": {
        // The floor opens — descent council → debate hall. During the HOLD
        // (first 22%) the camera pushes OUT past the council disc rim (r=8)
        // while the floor dissolves, so when it crosses the y=0 plane it is
        // outside the slab — no full-screen wipe. Both seams stay scrubbed:
        // entry = council orbit end, exit = debate resting pose.
        const lp = actLocal(pNow, "glide1");
        const desc = glideDescent(lp);
        const out = Math.min(1, lp / GLIDE_HOLD); // hold-phase push-out
        glideY = lerp(ZONE_Y.council, ZONE_Y.debate, desc);
        tPos.set(
          lerp(ORBIT_END_X, 0, Math.max(out * 0.4, desc)),
          glideY + lerp(1.9, 1.7, desc),
          lerp(ORBIT_END_Z, 8.6, Math.max(out, desc)),
        );
        tLook.set(0, glideY - 0.3, 0);
        fovTarget = 50 + 3 * Math.sin(Math.PI * desc); // 50 → 53 → 50 drop pump
        break;
      }
      case "debate": {
        const speakerNow = dd.debateRound >= 0 ? DEBATE_ROUNDS[dd.debateRound].speaker : null;
        const side = speakerNow ? Math.sign(DEBATE_ARRANGEMENT[speakerNow].x) : 0;
        r.debateDrift = dampNum(r.debateDrift, side * 0.9, 0.45, dt);
        tPos.set(r.debateDrift, ZONE_Y.debate + 1.7, 8.6);
        tLook.set(0, ZONE_Y.debate + 1.1, 0);
        break;
      }
      case "glide2": {
        // Second descent: debate hall → games den. Starts at the debate
        // resting pose (the last round's speaker is Sage, so debateDrift has
        // settled back to ≈0) and ends at the games arc entry (a=0 → z≈6.9).
        // The camera stays at z≥6.9 > the debate disc rim is crossed outside.
        const desc = glideDescent(actLocal(pNow, "glide2"));
        glideY = lerp(ZONE_Y.debate, ZONE_Y.games, desc);
        tPos.set(0, glideY + lerp(1.7, 1.6, desc), lerp(8.6, 6.9, desc));
        tLook.set(0, glideY - 0.3, 0);
        fovTarget = 50 + 3 * Math.sin(Math.PI * desc); // 50 → 53 → 50 drop pump
        break;
      }
      case "games": {
        // The wall-clock arc ramps IN from a=0 (exact glide2 handoff) and
        // settles back to a=0 before the act ends (exact finale handoff) —
        // the seams stay scrubbed regardless of where the sine happens to be.
        const gl = actLocal(pNow, "games");
        const arcIn = smoothstep01(Math.min(1, gl / 0.15));
        const arcOut = 1 - smoothstep01(Math.max(0, gl - 0.82) / 0.18);
        const a = Math.sin(t * 0.16) * 0.25 * arcIn * arcOut;
        const cx = GAMES_TABLE_CENTER.x;
        const cz = GAMES_TABLE_CENTER.z;
        tPos.set(cx + Math.sin(a) * 6.0, ZONE_Y.games + 1.6, cz + Math.cos(a) * 6.0);
        tLook.set(cx, ZONE_Y.games + 0.8, cz);
        break;
      }
      case "finale": {
        // The DOLLHOUSE shot — scroll OWNS the whole move: start exactly at
        // the games arc shot (so the games→finale seam is a scrubbed move,
        // not a damp-authored whip-pan) and pull back + UP until all three
        // lit floors read as one vertical cutaway. End z is 50 (not 44):
        // with the look point at ZONE_Y.debate − 2 the frame-top ray at
        // fov 56 crosses the z=0 plane at y ≈ +1.7, which is what actually
        // clears the council floor AND its tabletop at the top of the frame
        // (at z=44 it crosses at y ≈ −1.5 and the top floor would crop).
        const lp = smoothstep01(actLocal(pNow, "finale"));
        tPos.set(0, lerp(ZONE_Y.games + 1.6, -20, lp), lerp(6.9, 50, lp));
        tLook.set(
          0,
          lerp(ZONE_Y.games + 0.8, ZONE_Y.debate - 2, lp),
          lerp(GAMES_TABLE_CENTER.z, 0, lp),
        );
        fovTarget = lerp(50, 56, lp); // ease wide so the whole tower fits
        break;
      }
    }

    // Portrait aspect: pull the camera back so the blocking still fits.
    const aspect = state.size.width / Math.max(1, state.size.height);
    const zf = aspect < 0.8 ? 1.5 : aspect < 1.1 ? 1.2 : 1;
    if (zf !== 1) {
      tPos.x = tLook.x + (tPos.x - tLook.x) * zf;
      tPos.z = tLook.z + (tPos.z - tLook.z) * zf;
    }

    if (!r.init) {
      r.camPos.copy(tPos);
      r.camLook.copy(tLook);
    } else {
      dampV3(r.camPos, tPos, 0.32, dt);
      dampV3(r.camLook, tLook, 0.32, dt);
    }
    const camera = state.camera;
    camera.position.copy(r.camPos);
    if (noiseAmp > 0) {
      camera.position.x += Math.sin(t * 37) * noiseAmp;
      camera.position.y += Math.sin(t * 37 + 1.3) * noiseAmp;
    }
    camera.lookAt(r.camLook);
    if (roll !== 0) camera.rotation.z += roll; // faint roll AFTER lookAt
    const persp = camera as THREE.PerspectiveCamera;
    if (persp.isPerspectiveCamera) {
      r.fov = dampNum(r.fov, fovTarget, 0.18, dt);
      if (Math.abs(persp.fov - r.fov) > 0.01) {
        persp.fov = r.fov;
        persp.updateProjectionMatrix();
      }
    }
    fx.camPos.copy(camera.position);

    // ── Key light follows the action so shadows stay crisp everywhere ──────
    if (actNow === "boot" || actNow === "breakout") tFocus.set(0, CYBER_Y, 0);
    else if (actNow === "fall") tFocus.set(0, camY - 1.1, 0);
    else if (glideActive && glideY !== null) tFocus.set(0, glideY, 0);
    else if (actNow === "debate" || actNow === "finale") tFocus.set(0, ZONE_Y.debate, 0);
    else if (actNow === "games") tFocus.set(0, ZONE_Y.games, 0);
    else tFocus.set(0, ZONE_Y.council, 0);
    if (!r.init) r.focus.copy(tFocus);
    // During descents and the fall the focus target is already scroll-smooth
    // (glideY is smoothstepped, camY is the fall ease) — copy it undamped so
    // the ±9 shadow box never lags behind fast-moving members.
    else if (glideActive || actNow === "fall") r.focus.copy(tFocus);
    else dampV3(r.focus, tFocus, 0.4, dt);
    const key = keyLightRef.current;
    if (key) {
      key.position.set(r.focus.x + 5, r.focus.y + 8, r.focus.z + 6);
      lightTarget.position.copy(r.focus);
      lightTarget.updateMatrixWorld();
    }
    const rim = rimLightRef.current;
    if (rim) rim.position.set(r.focus.x - 6, r.focus.y + 5, r.focus.z - 7);

    // ── Fog + background damp toward the current context's palette ─────────
    const fogCtx: JourneyWorldId | "cyber" =
      actNow === "boot" || actNow === "breakout"
        ? "cyber"
        : actNow === "fall"
          ? JOURNEY_WORLD_ORDER[dd.worldIndex]
          : "cafe";
    tmpColor.set(WORLD_FOG[fogCtx]);
    if (!r.init) r.fogColor.copy(tmpColor);
    else r.fogColor.lerp(tmpColor, dampK(0.35, dt));
    // The finale frames the whole tower from ~50 units out — open the fog so
    // the farthest (games) floor at ~55 sits ~33% fogged, an atmospheric
    // depth cue rather than soup.
    const fogFarTarget = glideActive ? 30 : actNow === "finale" ? 150 : 46;
    r.fogFar = r.init ? dampNum(r.fogFar, fogFarTarget, 0.4, dt) : 46;
    const fog = state.scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.copy(r.fogColor);
      fog.near = 8;
      fog.far = r.fogFar;
    }
    if (state.scene.background instanceof THREE.Color) {
      state.scene.background.copy(r.fogColor).multiplyScalar(0.55);
    }

    // ── Members — pose targets per act, damped into the persistent groups ──
    for (let i = 0; i < MEMBER_ORDER.length; i++) {
      const id = MEMBER_ORDER[i];
      const g = memberRefs.current[i];
      if (!g) continue;

      let tx: number;
      let tz: number;
      let tRotY: number;
      let tRotX = 0;
      let tRotZ = 0;
      let y = 0;

      switch (actNow) {
        case "boot": {
          const pose = LINE_ARRANGEMENT[id];
          tx = pose.x;
          tz = pose.z;
          tRotY = pose.rotY;
          y = CYBER_Y;
          break;
        }
        case "breakout": {
          const pose = LINE_ARRANGEMENT[id];
          tx = pose.x;
          tz = pose.z;
          tRotY = pose.rotY;
          y = CYBER_Y - dd.shatterP * 1.2; // sink as the floor opens
          tRotX = Math.sin(t * 13 + i * 5.3) * 0.08 * dd.shatterP;
          tRotZ = Math.sin(t * 11 + i * 3.1) * 0.06 * dd.shatterP;
          break;
        }
        case "fall": {
          // THE plunge: y assigned directly (no damp) — oscillating vertical
          // spread within the frame, wide loose cluster tightening toward the
          // council circle as the café approaches.
          const pose = COUNCIL_ARRANGEMENT[id];
          const fe = dd.fallEase;
          const formulaY =
            camY - 1.1 + Math.sin(fe * Math.PI * 3 + i * 1.7) * 0.9 + (i - 2) * 0.22;
          // The y channel is undamped by design, so it must be C0-continuous
          // with the breakout exit altitude (CYBER_Y - 1.2). Blend the formula
          // in over the first 12% of the fall; fully converged long before the
          // landing handoff, so FALL_END_YS continuity is untouched.
          const blendIn = smoothstep01(dd.fallLocal / 0.12);
          y = lerp(CYBER_Y - 1.2, formulaY, blendIn);
          tx = pose.x * (1 + 0.8 * (1 - fe)) + (i - 2) * 0.3 * (1 - fe);
          tz = pose.z * (1 + 0.8 * (1 - fe));
          tRotY = pose.rotY;
          tRotX = (0.3 + Math.sin(t * 1.1 + i) * 0.18) * (1 - fe * 0.8); // tumble
          tRotZ = (i - 2) * 0.1 * (1 - fe);
          break;
        }
        case "landing": {
          const pose = COUNCIL_ARRANGEMENT[id];
          y = landingY(i, easeOutCubic(actLocal(pNow, "landing")));
          tx = pose.x;
          tz = pose.z;
          tRotY = pose.rotY;
          break;
        }
        case "glide1":
        case "glide2": {
          // Each descent reuses the fall's grammar, with a HOLD: for the
          // first 22% of the act the members stay put on the departure floor
          // while it dissolves beneath them (FadeDressing), THEN they drop.
          // y is assigned direct (no damp); x/z are SCROLL-SCRUBBED with the
          // same descent curve, so the horizontal transit happens well below
          // both floors at every scroll speed — no sweeping through the
          // council table on a slow scrub, no foot-slide on a fast one. The
          // HL 0.3 damp below only polishes an already-scrubbed target.
          // The billow/tumble envelope sin(desc·π) is exactly 0 at both
          // seams, so the y channel stays C0-continuous with the floors.
          const toDebate = actNow === "glide1";
          const fromPose = toDebate ? COUNCIL_ARRANGEMENT[id] : DEBATE_ARRANGEMENT[id];
          const toPose = toDebate ? DEBATE_ARRANGEMENT[id] : GAMES_ARRANGEMENT[id];
          const desc = glideDescent(actLocal(pNow, actNow));
          const env = Math.sin(desc * Math.PI);
          y =
            lerp(
              toDebate ? ZONE_Y.council : ZONE_Y.debate,
              toDebate ? ZONE_Y.debate : ZONE_Y.games,
              desc,
            ) +
            Math.sin(desc * Math.PI + i * 1.3) * 0.5 * env; // mid-descent billow
          tx = lerp(fromPose.x, toPose.x, desc);
          tz = lerp(fromPose.z, toPose.z, desc);
          tRotY = lerp(fromPose.rotY, toPose.rotY, desc);
          tRotX = (0.3 + Math.sin(t * 1.1 + i) * 0.18) * env; // tumble, land upright
          tRotZ = Math.sin(t * 0.9 + i * 2.1) * 0.1 * env;
          break;
        }
        case "debate": {
          const pose = DEBATE_ARRANGEMENT[id];
          tx = pose.x;
          tz = pose.z;
          tRotY = pose.rotY;
          y = ZONE_Y.debate; // standing on the -22 floor
          break;
        }
        case "games": {
          const pose = GAMES_ARRANGEMENT[id];
          tx = pose.x;
          tz = pose.z;
          tRotY = pose.rotY;
          y = ZONE_Y.games;
          break;
        }
        case "finale": {
          const pose = GAMES_ARRANGEMENT[id];
          // Seated players step forward, clear of their stools, before
          // turning to the camera — otherwise they stand up THROUGH the seat.
          const step = pose.role === "player" ? 0.95 : 0;
          tx = pose.x;
          tz = pose.z + step;
          tRotY = Math.atan2(r.camPos.x - g.position.x, r.camPos.z - g.position.z);
          y = ZONE_Y.games; // they stay home while the camera reveals the tower
          break;
        }
        default: {
          const pose = COUNCIL_ARRANGEMENT[id];
          tx = pose.x;
          tz = pose.z;
          tRotY = pose.rotY;
          break;
        }
      }

      if (!r.init) {
        g.position.set(tx, y, tz);
        g.rotation.set(tRotX, tRotY, tRotZ);
      } else {
        g.position.x = dampNum(g.position.x, tx, 0.3, dt);
        g.position.z = dampNum(g.position.z, tz, 0.3, dt);
        g.position.y = y; // direct — the fall/landing formulas ARE the motion
        g.rotation.y = dampAngle(g.rotation.y, tRotY, 0.25, dt);
        g.rotation.x = dampNum(g.rotation.x, tRotX, 0.15, dt);
        g.rotation.z = dampNum(g.rotation.z, tRotZ, 0.15, dt);
      }

      // Boot materialize: scale 0.85→1 + visibility gate.
      const matP = fx.matP[i];
      g.scale.setScalar(0.85 + 0.15 * Math.min(1, matP));
      g.visible = matP > 0.001;

      fx.memberPos[i].copy(g.position);

      // Look targets (stable vectors mutated in place — no prop churn).
      const mode: LookMode = anims[i].look;
      const lv = lookVecs[i];
      if (mode === "speaker" && speakerHead) lv.copy(speakerHead);
      else if (mode === "table")
        lv.set(GAMES_TABLE_CENTER.x, ZONE_Y.games + 0.9, GAMES_TABLE_CENTER.z);
      // Camera-RELATIVE height — the camera rides the tower floors, so an
      // absolute y here would have games-act speakers craning 45 units up.
      else if (mode === "camera")
        lv.set(camera.position.x, camera.position.y - 0.2, camera.position.z);
    }

    r.prevAct = actNow;
    r.init = true;
  });

  // ── Scene graph ───────────────────────────────────────────────────────────
  return (
    <>
      <color attach="background" args={[reduced ? WORLD_FOG.cafe : WORLD_FOG.cyber]} />
      <fog attach="fog" args={[reduced ? WORLD_FOG.cafe : WORLD_FOG.cyber, 8, 46]} />

      {/* Global rig — characters are identically lit across the whole journey */}
      <ambientLight color="#5a6b86" intensity={0.45} />
      <directionalLight
        ref={keyLightRef}
        color="#fff2d8"
        intensity={1.35}
        position={[5, CYBER_Y + 8, 6]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
      />
      <directionalLight
        ref={rimLightRef}
        color="#8aaee0"
        intensity={0.5}
        position={[-6, CYBER_Y + 5, -7]}
      />
      <primitive object={lightTarget} />

      {/* The vertical shaft: cyber void on top, 7 stacked worlds below */}
      {!reduced && (
        <group position={[0, CYBER_Y, 0]}>
          <MCyber opacity={cyberOpacity} shatterP={d.shatterP} />
        </group>
      )}
      {JOURNEY_WORLD_ORDER.map((id, i) =>
        reduced && id !== "cafe" ? null : (
          <group key={id} position={[0, worldYFor(i), 0]}>
            <MWorld id={id} opacity={worldOpacity(i)} />
          </group>
        ),
      )}

      {/* Tower floors — the café (y=0) doubles as the council floor; the
          debate hall and games den are stacked floors directly below it.
          Departure floors dissolve (FadeDressing) while members drop through. */}
      <group position={[0, ZONE_Y.council, 0]}>
        <FadeDressing factor={councilDressFactor}>
          <MCouncilFurniture />
        </FadeDressing>
      </group>
      <group position={[0, ZONE_Y.debate, 0]}>
        <FadeDressing factor={debateDressFactor}>
          <MDebateDressing />
        </FadeDressing>
      </group>
      <group position={[0, ZONE_Y.games, 0]}>
        <MGamesDressing />
      </group>

      {/* The five persistent members — never unmounted, only re-posed */}
      {MEMBER_ORDER.map((id, i) => (
        <group
          key={id}
          ref={(g) => {
            memberRefs.current[i] = g;
            if (g) g.rotation.order = "YXZ"; // heading first, then lean
          }}
        >
          <MMember
            modelPath={MODEL_PATHS[id]}
            animation={anims[i].animation}
            talkingVariant={anims[i].talkingVariant}
            lookAt={anims[i].look === "none" ? null : lookVecs[i]}
            scale={MEMBER_SCALE}
            idleVariant={council.microOffsets[id].idleVariant}
            headBobPhase={council.microOffsets[id].headBobPhase}
          />
        </group>
      ))}

      {/* Effect layers */}
      {!reduced && (
        <>
          <TowerShaft />
          <MaterializeLights fx={fx} />
          <SpeedStreaks fx={fx} />
          <WindParticles fx={fx} />
          <DustBursts fx={fx} />
          <GlideStreaks fx={fx} />
          <DebateSpots speaker={debateSpeaker} />
        </>
      )}
    </>
  );
}
