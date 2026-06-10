"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AuroraButton from "@/components/ui/AuroraButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import TypingDots from "@/components/ui/TypingDots";
import RoundDots from "@/components/debate/RoundDots";
import SetupScreen from "@/components/debate/SetupScreen";
import SpeechCard from "@/components/debate/SpeechCard";
import TeamCards from "@/components/debate/TeamCards";
import Verdict from "@/components/debate/Verdict";
import {
  ACTIVE_DEBATE,
  type DebateArgument,
  type DebateMotion,
} from "@/lib/debate-fixtures";
import { COUNCIL_MEMBERS, type CouncilMemberId } from "@/lib/design-tokens";
import { ApiError, api } from "@/lib/api";

interface ApiDebateArgument {
  id: string;
  participant_id: string;
  member_slug: string;
  member_name: string;
  side: "for" | "against" | "moderator";
  round_number: number;
  argument_type: "opening" | "argument" | "rebuttal" | "closing";
  content: string;
  strength_score: number | null;
  created_at: string;
}
interface ApiDebateParticipant {
  id: string;
  council_member_id: string;
  member_slug: string;
  member_name: string;
  side: "for" | "against" | "moderator";
}
interface ApiDebate {
  id: string;
  session_id: string;
  topic: string;
  status: "pending" | "active" | "completed" | "cancelled";
  total_rounds: number;
  current_round: number;
  moderator_member_id: string | null;
  moderator_slug: string | null;
  participants: ApiDebateParticipant[];
  arguments: ApiDebateArgument[];
  started_at: string | null;
  ended_at: string | null;
  next_speaker: ApiDebateParticipant | null;
}
interface ApiAdvanceResponse {
  debate: ApiDebate;
  new_argument: ApiDebateArgument | null;
}

type Phase = "setup" | "active" | "paused" | "verdict";

const ADVANCE_MS = 1800;

const KNOWN_SLUGS: ReadonlyArray<CouncilMemberId> = [
  "aria",
  "rex",
  "sage",
  "nova",
  "echo",
];

function toMemberId(slug: string | null | undefined): CouncilMemberId {
  if (slug && (KNOWN_SLUGS as ReadonlyArray<string>).includes(slug)) {
    return slug as CouncilMemberId;
  }
  return "sage";
}

function apiToMotion(d: ApiDebate): DebateMotion {
  const proMembers = Array.from(
    new Set(
      d.participants.filter((p) => p.side === "for").map((p) => toMemberId(p.member_slug)),
    ),
  );
  const conMembers = Array.from(
    new Set(
      d.participants.filter((p) => p.side === "against").map((p) => toMemberId(p.member_slug)),
    ),
  );
  const args: DebateArgument[] = d.arguments
    .filter((a) => a.side !== "moderator")
    .map((a) => ({
      id: a.id,
      side: a.side === "for" ? "pro" : "con",
      speakerId: toMemberId(a.member_slug),
      text: a.content,
      strength: a.strength_score ?? 0.6,
      roundNumber: a.round_number,
    }));
  const proAvg =
    args.filter((a) => a.side === "pro").reduce((s, a) => s + a.strength, 0) /
    Math.max(1, args.filter((a) => a.side === "pro").length);
  const conAvg =
    args.filter((a) => a.side === "con").reduce((s, a) => s + a.strength, 0) /
    Math.max(1, args.filter((a) => a.side === "con").length);
  return {
    id: d.id,
    title: d.topic,
    topic: d.topic,
    proMembers: proMembers.length > 0 ? proMembers : ACTIVE_DEBATE.proMembers,
    conMembers: conMembers.length > 0 ? conMembers : ACTIVE_DEBATE.conMembers,
    moderatorId: toMemberId(d.moderator_slug),
    rounds: d.total_rounds,
    arguments: args,
    verdict: {
      summary:
        d.status === "completed"
          ? proAvg > conAvg
            ? "The For side carried the room by a measurable edge."
            : conAvg > proAvg
              ? "The Against side carried the room by a measurable edge."
              : "A genuine draw — both sides made their case."
          : ACTIVE_DEBATE.verdict.summary,
      proAverage: Math.round(proAvg * 100),
      conAverage: Math.round(conAvg * 100),
    },
  };
}

