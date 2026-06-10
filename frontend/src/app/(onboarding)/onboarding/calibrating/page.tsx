"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import GlassCard from "@/components/ui/GlassCard";
import MemberAvatar from "@/components/ui/MemberAvatar";
import TypingDots from "@/components/ui/TypingDots";
import TraitBars from "@/components/onboarding/TraitBars";
import { COUNCIL_MEMBERS, councilColors } from "@/lib/design-tokens";
import {
  STORAGE_KEYS,
  getCelebration,
  getDominantTrait,
  type BigFiveScores,
} from "@/lib/onboarding";

const NEUTRAL_SCORES: BigFiveScores = {
  openness: 50,
  conscientiousness: 50,
  extraversion: 50,
  agreeableness: 50,
  neuroticism: 50,
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CalibratingPage() {
  const router = useRouter();
  const [scores, setScores] = useState<BigFiveScores>(NEUTRAL_SCORES);
  const [phase, setPhase] = useState<"gathering" | "reveal">("gathering");

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

  // A short huddle, then the payoff
  useEffect(() => {
    const t = setTimeout(() => setPhase("reveal"), 2200);
    return () => clearTimeout(t);
  }, []);

  const celebration = useMemo(() => getCelebration(scores), [scores]);
  const dominant = useMemo(() => getDominantTrait(scores), [scores]);
  const starColor = councilColors[celebration.member];

  return (
    <div className="w-full max-w-2xl">
      <AnimatePresence mode="wait">
        {phase === "gathering" ? (
          <motion.div
            key="gathering"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="glass rounded-3xl p-10 md:p-14 text-center"
          >
            <div className="flex items-center justify-center gap-3">
              {COUNCIL_MEMBERS.map((m, i) => (
                <motion.span
                  key={m.id}
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 1.6,
                    delay: i * 0.15,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="inline-flex"
                >
                  <MemberAvatar id={m.id} size="lg" status="thinking" />
                </motion.span>
              ))}
            </div>
            <h1 className="mt-8 font-[var(--font-headline)] text-2xl md:text-3xl font-bold text-white">
              The room&rsquo;s gone quiet…
            </h1>
            <p className="mt-3 text-white/55 text-sm">
              That only happens when they&rsquo;ve found something good.
            </p>
            <div className="mt-6 flex justify-center">
              <TypingDots memberId="nova" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <GlassCard className="relative overflow-hidden rounded-3xl p-7 md:p-12">
              {/* the headliner's glow saturating the card */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full blur-[110px]"
                style={{ background: starColor.soft }}
              />

              {/* the five, reacting */}
              <div className="relative flex items-end justify-center gap-3 md:gap-5">
                {COUNCIL_MEMBERS.map((m, i) => {
                  const isStar = m.id === celebration.member;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 20, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, scale: isStar ? 1.12 : 1 }}
                      transition={{
                        delay: 0.15 + i * 0.09,
                        type: "spring",
                        stiffness: 380,
                        damping: 22,
                      }}
                      className="flex flex-col items-center gap-2"
                    >
                      <motion.span
                        animate={{ y: isStar ? [0, -7, 0] : [0, -3, 0] }}
                        transition={{
                          duration: isStar ? 1.4 : 3,
                          delay: i * 0.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="inline-flex"
                      >
                        <MemberAvatar
                          id={m.id}
                          size={isStar ? "xl" : "lg"}
                          status="talking"
                          glow={isStar}
                        />
                      </motion.span>
                      <span
                        className="text-[10px] uppercase tracking-[0.2em] font-[var(--font-label)] font-bold"
                        style={{
                          color: isStar ? councilColors[m.id].hex : "rgba(255,255,255,0.45)",
                        }}
                      >
                        {m.name}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* the verdict */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
                className="relative mt-9 text-center"
              >
                <p className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-bold text-white/45">
                  The verdict is in
                </p>
                <h1 className="mt-3 font-[var(--font-headline)] text-3xl md:text-4xl font-bold tracking-tight text-white leading-[1.15]">
                  {celebration.headline}
                </h1>
                <p
                  className="mt-4 text-base md:text-lg italic leading-relaxed max-w-lg mx-auto"
                  style={{ color: starColor.hex }}
                >
                  {celebration.line}
                </p>
              </motion.div>

              {/* the full read */}
              <div className="relative mt-10 max-w-lg mx-auto">
                <TraitBars scores={scores} highlight={dominant} startDelay={0.9} />
              </div>

              {/* step into the room */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1.8, ease: EASE }}
                className="relative mt-11 flex flex-col items-center gap-3"
              >
                <AuroraButton
                  variant="primary"
                  size="lg"
                  onClick={() => router.push("/dashboard")}
                  iconRight={
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  }
                >
                  Meet your council
                </AuroraButton>
                <p className="text-xs text-white/40">
                  They&rsquo;re already talking about you. Nicely. Mostly.
                </p>
              </motion.div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
