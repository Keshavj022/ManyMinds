/**
 * Chat fixtures — shared types + starter prompts for the council room.
 *
 * Voices stay distinct across the app:
 *  - Aria — Analyst, slightly clinical but warm
 *  - Rex — Provocateur, contrarian punchlines
 *  - Sage — Architect, slow zoom-out perspective
 *  - Nova — Creator, wild swings of inspiration
 *  - Echo — Empath, gentle check-ins
 */

import type { CouncilMemberId } from "./design-tokens";

export type Sender =
  | { kind: "user"; name: string }
  | { kind: "member"; id: CouncilMemberId };

export interface Reaction {
  emoji: string;
  memberId: CouncilMemberId;
}

export interface ChatMessage {
  id: string;
  sender: Sender;
  content: string;
  timestamp: string;
  reactions?: Reaction[];
}

export type MemberStatus = "listening" | "thinking" | "typing" | "talking";

export interface CouncilStateRow {
  id: CouncilMemberId;
  status: MemberStatus;
}

export const STARTER_PROMPTS: ReadonlyArray<{ icon: string; label: string }> = [
  { icon: "psychology", label: "Help me decide…" },
  { icon: "lightbulb", label: "Brainstorm with me" },
  { icon: "favorite", label: "Vent for a sec" },
  { icon: "stadia_controller", label: "Pick a game" },
] as const;
