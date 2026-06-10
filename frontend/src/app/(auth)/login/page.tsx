"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AuthField,
  BusyButton,
  EASE,
  ErrorChip,
  FormHeader,
  MemberQuip,
} from "@/components/auth/FormKit";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One member says hi — picked on mount, static after (the layout already
  // has the rotating greeting). Chosen client-side to avoid hydration drift.
  const [quipIdx, setQuipIdx] = useState<number | null>(null);
  useEffect(() => {
    setQuipIdx(Math.floor(Math.random() * COUNCIL_MEMBERS.length));
  }, []);
  const quipMember = quipIdx !== null ? COUNCIL_MEMBERS[quipIdx] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const user = await login({ email: email.trim(), password });
      // Route based on onboarding state reported by the backend.
      if (user.onboarding_step < 1) {
        router.push("/onboarding/demographics");
      } else if (user.onboarding_step < 2) {
        router.push("/onboarding/quiz");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 401
            ? "Hmm, that email and password don't line up. One more try?"
            : err.message
          : "Couldn't get you in just now. Give it another go in a moment.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="w-full"
    >
      <FormHeader
        kicker="Sign in"
        title={
          <>
            Welcome <span className="aurora-text">back</span>
          </>
        }
        sub="They kept your seat warm."
      >
        <div className="mt-4 flex min-h-[26px] justify-center md:justify-start">
          <AnimatePresence>
            {quipMember && (
              <MemberQuip
                key={quipMember.id}
                id={quipMember.id}
                text={quipMember.signatureGreeting}
              />
            )}
          </AnimatePresence>
        </div>
      </FormHeader>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
        />

        <AuthField
          id="login-password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder="••••••••"
          labelEnd={
            <Link
              href="/forgot-password"
              className="text-xs text-white/55 transition-colors hover:text-white"
            >
              Forgot?
            </Link>
          }
        />

        <AnimatePresence>{error && <ErrorChip>{error}</ErrorChip>}</AnimatePresence>

        <div className="pt-1">
          <BusyButton
            busy={busy}
            busyLabel="Letting them know you're here…"
            disabled={!email || !password}
          >
            Step back in
          </BusyButton>
        </div>
      </form>

      <p className="mt-7 text-center text-sm text-white/55">
        First time here?{" "}
        <Link
          href="/signup"
          className="font-semibold text-white decoration-white/30 hover:underline hover:underline-offset-4"
        >
          Come meet everyone
        </Link>
      </p>
    </motion.div>
  );
}
