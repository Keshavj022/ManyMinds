"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { DebateArgument } from "@/lib/debate-fixtures";
import { SIDE } from "./palette";

interface SpeechCardProps {
  arg: DebateArgument;
  isLatest?: boolean;
}

/**
 * One spoken argument — a glass speech card with the speaker's hue
 * running down the rail. Pro speaks from the left, Con from the right,
 * so the feed reads like a conversation across the table.
 */
export default function SpeechCard({ arg, isLatest }: SpeechCardProps) {
  const color = councilColors[arg.speakerId];
  const member = COUNCIL_MEMBERS.find((m) => m.id === arg.speakerId);
  const side = SIDE[arg.side];
  const fromRight = arg.side === "con";

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 18, x: fromRight ? 12 : -12 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`relative max-w-2xl w-full rounded-2xl glass p-5 ${
        fromRight ? "ml-auto pr-6" : "mr-auto pl-6"
      }`}
      style={{
        borderColor: isLatest ? `${color.hex}44` : undefined,
        boxShadow: isLatest ? `0 0 28px ${color.soft}` : undefined,
      }}
    >
      {/* hue rail */}
      <span
        aria-hidden
        className={`absolute top-4 bottom-4 w-[3px] rounded-full ${
          fromRight ? "right-0" : "left-0"
        }`}
        style={{ background: color.hex, boxShadow: `0 0 10px ${color.soft}` }}
      />

      <div className={`flex items-start gap-3.5 ${fromRight ? "flex-row-reverse" : ""}`}>
        <MemberAvatar
          id={arg.speakerId}
          size="md"
          status={isLatest ? "talking" : "online"}
          glow={isLatest}
        />
        <div className={`flex-1 min-w-0 ${fromRight ? "text-right" : ""}`}>
          <div
            className={`flex items-center gap-2 mb-1.5 flex-wrap ${
              fromRight ? "justify-end" : ""
            }`}
          >
            <span
              className="text-sm font-bold tracking-tight"
              style={{ color: color.hex }}
            >
              {member?.name ?? arg.speakerId}
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: side.soft, color: side.hex }}
            >
              {side.label}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-white/35 font-[var(--font-label)]">
              round {arg.roundNumber}
            </span>
          </div>
          <p className="text-sm text-white/90 leading-relaxed">{arg.text}</p>
        </div>
      </div>
    </motion.div>
  );
}
