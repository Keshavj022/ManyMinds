"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { NAV_ITEMS, NavItem } from "./nav-config";
import { STORAGE_KEYS } from "@/lib/onboarding";

interface SidebarProps {
  /** When true the sidebar renders as an overlay drawer (mobile). */
  open?: boolean;
  /** Called when the user requests the drawer close (mobile only). */
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
          />
        )}
      </AnimatePresence>

      {/*
        Two layout modes:
         - lg+ : the sidebar is sticky and always visible (CSS handles it).
         - <lg : the sidebar is a fixed drawer that slides in based on `open`.
        We use CSS classes (`-translate-x-full` on mobile when closed) rather
        than reading window.innerWidth so it stays responsive on resize.
      */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-72 shrink-0 flex flex-col
          glass-strong border-r border-white/8
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Logo / Header */}
        <div className="px-6 pt-7 pb-5 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-baseline gap-0 transition-transform hover:scale-[1.02] active:scale-95"
          >
            <span className="font-[var(--font-headline)] text-2xl font-black tracking-tighter text-white">
              Many
            </span>
            <span className="font-[var(--font-headline)] text-2xl font-black tracking-tighter aurora-text">
              Minds
            </span>
          </Link>
          {/* Mobile close button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden text-white/60 hover:text-white p-1 rounded-full"
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="px-3 mt-1 space-y-1 flex-shrink-0">
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              isActive={isActiveRoute(pathname, item.href)}
              onNavigate={onClose}
            />
          ))}
        </nav>

        {/* Council status (compact) */}
        <CouncilStatus />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Profile chip + popover */}
        <ProfileChip />
      </aside>
    </>
  );
}

/* ----------------------------- Sidebar link --------------------------------- */

function isActiveRoute(
  pathname: string | null | undefined,
  href: string,
): boolean {
  if (!pathname) return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarLink({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  const color = councilColors[item.member];

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm group transition-colors"
      style={{
        color: isActive ? "white" : "rgba(255,255,255,0.65)",
      }}
    >
      {isActive && (
        <motion.span
          layoutId="sidebar-active-bg"
          className="absolute inset-0 rounded-xl"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          style={{
            background: `linear-gradient(110deg, ${color.soft}, rgba(255,255,255,0.02))`,
            border: `1px solid ${color.soft}`,
          }}
        />
      )}
      {isActive && (
        <motion.span
          layoutId="sidebar-active-bar"
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          style={{
            background: color.hex,
            boxShadow: `0 0 12px ${color.hex}`,
          }}
        />
      )}
      <span
        className="material-symbols-outlined relative z-10 text-[20px] transition-colors"
        style={{
          color: isActive ? color.hex : "rgba(255,255,255,0.55)",
          fontVariationSettings: isActive ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400",
        }}
      >
        {item.icon}
      </span>
      <span
        className={`relative z-10 transition-all ${
          isActive ? "font-semibold" : "font-medium group-hover:text-white/90"
        }`}
      >
        {item.name}
      </span>
    </Link>
  );
}

/* --------------------------- Council mini-status ---------------------------- */

const ACTIVITY_FLAVOURS: Record<string, string> = {
  aria: "is reading",
  rex: "is restless",
  sage: "is mapping",
  nova: "is sketching",
  echo: "is here",
};

function CouncilStatus() {
  return (
    <div className="px-5 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <span className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-semibold text-white/40">
          The Council
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
      <div className="flex items-center justify-between px-1">
        {COUNCIL_MEMBERS.map((m, i) => (
          <CouncilStatusDot
            key={m.id}
            id={m.id}
            name={m.name}
            role={m.role}
            activity={ACTIVITY_FLAVOURS[m.id] ?? "is here"}
            delay={i * 0.08}
          />
        ))}
      </div>
    </div>
  );
}

function CouncilStatusDot({
  id,
  name,
  role,
  activity,
  delay,
}: {
  id: keyof typeof councilColors;
  name: string;
  role: string;
  activity: string;
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
      >
        <MemberAvatar id={id} size="sm" status="online" glow />
      </motion.div>
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30 whitespace-nowrap pointer-events-none"
          >
            <div className="glass-strong rounded-xl px-3 py-2 text-[11px] leading-tight">
              <div className="font-bold text-white">{name}</div>
              <div className="text-white/55 text-[10px] uppercase tracking-wider font-[var(--font-label)]">
                {role}
              </div>
              <div className="text-white/70 mt-1">
                <span style={{ color: councilColors[id].hex }}>{name}</span> {activity}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------- Profile chip ------------------------------- */

function ProfileChip() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Friend");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.profile);
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string };
        if (parsed.name) setName(parsed.name);
      }
    } catch {
      // ignore
    }
  }, []);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  return (
    <div ref={rootRef} className="relative p-4 border-t border-white/8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-white/[0.04] transition-colors text-left"
      >
        <div
          className="w-10 h-10 rounded-full grid place-items-center font-semibold text-sm text-[#15121d] border border-white/10"
          style={{ background: "var(--color-accent)" }}
        >
          {initials || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{name}</p>
          <p className="text-[11px] text-white/45 uppercase tracking-wider font-[var(--font-label)]">
            Pioneer Tier
          </p>
        </div>
        <span className="material-symbols-outlined text-white/45 text-[20px]">
          settings
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-4 right-4 bottom-[5.5rem] z-50 glass-strong rounded-2xl p-1.5"
          >
            <PopoverItem icon="edit" label="Edit profile" />
            <PopoverItem icon="groups" label="Switch council" />
            <PopoverItem icon="logout" label="Sign out" tone="danger" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PopoverItem({
  icon,
  label,
  tone = "default",
}: {
  icon: string;
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-colors text-sm text-left"
      style={{ color: tone === "danger" ? "#f87171" : "rgba(255,255,255,0.85)" }}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
