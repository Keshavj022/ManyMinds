"use client";

/**
 * Shared form pieces for the auth pages (login / signup / forgot / reset).
 * The auth layout owns the room; these own the form column — warm focus
 * rings, friendly inline nudges, breathing busy buttons and member quips.
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { InputHTMLAttributes, ReactNode, useState } from "react";
import AuroraButton from "@/components/ui/AuroraButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import {
  COUNCIL_MEMBERS,
  CouncilMemberId,
  councilColors,
} from "@/lib/design-tokens";

export const EASE = [0.22, 1, 0.36, 1] as const;

/* Candle-light focus ring. Inline style so it wins over the global
   (unlayered) lilac `input:focus` rule in globals.css. */
const WARM_FOCUS: React.CSSProperties = {
  borderColor: "rgba(224, 176, 131, 0.45)",
  background: "rgba(255, 255, 255, 0.045)",
  boxShadow:
    "0 0 0 3px rgba(224, 176, 131, 0.13), 0 0 28px rgba(224, 176, 131, 0.10)",
};

/* ------------------------------- FormHeader ------------------------------ */

export function FormHeader({
  kicker,
  title,
  sub,
  children,
}: {
  kicker: string;
  title: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 text-center md:text-left">
      <p className="mb-3 text-[11px] font-[var(--font-label)] uppercase tracking-[0.32em] text-white/55">
        {kicker}
      </p>
      <h2 className="mb-2 font-[var(--font-headline)] text-3xl font-semibold text-white md:text-4xl">
        {title}
      </h2>
      {sub ? <p className="text-sm leading-relaxed text-white/55">{sub}</p> : null}
      {children}
    </div>
  );
}

/* -------------------------------- AuthField ------------------------------ */

interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id"> {
  id: string;
  label: string;
  /** Optional element at the right end of the label row (e.g. "Forgot?"). */
  labelEnd?: ReactNode;
  /** Friendly inline nudge under the field — never a red wall. */
  hint?: ReactNode;
}

export function AuthField({
  id,
  label,
  labelEnd,
  hint,
  onFocus,
  onBlur,
  ...rest
}: AuthFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <label
          htmlFor={id}
          className="text-xs font-[var(--font-label)] font-semibold text-white/70"
        >
          {label}
        </label>
        {labelEnd}
      </div>
      <input
        id={id}
        className="w-full rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-white/30"
        style={focused ? WARM_FOCUS : undefined}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {hint ? (
        <motion.p
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="px-1 text-xs leading-relaxed"
          style={{ color: "rgba(224, 176, 131, 0.85)" }}
        >
          {hint}
        </motion.p>
      ) : null}
    </div>
  );
}

/* -------------------------------- ErrorChip ------------------------------ */

export function ErrorChip({ children }: { children: ReactNode }) {
  return (
    <motion.p
      role="alert"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex items-start gap-2.5 rounded-2xl border border-[rgba(217,124,124,0.18)] bg-[rgba(217,124,124,0.08)] px-4 py-3 text-[13px] leading-relaxed text-[#e6b3b3]"
    >
      <span
        aria-hidden
        className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-danger)]"
      />
      <span>{children}</span>
    </motion.p>
  );
}

/* -------------------------------- BusyButton ----------------------------- */

export function BusyButton({
  busy,
  busyLabel,
  disabled,
  children,
}: {
  busy: boolean;
  busyLabel: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <AuroraButton
      type="submit"
      variant="primary"
      size="lg"
      fullWidth
      disabled={disabled || busy}
      className={
        busy
          ? "animate-pulse-soft cursor-wait"
          : "disabled:cursor-not-allowed disabled:opacity-45 disabled:saturate-50"
      }
      icon={
        busy ? (
          <span
            aria-hidden
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#15121d]/25 border-t-[#15121d]"
          />
        ) : undefined
      }
    >
      {busy ? busyLabel : children}
    </AuroraButton>
  );
}

/* -------------------------------- MemberQuip ----------------------------- */

/** One council member saying a small thing. Wrap in AnimatePresence to swap. */
export function MemberQuip({
  id,
  text,
  className = "",
}: {
  id: CouncilMemberId;
  text: string;
  className?: string;
}) {
  const member = COUNCIL_MEMBERS.find((m) => m.id === id);
  const color = councilColors[id];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={`flex min-w-0 items-center gap-2.5 ${className}`}
    >
      <MemberAvatar id={id} size="xs" glow={false} className="animate-pulse-soft" />
      <p className="min-w-0 text-[13px] leading-snug text-white/60">
        <span className="font-semibold" style={{ color: color.hex }}>
          {member?.name ?? id}
        </span>
        <span className="text-white/30"> — </span>
        <span className="italic">&ldquo;{text}&rdquo;</span>
      </p>
    </motion.div>
  );
}

/* ------------------------------- ConfirmCard ----------------------------- */

/** Calm confirmation card for success states (forgot / reset). */
export function ConfirmCard({
  title,
  children,
}: {
  title?: ReactNode;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="glass-warm rounded-3xl p-7"
    >
      {title ? (
        <p className="mb-2 font-[var(--font-headline)] text-lg font-semibold text-white">
          {title}
        </p>
      ) : null}
      <div className="space-y-3 text-sm leading-relaxed text-white/75">
        {children}
      </div>
    </motion.div>
  );
}

/* ----------------------------- BackToSignIn ------------------------------ */

export function BackToSignIn({ label = "Back to sign in" }: { label?: string }) {
  return (
    <p className="mt-7 text-center text-sm text-white/55">
      <Link
        href="/login"
        className="group inline-flex items-center justify-center gap-1.5 transition-colors hover:text-white"
      >
        <span className="material-symbols-outlined text-[16px] transition-transform group-hover:-translate-x-1">
          arrow_back
        </span>
        {label}
      </Link>
    </p>
  );
}
