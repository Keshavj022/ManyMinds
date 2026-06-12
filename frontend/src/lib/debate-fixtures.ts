/**
 * Debate types + example motion seeds.
 *
 * The shapes here describe a live debate as the backend serves it
 * (`POST /api/v1/debate` → `POST /api/v1/debate/{id}/advance`). Every
 * argument, side and verdict shown in the arena comes from that response —
 * nothing in this file is presented to anyone as real history.
 *
 * `QUICK_MOTIONS` are just example topics to seed an empty input.
 * Strength is a 0..1 confidence score (the API may also send 0..100).
 */

import type { CouncilMemberId } from "./design-tokens";

export type DebateSide = "pro" | "con";

/** Mirrors the backend's `argument_type` so the stage can badge a rebuttal. */
export type DebateArgumentKind =
  | "opening"
  | "argument"
  | "rebuttal"
  | "closing";

export interface DebateArgument {
  id: string;
  side: DebateSide;
  speakerId: CouncilMemberId;
  text: string;
  strength: number;
  roundNumber: number;
  kind: DebateArgumentKind;
}

export interface DebateMotion {
  id: string;
  title: string;
  topic: string;
  proMembers: CouncilMemberId[];
  conMembers: CouncilMemberId[];
  moderatorId: CouncilMemberId;
  rounds: number;
  arguments: DebateArgument[];
  verdict: DebateVerdict;
}

export interface DebateVerdict {
  summary: string;
  proAverage: number;
  conAverage: number;
}

/** Example topics to seed an empty motion box — not history, just sparks. */
export const QUICK_MOTIONS: ReadonlyArray<string> = [
  "Pineapple on pizza",
  "Remote work forever?",
  "Should we ship the MVP this week?",
  "Is fast food art?",
] as const;
