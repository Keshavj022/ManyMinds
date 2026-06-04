"use client";

interface EnvironmentChipProps {
  id: string;
  name: string;
  icon: string;
  mood: string;
  active: boolean;
  onClick: () => void;
}

export default function EnvironmentChip({
  name,
  icon,
  mood,
  active,
  onClick,
}: EnvironmentChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 flex items-center gap-2 ${
        active
          ? "bg-white text-[#0d0b14] shadow-[0_0_24px_rgba(216,163,184,0.4)]"
          : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
      <span>{name}</span>
      {active && (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-widest text-white/40 whitespace-nowrap font-[var(--font-label)]">
          {mood}
        </span>
      )}
    </button>
  );
}
