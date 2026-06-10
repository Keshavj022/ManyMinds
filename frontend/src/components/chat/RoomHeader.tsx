"use client";

import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import type { Environment } from "@/lib/environments";

interface RoomHeaderProps {
  env: Environment;
  onOpenScene: () => void;
  onFreshStart: () => void;
}

/**
 * Slim header — the five of them, where you all are, and two quiet actions.
 */
export default function RoomHeader({ env, onOpenScene, onFreshStart }: RoomHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 pb-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="hidden sm:flex -space-x-2.5 shrink-0">
          {COUNCIL_MEMBERS.map((m) => (
            <MemberAvatar
              key={m.id}
              id={m.id}
              size="sm"
              glow={false}
              className="animate-pulse-soft"
            />
          ))}
        </span>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white font-[var(--font-headline)] tracking-tight truncate">
            The living room
          </h1>
          <p className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] text-white/55 truncate">
            <span className="material-symbols-outlined text-[13px] align-[-2px] mr-1">
              {env.icon}
            </span>
            {env.name.toLowerCase()} · {env.mood}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenScene}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold bg-white/[0.04] border border-white/[0.06] text-white/75 hover:text-white hover:bg-white/[0.07] hover:-translate-y-0.5 transition-all"
        >
          <span className="material-symbols-outlined text-[15px]">visibility</span>
          <span className="hidden sm:inline">Step inside</span>
        </button>
        <button
          type="button"
          onClick={onFreshStart}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/55 hover:text-white bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:-translate-y-0.5 transition-all"
          aria-label="start a fresh page"
          title="fresh page — same friends"
        >
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
        </button>
      </div>
    </div>
  );
}
