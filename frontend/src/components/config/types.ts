/**
 * Per-member configuration shape used by the Config page.
 */
import type { CouncilMemberId } from "@/lib/design-tokens";
import type { BigFiveDimension } from "@/lib/onboarding";

export type ToneOption =
  | "warm"
  | "direct"
  | "witty"
  | "curious"
  | "professional";

export interface MemberConfig {
  traits: Record<BigFiveDimension, number>;
  tones: ToneOption[];
  boundaries: {
    citeReasoning: boolean;
    pushBack: boolean;
    usePreferredName: boolean;
  };
}

export const TONE_OPTIONS: ReadonlyArray<{ id: ToneOption; label: string; icon: string }> = [
  { id: "warm", label: "Warm", icon: "favorite" },
  { id: "direct", label: "Direct", icon: "north" },
  { id: "witty", label: "Witty", icon: "auto_awesome" },
  { id: "curious", label: "Curious", icon: "psychology" },
  { id: "professional", label: "Professional", icon: "work" },
];

export const TRAIT_LABELS: Record<BigFiveDimension, { name: string; low: string; high: string }> = {
  openness: {
    name: "Openness",
    low: "Grounded",
    high: "Imaginative",
  },
  conscientiousness: {
    name: "Conscientiousness",
    low: "Spontaneous",
    high: "Structured",
  },
  extraversion: {
    name: "Extraversion",
    low: "Reserved",
    high: "Outgoing",
  },
  agreeableness: {
    name: "Agreeableness",
    low: "Challenging",
    high: "Warm",
  },
  neuroticism: {
    name: "Sensitivity",
    low: "Steady",
    high: "Attuned",
  },
};

/** Per-member defaults so each character feels distinct out of the gate. */
export const DEFAULT_CONFIGS: Record<CouncilMemberId, MemberConfig> = {
  aria: {
    traits: {
      openness: 80,
      conscientiousness: 95,
      extraversion: 40,
      agreeableness: 50,
      neuroticism: 20,
    },
    tones: ["direct", "professional"],
    boundaries: {
      citeReasoning: true,
      pushBack: true,
      usePreferredName: true,
    },
  },
  rex: {
    traits: {
      openness: 90,
      conscientiousness: 30,
      extraversion: 95,
      agreeableness: 60,
      neuroticism: 30,
    },
    tones: ["witty", "direct"],
    boundaries: {
      citeReasoning: false,
      pushBack: true,
      usePreferredName: true,
    },
  },
  sage: {
    traits: {
      openness: 85,
      conscientiousness: 90,
      extraversion: 50,
      agreeableness: 70,
      neuroticism: 10,
    },
    tones: ["curious", "professional"],
    boundaries: {
      citeReasoning: true,
      pushBack: false,
      usePreferredName: true,
    },
  },
  nova: {
    traits: {
      openness: 98,
      conscientiousness: 40,
      extraversion: 80,
      agreeableness: 75,
      neuroticism: 45,
    },
    tones: ["warm", "witty"],
    boundaries: {
      citeReasoning: false,
      pushBack: false,
      usePreferredName: true,
    },
  },
  echo: {
    traits: {
      openness: 70,
      conscientiousness: 65,
      extraversion: 35,
      agreeableness: 95,
      neuroticism: 55,
    },
    tones: ["warm", "curious"],
    boundaries: {
      citeReasoning: false,
      pushBack: false,
      usePreferredName: true,
    },
  },
};

export type Boundary = keyof MemberConfig["boundaries"];

export const BOUNDARY_LABELS: Record<
  Boundary,
  { label: string; hint: string }
> = {
  citeReasoning: {
    label: "Always cite reasoning",
    hint: "Show the why, not just the what.",
  },
  pushBack: {
    label: "Push back when I'm wrong",
    hint: "Disagree with me when you should.",
  },
  usePreferredName: {
    label: "Use my preferred name",
    hint: "Address me the way I asked to be addressed.",
  },
};
