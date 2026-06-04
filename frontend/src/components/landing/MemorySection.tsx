"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import { councilColors, type CouncilMemberId } from "@/lib/design-tokens";

/**
 * MemorySection — the graph-memory differentiator.
 *
 * A 2D, non-pinned scroll-reveal. As the section enters the viewport, a
 * knowledge graph draws itself in: a central "you" node, the five council
 * members in their hues, and a ring of topic / emotion / event nodes, with
 * edges progressively stroking in. Nodes pulse softly once present.
 *
 * Animation is driven by a single rect-based scroll progress (useScroll on
 * the SVG wrapper) smoothed with a spring, fed through damped/eased
 * useTransforms. No per-frame React state. prefers-reduced-motion renders the
 * whole graph fully drawn and static.
 */

// ---------------------------------------------------------------------------
// Graph model — viewBox is 100 x 84 (wider than tall, sits left of copy).
// ---------------------------------------------------------------------------

type NodeKind = "you" | "member" | "topic" | "emotion" | "event";

type GraphNode = {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  r: number;
  color: string;
  label: string;
  /** 0..1 point in the build where this node pops in. */
  at: number;
};

const YOU_COLOR = "#ffffff";
const TOPIC_COLOR = councilColors.aria.hex; // sky — topics
const EMOTION_COLOR = councilColors.echo.hex; // blush — feelings
const EVENT_COLOR = councilColors.nova.hex; // mauve — events

const NODES: ReadonlyArray<GraphNode> = [
  { id: "you", kind: "you", x: 50, y: 42, r: 5.2, color: YOU_COLOR, label: "You", at: 0 },

  // Five members ring the center.
  { id: "aria", kind: "member", x: 24, y: 18, r: 3.6, color: councilColors.aria.hex, label: "Aria", at: 0.12 },
  { id: "rex", kind: "member", x: 78, y: 16, r: 3.6, color: councilColors.rex.hex, label: "Rex", at: 0.16 },
  { id: "sage", kind: "member", x: 16, y: 60, r: 3.6, color: councilColors.sage.hex, label: "Sage", at: 0.2 },
  { id: "nova", kind: "member", x: 50, y: 76, r: 3.6, color: councilColors.nova.hex, label: "Nova", at: 0.24 },
  { id: "echo", kind: "member", x: 84, y: 62, r: 3.6, color: councilColors.echo.hex, label: "Echo", at: 0.28 },

  // Topic / emotion / event satellites — the web of meaning.
  { id: "music", kind: "topic", x: 38, y: 8, r: 2.4, color: TOPIC_COLOR, label: "Music", at: 0.42 },
  { id: "work", kind: "topic", x: 92, y: 34, r: 2.4, color: TOPIC_COLOR, label: "Work", at: 0.5 },
  { id: "calm", kind: "emotion", x: 8, y: 38, r: 2.4, color: EMOTION_COLOR, label: "Calm", at: 0.58 },
  { id: "excited", kind: "emotion", x: 70, y: 84, r: 2.4, color: EMOTION_COLOR, label: "Excited", at: 0.66 },
  { id: "trip", kind: "event", x: 30, y: 80, r: 2.4, color: EVENT_COLOR, label: "That trip", at: 0.74 },
];

const NODE_BY_ID: Record<string, GraphNode> = Object.fromEntries(
  NODES.map((n) => [n.id, n]),
);

// [from, to, build-point]. Members link to you first, then meaning threads in.
const EDGES: ReadonlyArray<[string, string, number]> = [
  ["you", "aria", 0.14],
  ["you", "rex", 0.18],
  ["you", "sage", 0.22],
  ["you", "nova", 0.26],
  ["you", "echo", 0.3],
  ["aria", "music", 0.44],
  ["rex", "work", 0.52],
  ["echo", "calm", 0.6],
  ["nova", "excited", 0.68],
  ["sage", "trip", 0.76],
  ["you", "work", 0.56],
  ["you", "music", 0.48],
];

// ---------------------------------------------------------------------------
// Supporting copy rows
// ---------------------------------------------------------------------------

