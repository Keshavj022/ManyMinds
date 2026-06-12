"use client";

import { useEffect, useState } from "react";
import { api, type ChatSession, type ProfileData } from "./api";
import { useAuth } from "./auth-context";

/**
 * The only real, honest facts the dashboard is allowed to show.
 *
 * Everything here comes straight from the backend — the chat session list and
 * the stored onboarding profile. No counts are invented, no activity is
 * implied that didn't happen. For a brand-new account the numbers are simply
 * zero/null and the UI falls back to a warm empty state.
 */
export interface DashboardData {
  /** True once the first fetch has settled (success OR failure). */
  ready: boolean;
  /** Real number of conversations the friend has had. 0 for a new account. */
  sessionCount: number;
  /** The most recent chat session, if any — for "pick up where you left off". */
  lastSession: ChatSession | null;
  /** First name (full_name) → username → "you". Never fabricated. */
  name: string;
  /**
   * Dominant Big Five trait label, capitalised (e.g. "Openness"), or null if
   * the personality quiz hasn't been taken / scored yet.
   */
  dominantTrait: string | null;
}

const LOADING_DEFAULTS: DashboardData = {
  ready: false,
  sessionCount: 0,
  lastSession: null,
  name: "you",
  dominantTrait: null,
};

/**
 * Fetch the real dashboard facts once and expose them with safe defaults.
 *
 * Modeled on `useUserActivity`: optimistic loading defaults so we never flash
 * fabricated content, and on any error we degrade to the "new friend" shape
 * (zero sessions, no insights) rather than showing stale or invented data.
 */
export function useDashboard(): DashboardData {
  const { user, status } = useAuth();
  const [state, setState] = useState<DashboardData>(LOADING_DEFAULTS);

  useEffect(() => {
    // Wait for auth to settle. Anonymous visitors are treated as new friends.
    if (status === "loading") return;
    if (!user) {
      setState({ ...LOADING_DEFAULTS, ready: true });
      return;
    }

    let cancelled = false;

    (async () => {
      // Fetch both facts together. Either may fail independently — a missing
      // profile must not blank out a real session count, and vice versa.
      const [sessionsResult, profileResult] = await Promise.allSettled([
        api<ChatSession[]>("/api/v1/chat/sessions"),
        api<ProfileData>("/api/v1/onboarding/profile"),
      ]);
      if (cancelled) return;

      const sessions =
        sessionsResult.status === "fulfilled" ? sessionsResult.value : [];
      const profile =
        profileResult.status === "fulfilled" ? profileResult.value : null;

      setState({
        ready: true,
        sessionCount: sessions.length,
        lastSession: mostRecentSession(sessions),
        name: pickName(profile, user.username),
        dominantTrait: formatTrait(profile?.personality?.dominant_trait ?? null),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, status]);

  return state;
}

/** Most recent session by `started_at`, or null when there are none. */
function mostRecentSession(sessions: ChatSession[]): ChatSession | null {
  if (sessions.length === 0) return null;
  return sessions.reduce((latest, s) =>
    new Date(s.started_at).getTime() > new Date(latest.started_at).getTime()
      ? s
      : latest,
  );
}

/** Friendly first name: full_name → username → "you". Never invented. */
function pickName(profile: ProfileData | null, username: string): string {
  const full = profile?.full_name?.trim();
  if (full) return full.split(/\s+/)[0];
  const handle = profile?.username?.trim() || username?.trim();
  if (handle) return handle.split("@")[0];
  return "you";
}

/** "openness" → "Openness". Returns null for empty/unknown input. */
function formatTrait(trait: string | null): string | null {
  if (!trait) return null;
  const clean = trait.trim();
  if (!clean) return null;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Human relative time from an ISO timestamp, e.g. "2 days ago", "just now".
 * Shared by the dashboard surfaces so "last talked" copy stays consistent.
 */
export function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
