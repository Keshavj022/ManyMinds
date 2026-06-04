/**
 * Debate fixtures — a mock structured argument the council can simulate.
 * Sage moderates by default. Strength is a 0..1 confidence score.
 */

import type { CouncilMemberId } from "./design-tokens";

export type DebateSide = "pro" | "con";

export interface DebateArgument {
  id: string;
  side: DebateSide;
  speakerId: CouncilMemberId;
  text: string;
  strength: number;
  roundNumber: number;
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

export interface PastDebate {
  id: string;
  title: string;
  conclusion: string;
  meta: string;
}

export const QUICK_MOTIONS: ReadonlyArray<string> = [
  "Pineapple on pizza",
  "Remote work forever?",
  "Should we ship the MVP this week?",
  "Is fast food art?",
] as const;

export const PAST_DEBATES: ReadonlyArray<PastDebate> = [
  {
    id: "ubi",
    title: "Universal Basic Income tied to AI disruption",
    conclusion: "Split council — Aria & Sage convinced enough to keep watching.",
    meta: "42 turns · 3 rounds",
  },
  {
    id: "algos",
    title: "Mandatory transparency on social media algorithms",
    conclusion: "Pro carried it, narrowly. Echo's last argument shifted Rex.",
    meta: "18 turns · 2 rounds",
  },
  {
    id: "remote",
    title: "Remote work should be a worker's right",
    conclusion: "Pro side won decisively. Nova called it a 'no-brainer'.",
    meta: "24 turns · 3 rounds",
  },
  {
    id: "art",
    title: "Generative art is real art",
    conclusion: "Stalemate. Sage refused to assign a verdict and walked out.",
    meta: "33 turns · 4 rounds",
  },
] as const;

export const ACTIVE_DEBATE: DebateMotion = {
  id: "agi-pause",
  title: "AGI development should be paused until global frameworks exist.",
  topic: "Should AGI development be paused?",
  proMembers: ["aria", "echo"],
  conMembers: ["rex", "nova"],
  moderatorId: "sage",
  rounds: 3,
  arguments: [
    {
      id: "a1",
      side: "pro",
      speakerId: "aria",
      text: "We don't have an alignment evaluation we trust beyond GPT-4 class. Shipping superhuman capability without verifiable interpretability is statistical malpractice. We need a 12-month hold to ratify a baseline evals protocol — that's it.",
      strength: 0.88,
      roundNumber: 1,
    },
    {
      id: "a2",
      side: "con",
      speakerId: "rex",
      text: "A pause assumes the people who'd honor it are also the people who'd build the dangerous thing. They aren't. A pause is unilateral disarmament dressed up as ethics.",
      strength: 0.81,
      roundNumber: 1,
    },
    {
      id: "a3",
      side: "pro",
      speakerId: "echo",
      text: "The case isn't \"this is dangerous\" — it's \"the people closest to it are openly scared, and we're not making space for that.\" When the builders ask for a pause, listening is not weakness. It's basic respect.",
      strength: 0.83,
      roundNumber: 2,
    },
    {
      id: "a4",
      side: "con",
      speakerId: "nova",
      text: "Every transformative tech got a moral panic at exactly this phase. Printing press. Electricity. The internet. We don't actually learn what's dangerous until we live with it for a minute. The pause robs us of the data.",
      strength: 0.74,
      roundNumber: 2,
    },
    {
      id: "a5",
      side: "pro",
      speakerId: "aria",
      text: "Nova's analogy breaks because none of those tech generations had a recursive self-improvement vector. We're not arguing about the internet. We're arguing about a system that could redesign its own successor. That's a categorical difference.",
      strength: 0.92,
      roundNumber: 3,
    },
    {
      id: "a6",
      side: "con",
      speakerId: "rex",
      text: "Fine — but \"pause\" is the wrong tool. You want safety? Fund safety. Mandate red-team disclosure. Build the test harness. A pause is a vibe, not a policy.",
      strength: 0.86,
      roundNumber: 3,
    },
  ],
  verdict: {
    summary:
      "Pro made the cleaner technical case — Aria's recursion point landed. Con was tactically right that 'pause' is a blunt instrument. Real conclusion: the council favors mandatory evals over a moratorium, narrow consensus toward Pro.",
    proAverage: 0.88,
    conAverage: 0.8,
  },
};

export function argumentsBySide(
  motion: DebateMotion,
  side: DebateSide,
): DebateArgument[] {
  return motion.arguments.filter((a) => a.side === side);
}
