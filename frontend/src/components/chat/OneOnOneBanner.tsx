"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";

interface OneOnOneBannerProps {
  memberId: CouncilMemberId;
  onBack: () => void;
}

/**
 * The "we stepped into the kitchen" banner. Visible the whole time a 1:1 is
 * active — tap anywhere on it to rejoin the rest of the room.
 */
export default function OneOnOneBanner({ memberId, onBack }: OneOnOneBannerProps) {
  const member = COUNCIL_MEMBERS.find((m) => m.id === memberId);
  const color = councilColors[memberId];

  return (
    <motion.button
      type="button"
      onClick={onBack}
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group/banner relative w-full mb-3 flex items-center justify-between gap-3 rounded-full pl-1.5 pr-4 py-1.5 border text-left overflow-hidden transition-all hover:brightness-110"
      style={{
        background: color.soft,
        borderColor: `${color.hex}55`,
        boxShadow: `0 0 24px ${color.soft}, inset 0 0 18px ${color.soft}`,
      }}
      title="tap to rejoin everyone"
    >
      {/* A whisper-soft sweep of the friend's color, like a closed door. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-0 opacity-50"
        style={{
          background: `linear-gradient(90deg, ${color.soft}, transparent 60%)`,
        }}
      />
      <span className="relative flex items-center gap-2.5 min-w-0">
        <MemberAvatar id={memberId} size="sm" status="online" />
        <span className="text-xs text-white/85 truncate">
          Just you and{" "}
          <span className="font-bold" style={{ color: color.hex }}>
            {member?.name ?? memberId}
          </span>{" "}
          — the others can&rsquo;t hear you.
        </span>
      </span>
      <span className="relative shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-[var(--font-label)] text-white/50 group-hover/banner:text-white/85 transition-colors">
        <span className="material-symbols-outlined text-[13px] transition-transform group-hover/banner:-translate-x-0.5">
          undo
        </span>
        back to everyone
      </span>
    </motion.button>
  );
}
