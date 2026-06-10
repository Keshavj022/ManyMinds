"use client";

import { ReactNode, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import MobileTabBar from "@/components/dashboard/MobileTabBar";
import { EnvironmentProvider } from "@/components/dashboard/EnvironmentProvider";
import AmbientBackground from "@/components/ui/AmbientBackground";
import { useAuth } from "@/lib/auth-context";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auth + onboarding gate. Render nothing until we know the auth state, to
  // avoid flashing protected UI for a moment to a logged-out user.
  useEffect(() => {
    if (status === "loading") return;
    if (status === "anonymous") {
      router.replace("/login");
      return;
    }
    if (user && user.onboarding_step < 1) {
      router.replace("/onboarding/demographics");
    } else if (user && user.onboarding_step < 2) {
      router.replace("/onboarding/quiz");
    }
  }, [status, user, router]);

  if (status !== "authenticated" || !user || user.onboarding_step < 2) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/55 text-sm">
        <span className="inline-flex items-center gap-3">
          <span className="w-4 h-4 rounded-full border-2 border-white/15 border-t-[#e0b083]/70 animate-spin" />
          One sec — the room&rsquo;s waking up…
        </span>
      </div>
    );
  }

  return (
    <EnvironmentProvider>
      <div className="min-h-[100dvh] text-white flex relative">
        <AmbientBackground variant="warm" />

        <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuOpen={() => setDrawerOpen(true)} />
          <main className="flex-1 overflow-y-auto pb-28 lg:pb-12">
            <div className="px-4 sm:px-6 lg:px-10 pt-6 lg:pt-9 w-full max-w-7xl mx-auto">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pathname ?? "root"}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    y: -8,
                    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
                  }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        <MobileTabBar />
      </div>
    </EnvironmentProvider>
  );
}
