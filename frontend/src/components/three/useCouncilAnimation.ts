"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CouncilMemberAnimation } from "./CouncilMember3D";
import type { CouncilMemberId } from "./positions";

export type CouncilAnimationLabel = CouncilMemberAnimation;
export type CouncilPosture = "standing" | "sitting";

export interface CouncilMemberAnimState {
  animation: CouncilAnimationLabel;
  talkingVariant: 0 | 1 | 2;
}

export interface CouncilAnimationState {
  /** Per-member resolved animation + variant. */
  states: Record<CouncilMemberId, CouncilMemberAnimState>;
  /** Per-member micro-pose offsets so 5 members never feel identical. */
  microOffsets: Record<CouncilMemberId, { headBobPhase: number; idleVariant: number }>;
  /** Whoever is currently "speaking" in the auto-conversation, or null. */
  currentSpeakerId: CouncilMemberId | null;
}

export interface UseCouncilAnimationOptions {
  /** Member currently speaking (manual override). When set, `conversation` is ignored. */
  activeMemberId?: CouncilMemberId | null;
  /** Members currently "thinking" (queued to speak). */
  thinkingIds?: CouncilMemberId[];
  /** Force everyone into the falling pose (used by intros). */
  falling?: boolean;
  /**
   * Sitting (cafe / library / chat) vs standing (debate stage / hero
   * pre-seat). Changes the underlying clip family.
   */
  posture?: CouncilPosture;
  /**
   * When true, the hook auto-rotates the speaker every ~8s and fires the
   * occasional reaction on listeners — making the room feel ALIVE. Use this
   * when no real conversation is wired up yet (hero scene, demo placeholder).
   */
  conversation?: boolean;
  /** Speaker rotation period (seconds). Default 8. */
  speakerRotateSec?: number;
  /** Probability per rotation that a random listener throws a reaction. */
  reactionChance?: number;
  /** Random micro-pose re-roll frequency (seconds). */
  microShiftIntervalSec?: number;
}

const ALL_IDS: CouncilMemberId[] = ["aria", "rex", "sage", "nova", "echo"];

// Per-member talking variant assignments. Aria reads calm (0), Sage thoughtful
// (1), Rex animated (2), Nova animated (2), Echo warm (0). Tweak freely.
const TALKING_VARIANTS: Record<CouncilMemberId, 0 | 1 | 2> = {
  aria: 0,
  rex:  2,
  sage: 1,
  nova: 2,
  echo: 0,
};

// Reactions weighted by personality (some pop more often than others).
//   Rex   → angry / laughing
//   Nova  → laughing
//   Echo  → sad
//   Aria  → shocked
//   Sage  → laughing (rarely; mostly stays composed)
const REACTION_BIAS: Record<
  CouncilMemberId,
  ReadonlyArray<{ anim: CouncilAnimationLabel; weight: number }>
> = {
  aria: [{ anim: "shocked", weight: 0.4 }, { anim: "laughing", weight: 0.6 }],
  rex:  [{ anim: "laughing", weight: 0.6 }, { anim: "angry", weight: 0.4 }],
  sage: [{ anim: "laughing", weight: 0.7 }, { anim: "shocked", weight: 0.3 }],
  nova: [{ anim: "laughing", weight: 0.7 }, { anim: "shocked", weight: 0.3 }],
  echo: [{ anim: "sad", weight: 0.5 }, { anim: "laughing", weight: 0.5 }],
};

function pickReaction(id: CouncilMemberId): CouncilAnimationLabel {
  const choices = REACTION_BIAS[id];
  const total = choices.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of choices) {
    r -= c.weight;
    if (r <= 0) return c.anim;
  }
  return choices[0].anim;
}

const blankMicroOffsets = (): CouncilAnimationState["microOffsets"] =>
  ALL_IDS.reduce(
    (acc, id) => {
      acc[id] = { headBobPhase: Math.random() * Math.PI * 2, idleVariant: 0 };
      return acc;
    },
    {} as CouncilAnimationState["microOffsets"],
  );

/**
 * Map a semantic label + posture to the concrete `CouncilMemberAnimation`
 * label the component expects. Reactions / thinking / falling bypass posture.
 */
function withPosture(
  base: "idle" | "talking" | "listening" | "thinking" | "falling" | CouncilAnimationLabel,
  posture: CouncilPosture,
): CouncilAnimationLabel {
  // Reactions are posture-agnostic — they play in place.
  switch (base) {
    case "laughing":
    case "angry":
    case "sad":
    case "shocked":
    case "thinking":
    case "falling":
      return base;
  }
  if (posture === "sitting") {
    if (base === "idle") return "idle-sitting";
    if (base === "talking") return "talking-sitting";
    if (base === "listening") return "listening-sitting";
  }
  return base as CouncilAnimationLabel;
}

/**
 * Hook that maps high-level conversation state to per-member animation states.
 *
 * Resolution order:
 *   1. If `falling` is set → everyone falls.
 *   2. Else if `activeMemberId` is provided → that member talks, others listen.
 *      `thinkingIds` get the thinking label. Reactions can still fire.
 *   3. Else if `conversation === true` → auto-rotate a speaker every 8s, with
 *      occasional reactions from listeners. The room feels alive.
 *   4. Else → everyone idles.
 */
