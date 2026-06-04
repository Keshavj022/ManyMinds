"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { councilColors, CouncilMemberId } from "@/lib/design-tokens";
import {
  GRAPH_EDGES,
  GRAPH_NODES,
  GraphNode,
  NodeCategory,
} from "./graph-data";

interface Props {
  activeCategories: ReadonlyArray<NodeCategory>;
  selectedId: string;
  onSelect: (id: string) => void;
  /** Pan / zoom controlled by parent so the bottom-left controls can drive it. */
  zoom: number;
  centerOn: { x: number; y: number };
}

export default function MemoryGraphCanvas({
  activeCategories,
  selectedId,
  onSelect,
  zoom,
  centerOn,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter nodes by category
  const visibleNodes = useMemo(() => {
    return GRAPH_NODES.filter((n) => activeCategories.includes(n.category));
  }, [activeCategories]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes],
  );

  // Drop edges that point to filtered-out / unknown nodes
  const visibleEdges = useMemo(() => {
    return GRAPH_EDGES.filter(
      (e) =>
        e.weight > 0 &&
        visibleNodeIds.has(e.from) &&
        visibleNodeIds.has(e.to),
    );
  }, [visibleNodeIds]);

  // Map id → node for fast lookup
  const nodesById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    for (const n of visibleNodes) m.set(n.id, n);
    return m;
  }, [visibleNodes]);

  // Which edges connect to the highlighted node (selected ?? hovered)
  const focusId = hoveredId ?? selectedId;
  const focusedEdges = useMemo(() => {
    return new Set(
      visibleEdges
        .filter((e) => e.from === focusId || e.to === focusId)
        .map((e) => `${e.from}-${e.to}`),
    );
  }, [visibleEdges, focusId]);

  const neighbourIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of visibleEdges) {
      if (e.from === focusId) set.add(e.to);
      if (e.to === focusId) set.add(e.from);
    }
    return set;
  }, [visibleEdges, focusId]);

  // viewBox controls zoom and pan
  const half = 50 / zoom;
  const viewBox = `${centerOn.x - half} ${centerOn.y - half} ${half * 2} ${half * 2}`;

  return (
    <svg
      viewBox={viewBox}
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Defs: gradients per member, edge-pulse filter */}
      <defs>
        {Object.entries(councilColors).map(([id, c]) => (
          <radialGradient
            id={`node-${id}`}
            key={id}
            cx="35%"
            cy="35%"
            r="70%"
          >
            <stop offset="0%" stopColor="white" stopOpacity="0.95" />
            <stop offset="35%" stopColor={c.hex} stopOpacity="1" />
            <stop offset="100%" stopColor={c.hex} stopOpacity="0.5" />
          </radialGradient>
        ))}
      </defs>

      {/* Edges */}
      <g>
        {visibleEdges.map((edge) => {
          const a = nodesById.get(edge.from);
          const b = nodesById.get(edge.to);
          if (!a || !b) return null;
          const key = `${edge.from}-${edge.to}`;
          const isFocused = focusedEdges.has(key);
          return (
            <line
              key={key}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="white"
              strokeOpacity={isFocused ? 0.55 : 0.12 + edge.weight * 0.18}
              strokeWidth={isFocused ? 0.42 : 0.22}
              className={isFocused ? "edge-focused" : "edge-idle"}
            />
          );
        })}
      </g>

      {/* Nodes */}
      <g>
        {visibleNodes.map((node) => {
          const isFocused = focusId === node.id;
          const isNeighbour = neighbourIds.has(node.id);
          const isSelected = selectedId === node.id;
          const dim = focusId && !isFocused && !isNeighbour ? 0.35 : 1;

          return (
            <NodeBubble
              key={node.id}
              node={node}
              dim={dim}
              isFocused={isFocused}
              isSelected={isSelected}
              onHover={(h) => setHoveredId(h ? node.id : null)}
              onSelect={() => onSelect(node.id)}
            />
          );
        })}
      </g>

      {/* Tiny inline keyframe for edge pulse */}
      <style>{`
        .edge-focused {
          stroke-dasharray: 1 1.6;
          animation: graph-pulse 1.4s linear infinite;
        }
        @keyframes graph-pulse {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -5.2; }
        }
      `}</style>
    </svg>
  );
}

function NodeBubble({
  node,
  dim,
  isFocused,
  isSelected,
  onHover,
  onSelect,
}: {
  node: GraphNode;
  dim: number;
  isFocused: boolean;
  isSelected: boolean;
  onHover: (h: boolean) => void;
  onSelect: () => void;
}) {
  const champion: CouncilMemberId = node.champion;
  const color = councilColors[champion];

  return (
    <motion.g
      style={{ cursor: "pointer", opacity: dim }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onSelect}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: dim }}
      transition={{ duration: 0.4 }}
    >
      {/* Glow */}
      <circle
        cx={node.x}
        cy={node.y}
        r={node.radius * (isFocused ? 2.2 : 1.6)}
        fill={color.hex}
        opacity={isFocused ? 0.45 : 0.18}
        style={{ pointerEvents: "none" }}
      />
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={node.x}
          cy={node.y}
          r={node.radius + 1.5}
          fill="none"
          stroke="white"
          strokeOpacity={0.8}
          strokeWidth={0.5}
        />
      )}
      {/* Core */}
      <circle
        cx={node.x}
        cy={node.y}
        r={node.radius}
        fill={`url(#node-${champion})`}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={0.25}
      />
      {/* Label */}
      <text
        x={node.x}
        y={node.y + node.radius + 3}
        textAnchor="middle"
        fontSize={isFocused ? 2.8 : 2.4}
        fontWeight={isFocused ? 700 : 500}
        fill="white"
        style={{
          fontFamily: "var(--font-headline), sans-serif",
          paintOrder: "stroke",
          stroke: "rgba(8,7,13,0.85)",
          strokeWidth: 0.6,
          strokeLinejoin: "round",
          pointerEvents: "none",
        }}
      >
        {node.label}
      </text>
    </motion.g>
  );
}
