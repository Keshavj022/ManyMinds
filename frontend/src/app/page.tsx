"use client";

import dynamic from "next/dynamic";
import AmbientBackground from "@/components/ui/AmbientBackground";
import SmoothScrollProvider from "@/components/ui/SmoothScrollProvider";
import HowItWorks from "@/components/landing/HowItWorks";
import MemorySection from "@/components/landing/MemorySection";
import StatsSection from "@/components/landing/StatsSection";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";

// All R3F-backed sections must be client-only (Canvas can't SSR).
const CouncilHero = dynamic(
  () => import("@/components/landing/CouncilHero"),
  { ssr: false },
);

const DebateScene = dynamic(
  () => import("@/components/landing/DebateScene"),
  { ssr: false },
);

const GamesScene = dynamic(
  () => import("@/components/landing/GamesScene"),
  { ssr: false },
);

const CouncilProfiles = dynamic(
  () => import("@/components/landing/CouncilProfiles"),
  { ssr: false },
);

/**
 * Landing page — one long scroll-driven cinematic.
 *
 *   1. CouncilHero      — 6-stage cinematic: boot inside a CRT monitor,
 *                          the five characters materialize and wave, then
 *                          break out of the screen and assemble at a cafe
 *                          table.
 *   2. DebateScene      — pinned scroll, two-side debate cinematic with
 *                          rotating speaker spotlights + typewriter bubbles.
 *   3. GamesScene       — pinned scroll, two members play while three
 *                          spectators chat over the board.
 *   4. CouncilProfiles  — "Meet your Council": hover any character to
 *                          drop a cinematic spotlight on them.
 *   5. HowItWorks       — horizontal scroll-jacked 3-step flow covering
 *                          onboarding + memory + 3D rooms.
 *   6. StatsSection / PreviewSection / CTABanner / Footer — closers.
 *
 * SmoothScrollProvider (Lenis) wraps everything so all scroll-linked
 * transforms feel inertial.
 */
export default function LandingPage() {
  return (
    <SmoothScrollProvider>
      <AmbientBackground variant="rich" showNoise />
      <Navbar />
      <main>
        <CouncilHero />
        <DebateScene />
        <GamesScene />
        <CouncilProfiles />
        <HowItWorks />
        <MemorySection />
        <StatsSection />
        <CTABanner />
      </main>
      <Footer />
    </SmoothScrollProvider>
  );
}
