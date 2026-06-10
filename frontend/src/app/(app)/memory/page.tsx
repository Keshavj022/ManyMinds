"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import AuroraButton from "@/components/ui/AuroraButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import MemoryGraphCanvas from "@/components/memory/MemoryGraphCanvas";
import NodeDetailPanel from "@/components/memory/NodeDetailPanel";
import GraphControls from "@/components/memory/GraphControls";
import {
  ApiGraph,
  buildLayout,
  KIND_META,
  KIND_ORDER,
  MemoryLayout,
  NodeKind,
  YOU_NODE_ID,
} from "@/components/memory/graph-data";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import { api } from "@/lib/api";

const DEFAULT_CENTER = { x: 50, y: 50 };

type FetchState =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ready"; layout: MemoryLayout };

export default function MemoryPage() {
  const [state, setState] = useState<FetchState>({ phase: "loading" });
  const [hiddenKinds, setHiddenKinds] = useState<ReadonlySet<NodeKind>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState(DEFAULT_CENTER);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ phase: "loading" });
    api<ApiGraph>("/api/v1/memory/graph")
      .then((graph) => {
        if (cancelled) return;
        const layout = buildLayout(graph);
        setState({ phase: "ready", layout });
        setSelectedId(layout.nodes.length > 0 ? YOU_NODE_ID : null);
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  const layout = state.phase === "ready" ? state.layout : null;

  // Which kinds actually exist in this person's graph (drives the chips).
  const presentKinds = useMemo(() => {
    if (!layout) return [] as NodeKind[];
    const present = new Set(layout.nodes.map((n) => n.kind));
    return KIND_ORDER.filter((k) => present.has(k));
  }, [layout]);

  // Visible slice after kind filtering ("You" is always on the wall).
  const visibleNodes = useMemo(() => {
    if (!layout) return [];
    return layout.nodes.filter(
      (n) => n.kind === "you" || !hiddenKinds.has(n.kind),
    );
  }, [layout, hiddenKinds]);

  const visibleEdges = useMemo(() => {
    if (!layout) return [];
    const ids = new Set(visibleNodes.map((n) => n.id));
    return layout.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [layout, visibleNodes]);

  const focusId = hoveredId ?? selectedId;
  const focusNode = useMemo(
    () => visibleNodes.find((n) => n.id === focusId) ?? null,
    [visibleNodes, focusId],
  );

  const focusNeighbours = useMemo(() => {
    if (!focusNode) return [];
    const ids = new Set<string>();
    for (const e of visibleEdges) {
      if (e.source === focusNode.id) ids.add(e.target);
      if (e.target === focusNode.id) ids.add(e.source);
    }
    return visibleNodes.filter((n) => ids.has(n.id));
  }, [focusNode, visibleEdges, visibleNodes]);

  function toggleKind(kind: NodeKind) {
    setHiddenKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else if (presentKinds.length - next.size > 1) next.add(kind);
      return next;
    });
  }

  const hasNodes = (layout?.nodes.length ?? 0) > 0;
  const memoryCount = visibleNodes.filter((n) => n.kind !== "you").length;
  const threadCount = visibleEdges.filter((e) => !e.anchor).length;

  return (
    <div className="h-[calc(100dvh-12rem)] lg:h-[calc(100dvh-9rem)] min-h-[560px] flex flex-col">
      <GlassCard
        variant="strong"
        className="rounded-3xl flex-1 flex flex-col relative overflow-hidden"
      >
        {/* Top bar */}
        <header className="px-6 lg:px-7 pt-6 pb-5 flex flex-wrap items-start justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] text-white/55">
              Memory
            </p>
            <h1 className="text-xl lg:text-2xl font-bold font-[var(--font-headline)] text-white tracking-tight">
              What we remember about you — the shape of it.
            </h1>
            <GraphCaption
              state={state}
              memoryCount={memoryCount}
              threadCount={threadCount}
            />
          </div>

          <div className="flex flex-col items-end gap-3">
            {/* The five are always here, quietly holding the wall */}
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="flex -space-x-2">
                {COUNCIL_MEMBERS.map((m) => (
                  <MemberAvatar key={m.id} id={m.id} size="xs" glow={false} />
                ))}
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] font-[var(--font-label)] text-white/40">
                all five keep it
              </span>
            </div>

            {/* Kind filter chips — only the kinds this graph actually has */}
            {presentKinds.length > 1 && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {presentKinds.map((kind) => {
                  const meta = KIND_META[kind];
                  const active = !hiddenKinds.has(kind);
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => toggleKind(kind)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                      style={
                        active
                          ? { background: meta.soft, color: meta.hex }
                          : { background: "transparent", color: "rgba(255,255,255,0.4)" }
                      }
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {meta.icon}
                      </span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {/* Body: side card + canvas */}
        <div className="flex-1 relative grid grid-cols-1 lg:grid-cols-[300px_1fr] min-h-0">
          <aside className="hidden lg:block border-r border-white/[0.06] p-6 overflow-y-auto">
            <AnimatePresence mode="wait">
              {focusNode ? (
                <NodeDetailPanel
                  key={focusNode.id}
                  node={focusNode}
                  neighbours={focusNeighbours}
                  onSelectNeighbour={setSelectedId}
                />
              ) : (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-white/45 leading-relaxed"
                >
                  {hasNodes
                    ? "Hover a dot and we'll tell you why it's there."
                    : "When there's something worth keeping, it hangs here."}
                </motion.p>
              )}
            </AnimatePresence>
          </aside>

          <div className="relative min-h-0">
            {state.phase === "loading" && <LoadingWall />}
            {state.phase === "error" && <ErrorWall onRetry={load} />}
            {state.phase === "ready" && !hasNodes && <EmptyWall />}

            {state.phase === "ready" && hasNodes && (
              <>
                <MemoryGraphCanvas
                  nodes={visibleNodes}
                  edges={visibleEdges}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onSelect={setSelectedId}
                  onHover={setHoveredId}
                  zoom={zoom}
                  centerOn={center}
                />

                {/* Mobile detail strip */}
                {focusNode && (
                  <div className="lg:hidden absolute top-3 left-3 right-3 z-10 glass-strong rounded-2xl p-4">
                    <AnimatePresence mode="wait">
                      <NodeDetailPanel
                        key={focusNode.id}
                        node={focusNode}
                        neighbours={focusNeighbours}
                        onSelectNeighbour={setSelectedId}
                        compact
                      />
                    </AnimatePresence>
                  </div>
                )}

                <GraphControls
                  zoom={zoom}
                  onZoomIn={() => setZoom((z) => Math.min(z + 0.25, 2.5))}
                  onZoomOut={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                  onRecenter={() => {
                    setZoom(1);
                    setCenter(DEFAULT_CENTER);
                    setSelectedId(YOU_NODE_ID);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function GraphCaption({
  state,
  memoryCount,
  threadCount,
}: {
  state: FetchState;
  memoryCount: number;
  threadCount: number;
}) {
  if (state.phase !== "ready") {
    return <p className="text-xs text-white/45 min-h-[1.2em]" aria-hidden />;
  }
  if (state.layout.nodes.length === 0) {
    return (
      <p className="text-xs text-white/45">The graph grows as you talk.</p>
    );
  }
  if (state.layout.isSample) {
    // The backend served its placeholder generator — say so, gently.
    return (
      <p className="text-xs text-white/45">
        A sketch of what this becomes — the real graph grows as you talk.
      </p>
    );
  }
  return (
    <p className="text-xs text-white/55 tabular-nums">
      <span className="aurora-text font-bold">{memoryCount}</span>{" "}
      {memoryCount === 1 ? "thing" : "things"} we&apos;re holding onto ·{" "}
      <span className="aurora-text font-bold">{threadCount}</span>{" "}
      {threadCount === 1 ? "thread" : "threads"} between them
    </p>
  );
}

function LoadingWall() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="relative w-12 h-12">
          <span className="absolute inset-0 rounded-full bg-[var(--color-warm-soft)] animate-pulse-soft" />
          <span className="absolute inset-3 rounded-full bg-[var(--color-warm)]/40" />
        </span>
        <p className="text-sm text-white/55">Echo&apos;s getting the wall…</p>
      </div>
    </div>
  );
}

function ErrorWall({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <span className="material-symbols-outlined text-[32px] text-white/40">
          cloud_off
        </span>
        <p className="text-sm text-white/65 leading-relaxed">
          We couldn&apos;t reach the wall just now. It&apos;s all still there —
          give it another try in a moment.
        </p>
        <AuroraButton variant="ghost" size="sm" onClick={onRetry}>
          Try again
        </AuroraButton>
      </div>
    </div>
  );
}

function EmptyWall() {
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-5 text-center max-w-md"
      >
        <div className="flex -space-x-2">
          {COUNCIL_MEMBERS.map((m) => (
            <MemberAvatar key={m.id} id={m.id} size="md" glow={false} />
          ))}
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold font-[var(--font-headline)] text-white">
            Nothing on the wall yet.
          </h2>
          <p className="text-sm text-white/55 leading-relaxed">
            That&apos;s the honest answer — we only keep what you actually tell
            us. Come talk, and the first conversation hangs the first thread.
          </p>
        </div>
        <AuroraButton href="/chat" size="md">
          Start talking
        </AuroraButton>
      </motion.div>
    </div>
  );
}
