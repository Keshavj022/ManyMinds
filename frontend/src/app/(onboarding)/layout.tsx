"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AmbientBackground from "@/components/ui/AmbientBackground";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import { useAuth } from "@/lib/auth-context";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "anonymous") {
      router.replace("/login");
      return;
    }
    // If the user is already fully onboarded, send them on. The /calibrating
    // page intentionally stays accessible so the user can finish the visual
    // calibration step right after quiz completion.
    if (user && user.onboarding_step >= 2 && pathname !== "/onboarding/calibrating") {
      router.replace("/dashboard");
    }
  }, [status, user, router, pathname]);

  return (
    <div className="relative min-h-[100dvh] text-white flex flex-col">
      <AmbientBackground variant="warm" />

      <header className="relative z-20 h-16 sm:h-20 flex items-center justify-between px-5 sm:px-8 md:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="font-[var(--font-headline)] text-xl md:text-2xl font-black tracking-tighter text-white">
            Many<span className="aurora-text">Minds</span>
          </span>
        </Link>
        <span className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] font-semibold text-white/55 hidden sm:block">
          Getting to know you
        </span>
      </header>

      {/* Cozy single column — the step pages bring their own progress */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 pb-12 pt-2 w-full max-w-3xl mx-auto">
        {children}
      </main>

      {/* The council, waiting quietly in the corner */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="hidden md:flex fixed bottom-6 right-6 z-20 items-center gap-3 glass-warm rounded-full pl-3 pr-5 py-2.5 pointer-events-none"
      >
        <div className="flex -space-x-2">
          {COUNCIL_MEMBERS.map((member, i) => (
            <span
              key={member.id}
              className="animate-pulse-soft inline-flex rounded-full ring-2 ring-[#131017]"
              style={{ animationDelay: `${i * 0.7}s` }}
            >
              <MemberAvatar id={member.id} size="xs" glow={false} />
            </span>
          ))}
        </div>
        <span className="text-xs text-white/60 font-medium">
          we&rsquo;re all ears
        </span>
      </motion.div>
    </div>
  );
}