export default function DebateArenaPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [debate, setDebate] = useState<DebateMotion | null>(null);
  const [debateId, setDebateId] = useState<string | null>(null);
  const [nextSpeakerId, setNextSpeakerId] = useState<CouncilMemberId | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phaseRef = useRef<Phase>("setup");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const advanceLock = useRef(false);

  const doAdvance = useCallback(async () => {
    if (!debateId || advanceLock.current) return;
    if (phaseRef.current !== "active") return;
    advanceLock.current = true;
    setAdvancing(true);
    try {
      const res = await api<ApiAdvanceResponse>(
        `/api/v1/debate/${debateId}/advance`,
        { method: "POST" },
      );
      setDebate(apiToMotion(res.debate));
      setNextSpeakerId(
        res.debate.next_speaker
          ? toMemberId(res.debate.next_speaker.member_slug)
          : null,
      );
      if (res.debate.status === "completed") setPhase("verdict");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't advance the debate.",
      );
    } finally {
      advanceLock.current = false;
      setAdvancing(false);
    }
  }, [debateId]);

  // Existing auto-refresh: while the debate is live, the next argument
  // arrives on its own after a short beat.
  useEffect(() => {
    if (phase !== "active" || !debateId) return;
    const t = setTimeout(() => {
      void doAdvance();
    }, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [phase, debateId, debate?.arguments.length, doAdvance]);

  // Auto-scroll: keep the newest speech in view as it lands.
  useEffect(() => {
    if (!debate || debate.arguments.length === 0) return;
    feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [debate?.arguments.length, phase, debate]);

  const lastArg: DebateArgument | null =
    debate && debate.arguments.length > 0
      ? debate.arguments[debate.arguments.length - 1]
      : null;
  const currentRound = lastArg ? lastArg.roundNumber : 1;

  const begin = useCallback(async (title: string) => {
    setError(null);
    try {
      const created = await api<ApiDebate>("/api/v1/debate", {
        method: "POST",
        body: JSON.stringify({ topic: title, total_rounds: 3 }),
      });
      setDebateId(created.id);
      setDebate(apiToMotion(created));
      setNextSpeakerId(
        created.next_speaker ? toMemberId(created.next_speaker.member_slug) : null,
      );
      setPhase("active");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `Couldn't start the debate: ${err.message}`
          : "Couldn't start the debate.",
      );
    }
  }, []);

  const pauseResume = () => {
    setPhase((p) => (p === "active" ? "paused" : p === "paused" ? "active" : p));
  };

  // The big friendly button: bring on the next argument right now —
  // resuming first if they were on a breather.
  const nextArgument = () => {
    if (phaseRef.current === "verdict" || phaseRef.current === "setup") return;
    if (phaseRef.current === "paused") {
      phaseRef.current = "active";
      setPhase("active");
    }
    void doAdvance();
  };

  const endDebate = () => setPhase("verdict");

  const reset = () => {
    setDebate(null);
    setDebateId(null);
    setNextSpeakerId(null);
    setPhase("setup");
  };

  const nextSpeakerName = useMemo(() => {
    if (!nextSpeakerId) return null;
    return COUNCIL_MEMBERS.find((m) => m.id === nextSpeakerId)?.name ?? null;
  }, [nextSpeakerId]);

  if (phase === "setup" || !debate) {
    return (
      <div className="relative">
        {error && <ErrorNote message={error} />}
        <SetupScreen onBegin={(t) => void begin(t)} />
      </div>
    );
  }

  const live = phase === "active" || phase === "paused";

  return (
    <div className="relative max-w-4xl mx-auto space-y-7">
      {error && <ErrorNote message={error} />}

      {/* Stage header — the topic is the marquee */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <LivePill phase={phase} />
          <RoundDots round={currentRound} totalRounds={debate.rounds} />
        </div>
        <h1 className="font-[var(--font-headline)] font-bold text-3xl md:text-5xl text-white tracking-tight leading-[1.1]">
          &ldquo;{debate.title}&rdquo;
        </h1>
      </motion.header>

      {/* The two sides + moderator */}
      <TeamCards
        motion={debate}
        activeSpeakerId={lastArg?.speakerId ?? null}
        activeSide={lastArg?.side ?? null}
      />

      {/* Speech feed */}
      <section className="space-y-4" aria-label="Arguments">
        <AnimatePresence initial={false}>
          {debate.arguments.map((a, i) => (
            <SpeechCard
              key={a.id}
              arg={a}
              isLatest={live && i === debate.arguments.length - 1}
            />
          ))}
        </AnimatePresence>

        {debate.arguments.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] p-6 text-sm text-white/45 text-center">
            They&rsquo;re taking their seats…
          </div>
        )}

        {live && advancing && (
          <div className="flex items-center gap-3 px-2">
            {nextSpeakerId && <MemberAvatar id={nextSpeakerId} size="sm" status="thinking" />}
            <TypingDots memberId={nextSpeakerId ?? undefined} />
            <span className="text-xs text-white/45">
              {nextSpeakerName ? `${nextSpeakerName} is winding up…` : "Someone's winding up…"}
            </span>
          </div>
        )}

        <div ref={feedEndRef} />
      </section>

      {/* Controls */}
      {live && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-3 pt-1 pb-4"
        >
          <AuroraButton
            size="lg"
            onClick={nextArgument}
            disabled={advancing}
            iconRight={
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            }
          >
            {advancing ? "Mid-sentence, hang on…" : "Next argument"}
          </AuroraButton>
          <div className="flex items-center gap-2">
            <AuroraButton variant="ghost" size="sm" onClick={pauseResume}>
              {phase === "paused" ? "Carry on" : "Let them breathe"}
            </AuroraButton>
            <AuroraButton variant="ghost" size="sm" onClick={endDebate}>
              Wrap it up
            </AuroraButton>
          </div>
        </motion.div>
      )}

      {/* Verdict */}
      {phase === "verdict" && (
        <Verdict
          verdict={debate.verdict}
          moderatorId={debate.moderatorId}
          onReset={reset}
        />
      )}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="max-w-xl mx-auto mb-4 text-sm text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/30 rounded-xl px-4 py-2.5"
    >
      {message}
    </p>
  );
}

function LivePill({ phase }: { phase: Phase }) {
  if (phase === "verdict") {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/15 bg-white/[0.05] text-white/80">
        <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
        All said
      </span>
    );
  }
  if (phase === "paused") {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[var(--color-warm)]/30 bg-[var(--color-warm-soft)] text-[var(--color-warm)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warm)]" />
        Taking a breath
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
      Live
    </span>
  );
}
