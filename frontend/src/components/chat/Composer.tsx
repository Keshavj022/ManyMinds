"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { CouncilMemberId } from "@/lib/design-tokens";
import { useSpeechInput } from "@/lib/use-voice";

interface ComposerProps {
  /** Who the message goes to — colours the focus ring + placeholder. */
  target: CouncilMemberId | "group";
  /** A turn is in flight — sending is paused, typing still allowed. */
  busy: boolean;
  voiceEnabled: boolean;
  voiceUnavailable: boolean;
  onToggleVoice: () => void;
  onSend: (text: string) => void;
}

export default function Composer({
  target,
  busy,
  voiceEnabled,
  voiceUnavailable,
  onToggleVoice,
  onSend,
}: ComposerProps) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Final speech results land in the input — you still press send.
  const handleFinalSpeech = useCallback((text: string) => {
    setValue((prev) => (prev ? `${prev.replace(/\s+$/, "")} ${text}` : text));
  }, []);
  const { supported, listening, start, stop, interim } =
    useSpeechInput(handleFinalSpeech);

  const display = listening && interim ? (value ? `${value} ${interim}` : interim) : value;

  // Autosize up to ~5 rows; stays a pill while single-line.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 5 * 22 + 20)}px`;
  }, [display]);

  const targetMember =
    target === "group" ? null : COUNCIL_MEMBERS.find((m) => m.id === target);
  const accent = target === "group" ? null : councilColors[target];
  const ringColor = accent ? `${accent.hex}59` : "rgba(155,135,216,0.35)";

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    if (listening) stop();
    onSend(text);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSend = value.trim().length > 0 && !busy;

  return (
    <div className="pt-3">
      <div
        className="glass rounded-[28px] px-2 py-2 pl-5 flex items-end gap-2 transition-shadow focus-within:shadow-[0_0_0_2px_var(--composer-ring)]"
        style={
          {
            "--composer-ring": ringColor,
            ...(listening
              ? {
                  boxShadow: `0 0 0 2px ${accent?.hex ?? "#d8a3b8"}66, 0 0 28px ${accent?.soft ?? "rgba(216,163,184,0.25)"}`,
                }
              : null),
          } as React.CSSProperties
        }
      >
        <textarea
          ref={taRef}
          value={display}
          onChange={(e) => {
            if (!listening) setValue(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          readOnly={listening}
          placeholder={
            listening
              ? "Listening — say it like you mean it…"
              : target === "group"
                ? "Say anything — we're all ears"
                : `Just for ${targetMember?.name ?? target}…`
          }
          rows={1}
          className="flex-1 bg-transparent border-0 text-white placeholder:text-white/35 resize-none py-2 focus:outline-none focus:ring-0 text-sm leading-relaxed"
          style={{ background: "transparent", border: "none", boxShadow: "none" }}
        />

        {/* Mic — only on browsers that can hear you. */}
        {supported && (
          <button
            type="button"
            onClick={() => (listening ? stop() : start())}
            className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all ${
              listening
                ? "text-white animate-pulse-soft"
                : "text-white/55 hover:text-white hover:bg-white/[0.06]"
            }`}
            style={
              listening
                ? {
                    background: accent?.soft ?? "rgba(216,163,184,0.18)",
                    boxShadow: `0 0 18px ${accent?.hex ?? "#d8a3b8"}55`,
                  }
                : undefined
            }
            aria-label={listening ? "stop listening" : "speak instead of typing"}
            aria-pressed={listening}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={listening ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              mic
            </span>
          </button>
        )}

        {/* Voice output — hear the council out loud. */}
        <button
          type="button"
          onClick={onToggleVoice}
          className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all ${
            voiceEnabled
              ? "text-[var(--color-warm)] bg-[var(--color-warm-soft)]"
              : "text-white/55 hover:text-white hover:bg-white/[0.06]"
          }`}
          aria-label={voiceEnabled ? "turn their voices off" : "hear them out loud"}
          aria-pressed={voiceEnabled}
          title={
            voiceUnavailable
              ? "voice is taking a break"
              : voiceEnabled
                ? "they'll speak their replies"
                : "hear them out loud"
          }
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={voiceEnabled ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {voiceEnabled ? "volume_up" : "volume_off"}
          </span>
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all ${
            canSend
              ? "text-[#15121d] shadow-[0_0_18px_rgba(216,163,184,0.4)] hover:brightness-110 active:scale-95"
              : "bg-white/[0.05] text-white/30 cursor-not-allowed"
          }`}
          style={
            canSend
              ? {
                  background: accent
                    ? accent.hex
                    : "linear-gradient(135deg, #9b87d8 0%, #d8a3b8 100%)",
                }
              : undefined
          }
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

      <p className="mt-2 text-[10px] text-white/30 font-[var(--font-label)] tracking-[0.18em] uppercase text-center">
        Enter to send · Shift+Enter for a new line
        {supported ? " · tap the mic to talk" : ""}
      </p>
    </div>
  );
}
