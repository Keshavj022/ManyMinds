"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SectionHeaderProps {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  className?: string;
}

export default function SectionHeader({
  kicker,
  title,
  subtitle,
  align = "center",
  className = "",
}: SectionHeaderProps) {
  const alignCls = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`${alignCls} max-w-3xl ${className}`}
    >
      {kicker && (
        <div className="inline-flex items-center gap-2 mb-5">
          <span className="h-px w-8 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <p className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-semibold text-white/55">
            {kicker}
          </p>
          <span className="h-px w-8 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
      )}
      <h2 className="font-[var(--font-headline)] font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight text-white leading-[1.05]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-base md:text-lg text-white/60 leading-relaxed">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
