"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

function deriveUsername(seed: string, fallback: string): string {
  const cleaned = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30);
  if (cleaned.length >= 2) return cleaned;
  return `${fallback}${Math.floor(Math.random() * 9000 + 1000)}`;
}

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("");
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
      const username = deriveUsername(name || email.split("@")[0], "friend");
      await signup({ email: email.trim(), username, password });
      if (typeof window !== "undefined" && name.trim()) {
        try {
          const merged = { name: name.trim() };
          window.localStorage.setItem(
            "manyminds:profile",
            JSON.stringify(merged),
          );
        } catch {
          /* ignore */
        }
      }
      router.push("/onboarding/demographics");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.detail && typeof err.detail === "object" && "detail" in err.detail
            ? String((err.detail as { detail: unknown }).detail)
            : err.message
          : "Something went wrong. Try again.";
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
          New account
        </p>
        <h2 className="font-[var(--font-headline)] text-3xl md:text-4xl font-semibold text-white mb-2">
          Create your <span className="aurora-text">Council</span>
        </h2>
        <p className="text-white/55 text-sm">
          Five minds. One table. About 90 seconds to set up.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label
            htmlFor="signup-name"
            className="block text-xs font-[var(--font-label)] font-semibold text-white/70 ml-1"
          >
            Full Name
          </label>
          <input
            id="signup-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="w-full rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm"
            placeholder="Ada Lovelace"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="signup-email"
            className="block text-xs font-[var(--font-label)] font-semibold text-white/70 ml-1"
          >
            Email
          </label>
          <input
            id="signup-email"
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
          <label
            htmlFor="signup-password"
            className="block text-xs font-[var(--font-label)] font-semibold text-white/70 ml-1"
          >
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm"
            placeholder="At least 8 characters"
          />
          <p className="text-[10px] text-white/40 ml-2 mt-1">
            Min 8 characters.
          </p>
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
            disabled={busy || !name || !email || password.length < 8}
          >
            {busy ? "Creating your council…" : "Create Account"}
          </AuroraButton>
        </div>

        <p className="text-[10px] text-center text-white/45 leading-relaxed pt-1">
          By signing up, you agree to our{" "}
          <Link
            href="/terms"
            className="underline decoration-white/30 hover:text-white"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline decoration-white/30 hover:text-white"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-7 text-center text-sm text-white/55">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-white font-semibold hover:underline hover:underline-offset-4 decoration-white/30"
        >
          Sign In
        </Link>
      </p>
    </motion.div>
  );
}
