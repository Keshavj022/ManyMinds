"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import TypingDots from "@/components/ui/TypingDots";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";
import type { CouncilStateRow, MemberStatus } from "@/lib/chat-fixtures";

interface MemberRailProps {
  state: ReadonlyArray<CouncilStateRow>;
  target: CouncilMemberId | "group";
  onSelect: (id: CouncilMemberId | "group") => void;
}

function statusLabel(s: MemberStatus): string {
  switch (s) {
    case "talking":
      return "talking";
    case "typing":
      return "typing…";
    case "thinking":
      return "thinking";
    default:
      return "listening";
  }
}

function statusAvatar(s: MemberStatus): "online" | "talking" | "thinking" | "away" {
  if (s === "talking" || s === "typing") return "talking";
  if (s === "thinking") return "thinking";
  return "online";
}

export default function MemberRail({ state, target, onSelect }: MemberRailProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-1 pb-2">
      <button
        type="button"
        onClick={() => onSelect("group")}
        className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all ${
          target === "group"
            ? "bg-white text-[#0d0b14] shadow-[0_0_16px_rgba(255,255,255,0.25)]"
            : "border border-white/10 bg-white/[0.04] text-white/75 hover:text-white hover:bg-white/[0.07]"
        }`}
      >
        Group
      </button>
      {state.map((row) => {
        const member = COUNCIL_MEMBERS.find((m) => m.id === row.id);
        const color = councilColors[row.id];
        const active = target === row.id;

        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelect(row.id)}
            className={`group flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border transition-all ${
              active ? "scale-[1.03]" : "hover:scale-[1.01]"
            }`}
            style={{
              background: active ? color.soft : "rgba(255,255,255,0.025)",
              borderColor: active ? color.hex : "rgba(255,255,255,0.08)",
            }}
          >
            <MemberAvatar
              id={row.id}
              size="sm"
              status={statusAvatar(row.status)}
              glow={active}
            />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[11px] font-bold text-white">
                {member?.name ?? row.id}
              </span>
              <span
                className="text-[9px] uppercase tracking-wider font-[var(--font-label)] flex items-center gap-1"
                style={{
                  color: row.status === "listening" ? "rgba(255,255,255,0.45)" : color.hex,
                }}
              >
                {row.status === "typing" || row.status === "talking" ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="scale-75 origin-left"
                  >
                    <TypingDots memberId={row.id} />
                  </motion.span>
                ) : null}
                {statusLabel(row.status)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
