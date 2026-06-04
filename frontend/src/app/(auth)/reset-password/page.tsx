"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import { ApiError, api } from "@/lib/api";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="rounded-2xl p-6 glass text-sm text-white/75 leading-relaxed">
        This reset link is missing its token. Open the link from your email
        again, or{" "}
        <Link href="/forgot-password" className="text-white underline decoration-white/30">
          request a fresh one
        </Link>
        .
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
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
          : "Couldn't reset the password. The link may have expired.",
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
        className="rounded-2xl p-6 glass text-sm text-white/85 leading-relaxed"
      >
        Password updated. Redirecting you to sign in…
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="mb-2 text-center md:text-left">
        <p className="text-[11px] font-[var(--font-label)] uppercase tracking-[0.32em] text-white/55 mb-3">
          Set a new password
        </p>
        <h2 className="font-[var(--font-headline)] text-3xl md:text-4xl font-semibold text-white mb-2">
          Reset your <span className="aurora-text">password</span>
        </h2>
        <p className="text-white/55 text-sm">
          Pick something memorable. At least 8 characters.
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="reset-new"
          className="block text-xs font-[var(--font-label)] font-semibold text-white/70 ml-1"
        >
          New password
        </label>
        <input
          id="reset-new"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm"
          placeholder="At least 8 characters"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="reset-confirm"
          className="block text-xs font-[var(--font-label)] font-semibold text-white/70 ml-1"
        >
          Confirm new password
        </label>
        <input
          id="reset-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm"
          placeholder="Type it again"
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
          disabled={busy || password.length < 8 || password !== confirm}
        >
          {busy ? "Updating…" : "Set new password"}
        </AuroraButton>
      </div>

      <p className="text-center text-sm text-white/55">
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
    </form>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams must be inside a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={
        <div className="w-full">
          <p className="text-sm text-white/55">Loading…</p>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
