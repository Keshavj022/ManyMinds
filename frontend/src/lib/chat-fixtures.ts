/**
 * Chat fixtures — mock messages and council activity that make the council feel
 * like a tight group of friends, not a chatbot. Voices stay distinct:
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

export interface GroupAgreement {
  id: string;
  kind: "agreement";
  members: CouncilMemberId[];
  text: string;
  afterMessageId: string;
}

export type Feed = ChatMessage | GroupAgreement;

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

export const INITIAL_COUNCIL_STATE: ReadonlyArray<CouncilStateRow> = [
  { id: "aria", status: "listening" },
  { id: "rex", status: "thinking" },
  { id: "sage", status: "listening" },
  { id: "nova", status: "typing" },
  { id: "echo", status: "listening" },
];

export const MOCK_FEED: ReadonlyArray<Feed> = [
  {
    id: "m1",
    sender: { kind: "user", name: "Ada" },
    timestamp: "10:02 AM",
    content:
      "ok so I think I want to ditch the enterprise pivot and just ship a prosumer thing. tell me I'm not crazy.",
  },
  {
    id: "m2",
    sender: { kind: "member", id: "aria" },
    timestamp: "10:02 AM",
    content:
      "Hold on — before we call it. Your last enterprise lead asked for a quote 4 days ago. If we abandon it, we walk away from roughly $48k of MRR you said \"yes\" to in March.",
    reactions: [
      { emoji: "✨", memberId: "nova" },
      { emoji: "🤔", memberId: "sage" },
    ],
  },
  {
    id: "m3",
    sender: { kind: "member", id: "rex" },
    timestamp: "10:03 AM",
    content:
      "Counterpoint: that lead's been ghosting you for 11 days. \"$48k\" is fanfic until they sign. You wanna chase ghosts or build the thing?",
    reactions: [{ emoji: "😂", memberId: "echo" }],
  },
  {
    id: "m4",
    sender: { kind: "member", id: "echo" },
    timestamp: "10:03 AM",
    content:
      "I noticed you said \"just ship.\" That's the third time this week. What's underneath that — is the pivot the right call, or are you tired of waiting for permission?",
    reactions: [
      { emoji: "💗", memberId: "nova" },
      { emoji: "🎯", memberId: "sage" },
    ],
  },
  {
    id: "agree-1",
    kind: "agreement",
    members: ["sage", "echo", "nova"],
    text: "Sage, Echo, and Nova all caught the same thing.",
    afterMessageId: "m4",
  },
  {
    id: "m5",
    sender: { kind: "member", id: "sage" },
    timestamp: "10:04 AM",
    content:
      "Step back — both paths assume you're optimizing for revenue. What if you're actually optimizing for feedback velocity? Prosumer wins that hands down. Enterprise wins on stability. Which one does the next 90 days need?",
    reactions: [{ emoji: "🧭", memberId: "aria" }],
  },
  {
    id: "m6",
    sender: { kind: "user", name: "Ada" },
    timestamp: "10:05 AM",
    content: "honestly? feedback. I have no clue if any of this is even good yet.",
  },
  {
    id: "m7",
    sender: { kind: "member", id: "nova" },
    timestamp: "10:05 AM",
    content:
      "OK okay okay — what if the prosumer thing IS the demo for enterprise? Like — you ship the wild fun version, enterprise sees it, comes to you. You don't pick. They pick.",
    reactions: [
      { emoji: "🔥", memberId: "rex" },
      { emoji: "✨", memberId: "aria" },
    ],
  },
  {
    id: "m8",
    sender: { kind: "member", id: "aria" },
    timestamp: "10:06 AM",
    content:
      "That's actually testable. If we run the prosumer launch and track inbound enterprise inquiries against control month, we have a real signal in 6 weeks. Cost is one PR push.",
    reactions: [{ emoji: "📊", memberId: "sage" }],
  },
  {
    id: "m9",
    sender: { kind: "member", id: "rex" },
    timestamp: "10:06 AM",
    content:
      "Aria literally just turned Nova's vibes into a spreadsheet. I'm so proud. (Also: yes. Do that.)",
    reactions: [
      { emoji: "😂", memberId: "nova" },
      { emoji: "😂", memberId: "echo" },
    ],
  },
  {
    id: "m10",
    sender: { kind: "user", name: "Ada" },
    timestamp: "10:07 AM",
    content: "ok and timing? everyone keeps saying \"ship the MVP this week\" but the polish isn't there.",
  },
  {
    id: "m11",
    sender: { kind: "member", id: "rex" },
    timestamp: "10:07 AM",
    content: "Ship it ugly. Polish is a coping mechanism.",
  },
  {
    id: "m12",
    sender: { kind: "member", id: "aria" },
    timestamp: "10:07 AM",
    content:
      "Disagree on \"ugly\" — but a 70% version this week beats a 95% version in 4. First-touch quality matters less than iteration count when you're pre-PMF.",
    reactions: [{ emoji: "🎯", memberId: "rex" }],
  },
  {
    id: "m13",
    sender: { kind: "member", id: "echo" },
    timestamp: "10:08 AM",
    content:
      "Quick check — when you imagine pressing 'ship' on Friday, what do you feel? Like, in your body. That's data too.",
    reactions: [{ emoji: "💗", memberId: "sage" }],
  },
  {
    id: "m14",
    sender: { kind: "member", id: "sage" },
    timestamp: "10:08 AM",
    content:
      "If the answer is dread, we're not asking the right question yet. If it's nervous excitement — that's the green light.",
  },
  {
    id: "m15",
    sender: { kind: "member", id: "nova" },
    timestamp: "10:09 AM",
    content:
      "Plus you've literally never regretted shipping. You've only ever regretted waiting. Go.",
    reactions: [
      { emoji: "🚀", memberId: "rex" },
      { emoji: "💗", memberId: "echo" },
    ],
  },
];

/**
 * Returns a non-user message id that's most recent (for typing-state hints).
 */
export function lastSpeakerId(feed: ReadonlyArray<Feed>): CouncilMemberId | null {
  for (let i = feed.length - 1; i >= 0; i--) {
    const item = feed[i];
    if ("kind" in item && item.kind === "agreement") continue;
    if ("sender" in item && item.sender.kind === "member") return item.sender.id;
  }
  return null;
}
