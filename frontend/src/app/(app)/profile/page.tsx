"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import AuroraButton from "@/components/ui/AuroraButton";
import IdentityHeader from "@/components/profile/IdentityHeader";
import PersonalitySection from "@/components/profile/PersonalitySection";
import MemoryGraphSection from "@/components/profile/MemoryGraphSection";
import { api, type ProfileData } from "@/lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

type ProfileState =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ready"; profile: ProfileData };

export default function ProfilePage() {
  const [state, setState] = useState<ProfileState>({ phase: "loading" });

  const load = useCallback(() => {
    let cancelled = false;
    setState({ phase: "loading" });
    api<ProfileData>("/api/v1/onboarding/profile")
      .then((profile) => {
        if (!cancelled) setState({ phase: "ready", profile });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <div className="space-y-8 lg:space-y-10 pb-10">
      <header className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] text-white/50">
          Your corner
        </p>
        <h1 className="text-2xl lg:text-3xl font-bold font-[var(--font-headline)] aurora-text tracking-tight">
          You, as the five see you.
        </h1>
      </header>

      {/* Identity + personality — side by side on large screens. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7 items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {state.phase === "loading" && <ProfileSkeleton />}
          {state.phase === "error" && <ProfileError onRetry={load} />}
          {state.phase === "ready" && <IdentityHeader profile={state.profile} />}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
        >
          {state.phase === "loading" && <PersonalitySkeleton />}
          {state.phase === "error" && <PersonalitySection personality={null} />}
          {state.phase === "ready" && (
            <PersonalitySection personality={state.profile.personality} />
          )}
        </motion.div>
      </div>

      {/* The honest knowledge graph — fetches itself, full width. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.16, ease: EASE }}
      >
        <MemoryGraphSection />
      </motion.div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <GlassCard variant="strong" className="rounded-3xl p-6 lg:p-8 h-full">
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl bg-white/[0.05] animate-pulse-soft" />
        <div className="flex-1 space-y-2.5">
          <div className="h-3 w-24 rounded-full bg-white/[0.05] animate-pulse-soft" />
          <div className="h-6 w-44 rounded-full bg-white/[0.06] animate-pulse-soft" />
          <div className="h-3 w-36 rounded-full bg-white/[0.04] animate-pulse-soft" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse-soft"
          />
        ))}
      </div>
    </GlassCard>
  );
}

function PersonalitySkeleton() {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="h-4 w-32 rounded-full bg-white/[0.05] animate-pulse-soft" />
      <GlassCard variant="strong" className="rounded-3xl p-6 lg:p-7 flex-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/[0.06] animate-pulse-soft" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-28 rounded-full bg-white/[0.05] animate-pulse-soft" />
            <div className="h-3 w-40 rounded-full bg-white/[0.04] animate-pulse-soft" />
          </div>
        </div>
        <div className="mt-7 space-y-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-32 rounded-full bg-white/[0.05] animate-pulse-soft" />
              <div className="h-2 w-full rounded-full bg-white/[0.04] animate-pulse-soft" />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ProfileError({ onRetry }: { onRetry: () => void }) {
  return (
    <GlassCard variant="strong" className="rounded-3xl p-6 lg:p-8 h-full">
      <div className="h-full grid place-items-center py-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <span className="material-symbols-outlined text-[32px] text-white/40">
            cloud_off
          </span>
          <p className="text-sm text-white/65 leading-relaxed">
            We couldn&apos;t pull your details just now — nothing&apos;s lost.
            Give it another try in a moment.
          </p>
          <AuroraButton variant="ghost" size="sm" onClick={onRetry}>
            Try again
          </AuroraButton>
        </div>
      </div>
    </GlassCard>
  );
}
