"use client";

/**
 * choreography — pure derivations for the Journey.
 *
 * Everything in this file is a deterministic function of (progress, bootDone)
 * plus the discrete conversation state, so the scene can call it both from
 * React render (for prop-level animation switches) and from useFrame (for
 * ref-level motion) and always agree with itself.
 */

import type { CouncilMemberAnimation } from "../CouncilMember3D";
import type { CouncilMemberId } from "../positions";
import type { CouncilMemberAnimState } from "../useCouncilAnimation";
import {
  DEBATE_ROUNDS,
  GAME_CHAT,
  GAMES_ARRANGEMENT,
  GLIDE_HOLD,
  MEMBER_ORDER,
  N_WORLDS,
  TALKING_VARIANTS,
  actAt,
  actLocal,
  type JourneyAct,
} from "./timeline";
import { clamp01, easeOutCubic, smoothstep01 } from "./journeyMath";

// ---------------------------------------------------------------------------
// Fall → landing continuity
// ---------------------------------------------------------------------------

/**
 * Member i's altitude at the very end of the fall (fallEase = 1, camY = 2.2).
 * The landing act eases from exactly here down to the floor so the handoff
 * between the two acts is seamless.
 */
export const FALL_END_YS: ReadonlyArray<number> = MEMBER_ORDER.map(
  (_, i) => 2.2 - 1.1 + Math.sin(Math.PI * 3 + i * 1.7) * 0.9 + (i - 2) * 0.22,
);

const MAX_FALL_END_Y = Math.max(...FALL_END_YS);

/** Landing altitude: ease toward slightly below the floor, clamped at 0 —
 *  the clamp is the "touch of overshoot" that sells the touchdown. */
export function landingY(i: number, landingEase: number): number {
  return Math.max(0, FALL_END_YS[i] * (1 - landingEase) - 0.12 * landingEase);
}

// ---------------------------------------------------------------------------
// Scroll-derived snapshot
// ---------------------------------------------------------------------------

export interface JourneyDerived {
  p: number;
  act: JourneyAct;
  /** Breakout local progress; stays 1 for the rest of the journey. */
  shatterP: number;
  fallLocal: number;
  fallEase: number;
  bandPos: number;
  /** 0..6; clamps to 6 (café) from landing onward. */
  worldIndex: number;
  /** Index into DEBATE_ROUNDS, -1 outside the debate act. */
  debateRound: number;
  gamesLocal: number;
  /** Number of GAME_CHAT lines revealed (0 outside games). */
  gameChatCount: number;
  landingEase: number;
  /** True once the landing ease has brought everyone under y = 0.4. */
  touchedDown: boolean;
  /** True once the breakout shatter passes 0.35 — members react. */
  shocked: boolean;
}

export function deriveJourney(progress: number, bootDone: boolean): JourneyDerived {
  const p = clamp01(progress);
  if (!bootDone) {
    return {
      p,
      act: "boot",
      shatterP: 0,
      fallLocal: 0,
      fallEase: 0,
      bandPos: 0,
      worldIndex: 0,
      debateRound: -1,
      gamesLocal: 0,
      gameChatCount: 0,
      landingEase: 0,
      touchedDown: false,
      shocked: false,
    };
  }

  const act = actAt(p);
  const shatterP = actLocal(p, "breakout");
  const fallLocal = actLocal(p, "fall");
  const fallEase = smoothstep01(fallLocal);
  const bandPos = fallEase * (N_WORLDS - 1);
  const worldIndex =
    act === "breakout"
      ? 0
      : act === "fall"
        ? Math.min(N_WORLDS - 1, Math.max(0, Math.round(bandPos)))
        : N_WORLDS - 1;
  const debateRound =
    act === "debate"
      ? Math.min(
          DEBATE_ROUNDS.length - 1,
          Math.floor(actLocal(p, "debate") * DEBATE_ROUNDS.length),
        )
      : -1;
  const gamesLocal = act === "games" ? actLocal(p, "games") : 0;
  let gameChatCount = 0;
  if (act === "games") {
    for (const line of GAME_CHAT) if (line.at <= gamesLocal) gameChatCount++;
  }
  const landingEase = easeOutCubic(actLocal(p, "landing"));
  const touchedDown =
    act === "landing"
      ? Math.max(0, MAX_FALL_END_Y * (1 - landingEase) - 0.12 * landingEase) < 0.4
      : false;
  const shocked = act === "breakout" && shatterP > 0.35;

  return {
    p,
    act,
    shatterP,
    fallLocal,
    fallEase,
    bandPos,
    worldIndex,
    debateRound,
    gamesLocal,
    gameChatCount,
    landingEase,
    touchedDown,
    shocked,
  };
}

