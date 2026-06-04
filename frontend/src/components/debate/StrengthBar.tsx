"use client";

interface StrengthBarProps {
  value: number; // 0..1
  accent?: string;
}

export default function StrengthBar({ value, accent = "#9b87d8" }: StrengthBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;

  // Gradient: amber (low) → green (high)
  const tint =
    value > 0.85
      ? "#4ade80"
      : value > 0.75
      ? "#a3e635"
      : value > 0.6
      ? "#fbbf24"
      : "#f97316";

  return (
    <div className="w-full flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${accent}, ${tint})`,
            boxShadow: `0 0 8px ${tint}88`,
          }}
        />
      </div>
      <span
        className="text-[10px] font-bold font-[var(--font-label)] uppercase tracking-wider"
        style={{ color: tint }}
      >
        {Math.round(pct)}%
      </span>
    </div>
  );
}
