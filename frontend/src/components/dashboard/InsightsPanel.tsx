"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import MemberChip from "@/components/ui/MemberChip";
import { CouncilMemberId, councilColors } from "@/lib/design-tokens";
import { useUserActivity } from "@/lib/use-user-activity";

interface Insight {
  kind: "debate" | "memory" | "moment";
  title: string;
  body: string;
  surfaced: CouncilMemberId;
  surfacedName: string;
  surfacedRole: string;
  when: string;
}

const KIND_LABEL: Record<Insight["kind"], string> = {
  debate: "Debate Conclusion",
  memory: "Memory Edge",
  moment: "Moment Flagged",
};

// Sample insights — only ever shown once a user has actual sessions. New
// accounts see the empty state below.
const INSIGHTS: ReadonlyArray<Insight> = [
  {
    kind: "debate",
    title: "Move-first beats pivot-later",
    body:
      "After 22 turns, the council landed on shipping the smallest version this week. Aria documented the trade-offs and tagged the open questions for next session.",
    surfaced: "aria",
    surfacedName: "Aria",
    surfacedRole: "Analyst",
    when: "2 hrs ago",
  },
  {
    kind: "memory",
    title: "Decentralization ↔ peer-to-peer architectures",
    body:
      "Sage connected your fresh thoughts on decentralized systems to a thread you opened last month about peer-to-peer data. The graph picked up a new edge with weight 0.82.",
    surfaced: "sage",
    surfacedName: "Sage",
    surfacedRole: "Architect",
    when: "Yesterday",
  },
  {
    kind: "moment",
    title: "Something landed differently last Tuesday",
    body:
      "Echo flagged a shift in tone halfway through your evening session — softer, more reflective. She's marked it as a check-in opportunity next time we talk.",
    surfaced: "echo",
    surfacedName: "Echo",
    surfacedRole: "Empath",
    when: "3 days ago",
  },
];

export default function InsightsPanel() {
  const { ready, hasSessions } = useUserActivity();

  return (
    <GlassCard variant="default" className="rounded-3xl p-6">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold font-[var(--font-headline)] text-white">
            Recent insights
          </h2>
          <p className="text-xs text-white/45 mt-0.5">
            What the council surfaced for you since last time.
          </p>
        </div>
        {hasSessions && (
          <Link
            href="/memory"
            className="text-xs font-semibold text-white/55 hover:text-white transition-colors inline-flex items-center gap-1"
          >
            View graph
            <span className="material-symbols-outlined text-[16px]">
              arrow_forward
            </span>
          </Link>
        )}
      </header>

      {/* Until we know whether the user has sessions, render nothing — better
          a brief blank than a flash of mock content that's then yanked away. */}
      {!ready ? (
        <div className="h-32" aria-hidden />
      ) : hasSessions ? (
        <div className="space-y-3">
          {INSIGHTS.map((insight, i) => (
            <InsightCard key={insight.title} insight={insight} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </GlassCard>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-7 flex flex-col items-center text-center gap-4"
    >
      <span
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(155,135,216,0.18), rgba(216,163,184,0.14))",
        }}
      >
        <span className="material-symbols-outlined text-white/75 text-[26px]">
          hub
        </span>
      </span>
      <div className="max-w-sm">
        <h3 className="text-base font-semibold text-white mb-1.5">
          Nothing surfaced yet.
        </h3>
        <p className="text-sm text-white/55 leading-relaxed">
          Start a conversation and the council will begin noting what matters —
          decisions made, themes that recur, moments worth coming back to.
        </p>
      </div>
      <Link
        href="/chat"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-strong)] text-[#15121d] text-xs font-semibold transition-colors active:scale-[0.98]"
      >
        Start a chat
        <span className="material-symbols-outlined text-[15px]">
          arrow_forward
        </span>
      </Link>
    </motion.div>
  );
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const color = councilColors[insight.surfaced];
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.05, duration: 0.4 }}
      className="group relative p-4 rounded-2xl bg-white/[0.03] border border-white/8 overflow-hidden transition-colors hover:bg-white/[0.05]"
    >
      <span
        aria-hidden
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-90 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${color.soft}, transparent 70%)`,
        }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2 gap-3">
          <span
            className="text-[10px] font-bold uppercase tracking-wider font-[var(--font-label)] px-2 py-0.5 rounded-md"
            style={{
              background: color.soft,
              color: color.hex,
            }}
          >
            {KIND_LABEL[insight.kind]}
          </span>
          <span className="text-[11px] text-white/40">{insight.when}</span>
        </div>
        <h3 className="text-[15px] font-semibold text-white leading-snug mb-1.5">
          {insight.title}
        </h3>
        <p className="text-sm text-white/55 leading-relaxed mb-4">{insight.body}</p>
        <MemberChip
          id={insight.surfaced}
          name={insight.surfacedName}
          role={insight.surfacedRole}
        />
      </div>
    </motion.article>
  );
}
