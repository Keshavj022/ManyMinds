"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { DebateArgument } from "@/lib/debate-fixtures";

interface SpotlightProps {
  arg: DebateArgument | null;
  empty?: string;
}

function useLiveTyped(text: string, speed = 18) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!text) {
      setOut("");
      return;
    }
    setOut("");
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(timer);
    }, speed);
    return () => window.clearInterval(timer);
  }, [text, speed]);
  return out;
}

export default function Spotlight({ arg, empty }: SpotlightProps) {
  const live = useLiveTyped(arg?.text ?? "");

  if (!arg) {
    return (
      <div className="rounded-3xl border border-white/8 bg-white/[0.02] backdrop-blur-md p-6 text-center text-white/55 text-sm">
        {empty ?? "Waiting for the next speaker."}
      </div>
    );
  }

  const member = COUNCIL_MEMBERS.find((m) => m.id === arg.speakerId);
  const color = councilColors[arg.speakerId];
  const sideLabel = arg.side === "pro" ? "Pro" : "Con";
  const sideColor = arg.side === "pro" ? "#4ade80" : "#f87171";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-5 border backdrop-blur-md flex items-start gap-4"
      style={{
        background: `linear-gradient(135deg, ${color.soft}, rgba(13,11,20,0.85))`,
        borderColor: `${color.hex}55`,
      }}
    >
      <MemberAvatar id={arg.speakerId} size="xl" status="talking" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span
            className="font-bold text-lg font-[var(--font-headline)]"
            style={{ color: color.hex }}
          >
            {member?.name}
          </span>
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${sideColor}22`, color: sideColor }}
          >
            arguing {sideLabel}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-white/45 font-[var(--font-label)]">
            round {arg.roundNumber}
          </span>
        </div>
        <p className="text-sm text-white/90 leading-relaxed">
          {live}
          {live.length < arg.text.length && (
            <span className="inline-block w-1.5 h-4 bg-white/70 ml-0.5 align-middle animate-pulse-soft" />
          )}
        </p>
      </div>
    </motion.div>
  );
}
