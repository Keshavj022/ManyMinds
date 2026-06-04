"use client";

import { useEffect, useState } from "react";
import { api, type ChatSession } from "./api";
import { useAuth } from "./auth-context";

interface UserActivity {
  /** True once we've finished the first check. */
  ready: boolean;
  /** True if the user has at least one chat session on the backend. */
  hasSessions: boolean;
}

/**
 * Lightweight check for "is this a brand-new account?".
 *
 * The dashboard surfaces (Insights, Observations, the welcome subtitle) used
 * to render hand-authored mock content unconditionally. That looks dishonest
 * on a fresh signup — the user can't have insights yet. This hook fetches
 * the session list once and lets each component flip to an empty state.
 *
 * Returns optimistic defaults during loading so we never flash mock content
 * before the answer arrives: `ready=false, hasSessions=false`.
 */
export function useUserActivity(): UserActivity {
  const { user, status } = useAuth();
  const [state, setState] = useState<UserActivity>({ ready: false, hasSessions: false });

  useEffect(() => {
    // Wait until auth has settled. Anonymous users are treated as "new".
    if (status === "loading") return;
    if (!user) {
      setState({ ready: true, hasSessions: false });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const sessions = await api<ChatSession[]>("/api/v1/chat/sessions?limit=1");
        if (!cancelled) {
          setState({ ready: true, hasSessions: sessions.length > 0 });
        }
      } catch {
        if (!cancelled) {
          // On error, fail to "new user" — strictly better than rendering
          // stale mock content for someone who can't fetch their sessions.
          setState({ ready: true, hasSessions: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, status]);

  return state;
}
