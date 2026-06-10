"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import AuroraButton from "@/components/ui/AuroraButton";
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
  debate: "Where we landed",
  memory: "New thread",
  moment: "Kept moment",
};

// Sample insights — only ever shown once a user has actual sessions. New
// accounts see the empty state below.
const INSIGHTS: ReadonlyArray<Insight> = [
  {
    kind: "debate",
    title: "Move-first beats pivot-later",
    body:
      "After 22 turns, we landed on shipping the smallest version this week. Aria wrote down the trade-offs and tagged the open questions for next time.",
    surfaced: "aria",
    surfacedName: "Aria",
    surfacedRole: "Analyst",
    when: "2 hrs ago",
  },
  {
    kind: "memory",
    title: "Decentralization ↔ peer-to-peer architectures",
    body:
      "Sage connected your fresh thoughts on decentralized systems to a thread you opened last month about peer-to-peer data. A new line on the wall.",
    surfaced: "sage",
    surfacedName: "Sage",
    surfacedRole: "Architect",
    when: "Yesterday",
  },
  {
    kind: "moment",
    title: "Something landed differently last Tuesday",
    body:
      "Echo caught a shift in tone halfway through your evening session — softer, more reflective. She wants to check in on it next time you talk.",
    surfaced: "echo",
    surfacedName: "Echo",
    surfacedRole: "Empath",
    when: "3 days ago",
  },
];

export default function InsightsPanel() {
  const { ready, hasSessions } = useUserActivity();

  return (
    <div className="glass rounded-3xl p-7">
      <header className="flex items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold font-[var(--font-headline)] text-white">
            Since last time
          </h2>
          <p className="text-xs text-white/45">
            Things we kept for you — decisions, threads, moments.
          </p>
        </div>
        {hasSessions && (
          <Link
            href="/memory"
            className="text-xs font-semibold text-white/55 hover:text-white transition-colors inline-flex items-center gap-1 shrink-0"
          >
            See the wall
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
        <div className="space-y-4">
          {INSIGHTS.map((insight, i) => (
            <InsightCard key={insight.title} insight={insight} index={i} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] p-8 flex flex-col items-center text-center gap-5"
    >
      <span
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(155,135,216,0.18), rgba(224,176,131,0.12))",
        }}
      >
        <span className="material-symbols-outlined text-white/75 text-[26px]">
          hub
        </span>
      </span>
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-base font-semibold text-white">
          Nothing kept yet — and that&apos;s honest.
        </h3>
        <p className="text-sm text-white/55 leading-relaxed">
          Talk to us once and we&apos;ll start holding onto the good stuff:
          decisions you made, themes that repeat, moments worth coming back to.
        </p>
      </div>
      <AuroraButton
        href="/chat"
        size="sm"
        iconRight={
          <span className="material-symbols-outlined text-[15px]">
            arrow_forward
          </span>
        }
      >
        Start talking
      </AuroraButton>
    </motion.div>
  );
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const color = councilColors[insight.surfaced];
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group relative p-5 rounded-2xl bg-white/[0.03] overflow-hidden transition-colors duration-300 hover:bg-white/[0.05]"
    >
      <span
        aria-hidden
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-0 group-hover:opacity-90 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${color.soft}, transparent 70%)`,
        }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2.5 gap-3">
          <span
            className="text-[10px] font-bold uppercase tracking-wider font-[var(--font-label)] px-2.5 py-1 rounded-full"
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
