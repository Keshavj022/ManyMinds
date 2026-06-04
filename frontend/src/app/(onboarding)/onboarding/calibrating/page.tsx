"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import GlassCard from "@/components/ui/GlassCard";
import MemberAvatar from "@/components/ui/MemberAvatar";
import StepProgress from "@/components/onboarding/StepProgress";
import Typewriter from "@/components/onboarding/Typewriter";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import {
  STORAGE_KEYS,
  getCalibrationStory,
  type BigFiveScores,
} from "@/lib/onboarding";

const NEUTRAL_SCORES: BigFiveScores = {
  openness: 50,
  conscientiousness: 50,
  extraversion: 50,
  agreeableness: 50,
  neuroticism: 50,
};

export default function CalibratingPage() {
  const router = useRouter();
  const [scores, setScores] = useState<BigFiveScores>(NEUTRAL_SCORES);
  const [readyToEnter, setReadyToEnter] = useState(false);

  // Pull scores from localStorage written by the quiz page
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.personality);
      if (raw) {
        const parsed = JSON.parse(raw) as { scores?: BigFiveScores };
        if (parsed?.scores) setScores(parsed.scores);
      }
    } catch {
      // ignore — use neutral defaults
    }
  }, []);

  // Enable CTA after 3s
  useEffect(() => {
    const t = setTimeout(() => setReadyToEnter(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const story = useMemo(() => getCalibrationStory(scores), [scores]);

  const handleEnter = () => {
    router.push("/dashboard");
  };

  return (
    <div className="w-full max-w-3xl">
      {/* Step progress fully filled */}
      <div className="mb-8">
        <StepProgress total={3} current={3} />
        <p className="mt-3 text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-bold text-white/45">
          Step 3 of 3 · Calibration complete
        </p>
      </div>

      <GlassCard
        variant="aurora"
        className="rounded-[2rem] p-8 md:p-12 relative overflow-hidden"
      >
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-[var(--font-headline)] text-3xl md:text-4xl font-bold tracking-tight text-white text-center"
        >
          Calibrating your <span className="aurora-text">council</span>...
        </motion.h1>

        {/* Avatars row with scanning line */}
        <div className="relative mt-10 md:mt-14 flex items-end justify-center gap-4 md:gap-6">
          {COUNCIL_MEMBERS.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 24, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: 0.2 + i * 0.6,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex flex-col items-center gap-2"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 3.2,
                  delay: i * 0.18,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <MemberAvatar id={m.id} size="xl" status="talking" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.6 }}
                className="text-[10px] uppercase tracking-[0.22em] font-[var(--font-label)] font-bold text-white/55"
              >
                {m.name}
              </motion.span>
            </motion.div>
          ))}

          {/* Scanning line — sweeps across the avatar row */}
          <motion.div
            aria-hidden
            initial={{ left: "-2%", opacity: 0 }}
            animate={{ left: "102%", opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 2.4,
              delay: 0.8,
              repeat: Infinity,
              repeatDelay: 1.2,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-white/80 to-transparent"
            style={{ boxShadow: "0 0 28px rgba(255,255,255,0.7)" }}
          />
        </div>

        {/* Typewriter narrative */}
        <div className="mt-12 max-w-2xl mx-auto min-h-[140px]">
          <Typewriter text={story} speed={16} startDelay={1200} />
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <AuroraButton
            variant="primary"
            size="lg"
            onClick={handleEnter}
            className={!readyToEnter ? "opacity-40 pointer-events-none" : ""}
            iconRight={
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            }
          >
            Step inside
          </AuroraButton>
          {!readyToEnter && (
            <span className="text-[11px] uppercase tracking-[0.28em] font-[var(--font-label)] font-bold text-white/35">
              Listening...
            </span>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
