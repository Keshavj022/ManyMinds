"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";

type LenisLike = { scrollTo: (target: string | number | HTMLElement) => void };

const NAV_LINKS: ReadonlyArray<{ label: string; hash: string }> = [
  { label: "The Journey", hash: "#council-journey" },
  { label: "Council", hash: "#about" },
  { label: "Worlds", hash: "#environments" },
  { label: "Memory", hash: "#memory" },
  { label: "How it works", hash: "#how-it-works" },
];

/** Smooth-scroll to a hash via Lenis if present, else native anchor jump. */
function scrollToHash(hash: string) {
  const lenis =
    typeof window !== "undefined"
      ? (window.lenis as unknown as LenisLike | undefined)
      : undefined;
  if (lenis?.scrollTo) {
    lenis.scrollTo(hash);
    return;
  }
  const el = document.querySelector(hash);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Background appears after ~80vh of scroll. Passive listener toggling a
  // boolean — no rAF loop.
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  const handleNav = (
    e: React.MouseEvent<HTMLAnchorElement>,
    hash: string
  ) => {
    e.preventDefault();
    setOpen(false);
    scrollToHash(hash);
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass-strong border-b border-white/[0.06]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
        {/* Wordmark */}
        <Link
          href="/"
          className="group inline-flex items-baseline gap-0 text-2xl font-bold tracking-tight font-[var(--font-headline)] transition-transform duration-300 hover:scale-[1.02]"
        >
          <span
            aria-hidden
            className="mr-2 inline-block h-2.5 w-2.5 self-center rounded-full bg-[var(--color-accent)] shadow-[0_0_12px_var(--color-accent)]"
          />
          <span className="text-white">Many</span>
          <span className="aurora-text">Minds</span>
        </Link>

        {/* Center nav */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-1 font-[var(--font-label)] text-sm"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.hash}
              onClick={(e) => handleNav(e, link.hash)}
              className="relative px-4 py-2 rounded-full text-white/55 hover:text-white hover:bg-white/[0.05] transition-all duration-300"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-2">
          <AuroraButton href="/login" variant="ghost" size="sm">
            Log in
          </AuroraButton>
          <AuroraButton href="/signup" variant="primary" size="sm">
            Sign up
          </AuroraButton>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] transition-colors"
        >
          <span
            className="material-symbols-outlined text-[22px]"
            style={{ fontVariationSettings: "'FILL' 0" }}
          >
            {open ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="nav-mobile"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden glass-strong border-t border-white/[0.06]"
          >
            <nav
              aria-label="Mobile"
              className="px-4 py-5 flex flex-col gap-1"
            >
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.hash}
                  onClick={(e) => handleNav(e, link.hash)}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.04 + i * 0.05 }}
                  className="px-4 py-3 rounded-2xl text-base font-[var(--font-label)] font-semibold text-white/75 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>
            <div className="px-6 pb-7 pt-1 flex flex-col gap-3 border-t border-white/[0.06]">
              <AuroraButton href="/login" variant="ghost" size="md" fullWidth>
                Log in
              </AuroraButton>
              <AuroraButton
                href="/signup"
                variant="primary"
                size="md"
                fullWidth
              >
                Sign up
              </AuroraButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