// ---------------------------------------------------------------------------
// Per-member animation resolution (discrete — React props, never per frame)
// ---------------------------------------------------------------------------

export type LookMode = "none" | "speaker" | "table" | "camera";

export interface ResolvedMemberAnim {
  animation: CouncilMemberAnimation;
  talkingVariant: 0 | 1 | 2;
  look: LookMode;
}

export interface MemberAnimContext {
  bootDone: boolean;
  waveActive: boolean;
  d: JourneyDerived;
  councilStates: Record<CouncilMemberId, CouncilMemberAnimState>;
  councilSpeaker: CouncilMemberId | null;
  debateSpeaker: CouncilMemberId | null;
  gameSpeaker: CouncilMemberId | null;
  gameLaugher: CouncilMemberId | null;
}

export function resolveMemberAnim(ctx: MemberAnimContext, id: CouncilMemberId): ResolvedMemberAnim {
  const variant = TALKING_VARIANTS[id];
  const { d } = ctx;

  if (!ctx.bootDone) return { animation: "idle", talkingVariant: variant, look: "none" };
  // The greeting wave — all five, talking variant 2.
  if (ctx.waveActive) return { animation: "talking", talkingVariant: 2, look: "none" };

  switch (d.act) {
    case "breakout":
      return { animation: d.shocked ? "shocked" : "idle", talkingVariant: variant, look: "none" };
    case "fall":
      return { animation: "falling", talkingVariant: variant, look: "none" };
    case "landing":
      return {
        animation: d.touchedDown ? "idle" : "falling",
        talkingVariant: variant,
        look: "none",
      };
    case "council": {
      // The "alive table": the conversation hook's full output flows through —
      // talking-sitting / listening-sitting — and listeners turn their spine
      // toward whoever holds the floor. The hook's reaction clips (Laughing /
      // Angry / Crying / Terrified) are STANDING-rooted, so a seated member
      // playing one would pop out of their stool; remap them to an animated
      // seated gesture instead.
      const s = ctx.councilStates[id];
      const STANDING_REACTIONS: ReadonlyArray<CouncilMemberAnimation> = [
        "laughing",
        "angry",
        "sad",
        "shocked",
      ];
      const animation = STANDING_REACTIONS.includes(s.animation)
        ? "talking-sitting"
        : s.animation;
      const listening = ctx.councilSpeaker !== null && ctx.councilSpeaker !== id;
      return {
        animation,
        talkingVariant: s.talkingVariant,
        look: listening ? "speaker" : "none",
      };
    }
    case "glide1":
    case "glide2": {
      // Descents between tower floors. During the HOLD the members stay put
      // while the floor opens beneath them — seated at the table for glide1,
      // standing for glide2 — then go airborne with the same clip as the fall.
      const lp = actLocal(d.p, d.act);
      if (lp < GLIDE_HOLD) {
        return {
          animation: d.act === "glide1" ? "idle-sitting" : "idle",
          talkingVariant: variant,
          look: "none",
        };
      }
      return { animation: "falling", talkingVariant: variant, look: "none" };
    }
    case "debate": {
      const isSpeaker = ctx.debateSpeaker === id;
      return {
        animation: isSpeaker ? "talking" : "listening",
        talkingVariant: variant,
        look: isSpeaker ? "none" : "speaker",
      };
    }
    case "games": {
      if (GAMES_ARRANGEMENT[id].role === "player") {
        if (ctx.gameSpeaker === id)
          return { animation: "talking-sitting", talkingVariant: variant, look: "camera" };
        const third = Math.min(2, Math.floor(d.gamesLocal * 3));
        // Aria deliberates through the first half, Rex through the second.
        const animation: CouncilMemberAnimation =
          id === "aria"
            ? d.gamesLocal < 0.5
              ? "thinking"
              : third === 2
                ? "talking-sitting"
                : "idle-sitting"
            : d.gamesLocal >= 0.5
              ? "thinking"
              : third === 1
                ? "talking-sitting"
                : "idle-sitting";
        return { animation, talkingVariant: variant, look: "table" };
      }
      if (ctx.gameSpeaker === id)
        return { animation: "talking", talkingVariant: variant, look: "camera" };
      if (ctx.gameLaugher === id)
        return { animation: "laughing", talkingVariant: variant, look: "table" };
      return { animation: "idle", talkingVariant: variant, look: "table" };
    }
    case "finale":
      // Echo waves goodbye (talking variant 2), the rest stand at ease.
      return id === "echo"
        ? { animation: "talking", talkingVariant: 2, look: "none" }
        : { animation: "idle", talkingVariant: variant, look: "none" };
    default:
      return { animation: "idle", talkingVariant: variant, look: "none" };
  }
}
