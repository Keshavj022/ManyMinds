"use client";

import { CouncilMemberId, councilColors } from "@/lib/design-tokens";

interface TypingDotsProps {
  memberId?: CouncilMemberId;
  className?: string;
}

export default function TypingDots({ memberId, className = "" }: TypingDotsProps) {
  const color = memberId ? councilColors[memberId].hex : "rgba(255,255,255,0.7)";
  return (
    <span
      className={`typing-dots inline-flex items-center ${className}`}
      style={{ color }}
      aria-label="typing"
    >
      <span /><span /><span />
    </span>
  );
}
