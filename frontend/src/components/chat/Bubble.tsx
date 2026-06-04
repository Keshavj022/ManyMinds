"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import TypingDots from "@/components/ui/TypingDots";
import ReactionStrip from "./ReactionStrip";
import type { ChatMessage } from "@/lib/chat-fixtures";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";

interface BubbleProps {
  message: ChatMessage;
  isTyping?: boolean;
}

export default function Bubble({ message, isTyping = false }: BubbleProps) {
  if (message.sender.kind === "user") {
    const userName = message.sender.name;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-row-reverse gap-3"
      >
        <div className="w-9 h-9 shrink-0 rounded-full grid place-items-center text-[#15121d] text-xs font-semibold bg-[var(--color-accent)]">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="max-w-[78%] flex flex-col items-end">
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <span className="text-xs font-bold text-white">
              {userName}
            </span>
            <span className="text-[10px] text-white/35 font-[var(--font-label)] uppercase tracking-wider">
              {message.timestamp}
            </span>
          </div>
          <div
            className="px-4 py-3 rounded-2xl rounded-tr-md text-sm leading-relaxed text-white/95"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(12px)",
            }}
          >
            {message.content}
          </div>
        </div>
      </motion.div>
    );
  }

  if (message.sender.kind !== "member") return null;
  const memberId = message.sender.id;
  const color = councilColors[memberId];
  const member = COUNCIL_MEMBERS.find((m) => m.id === memberId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-row gap-3"
    >
      <MemberAvatar id={memberId} size="md" status="talking" />
      <div className="max-w-[78%] flex flex-col items-start">
        <div className="flex items-baseline gap-2 mb-1 px-1">
          <span
            className="text-xs font-bold"
            style={{ color: color.hex }}
          >
            {member?.name ?? memberId}
          </span>
          {member?.role && (
            <span className="text-[10px] text-white/35 font-[var(--font-label)] uppercase tracking-wider">
              {member.role}
            </span>
          )}
          {!isTyping && (
            <span className="text-[10px] text-white/30 font-[var(--font-label)] uppercase tracking-wider">
              {message.timestamp}
            </span>
          )}
        </div>
        <div
          className="px-4 py-3 rounded-2xl rounded-tl-md text-sm leading-relaxed text-white/90"
          style={{
            background: color.soft,
            border: "1px solid rgba(255,255,255,0.06)",
            borderLeft: `2px solid ${color.hex}`,
            backdropFilter: "blur(10px)",
          }}
        >
          {isTyping ? (
            <TypingDots memberId={memberId} />
          ) : (
            message.content
          )}
        </div>
        {message.reactions && message.reactions.length > 0 && !isTyping && (
          <ReactionStrip reactions={message.reactions} />
        )}
      </div>
    </motion.div>
  );
}
