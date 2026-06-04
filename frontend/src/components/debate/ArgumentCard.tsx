"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import StrengthBar from "./StrengthBar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { DebateArgument } from "@/lib/debate-fixtures";

interface ArgumentCardProps {
  arg: DebateArgument;
  isMostRecent?: boolean;
}

export default function ArgumentCard({ arg, isMostRecent }: ArgumentCardProps) {
  const color = councilColors[arg.speakerId];
  const member = COUNCIL_MEMBERS.find((m) => m.id === arg.speakerId);
  const sideLabel = arg.side === "pro" ? "PRO" : "CON";
  const sideColor = arg.side === "pro" ? "#4ade80" : "#f87171";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`relative rounded-2xl p-4 border ${
        isMostRecent ? "shadow-[0_0_24px_rgba(255,255,255,0.04)]" : ""
      }`}
      style={{
        background: `linear-gradient(135deg, ${color.soft}, rgba(18,16,26,0.85))`,
        borderColor: isMostRecent ? `${color.hex}55` : "rgba(255,255,255,0.08)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex items-start gap-3">
        <MemberAvatar id={arg.speakerId} size="md" status={isMostRecent ? "talking" : "online"} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="text-xs font-bold tracking-tight"
              style={{ color: color.hex }}
            >
              {member?.name ?? arg.speakerId}
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{
                background: `${sideColor}22`,
                color: sideColor,
              }}
            >
              {sideLabel}
            </span>
            <span className="text-[10px] text-white/35 font-[var(--font-label)] uppercase tracking-wider">
              R{arg.roundNumber}
            </span>
          </div>
          <p className="text-sm text-white/90 leading-relaxed">{arg.text}</p>
          <div className="mt-3">
            <StrengthBar value={arg.strength} accent={color.hex} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
