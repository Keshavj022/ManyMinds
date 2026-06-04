"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import MemberPeek from "@/components/onboarding/MemberPeek";
import QuestionCard from "@/components/onboarding/QuestionCard";
import StepProgress from "@/components/onboarding/StepProgress";
import {
  BIG_FIVE_QUESTIONS,
  STORAGE_KEYS,
  scoreQuiz,
} from "@/lib/onboarding";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const TOTAL = BIG_FIVE_QUESTIONS.length;
const DEFAULT_VALUE = 50;

export default function PersonalityQuizPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [reactionFor, setReactionFor] = useState<number | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert 0-100 slider → 1-5 Likert, applying reverse-coding so the backend
  // can score raw averages without needing the reverse-coding metadata.
  const toLikert = useCallback((value: number, reverse?: boolean): number => {
    const clamped = Math.max(0, Math.min(100, value));
    const flipped = reverse ? 100 - clamped : clamped;
    return Math.max(1, Math.min(5, Math.round(1 + (flipped / 100) * 4)));
  }, []);

  const submitToBackend = useCallback(
    async (finalAnswers: Record<string, number>) => {
      const responses = BIG_FIVE_QUESTIONS.map((q, idx) => {
        const raw = finalAnswers[q.id];
        const value = raw === undefined ? 50 : raw;
        return {
          question_id: idx + 1,
          dimension: q.dimension,
          response: toLikert(value, q.reverse),
        };
      });
      try {
        await api("/api/v1/onboarding/quiz", {
          method: "POST",
          body: JSON.stringify({ responses }),
        });
        await refresh();
        return true;
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Couldn't save the quiz — try again.",
        );
        return false;
      }
    },
    [refresh, toLikert],
  );

  const currentQuestion = BIG_FIVE_QUESTIONS[step];
  const currentVal = answers[currentQuestion?.id] ?? DEFAULT_VALUE;

  // Keep latest answers in a ref so async/timeout callbacks see fresh state
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const setValue = useCallback(
    (next: number) => {
      if (!currentQuestion) return;
      setAnswers((prev) => {
        const updated = { ...prev, [currentQuestion.id]: next };
        answersRef.current = updated;
        return updated;
      });
    },
    [currentQuestion],
  );

  const goNext = useCallback(() => {
    if (advancing || !currentQuestion) return;
    setAdvancing(true);

    // Brief asker reaction
    if (currentQuestion.reaction) {
      setReactionFor(step);
    }

    // Move forward after a short beat — feels snappy
    window.setTimeout(async () => {
      if (step >= TOTAL - 1) {
        // Quiz complete — persist & navigate. Use ref for freshest answers.
        const finalAnswers = answersRef.current;
        const scores = scoreQuiz(finalAnswers);
        try {
          window.localStorage.setItem(
            STORAGE_KEYS.personality,
            JSON.stringify({ scores, answers: finalAnswers, completedAt: Date.now() }),
          );
        } catch {
          // ignore — proceed
        }
        setSubmitting(true);
        const ok = await submitToBackend(finalAnswers);
        setSubmitting(false);
        if (ok) {
          router.push("/onboarding/calibrating");
        } else {
          setAdvancing(false);
        }
        return;
      }
      setStep((s) => s + 1);
      setAdvancing(false);
    }, 380);
  }, [advancing, currentQuestion, router, step, submitToBackend]);

  const goBack = useCallback(() => {
    if (step === 0 || advancing) return;
    setStep((s) => s - 1);
  }, [advancing, step]);

  const handleSkip = useCallback(() => {
    setValue(DEFAULT_VALUE);
    goNext();
  }, [goNext, setValue]);

  // ───────── Keyboard controls ─────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (advancing) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setValue(Math.min(100, currentVal + 5));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setValue(Math.max(0, currentVal - 5));
      } else if (e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Backspace" && step > 0) {
        // Soft undo last
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advancing, currentVal, goBack, goNext, setValue, step]);

  // Clear reaction after it has had time to play (matches MemberPeek duration)
  useEffect(() => {
    if (reactionFor === null) return;
    const t = setTimeout(() => setReactionFor(null), 1500);
    return () => clearTimeout(t);
  }, [reactionFor]);

  const reactionMember = useMemo(() => {
    if (reactionFor === null) return null;
    return BIG_FIVE_QUESTIONS[reactionFor];
  }, [reactionFor]);

  return (
    <div className="w-full max-w-3xl">
      {/* Progress */}
      <div className="mb-6 md:mb-8">
        <StepProgress total={TOTAL} current={step} />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-bold text-white/45">
            Question {step + 1} of {TOTAL}
          </p>
          <p className="text-[11px] tracking-[0.22em] uppercase font-[var(--font-label)] font-semibold text-white/30">
            Step 2 of 3 · Calibration
          </p>
        </div>
      </div>

      {/* Question stage */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              value={currentVal}
              onChange={setValue}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0 || advancing}
          className={`text-sm font-semibold text-white/50 hover:text-white/80 transition-colors ${
            step === 0 ? "opacity-30 pointer-events-none" : ""
          }`}
        >
          ← Back
        </button>

        <AuroraButton
          variant="primary"
          size="lg"
          onClick={goNext}
          disabled={submitting}
          iconRight={
            <span className="material-symbols-outlined text-[18px]">
              {step >= TOTAL - 1 ? "auto_awesome" : "arrow_forward"}
            </span>
          }
        >
          {submitting
            ? "Calibrating…"
            : step >= TOTAL - 1
              ? "Meet the council"
              : "Continue"}
        </AuroraButton>

        <button
          type="button"
          onClick={handleSkip}
          disabled={advancing}
          className="text-sm font-semibold text-white/30 hover:text-white/55 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Brief reaction from the asker between questions */}
      <AnimatePresence>
        {reactionFor !== null && reactionMember?.reaction && (
          <MemberPeek
            key={`react-${reactionMember.id}-${reactionFor}`}
            memberId={reactionMember.vibeColor}
            position={reactionFor % 2 === 0 ? "right" : "left"}
            text={reactionMember.reaction}
            duration={1400}
            triggerKey={`react-${reactionFor}`}
          />
        )}
      </AnimatePresence>

      {error && (
        <p
          role="alert"
          className="mt-6 text-sm text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/30 rounded-xl px-3 py-2"
        >
          {error}
        </p>
      )}

      {/* Subtle motion footer for vibe */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="mt-10 text-center text-[10px] tracking-[0.28em] uppercase font-[var(--font-label)] font-bold text-white/25"
      >
        No wrong answers. Just true ones.
      </motion.div>
    </div>
  );
}
