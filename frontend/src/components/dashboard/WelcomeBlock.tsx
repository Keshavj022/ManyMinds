"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { COUNCIL_MEMBERS } from "@/lib/design-tokens";
import MemberAvatar from "@/components/ui/MemberAvatar";
import { STORAGE_KEYS } from "@/lib/onboarding";
import { useAuth } from "@/lib/auth-context";
import { useUserActivity } from "@/lib/use-user-activity";

// For returning users — a mix of statuses makes the row feel alive.
// For brand-new users we render everyone as "online" so it doesn't lie
// about who's "thinking" or "talking" before any conversation has happened.
const RETURNING_STATUSES = ["online", "thinking", "online", "online", "talking"] as const;
const NEW_USER_STATUSES = ["online", "online", "online", "online", "online"] as const;

export default function WelcomeBlock() {
  const { user } = useAuth();
  const { ready, hasSessions } = useUserActivity();
  const [name, setName] = useState("Friend");
  const [greetingSubtitle, setGreetingSubtitle] = useState<string | null>(null);

  useEffect(() => {
    // Prefer the authenticated username; fall back to the profile blob from
    // demographics (which can carry a friendlier "name" the user typed).
    if (user?.username) setName(user.username.split("@")[0]);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.profile);
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string };
        if (parsed.name) setName(parsed.name.split(" ")[0]);
      }
    } catch {
      // ignore
    }
  }, [user]);

  // Subtitle picks between first-visit copy and time-of-day greetings once
  // we know whether the user has any past sessions.
  useEffect(() => {
    if (!ready) {
      setGreetingSubtitle(null);
      return;
    }
    if (!hasSessions) {
      setGreetingSubtitle(
        "First time here. The five of them are around whenever you are — start a chat and they'll take it from there.",
      );
      return;
    }
    setGreetingSubtitle(subtitleForTimeOfDay());
  }, [ready, hasSessions]);

  const heading = hasSessions ? "Welcome back" : "Welcome";
  const statuses = hasSessions ? RETURNING_STATUSES : NEW_USER_STATUSES;

  return (
    <section className="space-y-7">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-[var(--font-headline)] text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
          {heading}, <span className="aurora-text">{name}</span>.
        </h1>
        <p
          className="mt-3 text-white/55 text-base md:text-lg max-w-2xl min-h-[1.6em]"
          // Keep the slot reserved during the brief activity-check so the
          // member row doesn't reflow when the subtitle resolves.
          aria-live="polite"
        >
          {greetingSubtitle ?? ""}
        </p>
      </motion.div>

      {/* Council line-up — avatar row with staggered signature greetings */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {COUNCIL_MEMBERS.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
            className="flex flex-col items-center text-center gap-2 group cursor-default"
          >
            <MemberAvatar id={m.id} size="lg" status={statuses[i]} glow />
            <div>
              <p className="text-sm font-bold text-white">{m.name}</p>
              <p className="text-[10px] uppercase tracking-wider font-[var(--font-label)] text-white/40">
                {m.role.replace(/^The /, "")}
              </p>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.12, duration: 0.45 }}
              className="text-[11px] text-white/55 leading-snug italic min-h-[2.4em]"
            >
              &ldquo;{m.signatureGreeting}&rdquo;
            </motion.p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function subtitleForTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 5) return "The room is quiet. Whatever's keeping you up — we're here.";
  if (h < 12) return "The council just made coffee. What's on your mind today?";
  if (h < 17) return "Mid-day pause. The five of us are around if you want to think out loud.";
  if (h < 22) return "Evening light. Settle in — there's a lot to talk about.";
  return "Late hours. The room has lamps on, just for you.";
}
