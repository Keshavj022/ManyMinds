"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import GlassCard from "@/components/ui/GlassCard";
import MemberPeek from "@/components/onboarding/MemberPeek";
import StepProgress from "@/components/onboarding/StepProgress";
import {
  AGE_RANGES,
  LANGUAGES,
  PURPOSES,
  STORAGE_KEYS,
  type DemographicsProfile,
} from "@/lib/onboarding";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type PeekState = { id: "echo-intro" | "sage-purpose" | null };

export default function DemographicsPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState<string>("");
  const [language, setLanguage] = useState<string>("en");
  const [location, setLocation] = useState("");
  const [purposes, setPurposes] = useState<string[]>([]);
  const [peek, setPeek] = useState<PeekState>({ id: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Echo waves hello on first paint
  useEffect(() => {
    const t = setTimeout(() => setPeek({ id: "echo-intro" }), 700);
    return () => clearTimeout(t);
  }, []);

  // Sage chimes in when user first interacts with purpose chips
  const handlePurposeToggle = (id: string) => {
    const wasEmpty = purposes.length === 0;
    setPurposes((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
    if (wasEmpty) {
      setPeek({ id: "sage-purpose" });
    }
  };

  const isValid =
    name.trim().length >= 2 && ageRange.length > 0 && purposes.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || busy) return;
    setBusy(true);
    setError(null);
    const profile: DemographicsProfile = {
      name: name.trim(),
      ageRange,
      language,
      location: location.trim() || undefined,
      purposes,
    };
    try {
      window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    } catch {
      // ignore — proceed regardless
    }
    try {
      const purposesLine =
        purposes.length > 0 ? `Here to: ${purposes.join(", ")}.` : "";
      const ageLine = ageRange ? `Age range ${ageRange}.` : "";
      const bio = [ageLine, purposesLine].filter(Boolean).join(" ") || null;
      await api("/api/v1/onboarding/demographics", {
        method: "POST",
        body: JSON.stringify({
          full_name: name.trim(),
          preferred_language: language,
          location: location.trim() || null,
          bio,
        }),
      });
      await refresh();
      router.push("/onboarding/quiz");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't save that — try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  const fieldAnim = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8">
        <StepProgress total={3} current={0} />
        <p className="mt-3 text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-bold text-white/45">
          Step 1 of 3 · Demographics
        </p>
      </div>

      <GlassCard
        variant="strong"
        className="rounded-2xl p-5 sm:p-8 md:p-12 relative overflow-hidden"
      >
        <motion.div
          {...fieldAnim}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-10"
        >
          <h1 className="font-[var(--font-headline)] text-3xl md:text-4xl font-bold tracking-tight text-white leading-[1.1]">
            Let&apos;s set the <span className="aurora-text">stage.</span>
          </h1>
          <p className="mt-3 text-white/60 text-sm md:text-base max-w-lg leading-relaxed">
            We&apos;ll use this to calibrate how the council speaks with you.
            We won&apos;t share it — ever.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name */}
          <motion.div
            {...fieldAnim}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="space-y-2"
          >
            <label className="text-[11px] font-bold text-white/55 uppercase tracking-[0.28em] font-[var(--font-label)]">
              What should they call you?
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl px-5 py-4 text-base text-white placeholder:text-white/30 font-medium"
              placeholder="Your name"
              maxLength={48}
            />
          </motion.div>

          {/* Age range */}
          <motion.div
            {...fieldAnim}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="space-y-3"
          >
            <label className="text-[11px] font-bold text-white/55 uppercase tracking-[0.28em] font-[var(--font-label)]">
              Age range
            </label>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGES.map((opt) => {
                const active = ageRange === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAgeRange(opt.id)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                      active
                        ? "bg-white text-[#0d0b14] border-white shadow-[0_8px_24px_-8px_rgba(216,163,184,0.5)]"
                        : "bg-white/[0.04] text-white/75 border-white/10 hover:bg-white/[0.08] hover:border-white/25"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Language */}
          <motion.div
            {...fieldAnim}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="space-y-3"
          >
            <label className="text-[11px] font-bold text-white/55 uppercase tracking-[0.28em] font-[var(--font-label)]">
              Preferred language
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((opt) => {
                const active = language === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLanguage(opt.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all inline-flex items-center gap-2 ${
                      active
                        ? "bg-white/[0.12] text-white border-white/40"
                        : "bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span aria-hidden>{opt.flag}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Location (optional) */}
          <motion.div
            {...fieldAnim}
            transition={{ duration: 0.5, delay: 0.48 }}
            className="space-y-2"
          >
            <label className="flex items-center gap-3 text-[11px] font-bold text-white/55 uppercase tracking-[0.28em] font-[var(--font-label)]">
              Where in the world? <span className="text-white/30 normal-case tracking-normal font-medium">(optional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl px-5 py-4 text-base text-white placeholder:text-white/30 font-medium"
              placeholder="City, country, anywhere"
              maxLength={64}
            />
          </motion.div>

          {/* Purposes */}
          <motion.div
            {...fieldAnim}
            transition={{ duration: 0.5, delay: 0.58 }}
            className="space-y-3"
          >
            <label className="text-[11px] font-bold text-white/55 uppercase tracking-[0.28em] font-[var(--font-label)]">
              What brings you here? <span className="text-white/30 normal-case tracking-normal font-medium">(pick one or more)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => {
                const active = purposes.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePurposeToggle(p.id)}
                    className={`px-4 py-2.5 rounded-full text-sm font-semibold border transition-all inline-flex items-center gap-2 ${
                      active
                        ? "bg-[var(--color-sage-soft)] text-white border-[rgba(155,135,216,0.55)] shadow-[0_8px_24px_-10px_rgba(155,135,216,0.7)]"
                        : "bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.08] hover:border-white/25"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {error && (
            <p
              role="alert"
              className="text-sm text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/30 rounded-xl px-3 py-2"
            >
              {error}
            </p>
          )}

          {/* CTA */}
          <motion.div
            {...fieldAnim}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4"
          >
            <p className="text-[11px] text-white/35 leading-relaxed max-w-[16rem]">
              Takes ~30 seconds. Next up: a fun, fast personality quiz.
            </p>
            <AuroraButton
              variant="primary"
              size="lg"
              disabled={!isValid || busy}
              type="submit"
              iconRight={
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              }
              className={!isValid ? "opacity-50 pointer-events-none" : ""}
            >
              {busy ? "Saving…" : "Next"}
            </AuroraButton>
          </motion.div>
        </form>
      </GlassCard>

      <AnimatePresence>
        {peek.id === "echo-intro" && (
          <MemberPeek
            key="echo"
            memberId="echo"
            position="right"
            text="Hey — make yourself comfortable. We're really glad you're here."
            duration={3600}
            onComplete={() => setPeek({ id: null })}
          />
        )}
        {peek.id === "sage-purpose" && (
          <MemberPeek
            key="sage"
            memberId="sage"
            position="left"
            text="Nice — that helps me know which version of me you'll need."
            duration={3000}
            onComplete={() => setPeek({ id: null })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
