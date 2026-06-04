"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import MemoryGraphCanvas from "@/components/memory/MemoryGraphCanvas";
import NodeDetailPanel from "@/components/memory/NodeDetailPanel";
import GraphControls from "@/components/memory/GraphControls";
import {
  CATEGORY_ICON,
  GRAPH_EDGES,
  GRAPH_NODES,
  NODE_CATEGORIES,
  NodeCategory,
} from "@/components/memory/graph-data";
import { api } from "@/lib/api";

interface BackendNode {
  id: string;
  label: string;
  kind: string;
  weight: number;
  color: string | null;
  last_referenced: string | null;
}
interface BackendGraph {
  nodes: BackendNode[];
  edges: { id: string; source: string; target: string; kind: string; weight: number }[];
  generated_at: string;
}

const DEFAULT_CENTER = { x: 50, y: 50 };

export default function MemoryPage() {
  const [activeCategories, setActiveCategories] = useState<NodeCategory[]>([
    ...NODE_CATEGORIES,
  ]);
  const [selectedId, setSelectedId] = useState<string>("decentralized");
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [replayOpen, setReplayOpen] = useState(false);
  const [liveNodes, setLiveNodes] = useState<BackendNode[]>([]);

  useEffect(() => {
    let cancelled = false;
    api<BackendGraph>("/api/v1/memory/graph")
      .then((g) => {
        if (!cancelled) setLiveNodes(g.nodes);
      })
      .catch(() => {
        // Silent — memory backend is best-effort, the canvas still works
        // from the local layout.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedNode = useMemo(() => {
    return GRAPH_NODES.find((n) => n.id === selectedId) ?? GRAPH_NODES[0];
  }, [selectedId]);

  const nodeCount = useMemo(
    () => GRAPH_NODES.filter((n) => activeCategories.includes(n.category)).length,
    [activeCategories],
  );
  const edgeCount = useMemo(() => {
    const active = new Set(
      GRAPH_NODES.filter((n) => activeCategories.includes(n.category)).map((n) => n.id),
    );
    return GRAPH_EDGES.filter(
      (e) => e.weight > 0 && active.has(e.from) && active.has(e.to),
    ).length;
  }, [activeCategories]);

  function toggleCategory(cat: NodeCategory) {
    setActiveCategories((prev) => {
      if (prev.includes(cat)) {
        // keep at least one selected so the canvas isn't empty
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  }

  function centerOnMember(memberId: string) {
    // Find the champion's flagship node (highest radius) and pan there.
    const flagship = [...GRAPH_NODES]
      .filter((n) => n.champion === memberId)
      .sort((a, b) => b.radius - a.radius)[0];
    if (!flagship) return;
    setCenter({ x: flagship.x, y: flagship.y });
    setZoom(1.4);
    setSelectedId(flagship.id);
  }

  return (
    <div className="h-[calc(100dvh-12rem)] lg:h-[calc(100dvh-9rem)] min-h-[560px] flex flex-col gap-4">
      <GlassCard
        variant="strong"
        className="rounded-3xl flex-1 flex flex-col relative overflow-hidden"
      >
        {/* Top bar */}
        <header className="px-5 lg:px-7 pt-5 lg:pt-6 pb-4 border-b border-white/8 flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold font-[var(--font-headline)] text-white tracking-tight">
              Memory graph
            </h1>
            <p className="text-[11px] sm:text-xs text-white/55 mt-1 tabular-nums">
              <span className="aurora-text font-bold">{nodeCount}</span> nodes ·{" "}
              <span className="aurora-text font-bold">{edgeCount}</span> relational edges
            </p>
            {liveNodes.length > 0 && (
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] font-[var(--font-label)] text-white/40">
                Live from your council:{" "}
                {liveNodes
                  .slice(0, 5)
                  .map((n) => n.label)
                  .join(" · ")}
              </p>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            {NODE_CATEGORIES.map((cat) => {
              const active = activeCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-all ${
                    active
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-transparent border-white/8 text-white/45 hover:text-white/75 hover:border-white/15"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {CATEGORY_ICON[cat]}
                  </span>
                  {cat}
                </button>
              );
            })}
          </div>
        </header>

        {/* Body: side detail + canvas */}
        <div className="flex-1 relative grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-0">
          {/* Left: detail panel */}
          <aside className="hidden lg:block border-r border-white/8 p-5 overflow-y-auto">
            <AnimatePresence mode="wait">
              <NodeDetailPanel key={selectedNode.id} node={selectedNode} />
            </AnimatePresence>
          </aside>

          {/* Center: graph canvas */}
          <div className="relative min-h-0">
            <MemoryGraphCanvas
              activeCategories={activeCategories}
              selectedId={selectedId}
              onSelect={setSelectedId}
              zoom={zoom}
              centerOn={center}
            />

            {/* Mobile detail strip — bottom sheet style */}
            <div className="lg:hidden absolute top-3 left-3 right-3 z-10 glass-strong rounded-2xl p-4">
              <AnimatePresence mode="wait">
                <NodeDetailPanel key={selectedNode.id} node={selectedNode} />
              </AnimatePresence>
            </div>

            <GraphControls
              zoom={zoom}
              onZoomIn={() => setZoom((z) => Math.min(z + 0.25, 2.5))}
              onZoomOut={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              onRecenter={() => {
                setZoom(1);
                setCenter(DEFAULT_CENTER);
              }}
              onCenterOnMember={centerOnMember}
            />

            {/* Bottom-right replay button */}
            <button
              type="button"
              onClick={() => setReplayOpen(true)}
              className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong text-xs font-semibold text-white/85 hover:text-white border border-white/8 hover:border-white/15 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">replay</span>
              Replay last 7 days
            </button>
          </div>
        </div>
      </GlassCard>

      <ReplayModal open={replayOpen} onClose={() => setReplayOpen(false)} />
    </div>
  );
}

function ReplayModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/55 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong rounded-3xl p-8 max-w-md w-full border border-white/10 relative"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 grid place-items-center rounded-full text-white/55 hover:text-white hover:bg-white/[0.08]"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <p className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/45 mb-2">
              Coming soon
            </p>
            <h2 className="text-2xl font-bold font-[var(--font-headline)] aurora-text mb-3">
              Replay the week
            </h2>
            <p className="text-sm text-white/65 leading-relaxed">
              Scrub through how your memory graph evolved over the last 7 days — new
              edges firing, old nodes brightening up, moments the council flagged for
              you. We&apos;re still building this view. It&apos;ll land next.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