const CAPTURES: ReadonlyArray<{
  icon: string;
  title: string;
  line: string;
  member: CouncilMemberId;
}> = [
  {
    icon: "tag",
    title: "Recurring topics",
    line: "What you circle back to — and the threads that connect them.",
    member: "aria",
  },
  {
    icon: "favorite",
    title: "Emotional patterns",
    line: "What lights you up, what wears you down, how moods move.",
    member: "echo",
  },
  {
    icon: "groups",
    title: "Who you talk about",
    line: "The people in your orbit and how they relate to each other.",
    member: "nova",
  },
];

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export default function MemorySection() {
  const graphRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Rect-based progress: graph builds from when it enters to when it's centered.
  const { scrollYProgress } = useScroll({
    target: graphRef,
    offset: ["start 85%", "center 45%"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.5,
  });

  return (
    <section id="memory" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          align="center"
          kicker="Feature 03"
          title={
            <>
              They <span className="aurora-text">remember</span> the shape of
              you.
            </>
          }
          subtitle="Not a chat log — a living graph of people, topics, feelings, and the threads between them."
        />

        <div className="mt-16 lg:mt-20 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-16 items-center">
          {/* Centerpiece graph */}
          <div ref={graphRef} className="relative">
            <div
              aria-hidden
              className="absolute -inset-8 rounded-[3rem] blur-3xl opacity-60"
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 45%, rgba(155,135,216,0.22), rgba(216,163,184,0.12) 55%, transparent 75%)",
              }}
            />
            <div className="relative rounded-[2rem] glass-strong border border-white/10 p-5 sm:p-7">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] tracking-[0.3em] uppercase font-[var(--font-label)] font-semibold text-white/55">
                  Your memory graph
                </p>
                <span className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-white/35">
                  Living · Neo4j
                </span>
              </div>
              <KnowledgeGraph progress={smooth} reduced={!!reduced} />
              <Legend />
            </div>
          </div>

          {/* Supporting copy */}
          <div className="space-y-4">
            {CAPTURES.map((c, i) => (
              <CaptureRow key={c.title} capture={c} index={i} />
            ))}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              className="pt-2 text-white/55 text-sm leading-relaxed max-w-md"
            >
              Every conversation, debate, and game redraws this map. The longer
              you talk, the more it looks like{" "}
              <span className="text-white/80">you</span>.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Graph SVG
// ---------------------------------------------------------------------------

function KnowledgeGraph({
  progress,
  reduced,
}: {
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 84"
      className="w-full h-auto overflow-visible"
      role="img"
      aria-label="A knowledge graph linking you to the five council members and the topics, feelings, and events they remember."
    >
      <defs>
        <radialGradient id="mm-you-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft halo pulse, scoped to this section. Honors reduced-motion. */}
      <style>{`
        .mm-node-pulse { animation: mm-node-pulse 6s ease-in-out infinite; }
        @keyframes mm-node-pulse {
          0%, 100% { transform: scale(0.92); opacity: 0.12; }
          50% { transform: scale(1.08); opacity: 0.22; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mm-node-pulse { animation: none; }
        }
      `}</style>

      {/* Edges first so nodes sit on top. */}
      {EDGES.map(([from, to, at]) => {
        const f = NODE_BY_ID[from];
        const t = NODE_BY_ID[to];
        return (
          <Edge
            key={`${from}-${to}`}
            f={f}
            t={t}
            at={at}
            progress={progress}
            reduced={reduced}
          />
        );
      })}

      {NODES.map((n) => (
        <Node key={n.id} node={n} progress={progress} reduced={reduced} />
      ))}
    </svg>
  );
}

