/**
 * ManyMinds Design Tokens
 * Single source of truth for visual identity — vibrant friend-group palette.
 * Mirrors what's exposed in globals.css under @theme.
 */

export const canvas = {
  50:  "#1a1822",
  100: "#14121b",
  200: "#100e16",
  300: "#0b0a11",
  400: "#0a0910",    // page background
  500: "#06050a",
} as const;

export const surface = {
  base: "#14121b",
  raised: "#191622",
  elevated: "#1f1b2a",
} as const;

export const ink = {
  primary: "#eceaf3",
  dim:     "#b8b2c4",
  muted:   "#7a7589",
  faint:   "#45414f",
} as const;

/**
 * Council member signature colors. Each member keeps a distinct hue,
 * but all five live inside a tight, desaturated cool→warm family so
 * the product reads as one room rather than five competing brands.
 */
export const councilColors = {
  aria: {
    hex: "#7fb5d4",
    soft: "rgba(127, 181, 212, 0.12)",
    label: "Muted Sky",
  },
  rex: {
    hex: "#d49a7a",
    soft: "rgba(212, 154, 122, 0.12)",
    label: "Muted Amber",
  },
  sage: {
    hex: "#9b87d8",
    soft: "rgba(155, 135, 216, 0.14)",
    label: "Lilac",
  },
  nova: {
    hex: "#c89bc4",
    soft: "rgba(200, 155, 196, 0.12)",
    label: "Muted Mauve",
  },
  echo: {
    hex: "#d8a3b8",
    soft: "rgba(216, 163, 184, 0.12)",
    label: "Blush",
  },
} as const;

export type CouncilMemberId = keyof typeof councilColors;

export const COUNCIL_MEMBERS: ReadonlyArray<{
  id: CouncilMemberId;
  name: string;
  role: string;
  personality: string;
  shortBio: string;
  modelPath: string;
  signatureGreeting: string;
  vibe: string;
}> = [
  {
    id: "aria",
    name: "Aria",
    role: "The Analyst",
    personality: "Analytical · Precise · Cool-headed",
    shortBio: "Cuts through noise with data. Will absolutely make you a spreadsheet if asked.",
    modelPath: "/models/council/aria.glb",
    signatureGreeting: "Okay, let me actually look at this for a sec.",
    vibe: "the friend who reads the receipts",
  },
  {
    id: "rex",
    name: "Rex",
    role: "The Provocateur",
    personality: "Bold · Playful · Contrarian",
    shortBio: "Asks the question nobody else dares to. Mostly to mess with you, partly because it's right.",
    modelPath: "/models/council/rex.glb",
    signatureGreeting: "Wait wait wait — devil's advocate moment.",
    vibe: "the friend who actually says it",
  },
  {
    id: "sage",
    name: "Sage",
    role: "The Architect",
    personality: "Strategic · Visionary · Calm",
    shortBio: "Sees the shape of things. Will gently walk you through why your idea is bigger than you thought.",
    modelPath: "/models/council/sage.glb",
    signatureGreeting: "Hmm. Let's zoom out for a second.",
    vibe: "the friend who maps the road",
  },
  {
    id: "nova",
    name: "Nova",
    role: "The Creator",
    personality: "Imaginative · Expressive · Intuitive",
    shortBio: "Sees colors in the conversation. Will throw out the wild idea — and you'll be glad they did.",
    modelPath: "/models/council/nova.glb",
    signatureGreeting: "Oh! What if we just—",
    vibe: "the friend who paints outside the lines",
  },
  {
    id: "echo",
    name: "Echo",
    role: "The Empath",
    personality: "Perceptive · Warm · Reflective",
    shortBio: "Notices what you're not saying. Makes sure every voice in the room is heard.",
    modelPath: "/models/council/echo.glb",
    signatureGreeting: "Hey — how are you actually doing with all this?",
    vibe: "the friend who knows you better than you know yourself",
  },
];

export const fonts = {
  headline: "Space Grotesk",
  body:     "Inter",
  label:    "Manrope",
} as const;

export const radii = {
  default: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
  "2xl": "2rem",
} as const;

export const colors = {
  primary:    councilColors.sage.hex,
  secondary:  councilColors.aria.hex,
  accent:     councilColors.nova.hex,
  background: canvas[400],
  surface:    surface.base,
} as const;
