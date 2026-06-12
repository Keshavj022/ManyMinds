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
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.99 },
  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
};

/** A small animated sound-wave shown beside a bubble being read aloud. */
function SpeakingWave({ hex }: { hex: string }) {
  return (
    <span
      className="inline-flex items-center gap-[3px] h-3.5"
      aria-label="speaking aloud"
      title="reading this out loud"
    >
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-[2.5px] rounded-full"
          style={{ background: hex }}
          animate={{ height: ["4px", "13px", "6px", "11px", "4px"] }}
          transition={{
            duration: 1.1,
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 0.12,
          }}
        />
      ))}
    </span>
  );
}

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
            className={`relative px-4.5 py-3 text-sm leading-relaxed text-white/95 rounded-3xl shadow-[0_6px_18px_-8px_rgba(224,176,131,0.4)] ${
              grouped ? "rounded-tr-3xl" : "rounded-tr-md"
            }`}
            style={{
              background:
                "linear-gradient(135deg, rgba(224,176,131,0.22) 0%, rgba(216,163,184,0.13) 100%)",
              border: "1px solid rgba(224,176,131,0.16)",
              backdropFilter: "blur(12px)",
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
      <div className="w-10 shrink-0 flex justify-center self-end">
        {!grouped || isTyping ? (
          <MemberAvatar
            id={memberId}
            size="md"
            status={isTyping || speaking ? "talking" : undefined}
            glow={speaking}
            className={speaking ? "animate-pulse-soft" : undefined}
          />
        ) : (
          // A faint connector tick keeps grouped replies visually tied to the
          // friend above them, like a continuing thread.
          <span
            aria-hidden
            className="w-px h-4 rounded-full opacity-40"
            style={{ background: `linear-gradient(${color.hex}, transparent)` }}
          />
        )}
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
          <motion.div
            animate={
              speaking
                ? { boxShadow: `inset 3px 0 0 ${color.hex}, 0 0 24px ${color.soft}` }
                : { boxShadow: `inset 2.5px 0 0 ${color.hex}, 0 0 0px ${color.soft}` }
            }
            transition={{ duration: 0.4 }}
            className={`px-4.5 py-3 text-sm leading-relaxed text-white/90 rounded-3xl ${
              grouped ? "rounded-tl-3xl" : "rounded-tl-md"
            }`}
            style={{
              background: color.soft,
              border: "1px solid rgba(255,255,255,0.05)",
              backdropFilter: "blur(12px)",
            }}
          >
            {isTyping ? <TypingDots memberId={memberId} /> : message.content}
            {speaking && !isTyping && (
              <span className="inline-flex items-center align-middle ml-2 translate-y-[1px]">
                <SpeakingWave hex={color.hex} />
              </span>
            )}
          </motion.div>
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
