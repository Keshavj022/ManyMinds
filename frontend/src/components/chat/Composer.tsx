"use client";

import { useEffect, useRef, useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";

interface ComposerProps {
  target: CouncilMemberId | "group";
  onChangeTarget: () => void;
  onSend: (text: string) => void;
  onToast: (message: string) => void;
}

export default function Composer({
  target,
  onChangeTarget,
  onSend,
  onToast,
}: ComposerProps) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Autosize up to 6 rows
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxHeight = 6 * 22 + 24; // approx 6 rows
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
  }, [value]);

  const targetMember = target === "group" ? null : COUNCIL_MEMBERS.find((m) => m.id === target);
  const targetColor = target === "group" ? null : councilColors[target];

  const submit = () => {
    const t = value.trim();
    if (!t) return;
    onSend(t);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="pt-3">
      <GlassCard
        variant="aurora"
        className="rounded-2xl p-2.5 transition-shadow focus-within:shadow-[0_0_0_2px_rgba(155,135,216,0.35)]"
      >
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1 pb-1">
            <button
              type="button"
              onClick={() => onToast("Image upload — coming soon")}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="attach image"
            >
              <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
            </button>
            <button
              type="button"
              onClick={() => onToast("Voice input — coming soon")}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="record voice"
            >
              <span className="material-symbols-outlined text-[20px]">mic</span>
            </button>
          </div>

          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              target === "group"
                ? "What's on your mind?"
                : `Say something to ${targetMember?.name ?? target}…`
            }
            rows={1}
            className="flex-1 bg-transparent border-0 text-white placeholder:text-white/35 resize-none py-2.5 px-1 focus:outline-none focus:ring-0 focus:shadow-none text-sm leading-relaxed"
            style={{
              background: "transparent",
              border: "none",
              boxShadow: "none",
            }}
          />

          <div className="flex flex-col items-end gap-1 pb-1">
            <button
              type="button"
              onClick={onChangeTarget}
              className="text-[11px] font-semibold rounded-full px-2.5 py-1 border transition-all flex items-center gap-1"
              style={{
                color: targetColor?.hex ?? "rgba(255,255,255,0.85)",
                background: targetColor?.soft ?? "rgba(255,255,255,0.05)",
                borderColor: targetColor?.hex ?? "rgba(255,255,255,0.12)",
              }}
              title="Click to retarget"
            >
              <span className="material-symbols-outlined text-[12px]">arrow_drop_down</span>
              To: {targetMember?.name ?? "Group"}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!value.trim()}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                value.trim()
                  ? "aurora-gradient text-[#0d0b14] shadow-[0_0_18px_rgba(216,163,184,0.45)] hover:brightness-110 active:scale-95"
                  : "bg-white/[0.05] text-white/35 cursor-not-allowed"
              }`}
              aria-label="send"
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                send
              </span>
            </button>
          </div>
        </div>
      </GlassCard>

      <p className="mt-2 text-[10px] text-white/35 font-[var(--font-label)] tracking-wider uppercase text-center">
        Shift+Enter for new line · Space to start voice · Cmd+K for commands
      </p>
    </div>
  );
}