function Edge({
  f,
  t,
  at,
  progress,
  reduced,
}: {
  f: GraphNode;
  t: GraphNode;
  at: number;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const len = Math.hypot(t.x - f.x, t.y - f.y);
  // Stroke-dash draw-on, eased over a small window after `at`.
  const dashOffset = useTransform(progress, [at, at + 0.1], [len, 0]);
  const opacity = useTransform(progress, [at, at + 0.06], [0, 0.4]);

  if (reduced) {
    return (
      <line
        x1={f.x}
        y1={f.y}
        x2={t.x}
        y2={t.y}
        stroke="white"
        strokeWidth={0.3}
        strokeOpacity={0.4}
      />
    );
  }

  return (
    <motion.line
      x1={f.x}
      y1={f.y}
      x2={t.x}
      y2={t.y}
      stroke="white"
      strokeWidth={0.3}
      strokeLinecap="round"
      strokeDasharray={len}
      style={{ strokeDashoffset: dashOffset, opacity }}
    />
  );
}

function Node({
  node,
  progress,
  reduced,
}: {
  node: GraphNode;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const at = node.at;
  const opacity = useTransform(progress, [at, at + 0.05], [0, 1]);
  const scale = useTransform(progress, [at, at + 0.12], [0.3, 1]);

  const isYou = node.kind === "you";
  const isMember = node.kind === "member";
  const labelClass =
    isYou || isMember
      ? "fill-white"
      : "fill-white/70";
  const fontSize = isYou ? 4 : isMember ? 3 : 2.6;
  const labelDy = node.r + (isYou ? 5.5 : 4.5);

  const staticStyle = reduced
    ? undefined
    : { opacity, scale, transformOrigin: `${node.x}px ${node.y}px` };

  return (
    <motion.g style={staticStyle}>
      {/* Soft pulse halo behind every node. */}
      <circle
        cx={node.x}
        cy={node.y}
        r={node.r * (isYou ? 2.6 : 2.1)}
        fill={isYou ? "url(#mm-you-glow)" : node.color}
        opacity={isYou ? 0.5 : 0.16}
        className={reduced ? undefined : "mm-node-pulse"}
        style={
          reduced
            ? undefined
            : { transformOrigin: `${node.x}px ${node.y}px`, animationDelay: `${at * 2}s` }
        }
      />
      {/* Ring for emphasis on you + members. */}
      {(isYou || isMember) && (
        <circle
          cx={node.x}
          cy={node.y}
          r={node.r + 1.1}
          fill="none"
          stroke={node.color}
          strokeWidth={0.4}
          strokeOpacity={isYou ? 0.7 : 0.5}
        />
      )}
      <circle cx={node.x} cy={node.y} r={node.r} fill={node.color} />
      {isYou && (
        <circle cx={node.x} cy={node.y} r={node.r * 0.42} fill="#0a0910" opacity={0.25} />
      )}
      <text
        x={node.x}
        y={node.y + labelDy}
        textAnchor="middle"
        fontSize={fontSize}
        className={`${labelClass} font-[var(--font-label)] font-semibold`}
        style={{ letterSpacing: "0.02em" }}
      >
        {node.label}
      </text>
    </motion.g>
  );
}

function Legend() {
  const items: ReadonlyArray<{ color: string; label: string }> = [
    { color: TOPIC_COLOR, label: "Topics" },
    { color: EMOTION_COLOR, label: "Feelings" },
    { color: EVENT_COLOR, label: "Events" },
  ];
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-[var(--font-label)] text-white/50"
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: it.color }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Copy row
// ---------------------------------------------------------------------------

function CaptureRow({
  capture,
  index,
}: {
  capture: (typeof CAPTURES)[number];
  index: number;
}) {
  const c = councilColors[capture.member];
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.08,
      }}
      className="flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
    >
      <span
        className="grid place-items-center w-11 h-11 rounded-2xl shrink-0"
        style={{
          background: `linear-gradient(135deg, ${c.hex}33, transparent 70%)`,
          border: `1px solid ${c.hex}40`,
        }}
      >
        <span
          className="material-symbols-outlined text-[22px]"
          style={{ color: c.hex }}
        >
          {capture.icon}
        </span>
      </span>
      <div className="min-w-0">
        <p className="font-[var(--font-headline)] font-bold text-white text-lg leading-tight mb-1">
          {capture.title}
        </p>
        <p className="text-white/55 text-[13px] leading-snug">{capture.line}</p>
      </div>
    </motion.div>
  );
}
