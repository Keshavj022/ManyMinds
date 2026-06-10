"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { resolveActiveNav } from "./nav-config";
import { useEnvironment } from "./EnvironmentProvider";

/** Amber "candle-light" accent for active states (matches --color-warm). */
const WARM = "#e0b083";

interface HeaderProps {
  /** Mobile-only: opens the drawer Sidebar. */
  onMenuOpen: () => void;
}

export default function Header({ onMenuOpen }: HeaderProps) {
  const pathname = usePathname();
  const active = resolveActiveNav(pathname);
  // Time-bound label is computed client-side so SSR + hydration agree.
  const [todayLabel, setTodayLabel] = useState("Today");
  useEffect(() => {
    setTodayLabel(formatToday());
  }, []);

  return (
    <header
      className="sticky top-0 z-30 h-16 lg:h-20 px-4 sm:px-6 lg:px-10 flex items-center gap-3 backdrop-blur-xl"
      style={{
        background:
          "linear-gradient(180deg, rgba(19,16,23,0.85) 0%, rgba(19,16,23,0.4) 100%)",
      }}
    >
      {/* Mobile menu trigger */}
      <button
        type="button"
        onClick={onMenuOpen}
        className="lg:hidden text-white/70 hover:text-white p-2 -ml-2 rounded-full hover:bg-white/[0.06] transition-colors"
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>

      {/* Title block */}
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl font-bold text-white font-[var(--font-headline)] tracking-tight truncate">
          {active.name}
        </h1>
        <p className="hidden sm:block text-xs text-white/45 truncate">
          {todayLabel} · {active.hint}
        </p>
      </div>

      {/* Right-side: where you are + who's here */}
      <div className="flex items-center gap-3">
        <EnvironmentSwitcher />
        {/* On small screens the sidebar (and its room dots) are hidden,
            so the council peeks in here instead. */}
        <div className="lg:hidden flex -space-x-2" aria-hidden>
          {COUNCIL_MEMBERS.slice(0, 3).map((member, i) => (
            <span
              key={member.id}
              className="animate-pulse-soft inline-flex rounded-full ring-2 ring-[#131017]"
              style={{ animationDelay: `${i * 0.8}s` }}
            >
              <MemberAvatar id={member.id} size="xs" glow={false} />
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

/* ----------------------------- helpers / parts ------------------------------ */

function formatToday(): string {
  const d = new Date();
  const month = d.toLocaleString("en-US", { month: "long" });
  const day = d.getDate();
  const weekday = d.toLocaleString("en-US", { weekday: "long" });
  return `${weekday}, ${month} ${day}`;
}

/* --------------------------- Environment switcher --------------------------- */

function EnvironmentSwitcher() {
  const { current, setEnvironmentId, all } = useEnvironment();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-10 px-3 sm:px-4 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-[rgba(224,176,131,0.07)] flex items-center gap-2 text-sm text-white/85 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="material-symbols-outlined text-[18px]"
          style={{ color: WARM }}
        >
          {current.icon}
        </span>
        <span className="hidden sm:inline font-medium">{current.name}</span>
        <span className="material-symbols-outlined text-[16px] text-white/45">
          expand_more
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-64 glass-strong rounded-2xl p-2"
            role="menu"
          >
            <div className="px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-white/40 font-[var(--font-label)] font-semibold">
              Step into…
            </div>
            {all.map((env) => {
              const isActive = env.id === current.id;
              return (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => {
                    setEnvironmentId(env.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isActive
                      ? "bg-[rgba(224,176,131,0.08)]"
                      : "hover:bg-white/[0.05]"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{
                      color: isActive ? WARM : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {env.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-white">
                      {env.name}
                    </span>
                    <span className="block text-[11px] text-white/45">
                      {env.mood}
                    </span>
                  </span>
                  {isActive && (
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ color: WARM }}
                    >
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
