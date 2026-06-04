"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AmbientBackground from "@/components/ui/AmbientBackground";
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
      <AmbientBackground variant="minimal" />

      <header className="relative z-20 h-16 sm:h-20 flex items-center justify-between px-5 sm:px-8 md:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="font-[var(--font-headline)] text-xl md:text-2xl font-black tracking-tighter text-white">
            Many<span className="aurora-text">Minds</span>
          </span>
        </Link>
        <span className="text-[10px] uppercase tracking-[0.32em] font-[var(--font-label)] font-semibold text-white/40 hidden sm:block">
          Calibration
        </span>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 pb-10 pt-2">
        {children}
      </main>
    </div>
  );
}
