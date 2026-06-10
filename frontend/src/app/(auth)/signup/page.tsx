"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { CouncilMemberId } from "@/lib/design-tokens";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function deriveUsername(seed: string, fallback: string): string {
  const cleaned = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30);
  if (cleaned.length >= 2) return cleaned;
  return `${fallback}${Math.floor(Math.random() * 9000 + 1000)}`;
}

type FieldKey = "name" | "email" | "password";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which field they're in right now — drives the live council reaction.
  const [active, setActive] = useState<FieldKey | null>(null);
  const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
    name: false,
    email: false,
    password: false,
  });

  const nameOk = name.trim().length > 0;
  const emailOk = EMAIL_RE.test(email.trim());
  const passwordOk = password.length >= 8;

  // The council reacts as you type — one member per field.
  const reaction: { key: string; id: CouncilMemberId; text: string } | null =
    (() => {
      if (active === "name") {
        const trimmed = name.trim();
        return trimmed.length >= 2
          ? { key: "name-named", id: "echo", text: `${trimmed}. We like it already.` }
          : { key: "name", id: "echo", text: "Go on — what should we call you?" };
      }
      if (active === "email") {
        return {
          key: "email",
          id: "aria",
          text: "Noted. Filed under ‘how to find you again.’",
        };
      }
      if (active === "password") {
        return { key: "password", id: "rex", text: "Type away — we won't peek. Promise." };
      }
      return null;
    })();

  const markTouched = (field: FieldKey) =>
    setTouched((t) => (t[field] ? t : { ...t, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!nameOk || !emailOk || !passwordOk) {
      setTouched({ name: true, email: true, password: true });
      return;
    }
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
          : "Something hiccuped on our side. Give it another go.";
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
        kicker="New here"
        title={
          <>
            Come meet <span className="aurora-text">everyone</span>
          </>
        }
        sub="Five friends, one table. You'll be mid-conversation in about 90 seconds."
      >
        {/* The council reacts as you type — fixed height, no layout shift. */}
        <div className="mt-4 flex min-h-[26px] justify-center md:justify-start">
          <AnimatePresence mode="wait">
            {reaction && (
              <MemberQuip key={reaction.key} id={reaction.id} text={reaction.text} />
            )}
          </AnimatePresence>
        </div>
      </FormHeader>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="signup-name"
          label="Your name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          placeholder="Ada Lovelace"
          onFocus={() => setActive("name")}
          onBlur={() => {
            setActive((a) => (a === "name" ? null : a));
            markTouched("name");
          }}
          hint={
            touched.name && !nameOk
              ? "Just so they know what to call you."
              : undefined
          }
        />

        <AuthField
          id="signup-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
          onFocus={() => setActive("email")}
          onBlur={() => {
            setActive((a) => (a === "email" ? null : a));
            markTouched("email");
          }}
          hint={
            touched.email && !emailOk
              ? email.trim()
                ? "That email looks a touch off — mind double-checking?"
                : "We'll need this one to let you back in later."
              : undefined
          }
        />

        <AuthField
          id="signup-password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          onFocus={() => setActive("password")}
          onBlur={() => {
            setActive((a) => (a === "password" ? null : a));
            markTouched("password");
          }}
          hint={
            touched.password && !passwordOk
              ? "Almost — eight characters keeps things cozy and safe."
              : undefined
          }
        />

        <AnimatePresence>{error && <ErrorChip>{error}</ErrorChip>}</AnimatePresence>

        <div className="pt-1">
          <BusyButton
            busy={busy}
            busyLabel="Pulling up a chair for you…"
            disabled={!nameOk || !emailOk || !passwordOk}
          >
            Take your seat
          </BusyButton>
        </div>

        <p className="pt-1 text-center text-[11px] leading-relaxed text-white/45">
          By joining, you&apos;re okay with our{" "}
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
        Been here before?{" "}
        <Link
          href="/login"
          className="font-semibold text-white decoration-white/30 hover:underline hover:underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
