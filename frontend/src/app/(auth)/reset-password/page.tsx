"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AuthField,
  BackToSignIn,
  BusyButton,
  ConfirmCard,
  EASE,
  ErrorChip,
  FormHeader,
  MemberQuip,
} from "@/components/auth/FormKit";
import { ApiError, api } from "@/lib/api";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <ConfirmCard title="This link lost its key">
          <p>
            The reset link is missing its token — happens to the best of
            links. Open the one from your email again, or{" "}
            <Link
              href="/forgot-password"
              className="text-white underline decoration-white/30"
            >
              ask for a fresh one
            </Link>
            .
          </p>
        </ConfirmCard>
        <BackToSignIn />
      </motion.div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < 8) {
      setError("Almost — your new password needs at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those two don't quite match yet. One more look?");
      return;
    }
    setBusy(true);
    try {
      await api<void>("/api/v1/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
        skipAuth: true,
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't set the new password — the link may have expired.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <ConfirmCard title="All set">
          <p>
            Password updated — fresh start, same friends. Taking you back to
            sign in…
          </p>
          <div className="pt-1">
            <MemberQuip id="sage" text="Good. Now, where were we?" />
          </div>
        </ConfirmCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="w-full"
    >
      <FormHeader
        kicker="New password"
        title={
          <>
            A fresh <span className="aurora-text">start</span>
          </>
        }
        sub="Pick something memorable — at least 8 characters. Rex promises not to peek."
      />

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="reset-new"
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          onBlur={() => setTouchedPassword(true)}
          hint={
            touchedPassword && password.length > 0 && password.length < 8
              ? "A few more characters — eight keeps it safe."
              : undefined
          }
        />

        <AuthField
          id="reset-confirm"
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Type it again"
          onBlur={() => setTouchedConfirm(true)}
          hint={
            touchedConfirm && confirm.length > 0 && password !== confirm
              ? "These two don't quite match yet."
              : undefined
          }
        />

        <AnimatePresence>{error && <ErrorChip>{error}</ErrorChip>}</AnimatePresence>

        <div className="pt-1">
          <BusyButton
            busy={busy}
            busyLabel="Locking it in…"
            disabled={password.length < 8 || password !== confirm}
          >
            Set new password
          </BusyButton>
        </div>
      </form>

      <BackToSignIn />
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams must be inside a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={
        <div className="w-full">
          <p className="text-sm text-white/55">One sec…</p>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
