/**
 * Memory graph — API types, kind metadata, and a deterministic
 * force-ish layout for whatever /api/v1/memory/graph returns.
 *
 * Honesty rules:
 *  - We render the backend's data, never hand-authored memories.
 *  - The backend's deterministic fallback generator stamps every node with
 *    `metadata.seed`; live Neo4j nodes ship empty metadata. We surface that
 *    as `isSample` so the page can caption it truthfully.
 *  - The only node we add is "You" at the centre. It mirrors the real
 *    `(:User)-[:KNOWS]->(entity)` edge the backend schema keeps for every
 *    node, so it's structural, not invented.
 */
import type { CouncilMemberId } from "@/lib/design-tokens";

// ---------------------------------------------------------------------------
// API shapes (mirror backend app/schemas/memory.py)
// ---------------------------------------------------------------------------

export interface ApiGraphNode {
  id: string;
  label: string;
  kind: string;
  weight: number;
  color: string | null;
  metadata?: Record<string, unknown> | null;
  last_referenced: string | null;
}

export interface ApiGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: string;
  weight: number;
}

export interface ApiGraph {
  nodes: ApiGraphNode[];
  edges: ApiGraphEdge[];
  generated_at: string;
}

// ---------------------------------------------------------------------------
// Kind metadata — colours stay inside the desaturated member family,
// "you" gets the warm candle-light amber.
// ---------------------------------------------------------------------------

export type NodeKind =
  | "you"
  | "topic"
  | "person"
  | "emotion"
  | "preference"
  | "event"
  | "entity";

export interface KindMeta {
  /** Friendly chip label. */
  label: string;
  icon: string;
  hex: string;
  soft: string;
  /** Which member "holds" this kind of memory — drives the panel voice. */
  keeper: CouncilMemberId | null;
  keeperName: string | null;
}

export const KIND_META: Record<NodeKind, KindMeta> = {
  you: {
    label: "You",
    icon: "face",
    hex: "#e0b083",
    soft: "rgba(224, 176, 131, 0.14)",
    keeper: null,
    keeperName: null,
  },
  topic: {
    label: "Topics",
    icon: "label",
    hex: "#7fb5d4",
    soft: "rgba(127, 181, 212, 0.14)",
    keeper: "sage",
    keeperName: "Sage",
  },
  person: {
    label: "People",
    icon: "group",
    hex: "#d8a3b8",
    soft: "rgba(216, 163, 184, 0.14)",
    keeper: "echo",
    keeperName: "Echo",
  },
  emotion: {
    label: "Feelings",
    icon: "favorite",
    hex: "#c89bc4",
    soft: "rgba(200, 155, 196, 0.14)",
    keeper: "echo",
    keeperName: "Echo",
  },
  preference: {
    label: "Very-you things",
    icon: "star",
    hex: "#9b87d8",
    soft: "rgba(155, 135, 216, 0.14)",
    keeper: "nova",
    keeperName: "Nova",
  },
  event: {
    label: "Events",
    icon: "event",
    hex: "#d49a7a",
    soft: "rgba(212, 154, 122, 0.14)",
    keeper: "aria",
    keeperName: "Aria",
  },
  entity: {
    label: "Other threads",
    icon: "category",
    hex: "#b8b2c4",
    soft: "rgba(184, 178, 196, 0.12)",
    keeper: "rex",
    keeperName: "Rex",
  },
};

/** Stable chip ordering for the filter row. */
export const KIND_ORDER: ReadonlyArray<Exclude<NodeKind, "you">> = [
  "topic",
  "person",
  "emotion",
  "preference",
  "event",
  "entity",
];

export function normalizeKind(kind: string): NodeKind {
  if (kind in KIND_META) return kind as NodeKind;
  return "entity";
}

// ---------------------------------------------------------------------------
// Layout output
// ---------------------------------------------------------------------------

export const YOU_NODE_ID = "__you__";

export interface LayoutNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** [0..100] in the SVG viewBox. */
  x: number;
  y: number;
  radius: number;
  /** Normalised weight [0..1] — "how strongly we're holding this". */
  strength: number;
  lastReferenced: string | null;
}

export interface LayoutEdge {
  source: string;
  target: string;
  /** Normalised [0..1] visual intensity. */
  weight: number;
  /** True for the faint spokes back to "You" (the KNOWS relationship). */
  anchor: boolean;
}

export interface MemoryLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  /** True when the backend served its deterministic sample generator. */
  isSample: boolean;
}

