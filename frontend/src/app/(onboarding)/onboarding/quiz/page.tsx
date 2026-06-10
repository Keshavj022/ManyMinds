"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import TypingDots from "@/components/ui/TypingDots";
import QuizCard from "@/components/onboarding/QuizCard";
import QuizProgress from "@/components/onboarding/QuizProgress";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import {
  BIG_FIVE_QUESTIONS,
  STORAGE_KEYS,
  scoreQuiz,
  toBackendResponse,
} from "@/lib/onboarding";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const TOTAL = BIG_FIVE_QUESTIONS.length;
const ADVANCE_DELAY = 350;
const EASE = [0.22, 1, 0.36, 1] as const;

export default function PersonalityQuizPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [advancing, setAdvancing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = BIG_FIVE_QUESTIONS[step];

  // Keep the freshest answers visible to timeout callbacks.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const submitToBackend = useCallback(
    async (finalAnswers: Record<string, number>) => {
      const responses = BIG_FIVE_QUESTIONS.map((q, idx) => ({
        question_id: idx + 1,
        dimension: q.dimension,
        response: toBackendResponse(q, finalAnswers[q.id] ?? 3),
      }));
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
            : "That didn't save — give it another go.",
        );
        return false;
      }
    },
    [refresh],
  );

  const finishQuiz = useCallback(async () => {
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
    if (ok) {
      router.push("/onboarding/calibrating");
    } else {
      setSubmitting(false);
      setAdvancing(false);
    }
  }, [router, submitToBackend]);

  const pick = useCallback(
    (value: number) => {
      if (advancing || submitting || !currentQuestion) return;
      setAdvancing(true);
      setDirection(1);
      setAnswers((prev) => {
        const updated = { ...prev, [currentQuestion.id]: value };
        answersRef.current = updated;
        return updated;
      });
      // A springy beat to enjoy the pick, then the next card slides in.
      window.setTimeout(() => {
        if (step >= TOTAL - 1) {
          void finishQuiz();
          return;
        }
        setStep((s) => s + 1);
        setAdvancing(false);
      }, ADVANCE_DELAY);
    },
    [advancing, currentQuestion, finishQuiz, step, submitting],
  );

  const goBack = useCallback(() => {
    if (step === 0 || advancing || submitting) return;
    setDirection(-1);
    setStep((s) => s - 1);
  }, [advancing, step, submitting]);

  // 1-5 to answer, ← / backspace to revisit.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        pick(Number(e.key));
      } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBack, pick]);

  const answeredCount = Math.min(TOTAL, step + (advancing ? 1 : 0));

  if (submitting) {
    return (
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
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
            They&rsquo;re comparing notes…
          </h1>
          <p className="mt-3 text-white/55 text-sm">
            Five very different opinions about you are being reconciled.
          </p>
          <div className="mt-6 flex justify-center">
            <TypingDots memberId="sage" />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      {/* progress */}
      <div className="mb-8">
        <QuizProgress total={TOTAL} done={answeredCount} />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-bold text-white/45">
            Card {step + 1} of {TOTAL}
          </p>
          <p className="text-[11px] tracking-[0.22em] uppercase font-[var(--font-label)] font-semibold text-white/30">
            No wrong answers, just true ones
          </p>
        </div>
      </div>

      {/* the deck */}
      <AnimatePresence mode="wait" custom={direction}>
        {currentQuestion && (
          <QuizCard
            key={currentQuestion.id}
            question={currentQuestion}
            value={answers[currentQuestion.id]}
            onPick={pick}
            direction={direction}
          />
        )}
      </AnimatePresence>

      {/* controls */}
      <div className="mt-7 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0 || advancing}
          className={`inline-flex items-center gap-1.5 text-sm font-semibold text-white/40 hover:text-white/75 transition-colors ${
            step === 0 ? "opacity-0 pointer-events-none" : ""
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          previous card
        </button>
        <p className="hidden sm:block text-[11px] tracking-[0.22em] uppercase font-[var(--font-label)] font-semibold text-white/25">
          Tap an orb · or press 1–5
        </p>
      </div>

      {error && (
        <div className="mt-6 flex flex-col items-start gap-3">
          <p
            role="alert"
            className="text-sm text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/30 rounded-xl px-3 py-2"
          >
            {error}
          </p>
          <AuroraButton variant="soft" size="sm" onClick={() => void finishQuiz()}>
            Try sending again
          </AuroraButton>
        </div>
      )}
    </div>
  );
}
