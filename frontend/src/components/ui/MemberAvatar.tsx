"use client";

import { CouncilMemberId, councilColors } from "@/lib/design-tokens";

interface MemberAvatarProps {
  id: CouncilMemberId;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "away" | "offline" | "talking" | "thinking";
  initial?: string;
  glow?: boolean;
  className?: string;
}

const sizeMap = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
};
const ringMap = {
  xs: "ring-1",
  sm: "ring-1",
  md: "ring-2",
  lg: "ring-2",
  xl: "ring-[3px]",
};

export default function MemberAvatar({
  id,
  size = "md",
  status,
  initial,
  glow = true,
  className = "",
}: MemberAvatarProps) {
  const member = councilColors[id];
  const letter = initial ?? id.charAt(0).toUpperCase();

  const statusColor =
    status === "online" || status === "talking"
      ? member.hex
      : status === "thinking"
      ? "#fbbf24"
      : status === "away"
      ? "#94a3b8"
      : "#52525b";

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`relative grid place-items-center rounded-full font-bold font-[var(--font-headline)] ${sizeMap[size]} ${ringMap[size]}`}
        style={{
          background: `linear-gradient(135deg, ${member.hex} 0%, rgba(13,11,20,0.85) 80%)`,
          boxShadow: glow ? `0 0 24px ${member.soft}, inset 0 0 12px rgba(0,0,0,0.35)` : undefined,
          color: "#0d0b14",
          // @ts-expect-error tailwind ring var
          "--tw-ring-color": member.soft,
        }}
      >
        <span className="drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">{letter}</span>
        {status === "talking" && (
          <span className="absolute inset-0 rounded-full animate-pulse-soft" style={{ boxShadow: `0 0 16px ${member.hex}`, opacity: 0.4 }} />
        )}
      </div>
      {status && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
          style={{ background: statusColor, borderColor: "#08070d" }}
        />
      )}
    </div>
  );
}
