"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ArgumentCard from "@/components/debate/ArgumentCard";
import SceneStageEmbed from "@/components/chat/SceneStageEmbed";
import SetupScreen from "@/components/debate/SetupScreen";
import Spotlight from "@/components/debate/Spotlight";
import Stage from "@/components/debate/Stage";
import Verdict from "@/components/debate/Verdict";
import { ACTIVE_DEBATE, PAST_DEBATES, type DebateArgument, type DebateMotion } from "@/lib/debate-fixtures";
import type { CouncilMemberId } from "@/lib/design-tokens";
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
            ? "Pro carried the room by a measurable edge."
            : conAvg > proAvg
              ? "Con carried the room by a measurable edge."
              : "A genuine draw — both sides made their case."
          : ACTIVE_DEBATE.verdict.summary,
      proAverage: Math.round(proAvg * 100),
      conAverage: Math.round(conAvg * 100),
    },
  };
}

function argumentsBySide(d: DebateMotion, side: "pro" | "con") {
  return d.arguments.filter((a) => a.side === side);
}

export default function DebateArenaPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [debate, setDebate] = useState<DebateMotion | null>(null);
  const [debateId, setDebateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const phaseRef = useRef<Phase>("setup");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const advanceLock = useRef(false);

  const doAdvance = useCallback(async () => {
    if (!debateId || advanceLock.current) return;
    if (phaseRef.current !== "active") return;
    advanceLock.current = true;
    try {
      const res = await api<ApiAdvanceResponse>(
        `/api/v1/debate/${debateId}/advance`,
        { method: "POST" },
      );
      setDebate(apiToMotion(res.debate));
      if (res.debate.status === "completed") setPhase("verdict");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't advance the debate.",
      );
    } finally {
      advanceLock.current = false;
    }
  }, [debateId]);

  useEffect(() => {
    if (phase !== "active" || !debateId) return;
    const t = setTimeout(() => {
      void doAdvance();
    }, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [phase, debateId, debate?.arguments.length, doAdvance]);

  // For Stage/Spotlight: derive "visible" arguments from what the backend has
  // already produced, plus an empty "upcoming" placeholder for the next slots.
  const visible = useMemo<DebateArgument[]>(
    () => (debate ? debate.arguments : []),
    [debate],
  );
  const upcoming = useMemo<DebateArgument[]>(() => [], []);
  const lastArg: DebateArgument | null =
    visible.length > 0 ? visible[visible.length - 1] : null;
  const currentRound = lastArg ? lastArg.roundNumber : 1;
  const roundProgress = useMemo(() => {
    if (!debate) return 0;
    const inRound = debate.arguments.filter((a) => a.roundNumber === currentRound).length;
    return Math.min(1, inRound / 4);
  }, [debate, currentRound]);

  const proArgs = useMemo(() => (debate ? argumentsBySide(debate, "pro") : []), [debate]);
  const conArgs = useMemo(() => (debate ? argumentsBySide(debate, "con") : []), [debate]);

  const begin = useCallback(async (title: string) => {
    setError(null);
    try {
      const created = await api<ApiDebate>("/api/v1/debate", {
        method: "POST",
        body: JSON.stringify({ topic: title, total_rounds: 3 }),
      });
      setDebateId(created.id);
      setDebate(apiToMotion(created));
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

  const skipNext = () => {
    if (phaseRef.current === "active") void doAdvance();
  };

  const endDebate = () => setPhase("verdict");

  const reset = () => {
    setDebate(null);
    setDebateId(null);
    setPhase("setup");
  };

  if (phase === "setup" || !debate) {
    return (
      <div className="relative">
        {error && (
          <p
            role="alert"
            className="max-w-xl mx-auto mb-4 text-sm text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 border border-[color:var(--color-danger)]/30 rounded-xl px-3 py-2"
          >
            {error}
          </p>
        )}
        <SetupScreen onBegin={(t) => void begin(t)} />
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <LivePill phase={phase} />
            <span className="text-[10px] uppercase tracking-[0.4em] text-white/45 font-[var(--font-label)]">
              motion · round {currentRound} of {debate.rounds}
            </span>
          </div>
          <h1 className="font-[var(--font-headline)] font-bold text-2xl md:text-4xl text-white tracking-tight leading-tight">
            &ldquo;{debate.title}&rdquo;
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ControlButton
            icon={phase === "paused" ? "play_arrow" : "pause"}
            label={phase === "paused" ? "Resume" : "Pause"}
            onClick={pauseResume}
            disabled={phase === "verdict"}
          />
          <ControlButton
            icon="skip_next"
            label="Skip"
            onClick={skipNext}
            disabled={phase === "verdict"}
          />
          <ControlButton
            icon="stop"
            label="End"
            onClick={endDebate}
            disabled={phase === "verdict"}
            danger
          />
        </div>
      </motion.header>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.2fr_2fr] gap-4">
        {/* LEFT — Pro stack */}
        <section className="space-y-3">
          <SideHeader side="pro" count={proArgs.length} />
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {[...proArgs].reverse().map((a, i) => (
                <ArgumentCard key={a.id} arg={a} isMostRecent={i === 0} />
              ))}
            </AnimatePresence>
            {proArgs.length === 0 && <Empty side="pro" />}
          </div>
        </section>

        {/* CENTER — Stage */}
        <section className="glass-strong rounded-3xl p-3 self-start sticky top-4 min-h-[480px]">
          <Stage
            motion={debate}
            currentRound={currentRound}
            progress={roundProgress}
            upcoming={upcoming}
            activeSpeakerId={lastArg?.speakerId ?? null}
            activeSide={lastArg?.side ?? null}
          />
        </section>

        {/* RIGHT — Con stack */}
        <section className="space-y-3">
          <SideHeader side="con" count={conArgs.length} />
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {[...conArgs].reverse().map((a, i) => (
                <ArgumentCard key={a.id} arg={a} isMostRecent={i === 0} />
              ))}
            </AnimatePresence>
            {conArgs.length === 0 && <Empty side="con" />}
          </div>
        </section>
      </div>

      {/* Spotlight */}
      <Spotlight arg={phase === "verdict" ? null : lastArg} />

      {/* Verdict */}
      {phase === "verdict" && (
        <Verdict
          verdict={debate.verdict}
          moderatorId={debate.moderatorId}
          onReset={reset}
        />
      )}

      {/* Optional library scene under verdict */}
      {phase === "verdict" && (
        <div className="hidden lg:block rounded-3xl overflow-hidden border border-white/8">
          <SceneStageEmbed
            initialEnv="library"
            activeMemberId={debate.moderatorId}
            embedded
            height="200px"
            mood="quiet & sharp"
          />
        </div>
      )}

      {/* Archive grid */}
      {phase === "verdict" && (
        <section className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-[var(--font-headline)] font-bold text-white">
              Past debates
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-[var(--font-label)]">
              {PAST_DEBATES.length} archived
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PAST_DEBATES.map((d) => (
              <div
                key={d.id}
                className="glass rounded-2xl p-4 border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <h4 className="font-[var(--font-headline)] font-bold text-sm mb-1 line-clamp-2">
                  {d.title}
                </h4>
                <p className="text-xs text-white/55 line-clamp-2 leading-relaxed mb-3">
                  {d.conclusion}
                </p>
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-[var(--font-label)]">
                  {d.meta}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LivePill({ phase }: { phase: Phase }) {
  if (phase === "verdict") {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/15 bg-white/[0.05] text-white/80">
        <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
        Concluded
      </span>
    );
  }
  if (phase === "paused") {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-amber-400/30 bg-amber-400/10 text-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Paused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-rose-400/30 bg-rose-500/10 text-rose-300">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
      Live
    </span>
  );
}

function SideHeader({
  side,
  count,
}: {
  side: "pro" | "con";
  count: number;
}) {
  const label = side === "pro" ? "Pro side" : "Con side";
  const color = side === "pro" ? "text-emerald-300" : "text-red-300";
  const accent = side === "pro" ? "bg-emerald-400" : "bg-red-400";
  return (
    <div className="flex items-center justify-between px-1">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${accent}`} />
        <h2 className={`text-xs font-bold uppercase tracking-widest ${color}`}>
          {label}
        </h2>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-white/35 font-[var(--font-label)]">
        {count} argument{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function Empty({ side }: { side: "pro" | "con" }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.02] p-4 text-xs text-white/45 text-center">
      Waiting for the {side === "pro" ? "Pro" : "Con"} side to open…
    </div>
  );
}

function ControlButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
        disabled
          ? "border-white/5 bg-white/[0.02] text-white/30 cursor-not-allowed"
          : danger
          ? "border-rose-400/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
          : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {label}
    </button>
  );
}
