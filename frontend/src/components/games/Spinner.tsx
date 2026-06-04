"use client";

import { motion } from "framer-motion";
import { CouncilMemberId, councilColors } from "@/lib/design-tokens";

interface SpinnerProps {
  memberId?: CouncilMemberId;
  size?: number;
  active?: boolean;
}

export default function Spinner({ memberId, size = 36, active = true }: SpinnerProps) {
  const color = memberId ? councilColors[memberId].hex : "#ffffff";
  return (
    <motion.div
      className="rounded-full"
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}40`,
        borderTopColor: color,
      }}
      animate={active ? { rotate: 360 } : { rotate: 0 }}
      transition={active ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0 }}
      aria-hidden
    />
  );
}
