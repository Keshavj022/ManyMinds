"use client";

import { ChangeEvent } from "react";
import { motion } from "framer-motion";
import { councilColors, CouncilMemberId } from "@/lib/design-tokens";
import type { BigFiveDimension } from "@/lib/onboarding";
import { TRAIT_LABELS } from "./types";

interface Props {
  memberId: CouncilMemberId;
  dimension: BigFiveDimension;
  value: number;
  onChange: (next: number) => void;
}

export default function TraitSlider({
  memberId,
  dimension,
  value,
  onChange,
}: Props) {
  const color = councilColors[memberId];
  const labels = TRAIT_LABELS[dimension];

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    onChange(Number(e.target.value));
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end gap-3">
        <label className="text-sm font-semibold text-white">{labels.name}</label>
        <span className="text-xs text-white/55 font-[var(--font-label)] tabular-nums">
          {value}%
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-white/[0.06] border border-white/8">
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full"
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          style={{
            background: `linear-gradient(90deg, ${color.hex}55, ${color.hex})`,
            boxShadow: `0 0 12px ${color.soft}`,
          }}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={handleInput}
          aria-label={labels.name}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ appearance: "none" }}
        />
        {/* Custom thumb — pure CSS so the range input feels native but on-brand */}
        <div
          aria-hidden
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full pointer-events-none border-2 border-white/85"
          style={{
            left: `calc(${value}% - 8px)`,
            background: color.hex,
            boxShadow: `0 0 12px ${color.hex}`,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-wider font-[var(--font-label)] font-semibold text-white/35">
        <span>{labels.low}</span>
        <span>{labels.high}</span>
      </div>
    </div>
  );
}
