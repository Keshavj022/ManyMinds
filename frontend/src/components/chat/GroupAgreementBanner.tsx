"use client";

import { motion } from "framer-motion";
import MemberAvatar from "@/components/ui/MemberAvatar";
import type { CouncilMemberId } from "@/lib/design-tokens";

interface GroupAgreementBannerProps {
  members: ReadonlyArray<CouncilMemberId>;
  text: string;
}

export default function GroupAgreementBanner({
  members,
  text,
}: GroupAgreementBannerProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="my-1 flex items-center gap-3 self-center max-w-md mx-auto px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md animate-pulse-soft"
    >
      <div className="flex -space-x-2">
        {members.map((m) => (
          <MemberAvatar key={m} id={m} size="xs" glow />
        ))}
      </div>
      <span className="text-[11px] text-white/70 font-[var(--font-label)] tracking-wide">
        {text}
      </span>
    </motion.div>
  );
}
