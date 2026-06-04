"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import { resolveActiveNav } from "./nav-config";
import { useEnvironment } from "./EnvironmentProvider";

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
    <header className="sticky top-0 z-30 h-20 px-4 sm:px-6 lg:px-8 flex items-center gap-4 glass-strong border-b border-white/8">
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
      <div className="min-w-0 flex-1 lg:flex-initial">
        <h1 className="text-lg sm:text-xl font-bold text-white font-[var(--font-headline)] tracking-tight truncate">
          {active.name}
        </h1>
        <p className="hidden sm:block text-xs text-white/45 truncate">
          {todayLabel} · {active.hint}
        </p>
      </div>

      {/* Mood widget — center, md+ */}
      <div className="hidden md:flex flex-1 justify-center">
        <CouncilMoodWidget />
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-2 ml-auto md:ml-0">
        <EnvironmentSwitcher />
        <IconButton icon="search" label="Search" hideOnMobile />
        <IconButton
          icon="notifications"
          label="Notifications"
          badge
          hideOnMobile
        />
        <IconButton icon="person_add" label="Invite a friend" />
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

function IconButton({
  icon,
  label,
  badge = false,
  hideOnMobile = false,
  onClick,
}: {
  icon: string;
  label: string;
  badge?: boolean;
  hideOnMobile?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`relative w-10 h-10 rounded-full bg-white/[0.04] border border-white/8 grid place-items-center text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors ${
        hideOnMobile ? "hidden sm:grid" : ""
      }`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      {badge && (
        <span
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{
            background: councilColors.nova.hex,
            boxShadow: `0 0 8px ${councilColors.nova.hex}`,
          }}
        />
      )}
    </button>
  );
}

/* ---------------------------- Council Mood widget --------------------------- */

/**
 * Pseudo-random but DETERMINISTIC mood values (so they don't reflow on every
 * render). useMemo + a stable seed per id keeps the bars consistent for the
 * session. Eventually this becomes a real signal from the backend.
 */
function CouncilMoodWidget() {
  const moods = useMemo(() => {
    return COUNCIL_MEMBERS.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      energy: seededEnergy(m.id),
      // textual flavour reflecting the energy band
      label: energyLabel(seededEnergy(m.id)),
    }));
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/8">
      <span className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-[var(--font-label)] font-semibold">
        Mood
      </span>
      <div className="flex items-end gap-1.5 h-6">
        {moods.map((mood) => (
          <MoodBar key={mood.id} mood={mood} />
        ))}
      </div>
    </div>
  );
}

function MoodBar({
  mood,
}: {
  mood: { id: keyof typeof councilColors; name: string; role: string; energy: number; label: string };
}) {
  const [hover, setHover] = useState(false);
  const c = councilColors[mood.id];
  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <motion.div
        initial={{ height: 4 }}
        animate={{ height: 6 + mood.energy * 18 }}
        transition={{
          delay: 0.2,
          duration: 0.6,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="w-1.5 rounded-full"
        style={{
          background: `linear-gradient(180deg, ${c.hex}, ${c.hex}80)`,
          boxShadow: `0 0 6px ${c.soft}`,
        }}
      />
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap pointer-events-none"
          >
            <div className="glass-strong rounded-lg px-2.5 py-1.5 text-[11px]">
              <span className="font-bold" style={{ color: c.hex }}>
                {mood.name}
              </span>{" "}
              <span className="text-white/65">{mood.label}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function seededEnergy(seed: string): number {
  // Cheap, deterministic hash → [0.3, 1.0]
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const n = Math.abs(Math.sin(h)) * 1.7;
  return 0.3 + (n % 1) * 0.7;
}

function energyLabel(e: number): string {
  if (e > 0.85) return "is buzzing";
  if (e > 0.65) return "feels engaged";
  if (e > 0.45) return "is listening";
  return "is resting";
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
        className="h-10 px-3 sm:px-4 rounded-full bg-white/[0.04] border border-white/8 hover:bg-white/[0.08] flex items-center gap-2 text-sm text-white/85 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="material-symbols-outlined text-[18px]"
          style={{ color: "rgba(255,255,255,0.7)" }}
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
                      ? "bg-white/[0.07]"
                      : "hover:bg-white/[0.05]"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{
                      color: isActive
                        ? councilColors.nova.hex
                        : "rgba(255,255,255,0.7)",
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
                      style={{ color: councilColors.nova.hex }}
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
