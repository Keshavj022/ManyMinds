"use client";

import { motion } from "framer-motion";
import { CouncilMemberId, councilColors, COUNCIL_MEMBERS } from "@/lib/design-tokens";
import MemberAvatar from "@/components/ui/MemberAvatar";

interface TurnIndicatorProps {
  /** Either a council member id or "user". */
  player: CouncilMemberId | "user";
  /** Optional display name override. */
  name?: string;
  /** Subtitle below name — eg "Their turn". */
  subtitle?: string;
  size?: "md" | "lg";
  className?: string;
}

export default function TurnIndicator({
  player,
  name,
  subtitle = "Their turn",
  size = "md",
  className = "",
}: TurnIndicatorProps) {
  const isUser = player === "user";
  const memberId = isUser ? null : (player as CouncilMemberId);
  const c = memberId ? councilColors[memberId] : null;
  const displayName =
    name ?? (memberId ? COUNCIL_MEMBERS.find((m) => m.id === memberId)?.name : "You") ?? "You";

  const dim = size === "lg" ? "w-28 h-28" : "w-20 h-20";

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <motion.div
        className={`relative ${dim} grid place-items-center rounded-full`}
        style={{
          background: c ? `radial-gradient(circle at 30% 30%, ${c.hex}55, transparent 70%)` : "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 70%)",
        }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${c ? c.hex : "rgba(255,255,255,0.5)"}`,
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.85, 0.3, 0.85] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {isUser ? (
          <div
            className={`relative grid place-items-center ${size === "lg" ? "w-20 h-20 text-2xl" : "w-14 h-14 text-base"} rounded-full font-bold font-[var(--font-headline)]`}
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, rgba(13,11,20,0.85) 80%)",
              color: "#0d0b14",
              boxShadow: "0 0 24px rgba(255,255,255,0.4), inset 0 0 12px rgba(0,0,0,0.35)",
            }}
          >
            <span>You</span>
          </div>
        ) : (
          <MemberAvatar id={memberId!} size={size === "lg" ? "xl" : "lg"} />
        )}
      </motion.div>
      <div className="text-center">
        <div className="text-sm font-bold text-white font-[var(--font-headline)]">{displayName}</div>
        <div
          className="text-[10px] font-bold uppercase tracking-[0.25em]"
          style={{ color: c ? c.hex : "rgba(255,255,255,0.6)" }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
