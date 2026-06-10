"use client";

import dynamic from "next/dynamic";
import { MotionConfig } from "framer-motion";
import AmbientBackground from "@/components/ui/AmbientBackground";
import SmoothScrollProvider from "@/components/ui/SmoothScrollProvider";
import EnvironmentsShowcase from "@/components/landing/EnvironmentsShowcase";
import HowItWorks from "@/components/landing/HowItWorks";
import MemorySection from "@/components/landing/MemorySection";
import StatsSection from "@/components/landing/StatsSection";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";

// All R3F-backed sections must be client-only (Canvas can't SSR).
const JourneyHero = dynamic(
  () => import("@/components/landing/JourneyHero"),
  { ssr: false },
);

const CouncilProfiles = dynamic(
  () => import("@/components/landing/CouncilProfiles"),
  { ssr: false },
);

/**
 * Landing page — ONE continuous vertical narrative. Scroll down = go down.
 *
 * The 3D journey is a VERTICAL TOWER: the council boots on a cyber platform
 * at the top, falls through seven stacked diorama worlds, lands in the café
 * council at ground level, then the floor opens and the camera DESCENDS to
 * the debate hall and the games den below, before pulling back to a
 * "dollhouse" shot of all three lit floors. Its overlay chips number acts
 * 01–04 in-canvas.
 *
 * The 2D chapters then CONTINUE that numbering down the page:
 *
 *   01–04  JourneyHero          — the 3D tower (canvas).
 *   05     CouncilProfiles      — meet the five properly, spotlight stage.
 *   06     EnvironmentsShowcase — the seven worlds, cataloged.
 *   07     MemorySection        — the living memory graph.
 *   08     HowItWorks           — how it begins.
 *   09     StatsSection         — the receipts.
 *          CTABanner / Footer   — the closer ("Your move").
 *
 * A slim FlowDivider hairline threads between chapters so the page reads as
 * one descending line. SmoothScrollProvider (Lenis) wraps everything so all
 * scroll-linked transforms feel inertial.
 */

/** The thread continues downward — a slim connective hairline between chapters. */
function FlowDivider() {
  return (
    <div aria-hidden className="flex flex-col items-center opacity-50">
      <span className="h-1.5 w-1.5 rounded-full bg-[#9b87d8] shadow-[0_0_10px_rgba(155,135,216,0.9)]" />
      <span
        className="w-px h-16"
        style={{
          background:
            "linear-gradient(180deg, rgba(155,135,216,0.85), transparent)",
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  return (
    <SmoothScrollProvider>
      {/* reducedMotion="user": every framer-motion reveal across the page
          collapses to a fade for prefers-reduced-motion users (the 3D canvas
          handles its own static fallback). */}
      <MotionConfig reducedMotion="user">
        <AmbientBackground variant="rich" showNoise />
        <Navbar />
        <main>
          <JourneyHero />
          <FlowDivider />
          <CouncilProfiles />
          <FlowDivider />
          <EnvironmentsShowcase />
          <FlowDivider />
          <MemorySection />
          <FlowDivider />
          <HowItWorks />
          <FlowDivider />
          <StatsSection />
          <FlowDivider />
          <CTABanner />
        </main>
        <Footer />
      </MotionConfig>
    </SmoothScrollProvider>
  );
}
