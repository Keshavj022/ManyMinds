"use client";

import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";
import AuroraButton from "@/components/ui/AuroraButton";
import type { ProfileData } from "@/lib/api";
import { LANGUAGES } from "@/lib/onboarding";

const EASE = [0.22, 1, 0.36, 1] as const;

/** "en" → "English" using the same table the onboarding flow offers. */
function languageLabel(code: string): string {
  const match = LANGUAGES.find((l) => l.id === code.toLowerCase());
  return match ? match.label : code;
}

/** Whole years since a birthday, or null if the date is missing / unparseable. */
function ageFrom(dob: string | null): number | null {
  if (!dob) return null;
  const then = new Date(dob);
  if (Number.isNaN(then.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - then.getFullYear();
  const m = now.getMonth() - then.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < then.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** Initials from a display name — up to two letters, always something. */
function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Fact {
  icon: string;
  label: string;
  value: string;
}

export default function IdentityHeader({ profile }: { profile: ProfileData }) {
  const displayName =
    profile.full_name?.trim() || profile.username?.trim() || "Friend";
  const initials = monogram(displayName);
  const age = ageFrom(profile.date_of_birth);

  // Only honest, present facts — anything null is simply omitted.
  const facts: Fact[] = [];
  if (profile.location?.trim()) {
    facts.push({
      icon: "location_on",
      label: "Home base",
      value: profile.location.trim(),
    });
  }
  if (age != null) {
    facts.push({ icon: "cake", label: "Age", value: `${age}` });
  }
  if (profile.gender?.trim()) {
    facts.push({
      icon: "person",
      label: "Identity",
      value: profile.gender.trim(),
    });
  }
  if (profile.preferred_language?.trim()) {
    facts.push({
      icon: "translate",
      label: "Language",
      value: languageLabel(profile.preferred_language.trim()),
    });
  }

  // "Entirely missing demographics" — nothing but the name to show.
  const demographicsMissing =
    facts.length === 0 && !profile.bio?.trim() && !profile.full_name?.trim();

  return (
    <GlassCard variant="strong" className="rounded-3xl p-6 lg:p-8 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative shrink-0"
        >
          <div
            className="grid place-items-center w-20 h-20 lg:w-24 lg:h-24 rounded-3xl font-bold font-[var(--font-headline)] text-2xl lg:text-3xl text-[#15121d] ring-2 ring-[var(--color-warm-soft)]"
            style={{
              background:
                "linear-gradient(135deg, var(--color-warm) 0%, rgba(216,163,184,0.85) 100%)",
              boxShadow: "0 0 32px var(--color-warm-soft)",
            }}
          >
            {initials}
          </div>
        </motion.div>

        <div className="min-w-0 space-y-1">
          <p className="text-[11px] uppercase tracking-[0.32em] font-[var(--font-label)] text-white/50">
            This is you
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold font-[var(--font-headline)] text-white tracking-tight truncate">
            {displayName}
          </h1>
          {profile.email?.trim() && (
            <p className="text-sm text-white/55 truncate">{profile.email}</p>
          )}
        </div>
      </div>

      {demographicsMissing ? (
        <div className="mt-6 rounded-2xl glass-warm p-5 space-y-3">
          <p className="text-sm text-white/70 leading-relaxed">
            We barely know you yet. Finish the few quick questions and the five
            can start tuning to you.
          </p>
          <AuroraButton href="/onboarding/demographics" size="sm">
            Finish your profile
          </AuroraButton>
        </div>
      ) : (
        <>
          {facts.length > 0 && (
            <dl className="mt-6 grid grid-cols-2 gap-3">
              {facts.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.06, ease: EASE }}
                  className="rounded-2xl bg-white/[0.03] border border-white/[0.06] px-4 py-3"
                >
                  <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-[var(--font-label)] font-semibold text-white/45">
                    <span className="material-symbols-outlined text-[14px] text-[var(--color-warm)]">
                      {f.icon}
                    </span>
                    {f.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-white/90 truncate">
                    {f.value}
                  </dd>
                </motion.div>
              ))}
            </dl>
          )}

          {profile.bio?.trim() && (
            <p className="mt-5 text-sm text-white/70 leading-relaxed italic border-l-2 border-[var(--color-warm)]/40 pl-4">
              &ldquo;{profile.bio.trim()}&rdquo;
            </p>
          )}
        </>
      )}
    </GlassCard>
  );
}