// ---------------------------------------------------------------------------
// Deterministic force-ish layout
// ---------------------------------------------------------------------------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MAX_NODES = 60;
const ITERATIONS = 200;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * Build a static layout from the API payload. Pure + deterministic:
 * the same payload always produces the same picture, so the graph never
 * jiggles between visits.
 */
export function buildLayout(graph: ApiGraph): MemoryLayout {
  const isSample = graph.nodes.some(
    (n) => n.metadata != null && "seed" in n.metadata,
  );
  const apiNodes = graph.nodes.slice(0, MAX_NODES);
  if (apiNodes.length === 0) {
    return { nodes: [], edges: [], isSample };
  }

  // Normalise node weights → radius + strength.
  const weights = apiNodes.map((n) => (Number.isFinite(n.weight) ? n.weight : 1));
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const norm = (w: number) => (maxW === minW ? 0.5 : (w - minW) / (maxW - minW));

  const nodes: LayoutNode[] = [
    {
      id: YOU_NODE_ID,
      label: "You",
      kind: "you",
      x: 50,
      y: 50,
      radius: 6.4,
      strength: 1,
      lastReferenced: null,
    },
    ...apiNodes.map((n, i) => ({
      id: n.id,
      label: n.label,
      kind: normalizeKind(n.kind),
      x: 50,
      y: 50,
      radius: 3 + norm(weights[i]) * 3,
      strength: norm(weights[i]),
      lastReferenced: n.last_referenced,
    })),
  ];

  const ids = new Set(nodes.map((n) => n.id));

  // Co-occurrence edges from the API, deduped, weight-normalised.
  const edgeWeights = graph.edges.map((e) => (Number.isFinite(e.weight) ? e.weight : 0.5));
  const maxE = edgeWeights.length > 0 ? Math.max(...edgeWeights, 0.001) : 1;
  const seen = new Set<string>();
  const edges: LayoutEdge[] = [];
  graph.edges.forEach((e, i) => {
    if (!ids.has(e.source) || !ids.has(e.target) || e.source === e.target) return;
    const key = [e.source, e.target].sort().join("→");
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({
      source: e.source,
      target: e.target,
      weight: Math.max(0.2, edgeWeights[i] / maxE),
      anchor: false,
    });
  });

  // Spokes back to "You": orphans (so nothing floats disconnected) plus the
  // few strongest memories. Every one mirrors a real KNOWS edge.
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  const anchorIds = new Set<string>();
  for (const n of nodes) {
    if (n.id !== YOU_NODE_ID && (degree.get(n.id) ?? 0) === 0) anchorIds.add(n.id);
  }
  [...nodes]
    .filter((n) => n.id !== YOU_NODE_ID)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 4)
    .forEach((n) => anchorIds.add(n.id));
  for (const id of anchorIds) {
    edges.push({ source: YOU_NODE_ID, target: id, weight: 0.3, anchor: true });
  }

  runSimulation(nodes, edges);
  return { nodes, edges, isSample };
}

