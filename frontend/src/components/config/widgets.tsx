"use client";

import { motion } from "framer-motion";

/** Real backend connection state for the council config page — never faked. */
export type LoadState = "loading" | "ready" | "error";

/**
 * Honest connection indicator. Reflects only the live result of the
 * `GET /api/v1/council/members` fetch — loading, connected, or offline.
 * It is not a fabricated status and carries no invented "last edited" data.
 */
export function ConnectionPill({ state }: { state: LoadState }) {
  const map: Record<LoadState, { dot: string; label: string; tone: string }> = {
    loading: {
      dot: "#e0b083",
      label: "Reaching the council…",
      tone: "var(--color-warm-soft)",
    },
    ready: {
      dot: "#7fb5d4",
      label: "Live from the council",
      tone: "rgba(127, 181, 212, 0.12)",
    },
    error: {
      dot: "#d8a3b8",
      label: "Council offline",
      tone: "rgba(216, 163, 184, 0.12)",
    },
  };
  const cfg = map[state];
  return (
    <span
      role="status"
      className="inline-flex items-center gap-2 pl-2.5 pr-3 py-1 rounded-full text-[11px] font-semibold font-[var(--font-label)] border border-white/[0.06] shrink-0"
      style={{ background: cfg.tone, color: "rgba(255,255,255,0.7)" }}
    >
      <motion.span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: cfg.dot }}
        animate={state === "loading" ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
        transition={
          state === "loading"
            ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
      />
      {cfg.label}
    </span>
  );
}

/** A single "house rule" toggle, tinted in the active member's hue. */
export function BoundaryToggle({
  active,
  label,
  hint,
  color,
  onToggle,
}: {
  active: boolean;
  label: string;
  hint: string;
  color: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className="w-full flex items-center gap-4 p-3.5 pl-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] text-left transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-white/45 mt-0.5">{hint}</p>
      </div>
      <span
        className="relative inline-flex w-11 h-6 rounded-full shrink-0 transition-colors"
        style={{
          background: active ? color : "rgba(255,255,255,0.08)",
        }}
      >
        <motion.span
          animate={{ x: active ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white shadow-md"
        />
      </span>
    </button>
  );
}
