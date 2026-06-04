/**
 * Shared seating layouts for the 5 council members across all environments.
 *
 * Two canonical arrangements:
 *   • LINE   — used by the hero "first reveal" and intros.
 *   • CIRCLE — used inside every immersive environment so the user feels
 *              they are seated AMONG friends.
 *
 * Order in the circle is hand-tuned for personality balance:
 *   Aria (analyst) and Sage (architect) flank the user's line of sight;
 *   Rex (provocateur) sits across, Nova/Echo bookend the warmth.
 */
export type CouncilMemberId = "aria" | "rex" | "sage" | "nova" | "echo";

export type Vec3 = [number, number, number];

const CIRCLE_RADIUS = 2.8;

/**
 * Members arranged in a circle, all facing the centre (where the camera /
 * the user sits). Indexing order matters — it determines who is "front-right",
 * "back", etc., from the default camera viewpoint.
 */
const CIRCLE_ORDER: CouncilMemberId[] = ["aria", "rex", "sage", "nova", "echo"];

export const COUNCIL_POSITIONS_CIRCLE: Record<
  CouncilMemberId,
  { position: Vec3; rotationY: number }
> = (() => {
  const out = {} as Record<CouncilMemberId, { position: Vec3; rotationY: number }>;
  // Distribute 5 members across a partial arc so the user always sees them
  // (camera looks down -Z by default). Span 240°, centred on -Z.
  const span = (Math.PI * 4) / 3;
  const start = -Math.PI / 2 - span / 2;
  CIRCLE_ORDER.forEach((id, i) => {
    const angle = start + (i / (CIRCLE_ORDER.length - 1)) * span;
    const x = Math.cos(angle) * CIRCLE_RADIUS;
    const z = Math.sin(angle) * CIRCLE_RADIUS;
    const rotationY = Math.atan2(-x, -z); // face the origin
    out[id] = { position: [x, 0, z], rotationY };
  });
  return out;
})();

/**
 * Members arranged shoulder-to-shoulder facing the camera. Used in the hero
 * line-up reveal before the "drop into circle" transition.
 */
const LINE_ORDER: CouncilMemberId[] = ["aria", "rex", "sage", "nova", "echo"];

export const COUNCIL_POSITIONS_LINE: Record<
  CouncilMemberId,
  { position: Vec3; rotationY: number }
> = (() => {
  const out = {} as Record<CouncilMemberId, { position: Vec3; rotationY: number }>;
  const spacing = 2.0;
  LINE_ORDER.forEach((id, i) => {
    const x = (i - (LINE_ORDER.length - 1) / 2) * spacing;
    out[id] = { position: [x, 0, 0], rotationY: 0 };
  });
  return out;
})();

/** All 5 IDs in canonical order. */
export const COUNCIL_IDS: ReadonlyArray<CouncilMemberId> = CIRCLE_ORDER;

export const MODEL_PATHS: Record<CouncilMemberId, string> = {
  aria: "/models/council/aria.glb",
  rex: "/models/council/rex.glb",
  sage: "/models/council/sage.glb",
  nova: "/models/council/nova.glb",
  echo: "/models/council/echo.glb",
};
