/**
 * Side palette for the debate stage.
 * Pro argues from the cool end of the room; Con sits by the candle.
 */
export const SIDE = {
  pro: {
    label: "For it",
    hex: "#7fb5d4",
    soft: "rgba(127, 181, 212, 0.12)",
  },
  con: {
    label: "Against it",
    hex: "#e0b083",
    soft: "rgba(224, 176, 131, 0.14)",
  },
} as const;

export type SideKey = keyof typeof SIDE;
