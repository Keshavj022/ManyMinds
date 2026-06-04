"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GameHeader from "@/components/games/GameHeader";
import GlassCard from "@/components/ui/GlassCard";
import AuroraButton from "@/components/ui/AuroraButton";
import MemberAvatar from "@/components/ui/MemberAvatar";
import TypingDots from "@/components/ui/TypingDots";
import AmbientBackground from "@/components/ui/AmbientBackground";
import {
  pickPrompt,
  pickPoser,
  pickMemberResponse,
  shuffle,
  spin,
  tallyVotes,
  scoreDelta,
  outroLine,
  type Choice,
  type Player,
  type PlayerId,
  type Prompt,
  type Vote,
} from "@/lib/games/truth-or-dare";
import { councilColors, type CouncilMemberId, COUNCIL_MEMBERS } from "@/lib/design-tokens";
import { recordGameResult } from "@/lib/games/storage";

type Phase =
  | "intro" // pre-game splash
  | "spinning" // visual spin animation -> sets currentChoice
  | "awaitingChoice" // user must pick truth/dare
  | "showingPrompt" // prompt displayed; user or AI responds
  | "userResponding" // user typing
  | "memberTyping" // AI member typing out response
  | "voting" // voting in progress
  | "tallying" // brief moment between votes and next round
  | "ended"; // 12 rounds done

type RoundLog = {
  round: number;
  responder: PlayerId;
  choice: Choice;
  promptId: string;
  responseText: string;
  skipped: boolean;
  votes: Vote[];
  delta: number;
};

const TOTAL_ROUNDS = 12;
const COUNCIL_IDS: CouncilMemberId[] = ["aria", "rex", "sage", "nova", "echo"];

function defaultPlayers(): Player[] {
  // Deterministic order — used for SSR/initial render to avoid hydration mismatch.
  return [
    { id: "user", name: "You", isUser: true, score: 0 },
    ...COUNCIL_IDS.map((id) => ({
      id,
      name: COUNCIL_MEMBERS.find((m) => m.id === id)!.name,
      isUser: false,
      score: 0,
    })),
  ];
}

function buildPlayers(): Player[] {
  return shuffle(defaultPlayers());
}

