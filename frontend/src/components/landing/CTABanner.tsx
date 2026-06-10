"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import GradientOrb from "@/components/ui/GradientOrb";
import AuroraButton from "@/components/ui/AuroraButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { COUNCIL_IDS } from "@/components/three/positions";

const REVEAL = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

export default function CTABanner() {
  return (
    <section className="relative py-32 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={REVEAL}
          className="relative"
        >
          {/* Soft brand glow behind the card */}
          <GradientOrb
            color="violet"
            size="xl"
            intensity={0.5}
            className="-top-28 left-1/2 -translate-x-1/2"
          />

          <GlassCard
            variant="aurora"
            className="relative overflow-hidden rounded-[2.5rem] px-8 md:px-16 py-16 md:py-20 text-center"
          >
            <div className="absolute inset-0 noise opacity-[0.16] pointer-events-none" />

            <div className="relative z-10">
              {/* Avatar row for warmth */}
              <div className="flex items-center justify-center -space-x-3 mb-9">
                {COUNCIL_IDS.map((id) => (
                  <MemberAvatar
                    key={id}
                    id={id}
                    size="lg"
                    glow
                    className="ring-2 ring-[#0a0910]/70"
                  />
                ))}
              </div>

              <p className="text-[11px] font-[var(--font-label)] font-semibold uppercase tracking-[0.32em] text-white/55 mb-6">
                Your move
              </p>

              <h2 className="font-[var(--font-headline)] font-bold text-4xl md:text-5xl lg:text-6xl leading-[1.05]">
                <span className="text-white">Your friends are </span>
                <span className="aurora-text">waiting</span>
                <span className="text-white">.</span>
              </h2>

              <p className="mt-6 text-white/65 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                Build your five once. They&apos;ll remember you, grow with you,
                and show up every time you do.
              </p>

              <div className="mt-11 flex flex-col sm:flex-row items-center justify-center gap-4">
                <AuroraButton
                  href="/signup"
                  variant="primary"
                  size="lg"
                  iconRight={
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: "'FILL' 0" }}
                    >
                      arrow_forward
                    </span>
                  }
                >
                  Create your council
                </AuroraButton>
                <AuroraButton href="#how-it-works" variant="ghost" size="lg">
                  See how it works
                </AuroraButton>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}
