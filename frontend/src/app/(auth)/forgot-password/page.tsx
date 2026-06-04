"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
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
          : "Couldn't submit your request. Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <div className="mb-7 text-center md:text-left">
        <p className="text-[11px] font-[var(--font-label)] uppercase tracking-[0.32em] text-white/55 mb-3">
          Forgot password
        </p>
        <h2 className="font-[var(--font-headline)] text-3xl md:text-4xl font-semibold text-white mb-2">
          Reset your <span className="aurora-text">password</span>
        </h2>
        <p className="text-white/55 text-sm">
          Drop your email — if there&apos;s an account, we&apos;ll send a reset link.
        </p>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="forgot-email"
              className="block text-xs font-[var(--font-label)] font-semibold text-white/70 ml-1"
            >
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/30 rounded-xl px-3 py-2"
            >
              {error}
            </p>
          )}

          <div className="pt-1">
            <AuroraButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={busy || !email}
            >
              {busy ? "Sending…" : "Send reset link"}
            </AuroraButton>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl p-6 glass">
          <p className="text-sm text-white/80 leading-relaxed">
            If an account exists for{" "}
            <span className="text-white font-semibold">{email}</span>, a reset link
            is on its way. The link expires in 30 minutes.
          </p>
          {delivery === "console" && (
            <p className="mt-3 text-xs text-white/55 leading-relaxed">
              Heads-up: no email provider is configured on this server, so the
              reset link was logged to the backend console. Paste it into your
              browser from there.
            </p>
          )}
        </div>
      )}

      <p className="mt-7 text-center text-sm text-white/55">
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-1.5 hover:text-white transition-colors group"
        >
          <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-1 transition-transform">
            arrow_back
          </span>
          Back to Sign In
        </Link>
      </p>
    </motion.div>
  );
}
