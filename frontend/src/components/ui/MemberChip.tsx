"use client";

import { CouncilMemberId, councilColors } from "@/lib/design-tokens";
import MemberAvatar from "./MemberAvatar";

interface MemberChipProps {
  id: CouncilMemberId;
  name: string;
  role?: string;
  active?: boolean;
  /**
   * When provided, the chip renders as an interactive `<button>` and calls
   * this on click. When omitted, it renders as a presentational `<div>` so
   * it can safely live inside a parent `<button>` / `<a>` without producing
   * an invalid nested-interactive DOM (the browser logs a hydration error).
   */
  onClick?: () => void;
  className?: string;
}

export default function MemberChip({
  id,
  name,
  role,
  active,
  onClick,
  className = "",
}: MemberChipProps) {
  const c = councilColors[id];

  const baseClass = `group flex items-center gap-3 rounded-full pl-1.5 pr-4 py-1.5 border transition-all duration-300 ${
    active ? "scale-[1.02]" : "hover:scale-[1.01]"
  } ${className}`;

  const baseStyle = {
    background: active ? c.soft : "rgba(255,255,255,0.03)",
    borderColor: active ? c.hex : "rgba(255,255,255,0.08)",
    color: c.hex,
  };

  const inner = (
    <>
      <MemberAvatar id={id} size="sm" glow={active} />
      <span className="text-left leading-tight">
        <span className="block text-xs font-bold text-white">{name}</span>
        {role && (
          <span className="block text-[10px] text-white/50 uppercase tracking-wider">
            {role}
          </span>
        )}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClass} style={baseStyle}>
        {inner}
      </button>
    );
  }
  return (
    <div className={baseClass} style={baseStyle}>
      {inner}
    </div>
  );
}
