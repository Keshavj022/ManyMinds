"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [delivery, setDelivery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ accepted: boolean; delivery: string }>(
        "/api/v1/auth/password-reset/request",
        {
          method: "POST",
          body: JSON.stringify({ email: email.trim() }),
          skipAuth: true,
        },
      );
      setDelivery(res.delivery);
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "That didn't go through. Give it another go in a moment.",
      );
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
        kicker="Forgot password"
        title={
          <>
            Happens to the <span className="aurora-text">best of us</span>
          </>
        }
        sub="Drop your email — if it rings a bell, a way back in is on its way."
      />

      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.form
            key="form"
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
          >
            <AuthField
              id="forgot-email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />

            <AnimatePresence>
              {error && <ErrorChip>{error}</ErrorChip>}
            </AnimatePresence>

            <div className="pt-1">
              <BusyButton
                busy={busy}
                busyLabel="Sending a way back in…"
                disabled={!email}
              >
                Send reset link
              </BusyButton>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <ConfirmCard title="Check your inbox">
              <p>
                If <span className="font-semibold text-white">{email}</span>{" "}
                rings a bell on our end, a reset link is already on its way.
                It&apos;s good for 30 minutes.
              </p>
              {delivery === "console" && (
                <p className="text-xs leading-relaxed text-white/55">
                  Heads-up: no email provider is configured on this server, so
                  the reset link was logged to the backend console. Paste it
                  into your browser from there.
                </p>
              )}
              <div className="pt-1">
                <MemberQuip
                  id="echo"
                  text="It's on its way. Take a breath — we'll be right here."
                />
              </div>
            </ConfirmCard>
          </motion.div>
        )}
      </AnimatePresence>

      <BackToSignIn />
    </motion.div>
  );
}
