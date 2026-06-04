"use client";

import { motion } from "framer-motion";
import { STARTER_PROMPTS } from "@/lib/chat-fixtures";

interface EmptyStateProps {
  onPick: (label: string) => void;
}

export default function EmptyState({ onPick }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl md:text-5xl font-[var(--font-headline)] font-bold aurora-text tracking-tight"
      >
        What&rsquo;s on your mind?
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-3 text-sm text-white/55 max-w-md leading-relaxed"
      >
        The council is here. Pull up a seat. They&rsquo;ll listen first, then jump in.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-8 flex flex-wrap justify-center gap-2 max-w-lg"
      >
        {STARTER_PROMPTS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPick(p.label)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border border-white/10 bg-white/[0.04] text-white/85 hover:text-white hover:bg-white/[0.07] hover:scale-[1.03] transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-white/55">
              {p.icon}
            </span>
            {p.label}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