export default function TruthOrDarePage() {
  const [players, setPlayers] = useState<Player[]>(defaultPlayers);
  const [round, setRound] = useState(0); // 0-based
  const [turnIdx, setTurnIdx] = useState(0); // index into players
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentChoice, setCurrentChoice] = useState<Choice | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [currentPoser, setCurrentPoser] = useState<CouncilMemberId | null>(null);
  const [userInput, setUserInput] = useState("");
  const [memberResponse, setMemberResponse] = useState("");
  const [typedResponse, setTypedResponse] = useState("");
  const [usedPromptIds] = useState<Set<string>>(() => new Set<string>());
  const [voting, setVoting] = useState<Vote[]>([]);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [history, setHistory] = useState<RoundLog[]>([]);
  const typingTimerRef = useRef<number | null>(null);

  // For convenience
  const currentResponder = players[turnIdx];
  const ambientMusicOn = useRef(false);

  // ----- Start: pick the spinning result automatically after intro -----
  const startGame = useCallback(() => {
    setPlayers(buildPlayers());
    setPhase("spinning");
  }, []);

  // ----- Spinning effect -----
  useEffect(() => {
    if (phase !== "spinning") return;
    const t = window.setTimeout(() => {
      if (currentResponder.isUser) {
        // user chooses
        setPhase("awaitingChoice");
        return;
      }
      // AI picks for themselves
      const choice = spin(currentResponder.id);
      setCurrentChoice(choice);
      const prompt = pickPrompt(choice, usedPromptIds);
      usedPromptIds.add(prompt.id);
      const poser = pickPoser(prompt, currentResponder.id);
      setCurrentPrompt(prompt);
      setCurrentPoser(poser);
      setPhase("showingPrompt");
    }, 1500);
    return () => window.clearTimeout(t);
  }, [phase, currentResponder, usedPromptIds]);

  // ----- After showingPrompt, kick off responder -----
  useEffect(() => {
    if (phase !== "showingPrompt") return;
    const t = window.setTimeout(() => {
      if (currentResponder.isUser) {
        setPhase("userResponding");
        setUserInput("");
      } else {
        const txt = pickMemberResponse(currentResponder.id as CouncilMemberId, currentChoice!);
        setMemberResponse(txt);
        setTypedResponse("");
        setPhase("memberTyping");
      }
    }, 900);
    return () => window.clearTimeout(t);
  }, [phase, currentResponder, currentChoice]);

  // ----- Typewriter effect for AI member responses -----
  useEffect(() => {
    if (phase !== "memberTyping" || !memberResponse) return;
    let i = 0;
    setTypedResponse("");
    const step = () => {
      i++;
      setTypedResponse(memberResponse.slice(0, i));
      if (i >= memberResponse.length) {
        if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
        // pause briefly then trigger vote
        window.setTimeout(() => triggerVote(memberResponse, false), 600);
        return;
      }
      typingTimerRef.current = window.setTimeout(step, 22 + Math.random() * 24);
    };
    typingTimerRef.current = window.setTimeout(step, 200);
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, memberResponse]);

  const triggerVote = (responseText: string, skipped: boolean) => {
    if (!currentPrompt) return;
    // voters: everyone except responder; but voting members are only council.
    const voters: CouncilMemberId[] =
      currentResponder.id === "user"
        ? COUNCIL_IDS
        : COUNCIL_IDS.filter((c) => c !== currentResponder.id);
    const votes = tallyVotes(currentResponder.id, voters, currentPrompt.vibe, responseText.length, skipped);
    setVoting(votes);
    setPhase("voting");
    const kept = !skipped && majorityKept(votes);
    const delta = scoreDelta(currentChoice!, kept, skipped);
    setLastDelta(delta);

    // animate votes appearing over 1s, then tally
    window.setTimeout(() => {
      setPlayers((prev) => prev.map((p) =>
        p.id === currentResponder.id ? { ...p, score: p.score + delta } : p,
      ));
      setHistory((h) => [
        ...h,
        {
          round: round + 1,
          responder: currentResponder.id,
          choice: currentChoice!,
          promptId: currentPrompt.id,
          responseText,
          skipped,
          votes,
          delta,
        },
      ]);
      setPhase("tallying");
      window.setTimeout(() => advance(), 1100);
    }, 1200);
  };

  const advance = () => {
    const nextRound = round + 1;
    if (nextRound >= TOTAL_ROUNDS) {
      setPhase("ended");
      return;
    }
    setRound(nextRound);
    setTurnIdx((turnIdx + 1) % players.length);
    setCurrentChoice(null);
    setCurrentPrompt(null);
    setCurrentPoser(null);
    setMemberResponse("");
    setTypedResponse("");
    setUserInput("");
    setLastDelta(null);
    setVoting([]);
    setPhase("spinning");
  };

  // Record result + outro when ended
  useEffect(() => {
    if (phase !== "ended") return;
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const userPlace = sorted.findIndex((p) => p.id === "user") + 1;
    recordGameResult({
      game: "truth-or-dare",
      outcome: userPlace === 1 ? "win" : "finished",
      detail: `Placed ${ordinal(userPlace)} (${players.find((p) => p.id === "user")?.score ?? 0} pts)`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ----- USER ACTIONS -----
  const onPickChoice = (choice: Choice) => {
    setCurrentChoice(choice);
    const prompt = pickPrompt(choice, usedPromptIds);
    usedPromptIds.add(prompt.id);
    const poser = pickPoser(prompt, "user");
    setCurrentPrompt(prompt);
    setCurrentPoser(poser);
    setPhase("showingPrompt");
  };
  const onSubmitResponse = () => {
    if (userInput.length < 50) return;
    triggerVote(userInput, false);
  };
  const onSkip = () => {
    triggerVote("(skipped)", true);
  };
  const onNewGame = () => {
    setPlayers(buildPlayers());
    setRound(0);
    setTurnIdx(0);
    setPhase("intro");
    setHistory([]);
    setLastDelta(null);
    setVoting([]);
    setCurrentChoice(null);
    setCurrentPrompt(null);
    setCurrentPoser(null);
    setMemberResponse("");
    setTypedResponse("");
    setUserInput("");
    usedPromptIds.clear();
  };

  // ----- DERIVED -----
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players],
  );
  const leader = sortedPlayers[0];

  return (
    <>
      <AmbientBackground variant="warm" />
      <div className="space-y-6">
        <GameHeader
          backHref="/games"
          title="Truth or Dare"
          subtitle="The whole council plays. Honesty earns 2. Dares earn 3. Skipping costs 1."
          rightSlot={
            <div className="flex items-center gap-2">
              <button
                onClick={() => (ambientMusicOn.current = !ambientMusicOn.current)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-white/70 hover:bg-white/[0.08]"
              >
                <span className="material-symbols-outlined text-[14px]">music_note</span>
                Music
              </button>
              <div className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-white/70 font-mono">
                Round {Math.min(round + 1, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
              </div>
            </div>
          }
        />

        {phase === "intro" && (
          <GlassCard variant="aurora" className="rounded-3xl p-10 text-center">
            <h2 className="font-[var(--font-headline)] text-3xl font-bold text-white tracking-tight mb-3">Ready?</h2>
            <p className="text-white/65 max-w-xl mx-auto">
              Six players. {TOTAL_ROUNDS} rounds. The council brings the prompts, the votes, and the receipts.
              Type a real answer (50+ chars), or skip for -1.
            </p>
            <div className="mt-6">
              <AuroraButton variant="primary" size="lg" onClick={startGame}>Start</AuroraButton>
            </div>
          </GlassCard>
        )}

        {phase !== "intro" && phase !== "ended" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <GlassCard variant="default" className="rounded-3xl p-6 relative overflow-hidden">
              {/* Hexagon player ring */}
              <PlayerRing
                players={players}
                turnIdx={turnIdx}
                phase={phase}
              />

              {/* Prompt card / interactions */}
              <div className="mt-8 min-h-[200px]">
                <AnimatePresence mode="wait">
                  {(phase === "spinning" || phase === "awaitingChoice") && (
                    <motion.div
                      key="spin"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      className="text-center"
                    >
                      {phase === "spinning" ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-[10px] uppercase tracking-[0.32em] text-white/55 font-bold">
                            {currentResponder.isUser ? "Your turn" : `${currentResponder.name}'s turn`}
                          </div>
                          <div className="text-2xl font-[var(--font-headline)] font-bold text-white">
                            The wheel is spinning…
                          </div>
                          <TypingDots />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4">
                          <div className="text-[10px] uppercase tracking-[0.32em] text-white/55 font-bold">Pick one</div>
                          <div className="flex gap-3">
                            <AuroraButton variant="member" memberColor="sage" size="lg" onClick={() => onPickChoice("truth")}>
                              Truth
                            </AuroraButton>
                            <AuroraButton variant="member" memberColor="rex" size="lg" onClick={() => onPickChoice("dare")}>
                              Dare
                            </AuroraButton>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {(phase === "showingPrompt" || phase === "userResponding" || phase === "memberTyping" || phase === "voting" || phase === "tallying") &&
                    currentPrompt &&
                    currentChoice &&
                    currentPoser && (
                      <motion.div
                        key={currentPrompt.id}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-5"
                      >
                        <PromptCard
                          choice={currentChoice}
                          prompt={currentPrompt}
                          poser={currentPoser}
                        />

                        {phase === "userResponding" && (
                          <div className="space-y-3">
                            <textarea
                              value={userInput}
                              onChange={(e) => setUserInput(e.target.value)}
                              placeholder="Type your real answer here (50 chars min)…"
                              rows={3}
                              className="w-full bg-white/[0.04] border border-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/30 rounded-2xl p-4 text-sm text-white placeholder:text-white/35 outline-none resize-none"
                            />
                            <div className="flex items-center justify-between">
                              <span className={`text-xs ${userInput.length >= 50 ? "text-emerald-300" : "text-white/45"}`}>
                                {userInput.length} / 50
                              </span>
                              <div className="flex gap-2">
                                <AuroraButton variant="ghost" size="sm" onClick={onSkip}>Skip (-1)</AuroraButton>
                                <AuroraButton
                                  variant="primary"
                                  size="sm"
                                  onClick={onSubmitResponse}
                                  className={userInput.length < 50 ? "opacity-40 pointer-events-none" : ""}
                                >
                                  Submit
                                </AuroraButton>
                              </div>
                            </div>
                          </div>
                        )}

                        {(phase === "memberTyping" || phase === "voting" || phase === "tallying") && (
                          <div className="space-y-3">
                            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 min-h-[64px]">
                              <div className="flex items-center gap-2 mb-2">
                                <MemberAvatar id={currentResponder.id as CouncilMemberId} size="xs" />
                                <span className="text-xs font-bold" style={{ color: councilColors[currentResponder.id as CouncilMemberId].hex }}>
                                  {currentResponder.name}
                                </span>
                                {phase === "memberTyping" && <TypingDots memberId={currentResponder.id as CouncilMemberId} />}
                              </div>
                              <p className="text-sm text-white/85 leading-relaxed">
                                {phase === "memberTyping" ? typedResponse : memberResponse}
                              </p>
                            </div>
                          </div>
                        )}

                        {(phase === "voting" || phase === "tallying") && (
                          <VoteRow votes={voting} delta={lastDelta} skipped={false} />
                        )}
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            </GlassCard>

            {/* Scoreboard */}
            <Scoreboard players={sortedPlayers} leaderId={leader?.id ?? null} />
          </div>
        )}

        {phase === "ended" && (
          <EndScreen players={players} history={history} onAgain={onNewGame} />
        )}
      </div>
    </>
  );
}

// ============= sub-components =============

function PlayerRing({
  players,
  turnIdx,
  phase,
}: {
  players: Player[];
  turnIdx: number;
  phase: Phase;
}) {
  const count = players.length;
  const center = { x: 50, y: 50 };
  const r = 35;
  return (
    <div className="relative w-full aspect-square max-w-[420px] mx-auto">
      {/* center indicator */}
      <motion.div
        key={turnIdx}
        initial={{ rotate: 0 }}
        animate={{ rotate: phase === "spinning" ? 900 : 0 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="20"
            stroke="url(#aurora-grad)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="aurora-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d8a3b8" />
              <stop offset="100%" stopColor="#9b87d8" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* center hub */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md grid place-items-center">
        <span className="text-xs uppercase tracking-wider text-white/55 font-bold">
          {phase === "spinning" ? "spin" : phase === "awaitingChoice" ? "choose" : "play"}
        </span>
      </div>

      {/* players */}
      {players.map((p, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const x = center.x + Math.cos(angle) * r;
        const y = center.y + Math.sin(angle) * r;
        const isActive = i === turnIdx;
        const isUser = p.isUser;
        return (
          <motion.div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
            animate={{ scale: isActive ? 1.18 : 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative">
              {isActive && (
                <motion.div
                  className="absolute -inset-3 rounded-full"
                  style={{
                    background: isUser
                      ? "radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)"
                      : `radial-gradient(circle, ${councilColors[p.id as CouncilMemberId].hex}66, transparent 70%)`,
                  }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              {isUser ? (
                <div className="relative grid place-items-center w-14 h-14 rounded-full font-bold font-[var(--font-headline)] text-sm"
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, rgba(13,11,20,0.85) 80%)",
                    color: "#0d0b14",
                    boxShadow: "0 0 24px rgba(255,255,255,0.35)",
                  }}
                >
                  You
                </div>
              ) : (
                <MemberAvatar id={p.id as CouncilMemberId} size="lg" />
              )}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider text-white/70 font-bold whitespace-nowrap">
                {p.name}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function PromptCard({
  choice,
  prompt,
  poser,
}: {
  choice: Choice;
  prompt: Prompt;
  poser: CouncilMemberId;
}) {
  const c = councilColors[poser];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl p-6 border-aurora glass"
    >
      <div className="flex items-center gap-3">
        <div
          className="text-[10px] font-bold uppercase tracking-[0.32em] px-3 py-1 rounded-full border"
          style={{
            background: choice === "truth" ? "rgba(155,135,216,0.18)" : "rgba(212,154,122,0.18)",
            borderColor: choice === "truth" ? "#9b87d8" : "#d49a7a",
            color: choice === "truth" ? "#b495d0" : "#fdba74",
          }}
        >
          {choice}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <MemberAvatar id={poser} size="sm" />
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-wider text-white/45 font-bold">Posed by</div>
            <div className="text-xs font-bold" style={{ color: c.hex }}>
              {COUNCIL_MEMBERS.find((m) => m.id === poser)?.name}
            </div>
          </div>
        </div>
      </div>
      <p className="text-white text-lg md:text-xl font-[var(--font-headline)] font-bold leading-snug mt-4">
        {prompt.text}
      </p>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mt-3">
        vibe: {prompt.vibe}
      </div>
    </motion.div>
  );
}

function VoteRow({
  votes,
  delta,
  skipped,
}: {
  votes: Vote[];
  delta: number | null;
  skipped: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {votes.map((v, i) => (
          <motion.div
            key={v.voter}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 * i }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
            style={{
              background: v.kept ? "rgba(74,222,128,0.10)" : "rgba(248,113,113,0.10)",
              borderColor: v.kept ? "rgba(74,222,128,0.45)" : "rgba(248,113,113,0.45)",
            }}
          >
            <MemberAvatar id={v.voter} size="xs" />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: v.kept ? "#86efac" : "#d8a3b8" }}>
              {v.kept ? "kept it" : skipped ? "skipped" : "chickened"}
            </span>
          </motion.div>
        ))}
      </div>
      {delta !== null && (
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-sm font-bold"
          style={{ color: delta > 0 ? "#86efac" : delta < 0 ? "#d8a3b8" : "#ffffff" }}
        >
          {delta > 0 ? "+" : ""}
          {delta} pts
        </motion.div>
      )}
    </div>
  );
}

function Scoreboard({ players, leaderId }: { players: Player[]; leaderId: PlayerId | null }) {
  return (
    <GlassCard variant="default" className="rounded-3xl p-5 h-fit lg:sticky lg:top-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white font-[var(--font-headline)]">Scoreboard</h3>
        <span className="text-[10px] text-white/40 uppercase tracking-wider">live</span>
      </div>
      <ul className="space-y-2">
        {players.map((p) => {
          const isLead = p.id === leaderId && p.score > 0;
          const isUser = p.isUser;
          const memberId = isUser ? null : (p.id as CouncilMemberId);
          const c = memberId ? councilColors[memberId] : null;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 p-2 rounded-2xl border transition-all ${
                isLead ? "" : ""
              }`}
              style={{
                background: isLead ? (c?.soft ?? "rgba(255,255,255,0.05)") : "rgba(255,255,255,0.02)",
                borderColor: isLead ? (c?.hex ?? "#ffffff") + "66" : "rgba(255,255,255,0.06)",
                boxShadow: isLead ? `0 0 20px ${c?.soft ?? "rgba(255,255,255,0.2)"}` : undefined,
              }}
            >
              {isUser ? (
                <div className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold bg-white text-black">You</div>
              ) : (
                <MemberAvatar id={memberId!} size="md" />
              )}
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{p.name}</div>
                {isLead && <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: c?.hex ?? "#fff" }}>leader</div>}
              </div>
              <div className="text-base font-bold text-white font-mono">{p.score}</div>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}

function EndScreen({
  players,
  history,
  onAgain,
}: {
  players: Player[];
  history: RoundLog[];
  onAgain: () => void;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const userPlace = sorted.findIndex((p) => p.id === "user") + 1;
  const outro = outroLine(players);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6"
    >
      <GlassCard variant="aurora" className="rounded-3xl p-8">
        <div className="flex items-center gap-4">
          {!winner.isUser && <MemberAvatar id={winner.id as CouncilMemberId} size="xl" />}
          <div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-white/55 font-bold">Winner</div>
            <h2 className="aurora-text text-4xl font-[var(--font-headline)] font-bold tracking-tight">
              {winner.name}
            </h2>
            <p className="text-white/65 text-sm mt-1">{winner.score} points · You finished {ordinal(userPlace)} of {players.length}</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex items-start gap-3">
          <MemberAvatar id={outro.memberId} size="md" />
          <p className="text-white/85 text-sm italic leading-relaxed">{outro.text}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <AuroraButton variant="primary" onClick={onAgain}>Play again</AuroraButton>
          <AuroraButton variant="ghost" href="/games">Back to hub</AuroraButton>
        </div>
      </GlassCard>

      <GlassCard variant="default" className="rounded-3xl p-5">
        <h3 className="text-sm font-bold text-white font-[var(--font-headline)] mb-3">Final standings</h3>
        <ul className="space-y-2">
          {sorted.map((p, i) => {
            const memberId = p.isUser ? null : (p.id as CouncilMemberId);
            return (
              <li key={p.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-xs font-mono text-white/40 w-5 text-right">{i + 1}.</span>
                {p.isUser ? (
                  <div className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold bg-white text-black">You</div>
                ) : (
                  <MemberAvatar id={memberId!} size="md" />
                )}
                <span className="flex-1 text-sm text-white font-bold">{p.name}</span>
                <span className="text-sm font-mono text-white/85">{p.score}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 text-[10px] uppercase tracking-wider text-white/40">
          {history.length} rounds · {history.filter((h) => h.skipped).length} skips
        </div>
      </GlassCard>
    </motion.div>
  );
}

// helpers
function majorityKept(votes: Vote[]): boolean {
  const k = votes.filter((v) => v.kept).length;
  return k * 2 > votes.length;
}
function ordinal(n: number): string {
  if (n <= 0) return `${n}`;
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
