"use client";

interface Props {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
}

export default function GraphControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onRecenter,
}: Props) {
  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 glass-strong rounded-full p-1 pointer-events-auto">
      <ControlButton icon="zoom_out" label="Zoom out" onClick={onZoomOut} />
      <span className="px-2 text-[11px] tabular-nums text-white/55 font-[var(--font-label)] font-semibold min-w-[3.4rem] text-center">
        {(zoom * 100).toFixed(0)}%
      </span>
      <ControlButton icon="zoom_in" label="Zoom in" onClick={onZoomIn} />
      <span className="w-px h-5 bg-white/10 mx-0.5" />
      <ControlButton icon="my_location" label="Recenter" onClick={onRecenter} />
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
