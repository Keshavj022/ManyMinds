"use client";

import { useState } from "react";
import { ENVIRONMENTS, type EnvironmentId } from "@/lib/environments";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";

type Mode = "group" | "one_on_one";

interface ChatHeaderStripProps {
  mode: Mode;
  oneOnOneTarget: CouncilMemberId;
  voiceOn: boolean;
  currentEnv: EnvironmentId;
  onToggleVoice: () => void;
  onSwitchMode: (mode: Mode) => void;
  onChangeOneOnOne: (id: CouncilMemberId) => void;
  onClearChat: () => void;
}

export default function ChatHeaderStrip({
  mode,
  oneOnOneTarget,
  voiceOn,
  currentEnv,
  onToggleVoice,
  onSwitchMode,
  onChangeOneOnOne,
  onClearChat,
}: ChatHeaderStripProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeEnv = ENVIRONMENTS.find((e) => e.id === currentEnv) ?? ENVIRONMENTS[0];

  return (
    <div className="flex flex-col gap-3 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-white/5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-white/[0.05] p-1 border border-white/10">
            <button
              type="button"
              onClick={() => onSwitchMode("group")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                mode === "group"
                  ? "bg-white text-[#15121d]"
                  : "text-white/65 hover:text-white"
              }`}
            >
              Group
            </button>
            <button
              type="button"
              onClick={() => onSwitchMode("one_on_one")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                mode === "one_on_one"
                  ? "bg-white text-[#15121d]"
                  : "text-white/65 hover:text-white"
              }`}
            >
              1:1
            </button>
          </div>

          {mode === "one_on_one" && (
            <select
              value={oneOnOneTarget}
              onChange={(e) => onChangeOneOnOne(e.target.value as CouncilMemberId)}
              className="text-xs font-semibold rounded-full px-3 py-1 bg-white/[0.04] border border-white/10 text-white cursor-pointer max-w-[55vw] sm:max-w-none"
            >
              {COUNCIL_MEMBERS.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#100e16]">
                  {m.name} — {m.role}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleVoice}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
              voiceOn
                ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                : "bg-white/[0.04] text-white/65 border border-white/10 hover:bg-white/[0.07]"
            }`}
            aria-pressed={voiceOn}
          >
            <span className="material-symbols-outlined text-[14px]">
              {voiceOn ? "mic" : "mic_off"}
            </span>
            Voice {voiceOn ? "on" : "off"}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/65 hover:text-white hover:bg-white/[0.07] transition-colors border border-white/10"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-1 w-44 rounded-xl border border-white/10 bg-[#0d0b14]/95 backdrop-blur-xl shadow-2xl py-1 z-30"
              >
                <MenuItem
                  icon="restart_alt"
                  label="Clear chat"
                  onClick={() => {
                    setMenuOpen(false);
                    onClearChat();
                  }}
                />
                <MenuItem
                  icon="download"
                  label="Export transcript"
                  onClick={() => setMenuOpen(false)}
                />
                <MenuItem
                  icon="share"
                  label="Share session"
                  onClick={() => setMenuOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-white/40 font-[var(--font-label)] uppercase tracking-wider">
        <span className="material-symbols-outlined text-[14px]">{activeEnv.icon}</span>
        you&rsquo;re in the {activeEnv.name.toLowerCase()} · {activeEnv.mood}
      </div>
    </div>
  );
}

function MenuItem({
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
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/85 hover:bg-white/[0.07] transition-colors"
    >
      <span className="material-symbols-outlined text-[16px] text-white/55">{icon}</span>
      {label}
    </button>
  );
}
