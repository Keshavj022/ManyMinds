"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            ? "Wrong email or password."
            : err.message
          : "Couldn't sign in. Try again in a moment.";
      setError(msg);
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
      <div className="mb-8 text-center md:text-left">
        <p className="text-[11px] font-[var(--font-label)] uppercase tracking-[0.32em] text-white/55 mb-3">
          Sign in
        </p>
        <h2 className="font-[var(--font-headline)] text-3xl md:text-4xl font-semibold text-white mb-2">
          Welcome <span className="aurora-text">back</span>
        </h2>
        <p className="text-white/55 text-sm">Your council is waiting.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label
            htmlFor="login-email"
            className="block text-xs font-[var(--font-label)] font-semibold text-white/70 ml-1"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label
              htmlFor="login-password"
              className="text-xs font-[var(--font-label)] font-semibold text-white/70"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-white/55 hover:text-white transition-colors"
            >
              Forgot?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm"
            placeholder="••••••••"
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
            disabled={busy || !email || !password}
          >
            {busy ? "Signing you in…" : "Sign In"}
          </AuroraButton>
        </div>
      </form>

      <p className="mt-7 text-center text-sm text-white/55">
        New here?{" "}
        <Link
          href="/signup"
          className="text-white font-semibold hover:underline hover:underline-offset-4 decoration-white/30"
        >
          Build your council
        </Link>
      </p>
    </motion.div>
  );
}
