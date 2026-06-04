"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { councilColors } from "@/lib/design-tokens";
import { NAV_ITEMS } from "./nav-config";

/**
 * Bottom tab bar shown on small screens (<lg). Mirrors the 6 sidebar items,
 * but only shows the most important 5 (drops Config — accessible via Sidebar).
 */
export default function MobileTabBar() {
  const pathname = usePathname();
  const items = NAV_ITEMS.slice(0, 5);

  return (
    <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-40 glass-strong rounded-2xl flex items-stretch justify-between px-1 py-1.5 border border-white/8 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
      {items.map((item) => {
        const isActive =
          !!pathname &&
          (pathname === item.href || pathname.startsWith(item.href + "/"));
        const color = councilColors[item.member];
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl"
            style={{ color: isActive ? color.hex : "rgba(255,255,255,0.55)" }}
          >
            {isActive && (
              <motion.span
                layoutId="mobile-tab-active"
                className="absolute inset-0 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                style={{
                  background: color.soft,
                  boxShadow: `inset 0 0 0 1px ${color.soft}`,
                }}
              />
            )}
            <span
              className="material-symbols-outlined text-[22px]"
              style={{
                fontVariationSettings: isActive
                  ? "'FILL' 1, 'wght' 500"
                  : "'FILL' 0, 'wght' 400",
              }}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider font-[var(--font-label)]">
              {item.shortName}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
