"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConvoStep from "@/components/onboarding/ConvoStep";
import MemberDots from "@/components/onboarding/MemberDots";
import MemberPeek from "@/components/onboarding/MemberPeek";
import RecapCard, { RecapRow } from "@/components/onboarding/RecapCard";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { councilColors } from "@/lib/design-tokens";
import {
  DEMOGRAPHIC_STEPS,
  GENDER_OPTIONS,
  LANGUAGES,
  STORAGE_KEYS,
  type DemographicAnswers,
} from "@/lib/onboarding";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const EASE = [0.22, 1, 0.36, 1] as const;
const STEP_MEMBERS = DEMOGRAPHIC_STEPS.map((s) => s.member);

function labelFor(key: string, value?: string): string | undefined {
  if (!value) return undefined;
  if (key === "gender")
    return GENDER_OPTIONS.find((o) => o.id === value)?.label ?? value;
  if (key === "language")
    return LANGUAGES.find((o) => o.id === value)?.label ?? value;
  if (key === "birthday") {
    const d = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  }
  return value;
}

export default function DemographicsPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<DemographicAnswers>({ language: "en" });
  const [recap, setRecap] = useState(false);
  const [rexQuip, setRexQuip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = DEMOGRAPHIC_STEPS[step];

  const advance = (value: string) => {
    setAnswers((prev) => ({ ...prev, [current.key]: value }));
    if (step >= DEMOGRAPHIC_STEPS.length - 1) {
      setRecap(true);
      // Rex wasn't given a question — he has opinions about that.
      window.setTimeout(() => setRexQuip(true), 900);
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => advance("");

  const goBack = () => {
    if (recap) {
      setRecap(false);
      return;
    }
    if (step > 0) setStep((s) => s - 1);
  };

  const editStep = (index: number) => {
    setRecap(false);
    setStep(Math.max(0, Math.min(DEMOGRAPHIC_STEPS.length - 1, index)));
  };

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const name = answers.name?.trim() ?? "";
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.profile,
        JSON.stringify({
          name,
          language: answers.language || "en",
          location: answers.location || undefined,
          birthday: answers.birthday || undefined,
          gender: answers.gender || undefined,
        }),
      );
    } catch {
      // ignore — proceed regardless
    }
    try {
      await api("/api/v1/onboarding/demographics", {
        method: "POST",
        body: JSON.stringify({
          full_name: name || null,
          date_of_birth: answers.birthday || null,
          gender: answers.gender || null,
          location: answers.location?.trim() || null,
          preferred_language: answers.language || "en",
        }),
      });
      await refresh();
      router.push("/onboarding/quiz");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "That didn't go through — give it another try in a moment.",
      );
      setBusy(false);
    }
  };

  const recapRows: RecapRow[] = DEMOGRAPHIC_STEPS.map((s) => ({
    key: s.key,
    member: s.member,
    label: s.recapLabel,
    value: labelFor(s.key, answers[s.key]),
  }));

  const firstName = answers.name?.trim().split(" ")[0];

  return (
    <div className="w-full max-w-2xl">
      {/* Header — five dots filling as the council takes turns */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <MemberDots
          members={STEP_MEMBERS}
          current={recap ? DEMOGRAPHIC_STEPS.length : step}
        />
        <p className="text-[11px] tracking-[0.32em] uppercase font-[var(--font-label)] font-bold text-white/45">
          {recap
            ? "Quick double-check"
            : `Getting to know ${firstName ?? "you"} · ${step + 1} of ${DEMOGRAPHIC_STEPS.length}`}
        </p>
      </div>

      {/* A little trail of what's been answered — like scrolling up in a chat */}
      {!recap && step > 0 && (
        <div className="mb-8 space-y-2">
          {DEMOGRAPHIC_STEPS.slice(0, step).map((s, i) => {
            const value = labelFor(s.key, answers[s.key]);
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04, ease: EASE }}
                className="flex items-center gap-3"
              >
                <MemberAvatar id={s.member} size="xs" glow={false} />
                <span
                  className="text-[10px] uppercase tracking-[0.2em] font-[var(--font-label)] font-bold w-20 shrink-0"
                  style={{ color: councilColors[s.member].hex }}
                >
                  {s.recapLabel}
                </span>
                <span className="rounded-full bg-white/[0.05] border border-white/[0.06] px-3.5 py-1 text-xs font-medium text-white/75 truncate">
                  {value ?? "passed on this one"}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* The active beat of the conversation */}
      <AnimatePresence mode="wait">
        {recap ? (
          <RecapCard
            key="recap"
            rows={recapRows}
            busy={busy}
            error={error}
            onConfirm={handleConfirm}
            onEdit={editStep}
          />
        ) : (
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <ConvoStep
              step={current}
              initialValue={answers[current.key] ?? ""}
              onSubmit={advance}
              onSkip={current.optional ? skip : undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back — quietly available once there's somewhere to go */}
      {!recap && step > 0 && (
        <motion.button
          type="button"
          onClick={goBack}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 inline-flex items-center gap-1.5 text-sm font-semibold text-white/40 hover:text-white/75 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          previous question
        </motion.button>
      )}

      <AnimatePresence>
        {rexQuip && recap && (
          <MemberPeek
            key="rex-recap"
            memberId="rex"
            position="left"
            text="Nobody asked me anything, which is rude. Looks right to me though."
            duration={4600}
            onComplete={() => setRexQuip(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
