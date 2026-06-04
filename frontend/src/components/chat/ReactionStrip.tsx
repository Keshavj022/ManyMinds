"use client";

import { useState } from "react";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import type { Reaction } from "@/lib/chat-fixtures";

interface ReactionStripProps {
  reactions: ReadonlyArray<Reaction>;
}

export default function ReactionStrip({ reactions }: ReactionStripProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="mt-1 flex flex-wrap gap-1 px-1">
      {reactions.map((reaction, i) => {
        const member = COUNCIL_MEMBERS.find((m) => m.id === reaction.memberId);
        const color = councilColors[reaction.memberId];
        const isHovered = hovered === i;

        return (
          <div
            key={`${reaction.emoji}-${reaction.memberId}-${i}`}
            className="relative"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-all hover:scale-105"
              style={{
                background: color.soft,
                border: `1px solid ${color.hex}33`,
                color: color.hex,
              }}
            >
              <span className="text-[12px] leading-none">{reaction.emoji}</span>
              <span className="font-semibold leading-none">
                {member?.name ?? reaction.memberId}
              </span>
            </button>
            {isHovered && (
              <span
                role="tooltip"
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded-md bg-black/85 px-2 py-1 text-[10px] text-white/85 font-[var(--font-label)] tracking-wide"
              >
                {member?.name} reacted {reaction.emoji}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
