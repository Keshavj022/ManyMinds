"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import MemberChip from "@/components/ui/MemberChip";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import {
  KIND_META,
  LayoutNode,
  rememberCopy,
  timeAgo,
  YOU_NODE_ID,
} from "./graph-data";

interface Props {
  node: LayoutNode;
  neighbours: ReadonlyArray<LayoutNode>;
  onSelectNeighbour?: (id: string) => void;
  /** Tighter spacing for the mobile strip. */
  compact?: boolean;
}

export default function NodeDetailPanel({
  node,
  neighbours,
  onSelectNeighbour,
  compact = false,
}: Props) {
  const meta = KIND_META[node.kind];
  const threads = neighbours.filter((n) => n.id !== YOU_NODE_ID);
  const copy = rememberCopy(
    node,
    threads.map((n) => n.label),
  );
  const keeper = copy.keeper
    ? COUNCIL_MEMBERS.find((m) => m.id === copy.keeper)
    : undefined;
  const isYou = node.kind === "you";

  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={compact ? "space-y-3" : "space-y-6"}
    >
      <header>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] font-[var(--font-label)]"
          style={{ background: meta.soft, color: meta.hex }}
        >
          <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
          {isYou ? "You" : meta.label}
        </span>
        <h3 className="mt-2.5 text-xl font-bold font-[var(--font-headline)] text-white leading-tight">
          {node.label}
        </h3>
      </header>

      {/* Who's holding this memory, and what they'd say about it */}
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {isYou ? (
          <div className="flex -space-x-2">
            {COUNCIL_MEMBERS.map((m) => (
              <MemberAvatar key={m.id} id={m.id} size="sm" glow={false} />
            ))}
          </div>
        ) : (
          keeper && (
            <div className="flex items-center gap-2">
              <MemberChip id={keeper.id} name={keeper.name} />
              <span className="text-[10px] uppercase tracking-[0.18em] font-[var(--font-label)] text-white/45">
                remembers
              </span>
            </div>
          )
        )}
        <p className="text-sm text-white/70 leading-relaxed italic">
          &ldquo;{copy.line}&rdquo;
        </p>
      </div>

      {!isYou && (
        <dl className={compact ? "space-y-1.5 text-xs" : "space-y-2.5 text-xs"}>
          <Row label="Last touched" value={timeAgo(node.lastReferenced)} />
          <Row
            label="How strongly"
            value={
              <span className="inline-flex items-center gap-2">
                <span className="relative w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${Math.round(12 + node.strength * 88)}%`,
                      background: meta.hex,
                      boxShadow: `0 0 8px ${meta.soft}`,
                    }}
                  />
                </span>
                <span className="text-white/65">
                  {node.strength > 0.66 ? "holding on tight" : node.strength > 0.33 ? "keeping it close" : "still settling in"}
                </span>
              </span>
            }
          />
        </dl>
      )}

      {threads.length > 0 && !compact && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/45">
            Threads to
          </p>
          <div className="flex flex-wrap gap-1.5">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectNeighbour?.(t.id)}
                className="px-2.5 py-1 rounded-full text-[11px] bg-white/[0.04] text-white/75 hover:text-white hover:bg-white/[0.08] transition-colors inline-flex items-center gap-1.5"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: KIND_META[t.kind].hex }}
                />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <dt className="text-white/45 uppercase tracking-wider text-[10px] font-[var(--font-label)] font-semibold">
        {label}
      </dt>
      <dd className="text-white/85 text-right text-xs font-medium">{value}</dd>
    </div>
  );
}
