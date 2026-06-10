"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import TypingDots from "@/components/ui/TypingDots";
import type { ChatMessage } from "@/lib/chat-fixtures";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";

interface BubbleProps {
  message: ChatMessage;
  /** Render the typing dots instead of content (member staging). */
  isTyping?: boolean;
  /** Continuation of the previous message from the same voice — tighter, no header. */
  grouped?: boolean;
  /** This member is being read out loud right now. */
  speaking?: boolean;
}

const reveal = {
  initial: { opacity: 0, y: 14, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

export default function Bubble({
  message,
  isTyping = false,
  grouped = false,
  speaking = false,
}: BubbleProps) {
  if (message.sender.kind === "user") {
    return (
      <motion.div
        layout="position"
        {...reveal}
        className={`group/msg flex flex-row-reverse items-end gap-2 ${
          grouped ? "mt-1" : "mt-5"
        }`}
      >
        <div className="max-w-[82%] sm:max-w-[72%] flex flex-col items-end">
          <div
            className={`px-4.5 py-3 text-sm leading-relaxed text-white/95 rounded-3xl ${
              grouped ? "" : "rounded-tr-lg"
            }`}
            style={{
              background:
                "linear-gradient(135deg, rgba(224,176,131,0.18) 0%, rgba(216,163,184,0.10) 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(10px)",
            }}
          >
            {message.content}
          </div>
        </div>
        {message.timestamp && (
          <span className="pb-1 text-[10px] text-white/30 font-[var(--font-label)] tracking-wide opacity-0 group-hover/msg:opacity-100 transition-opacity duration-300 select-none whitespace-nowrap">
            {message.timestamp}
          </span>
        )}
      </motion.div>
    );
  }

  if (message.sender.kind !== "member") return null;
  const memberId = message.sender.id;
  const color = councilColors[memberId];
  const member = COUNCIL_MEMBERS.find((m) => m.id === memberId);

  return (
    <motion.div
      layout="position"
      {...reveal}
      className={`group/msg flex items-end gap-3 ${grouped ? "mt-1" : "mt-5"}`}
    >
      {/* Avatar column — only on the first message of a run. */}
      <div className="w-10 shrink-0 flex justify-center">
        {!grouped || isTyping ? (
          <MemberAvatar
            id={memberId}
            size="md"
            status={isTyping || speaking ? "talking" : undefined}
            glow={speaking}
            className={speaking ? "animate-pulse-soft" : undefined}
          />
        ) : null}
      </div>

      <div className="max-w-[82%] sm:max-w-[72%] flex flex-col items-start min-w-0">
        {!grouped && (
          <div className="flex items-baseline gap-2 mb-1.5 px-1">
            <span className="text-xs font-bold" style={{ color: color.hex }}>
              {member?.name ?? memberId}
            </span>
            {member?.role && (
              <span className="text-[10px] text-white/30 font-[var(--font-label)] uppercase tracking-[0.18em]">
                {member.role}
              </span>
            )}
          </div>
        )}
        <div className="flex items-end gap-2 max-w-full">
          <div
            className={`px-4.5 py-3 text-sm leading-relaxed text-white/90 rounded-3xl ${
              grouped ? "" : "rounded-tl-lg"
            }`}
            style={{
              background: color.soft,
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow: `inset 2.5px 0 0 ${color.hex}`,
              backdropFilter: "blur(10px)",
            }}
          >
            {isTyping ? <TypingDots memberId={memberId} /> : message.content}
          </div>
          {!isTyping && message.timestamp && (
            <span className="pb-1 text-[10px] text-white/30 font-[var(--font-label)] tracking-wide opacity-0 group-hover/msg:opacity-100 transition-opacity duration-300 select-none whitespace-nowrap">
              {message.timestamp}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
