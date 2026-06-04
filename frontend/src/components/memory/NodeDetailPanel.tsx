"use client";

import { motion } from "framer-motion";
import MemberChip from "@/components/ui/MemberChip";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import { GraphNode } from "./graph-data";

interface Props {
  node: GraphNode;
}

export default function NodeDetailPanel({ node }: Props) {
  const champion = COUNCIL_MEMBERS.find((m) => m.id === node.champion);
  const sentimentLabel =
    node.sentiment === "positive"
      ? "Positive"
      : node.sentiment === "negative"
      ? "Tense"
      : "Mixed";
  const sentimentColor =
    node.sentiment === "positive"
      ? "#4ade80"
      : node.sentiment === "negative"
      ? "#f87171"
      : "#fbbf24";

  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      <header>
        <p className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/45 mb-1">
          {node.category}
        </p>
        <h3 className="text-xl font-bold font-[var(--font-headline)] text-white leading-tight">
          {node.label}
        </h3>
      </header>

      <dl className="space-y-2.5 text-xs">
        <Row label="First mentioned" value={node.firstMentioned} />
        <Row
          label="Sentiment"
          value={
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider font-[var(--font-label)]"
              style={{
                background: `${sentimentColor}22`,
                color: sentimentColor,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: sentimentColor }}
              />
              {sentimentLabel} · {node.sentimentScore > 0 ? "+" : ""}
              {node.sentimentScore.toFixed(2)}
            </span>
          }
        />
      </dl>

      {champion && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/45">
            Primary champion
          </p>
          <MemberChip id={champion.id} name={champion.name} role={champion.role} />
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/45">
          Connected
        </p>
        <div className="flex flex-wrap gap-1.5">
          {node.connectedTopics.map((t) => (
            <span
              key={t}
              className="px-2 py-1 rounded-md text-[11px] bg-white/[0.04] border border-white/8 text-white/75"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <dt className="text-white/45 uppercase tracking-wider text-[10px] font-[var(--font-label)] font-semibold">
        {label}
      </dt>
      <dd className="text-white text-right text-xs font-medium">{value}</dd>
    </div>
  );
}
