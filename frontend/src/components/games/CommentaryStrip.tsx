"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CouncilMemberId, councilColors, COUNCIL_MEMBERS } from "@/lib/design-tokens";
import MemberAvatar from "@/components/ui/MemberAvatar";

export type CommentaryItem = {
  id: string;
  memberId: CouncilMemberId;
  text: string;
  ts: number;
};

interface CommentaryStripProps {
  items: CommentaryItem[];
  /** newest left. The list is rendered as-is. */
  className?: string;
  emptyText?: string;
  max?: number;
}

const nameOf = (id: CouncilMemberId): string =>
  COUNCIL_MEMBERS.find((m) => m.id === id)?.name ?? id;

export default function CommentaryStrip({
  items,
  className = "",
  emptyText = "The council is quiet… for now.",
  max = 8,
}: CommentaryStripProps) {
  const trimmed = items.slice(0, max);

  return (
    <div
      className={`flex gap-2 overflow-x-auto no-scrollbar pb-1 ${className}`}
      style={{ scrollbarWidth: "none" }}
    >
      {trimmed.length === 0 && (
        <div className="text-xs text-white/40 italic px-3 py-2">{emptyText}</div>
      )}
      <AnimatePresence initial={false}>
        {trimmed.map((item) => {
          const c = councilColors[item.memberId];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="shrink-0 max-w-xs rounded-2xl pl-1.5 pr-3 py-1.5 flex items-center gap-2 border"
              style={{
                background: c.soft,
                borderColor: `${c.hex}66`,
              }}
            >
              <MemberAvatar id={item.memberId} size="xs" />
              <div className="leading-tight">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.hex }}>
                  {nameOf(item.memberId)}
                </div>
                <div className="text-xs text-white/85">{item.text}</div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
