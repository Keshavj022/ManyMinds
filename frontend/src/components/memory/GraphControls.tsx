"use client";

import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";

interface Props {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onCenterOnMember: (memberId: string) => void;
}

export default function GraphControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onCenterOnMember,
}: Props) {
  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-3 pointer-events-auto">
      {/* Zoom + recenter */}
      <div className="flex items-center gap-1 glass-strong rounded-full p-1">
        <ControlButton icon="zoom_out" label="Zoom out" onClick={onZoomOut} />
        <span className="px-2 text-[11px] tabular-nums text-white/55 font-[var(--font-label)] font-semibold min-w-[3.4rem] text-center">
          {(zoom * 100).toFixed(0)}%
        </span>
        <ControlButton icon="zoom_in" label="Zoom in" onClick={onZoomIn} />
        <span className="w-px h-5 bg-white/10 mx-0.5" />
        <ControlButton icon="my_location" label="Recenter" onClick={onRecenter} />
      </div>

      {/* Recenter on member */}
      <div className="glass-strong rounded-full p-1.5 flex items-center gap-1.5">
        <span className="pl-2 pr-1 text-[10px] uppercase tracking-wider font-[var(--font-label)] font-semibold text-white/40 whitespace-nowrap">
          Focus on
        </span>
        {COUNCIL_MEMBERS.map((m) => (
          <button
            key={m.id}
            type="button"
            title={`Focus on ${m.name}'s threads`}
            onClick={() => onCenterOnMember(m.id)}
            className="w-7 h-7 rounded-full grid place-items-center text-[11px] font-bold text-[#0d0b14] hover:scale-110 transition-transform"
            style={{
              background: `linear-gradient(135deg, ${councilColors[m.id].hex}, rgba(13,11,20,0.6))`,
              boxShadow: `0 0 10px ${councilColors[m.id].soft}`,
            }}
          >
            {m.name.charAt(0)}
          </button>
        ))}
      </div>
    </div>
  );
}

function ControlButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-8 h-8 grid place-items-center rounded-full text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}
