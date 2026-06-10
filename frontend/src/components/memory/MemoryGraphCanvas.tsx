"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  KIND_META,
  LayoutEdge,
  LayoutNode,
  NodeKind,
  YOU_NODE_ID,
} from "./graph-data";

interface Props {
  nodes: ReadonlyArray<LayoutNode>;
  edges: ReadonlyArray<LayoutEdge>;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  /** Pan / zoom controlled by the parent so the corner controls can drive it. */
  zoom: number;
  centerOn: { x: number; y: number };
}

const ALL_KINDS = Object.keys(KIND_META) as NodeKind[];

export default function MemoryGraphCanvas({
  nodes,
  edges,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  zoom,
  centerOn,
}: Props) {
  const focusId = hoveredId ?? selectedId;

  const nodesById = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  // Edges touching the focused node + its neighbour set.
  const { focusedEdgeKeys, neighbourIds } = useMemo(() => {
    const keys = new Set<string>();
    const ids = new Set<string>();
    if (focusId) {
      for (const e of edges) {
        if (e.source === focusId || e.target === focusId) {
          keys.add(`${e.source}→${e.target}`);
          ids.add(e.source === focusId ? e.target : e.source);
        }
      }
    }
    return { focusedEdgeKeys: keys, neighbourIds: ids };
  }, [edges, focusId]);

  const focusHex = focusId
    ? KIND_META[nodesById.get(focusId)?.kind ?? "entity"].hex
    : "#ffffff";

  // viewBox drives zoom and pan.
  const half = 50 / zoom;
  const viewBox = `${centerOn.x - half} ${centerOn.y - half} ${half * 2} ${half * 2}`;

  return (
    <svg
      viewBox={viewBox}
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Your memory graph"
    >
      <defs>
        {ALL_KINDS.map((kind) => (
          <radialGradient key={kind} id={`mg-${kind}`} cx="35%" cy="35%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="38%" stopColor={KIND_META[kind].hex} stopOpacity="1" />
            <stop offset="100%" stopColor={KIND_META[kind].hex} stopOpacity="0.45" />
          </radialGradient>
        ))}
      </defs>

      {/* Edges — faint by default, lit in the focused node's hue */}
      <g>
        {edges.map((edge) => {
          const a = nodesById.get(edge.source);
          const b = nodesById.get(edge.target);
          if (!a || !b) return null;
          const key = `${edge.source}→${edge.target}`;
          const isFocused = focusedEdgeKeys.has(key);
          const idleOpacity = edge.anchor ? 0.05 : 0.1 + edge.weight * 0.16;
          return (
            <line
              key={key}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={isFocused ? focusHex : "white"}
              strokeOpacity={isFocused ? 0.6 : idleOpacity}
              strokeWidth={isFocused ? 0.42 : edge.anchor ? 0.16 : 0.22}
              className={isFocused ? "edge-focused" : undefined}
            />
          );
        })}
      </g>

      {/* Nodes */}
      <g>
        {nodes.map((node, i) => {
          const isFocused = focusId === node.id;
          const isNeighbour = neighbourIds.has(node.id);
          const dim = focusId && !isFocused && !isNeighbour ? 0.3 : 1;
          return (
            <NodeBubble
              key={node.id}
              node={node}
              order={i}
              dim={dim}
              isFocused={isFocused}
              isSelected={selectedId === node.id}
              onHover={(h) => onHover(h ? node.id : null)}
              onSelect={() => onSelect(node.id)}
            />
          );
        })}
      </g>

      {/* Edge pulse keyframes (scoped to this SVG) */}
      <style>{`
        .edge-focused {
          stroke-dasharray: 1 1.6;
          animation: graph-pulse 1.4s linear infinite;
        }
        @keyframes graph-pulse {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -5.2; }
        }
        @media (prefers-reduced-motion: reduce) {
          .edge-focused { animation: none; }
        }
      `}</style>
    </svg>
  );
}

function NodeBubble({
  node,
  order,
  dim,
  isFocused,
  isSelected,
  onHover,
  onSelect,
}: {
  node: LayoutNode;
  order: number;
  dim: number;
  isFocused: boolean;
  isSelected: boolean;
  onHover: (h: boolean) => void;
  onSelect: () => void;
}) {
  const meta = KIND_META[node.kind];
  const isYou = node.id === YOU_NODE_ID;
  const label =
    node.label.length > 18 ? `${node.label.slice(0, 17)}…` : node.label;

  return (
    <motion.g
      // Outer layer: staggered entrance only. The hover-dim lives on the
      // inner <g> as a plain CSS transition so it never inherits the delay.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, delay: Math.min(order * 0.03, 0.6) }}
    >
    <g
      style={{ cursor: "pointer", opacity: dim, transition: "opacity 0.25s ease" }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onSelect}
    >
      {/* Glow halo — breathes softly on the You node */}
      {isYou ? (
        <motion.circle
          cx={node.x}
          cy={node.y}
          r={node.radius * (isFocused ? 2.3 : 1.9)}
          fill={meta.hex}
          style={{ pointerEvents: "none" }}
          animate={{ opacity: [0.16, 0.32, 0.16] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <circle
          cx={node.x}
          cy={node.y}
          r={node.radius * (isFocused ? 2.2 : 1.6)}
          fill={meta.hex}
          opacity={isFocused ? 0.42 : 0.15}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={node.x}
          cy={node.y}
          r={node.radius + 1.4}
          fill="none"
          stroke="white"
          strokeOpacity={0.75}
          strokeWidth={0.4}
        />
      )}

      {/* Core */}
      <circle
        cx={node.x}
        cy={node.y}
        r={node.radius}
        fill={`url(#mg-${node.kind})`}
        stroke="rgba(255,255,255,0.16)"
        strokeWidth={0.22}
      />

      {/* Label */}
      <text
        x={node.x}
        y={node.y + node.radius + 2.8}
        textAnchor="middle"
        fontSize={isFocused ? 2.7 : 2.3}
        fontWeight={isFocused || isYou ? 700 : 500}
        fill="white"
        fillOpacity={isFocused || isYou ? 1 : 0.82}
        style={{
          fontFamily: "var(--font-headline), sans-serif",
          paintOrder: "stroke",
          stroke: "rgba(15,13,20,0.85)",
          strokeWidth: 0.6,
          strokeLinejoin: "round",
          pointerEvents: "none",
        }}
      >
        {label}
      </text>
    </g>
    </motion.g>
  );
}