export default function useCouncilAnimation(
  opts: UseCouncilAnimationOptions = {},
): CouncilAnimationState {
  const {
    activeMemberId = null,
    thinkingIds = [],
    falling = false,
    posture = "standing",
    conversation = false,
    speakerRotateSec = 8,
    reactionChance = 0.55,
    microShiftIntervalSec = 7,
  } = opts;

  const [microOffsets, setMicroOffsets] = useState(blankMicroOffsets);

  // Auto-rotated speaker (only used when conversation === true and no manual override).
  const [autoSpeaker, setAutoSpeaker] = useState<CouncilMemberId | null>(null);
  // Transient reactions: who's reacting, with which animation, and until when (sec).
  const [reactions, setReactions] = useState<
    Partial<Record<CouncilMemberId, { anim: CouncilAnimationLabel; until: number }>>
  >({});
  const reactionsRef = useRef(reactions);
  reactionsRef.current = reactions;

  // Micro-pose variance ticker.
  useEffect(() => {
    const id = setInterval(() => {
      setMicroOffsets((prev) => {
        const next = { ...prev };
        const target = ALL_IDS[Math.floor(Math.random() * ALL_IDS.length)];
        next[target] = {
          headBobPhase: Math.random() * Math.PI * 2,
          idleVariant: Math.floor(Math.random() * 3),
        };
        return next;
      });
    }, Math.max(2, microShiftIntervalSec) * 1000);
    return () => clearInterval(id);
  }, [microShiftIntervalSec]);

  // Conversation simulation: rotate speaker + occasional reactions.
  useEffect(() => {
    if (!conversation) {
      setAutoSpeaker(null);
      return;
    }
    // Seed first speaker after a short delay so the scene settles first.
    const seed = setTimeout(() => {
      setAutoSpeaker(ALL_IDS[Math.floor(Math.random() * ALL_IDS.length)]);
    }, 1200);

    const rotateMs = Math.max(3, speakerRotateSec) * 1000;
    const id = setInterval(() => {
      setAutoSpeaker((prev) => {
        // Pick a NEW speaker (not the same one twice).
        let next = ALL_IDS[Math.floor(Math.random() * ALL_IDS.length)];
        if (prev && ALL_IDS.length > 1) {
          let safety = 4;
          while (next === prev && safety-- > 0) {
            next = ALL_IDS[Math.floor(Math.random() * ALL_IDS.length)];
          }
        }

        // Maybe trigger a reaction on a non-speaker listener.
        if (Math.random() < reactionChance) {
          const listeners = ALL_IDS.filter((m) => m !== next);
          const who = listeners[Math.floor(Math.random() * listeners.length)];
          const reactionAnim = pickReaction(who);
          const hold = reactionAnim === "sad" ? 2.5 : reactionAnim === "shocked" ? 1.8 : 2.0;
          const until = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000 + hold;
          setReactions((r) => ({ ...r, [who]: { anim: reactionAnim, until } }));
        }

        return next;
      });
    }, rotateMs);

    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, [conversation, speakerRotateSec, reactionChance]);

  // Expire reactions on a 250ms cleanup tick.
  useEffect(() => {
    if (!conversation) return;
    const tick = setInterval(() => {
      const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
      const r = reactionsRef.current;
      let changed = false;
      const next: typeof r = { ...r };
      for (const id of ALL_IDS) {
        const entry = next[id];
        if (entry && entry.until <= now) {
          delete next[id];
          changed = true;
        }
      }
      if (changed) setReactions(next);
    }, 250);
    return () => clearInterval(tick);
  }, [conversation]);

  const currentSpeakerId: CouncilMemberId | null = activeMemberId ?? autoSpeaker;

  const states = useMemo<Record<CouncilMemberId, CouncilMemberAnimState>>(() => {
    const out = {} as Record<CouncilMemberId, CouncilMemberAnimState>;
    for (const id of ALL_IDS) {
      const variant = TALKING_VARIANTS[id];

      // Hard precedence: falling > reaction > speaker > thinking > listener > idle.
      if (falling) {
        out[id] = { animation: "falling", talkingVariant: variant };
        continue;
      }
      const reaction = reactions[id];
      if (reaction) {
        out[id] = { animation: reaction.anim, talkingVariant: variant };
        continue;
      }
      if (currentSpeakerId === id) {
        out[id] = { animation: withPosture("talking", posture), talkingVariant: variant };
        continue;
      }
      if (thinkingIds.includes(id)) {
        out[id] = { animation: withPosture("thinking", posture), talkingVariant: variant };
        continue;
      }
      if (currentSpeakerId) {
        out[id] = { animation: withPosture("listening", posture), talkingVariant: variant };
        continue;
      }
      out[id] = { animation: withPosture("idle", posture), talkingVariant: variant };
    }
    return out;
  }, [falling, reactions, currentSpeakerId, thinkingIds, posture]);

  return { states, microOffsets, currentSpeakerId };
}