function runSimulation(nodes: LayoutNode[], edges: LayoutEdge[]): void {
  const n = nodes.length;
  const index = new Map<string, number>();
  nodes.forEach((node, i) => index.set(node.id, i));

  const xs = new Float64Array(n);
  const ys = new Float64Array(n);

  // Seed on a golden-angle spiral, jittered by a hash of each id so the
  // start state (and therefore the result) is stable per node.
  for (let i = 0; i < n; i++) {
    if (nodes[i].id === YOU_NODE_ID) {
      xs[i] = 50;
      ys[i] = 50;
      continue;
    }
    const t = i / Math.max(n - 1, 1);
    const jitter = (hashString(nodes[i].id) % 628) / 100;
    const angle = i * GOLDEN + jitter;
    const r = 16 + 26 * Math.sqrt(t);
    xs[i] = 50 + Math.cos(angle) * r;
    ys[i] = 50 + Math.sin(angle) * r * 0.85;
  }

  const dx = new Float64Array(n);
  const dy = new Float64Array(n);

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const temp = 1 - iter / ITERATIONS;
    dx.fill(0);
    dy.fill(0);

    // Pairwise repulsion.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ax = xs[i] - xs[j];
        let ay = ys[i] - ys[j];
        const d2 = ax * ax + ay * ay + 0.01;
        const f = Math.min((150 * temp) / d2, 5);
        const d = Math.sqrt(d2);
        ax /= d;
        ay /= d;
        dx[i] += ax * f;
        dy[i] += ay * f;
        dx[j] -= ax * f;
        dy[j] -= ay * f;
      }
    }

    // Edge springs — heavier edges pull tighter; You-spokes stay long.
    for (const e of edges) {
      const i = index.get(e.source);
      const j = index.get(e.target);
      if (i === undefined || j === undefined) continue;
      const ax = xs[j] - xs[i];
      const ay = ys[j] - ys[i];
      const d = Math.sqrt(ax * ax + ay * ay) + 0.001;
      const rest = e.anchor ? 30 : 14 + 12 * (1 - e.weight);
      const f = ((d - rest) / d) * 0.025;
      dx[i] += ax * f;
      dy[i] += ay * f;
      dx[j] -= ax * f;
      dy[j] -= ay * f;
    }

    // Gentle gravity toward centre + apply with clamped step.
    for (let i = 0; i < n; i++) {
      if (nodes[i].id === YOU_NODE_ID) continue;
      dx[i] += (50 - xs[i]) * 0.004;
      dy[i] += (50 - ys[i]) * 0.004;
      xs[i] += Math.max(-2.2, Math.min(2.2, dx[i]));
      ys[i] += Math.max(-2.2, Math.min(2.2, dy[i]));
      xs[i] = Math.max(9, Math.min(91, xs[i]));
      ys[i] = Math.max(11, Math.min(87, ys[i]));
    }
  }

  // Collision pass — nudge any overlapping cores apart so labels stay
  // readable. Deterministic: fixed iteration order, no randomness.
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const minD = nodes[i].radius + nodes[j].radius + 2.6;
        let ax = xs[i] - xs[j];
        let ay = ys[i] - ys[j];
        let d = Math.sqrt(ax * ax + ay * ay);
        if (d >= minD) continue;
        moved = true;
        if (d < 0.001) {
          // Coincident — split along a hash-stable direction.
          const a = (hashString(nodes[i].id + nodes[j].id) % 628) / 100;
          ax = Math.cos(a);
          ay = Math.sin(a);
          d = 1;
        }
        const push = (minD - d) / 2;
        const ux = (ax / d) * push;
        const uy = (ay / d) * push;
        if (nodes[i].id !== YOU_NODE_ID) {
          xs[i] = Math.max(9, Math.min(91, xs[i] + ux));
          ys[i] = Math.max(11, Math.min(87, ys[i] + uy));
        }
        if (nodes[j].id !== YOU_NODE_ID) {
          xs[j] = Math.max(9, Math.min(91, xs[j] - ux));
          ys[j] = Math.max(11, Math.min(87, ys[j] - uy));
        }
      }
    }
    if (!moved) break;
  }

  for (let i = 0; i < n; i++) {
    nodes[i].x = Math.round(xs[i] * 100) / 100;
    nodes[i].y = Math.round(ys[i] * 100) / 100;
  }
}

// ---------------------------------------------------------------------------
// Friendly copy helpers
// ---------------------------------------------------------------------------

export interface RememberCopy {
  keeper: CouncilMemberId | null;
  keeperName: string | null;
  line: string;
}

/** "Echo remembers: …" — one warm sentence per node for the side card. */
export function rememberCopy(
  node: LayoutNode,
  neighbourLabels: ReadonlyArray<string>,
): RememberCopy {
  if (node.kind === "you") {
    return {
      keeper: null,
      keeperName: null,
      line: "This is you — the middle of the map. Every dot out here is a thread back to something you said.",
    };
  }
  const meta = KIND_META[node.kind];
  const near = neighbourLabels.slice(0, 2);
  const tail =
    near.length === 2
      ? ` It tends to show up near ${near[0]} and ${near[1]}.`
      : near.length === 1
        ? ` It tends to show up near ${near[0]}.`
        : "";

  let line: string;
  switch (node.kind) {
    case "person":
      line = `${node.label} doesn't just pass through your conversations — Echo keeps a seat for them.${tail}`;
      break;
    case "emotion":
      line = `Echo noticed this feeling in the room more than once.${tail}`;
      break;
    case "preference":
      line = `Nova filed this under "very you" the moment you said it.${tail}`;
      break;
    case "event":
      line = `Aria wrote this one down when it happened, dates and all.${tail}`;
      break;
    case "topic":
      line = `Sage says this one keeps circling back when you talk.${tail}`;
      break;
    default:
      line = `Rex flagged this — not sure why yet, but it keeps turning up.${tail}`;
  }
  return { keeper: meta.keeper, keeperName: meta.keeperName, line };
}

/** Soft relative time — "yesterday", "3 days ago", "a while back". */
export function timeAgo(iso: string | null): string {
  if (!iso) return "a while back";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "a while back";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "last week" : `${weeks} weeks ago`;
  }
  return "a while back";
}
