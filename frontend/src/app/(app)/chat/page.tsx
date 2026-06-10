"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Bubble from "@/components/chat/Bubble";
import Composer from "@/components/chat/Composer";
import CouncilRail from "@/components/chat/CouncilRail";
import EmptyState from "@/components/chat/EmptyState";
import OneOnOneBanner from "@/components/chat/OneOnOneBanner";
import RoomHeader from "@/components/chat/RoomHeader";
import SceneDrawer from "@/components/chat/SceneDrawer";
import ThinkingIndicator from "@/components/chat/ThinkingIndicator";
import { useEnvironment } from "@/components/dashboard/EnvironmentProvider";
import type {
  ChatMessage as UiChatMessage,
  CouncilStateRow,
  MemberStatus,
} from "@/lib/chat-fixtures";
import { COUNCIL_MEMBERS, type CouncilMemberId } from "@/lib/design-tokens";
import type { EnvironmentId } from "@/lib/environments";
import {
  ApiError,
  type ChatMessage as ApiChatMessage,
  type ChatSession,
  type MessageTurn,
  api,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useVoicePlayback } from "@/lib/use-voice";

type Mode = "group" | "one_on_one";

const MEMBER_IDS = COUNCIL_MEMBERS.map((m) => m.id);
const KNOWN_SLUGS = new Set<string>(MEMBER_IDS);
const CHAT_SESSION_KEY = "manyminds:chat-session-id";

function formatClockTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function isKnownMemberSlug(
  slug: string | null | undefined,
): slug is CouncilMemberId {
  return !!slug && KNOWN_SLUGS.has(slug);
}

function backendToUi(msg: ApiChatMessage, userName: string): UiChatMessage {
  if (msg.role === "user") {
    return {
      id: msg.id,
      sender: { kind: "user", name: userName },
      timestamp: formatClockTime(msg.created_at),
      content: msg.content,
    };
  }
  return {
    id: msg.id,
    sender: {
      kind: "member",
      // Unknown slug → render in Sage's calm tone rather than breaking.
      id: isKnownMemberSlug(msg.member_slug) ? msg.member_slug : "sage",
    },
    timestamp: formatClockTime(msg.created_at),
    content: msg.content,
  };
}

function sameVoice(a: UiChatMessage, b: UiChatMessage): boolean {
  if (a.sender.kind === "user" && b.sender.kind === "user") return true;
  if (a.sender.kind === "member" && b.sender.kind === "member") {
    return a.sender.id === b.sender.id;
  }
  return false;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function ChatRoom() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSession = searchParams.get("session");
  const userName = user?.username ? user.username.split("@")[0] : "You";

  const [feed, setFeed] = useState<UiChatMessage[]>([]);
  const [mode, setMode] = useState<Mode>("group");
  const [oneOnOneTarget, setOneOnOneTarget] = useState<CouncilMemberId>("aria");
  const [councilState, setCouncilState] = useState<CouncilStateRow[]>(
    MEMBER_IDS.map((id) => ({ id, status: "listening" as MemberStatus })),
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const [typingMember, setTypingMember] = useState<CouncilMemberId | null>(null);
  const [whoIsTalking, setWhoIsTalking] = useState<CouncilMemberId | null>(null);
  const [sceneOpen, setSceneOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { current: env, setEnvironmentId } = useEnvironment();
  const voice = useVoicePlayback();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stagingRunRef = useRef(0);
  const bootedSidRef = useRef<string | null>(null);
  const voiceToastShownRef = useRef(false);

  const setStatuses = useCallback(
    (compute: (id: CouncilMemberId) => MemberStatus) => {
      setCouncilState(MEMBER_IDS.map((id) => ({ id, status: compute(id) })));
    },
    [],
  );

  // Cancel any in-flight reply staging when leaving the room.
  useEffect(() => {
    return () => {
      stagingRunRef.current += 1;
    };
  }, []);

  // Toast auto-dismiss.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // One soft note when the voice server says "not today".
  useEffect(() => {
    if (voice.unavailable && !voiceToastShownRef.current) {
      voiceToastShownRef.current = true;
      setToast("Their voices are taking a break — text still works.");
    }
  }, [voice.unavailable]);

  // Keep the latest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [feed, typingMember, awaiting]);

  // Session boot — ?session= in the URL wins, then localStorage, then a
  // fresh one. History loads right after.
  useEffect(() => {
    if (urlSession && urlSession === bootedSidRef.current) return;
    let cancelled = false;

    async function boot() {
      setSessionLoading(true);
      let sid: string | null = urlSession;
      if (!sid) {
        try {
          sid = window.localStorage.getItem(CHAT_SESSION_KEY);
        } catch {
          /* localStorage blocked */
        }
      }

      try {
        // Make sure the session is real and ours; 404 means start over.
        if (sid) {
          try {
            await api<ChatSession>(`/api/v1/chat/sessions/${sid}`);
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) sid = null;
            else throw err;
          }
        }

        if (!sid) {
          const created = await api<ChatSession>("/api/v1/chat/sessions", {
            method: "POST",
            body: JSON.stringify({ title: null, environment_id: null }),
          });
          sid = created.id;
        }

        if (cancelled) return;
        bootedSidRef.current = sid;
        setSessionId(sid);
        try {
          window.localStorage.setItem(CHAT_SESSION_KEY, sid);
        } catch {
          /* ignore */
        }
        if (urlSession !== sid) {
          router.replace(`/chat?session=${sid}`, { scroll: false });
        }

        const history = await api<ApiChatMessage[]>(
          `/api/v1/chat/sessions/${sid}/messages?limit=100`,
        );
        if (cancelled) return;
        setFeed(history.map((m) => backendToUi(m, userName)));
        const lastMember = [...history]
          .reverse()
          .find((m) => m.role === "assistant" && isKnownMemberSlug(m.member_slug));
        if (lastMember && isKnownMemberSlug(lastMember.member_slug)) {
          setWhoIsTalking(lastMember.member_slug);
        }
      } catch (err) {
        if (cancelled) return;
        setToast(
          err instanceof ApiError
            ? `Couldn't open the room: ${err.message}`
            : "Couldn't open the room. Is the backend awake?",
        );
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [urlSession, userName, router]);

  const enterOneOnOne = useCallback(
    (id: CouncilMemberId) => {
      if (mode === "one_on_one" && oneOnOneTarget === id) {
        setMode("group");
        return;
      }
      setMode("one_on_one");
      setOneOnOneTarget(id);
    },
    [mode, oneOnOneTarget],
  );

  const backToEveryone = useCallback(() => setMode("group"), []);

  const handleFreshStart = useCallback(async () => {
    stagingRunRef.current += 1;
    voice.stop();
    setBusy(false);
    setAwaiting(false);
    setTypingMember(null);
    try {
      const created = await api<ChatSession>("/api/v1/chat/sessions", {
        method: "POST",
        body: JSON.stringify({ title: null, environment_id: null }),
      });
      bootedSidRef.current = created.id;
      setSessionId(created.id);
      try {
        window.localStorage.setItem(CHAT_SESSION_KEY, created.id);
      } catch {
        /* ignore */
      }
      router.replace(`/chat?session=${created.id}`, { scroll: false });
      setFeed([]);
      setWhoIsTalking(null);
      setStatuses(() => "listening");
      setToast("Fresh page. Same friends.");
    } catch (err) {
      setToast(
        err instanceof ApiError
          ? `Couldn't start fresh: ${err.message}`
          : "Couldn't start fresh. Try again?",
      );
    }
  }, [router, setStatuses, voice]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionId || busy) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const target: CouncilMemberId | null =
        mode === "group" ? null : oneOnOneTarget;

      // The message lands instantly — the room hears you right away.
      const localId = `local-${Date.now()}`;
      setFeed((prev) => [
        ...prev,
        {
          id: localId,
          sender: { kind: "user", name: userName },
          timestamp: new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
          content: trimmed,
        },
      ]);

      const run = ++stagingRunRef.current;
      setBusy(true);
      setAwaiting(true);
      setStatuses((id) =>
        target ? (id === target ? "thinking" : "listening") : "thinking",
      );

      try {
        const out = await api<MessageTurn>(
          `/api/v1/chat/sessions/${sessionId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({
              content: trimmed,
              content_type: "text",
              target_member_id: target,
            }),
          },
        );
        if (stagingRunRef.current !== run) return;

        setAwaiting(false);
        // Swap the optimistic message for the canonical one.
        setFeed((prev) =>
          prev.map((f) =>
            f.id === localId ? backendToUi(out.user_message, userName) : f,
          ),
        );

        // Stage the replies — one friend at a time, never a wall of text.
        for (let i = 0; i < out.member_messages.length; i++) {
          const m = out.member_messages[i];
          const slug: CouncilMemberId = isKnownMemberSlug(m.member_slug)
            ? m.member_slug
            : "sage";

          setTypingMember(slug);
          setStatuses((id) => (id === slug ? "typing" : "listening"));
          await wait(i === 0 ? 650 : 950);
          if (stagingRunRef.current !== run) return;

          setTypingMember(null);
          setFeed((prev) => [...prev, backendToUi(m, userName)]);
          setWhoIsTalking(slug);
          setStatuses((id) => (id === slug ? "talking" : "listening"));
          // Read aloud as the reply is revealed; the queue keeps them
          // from talking over each other.
          if (voice.enabled && m.member_slug) {
            voice.speak(m.member_slug, m.content);
          }
        }
      } catch (err) {
        if (stagingRunRef.current !== run) return;
        setFeed((prev) => prev.filter((f) => f.id !== localId));
        setStatuses(() => "listening");
        setToast(
          err instanceof ApiError
            ? `That one didn't land: ${err.message}`
            : "That one didn't land. Say it again?",
        );
      } finally {
        if (stagingRunRef.current === run) {
          setBusy(false);
          setAwaiting(false);
          setTypingMember(null);
        }
      }
    },
    [sessionId, busy, mode, oneOnOneTarget, userName, setStatuses, voice],
  );

  const toggleVoice = useCallback(() => {
    const next = !voice.enabled;
    voice.setEnabled(next);
    if (next) {
      voiceToastShownRef.current = false;
      setToast("You'll hear them out loud now.");
    } else {
      setToast("Voices off — text only.");
    }
  }, [voice]);

  const thinkCandidates = useMemo<ReadonlyArray<CouncilMemberId>>(
    () => (mode === "group" ? MEMBER_IDS : [oneOnOneTarget]),
    [mode, oneOnOneTarget],
  );

  // The most recent message per member — used to glow whoever is speaking.
  const lastMsgIdByMember = useMemo(() => {
    const map = new Map<CouncilMemberId, string>();
    for (const f of feed) {
      if (f.sender.kind === "member") map.set(f.sender.id, f.id);
    }
    return map;
  }, [feed]);

  const hasMessages = feed.length > 0;

  return (
    <div className="relative h-[calc(100dvh-9rem)] lg:h-[calc(100vh-9rem)] flex flex-col">
      <div className="flex-1 min-h-0 mx-auto w-full max-w-5xl flex gap-7">
        {/* The conversation — the main character. */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 min-w-0 max-w-3xl mx-auto flex flex-col min-h-0"
        >
          <RoomHeader
            env={env}
            onOpenScene={() => setSceneOpen(true)}
            onFreshStart={() => void handleFreshStart()}
          />

          {/* Mobile — the friends collapse into a strip up top. */}
          <div className="lg:hidden pb-3">
            <CouncilRail
              variant="strip"
              state={councilState}
              mode={mode}
              activeId={oneOnOneTarget}
              onPick={enterOneOnOne}
              onEveryone={backToEveryone}
            />
          </div>

          <AnimatePresence>
            {mode === "one_on_one" && (
              <OneOnOneBanner
                key={`solo-${oneOnOneTarget}`}
                memberId={oneOnOneTarget}
                onBack={backToEveryone}
              />
            )}
          </AnimatePresence>

          <div className="flex-1 min-h-0 glass rounded-3xl flex flex-col overflow-hidden">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 flex flex-col"
            >
              {sessionLoading ? (
                <div className="flex-1 grid place-items-center text-white/45 text-sm">
                  <span className="inline-flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/15 border-t-[var(--color-warm)]/70 animate-spin" />
                    Walking into the room…
                  </span>
                </div>
              ) : !hasMessages && !awaiting ? (
                <EmptyState
                  onPick={(label) => void handleSend(label)}
                  member={mode === "one_on_one" ? oneOnOneTarget : null}
                />
              ) : (
                <div className="flex flex-col pb-1">
                  <AnimatePresence initial={false}>
                    {feed.map((item, i) => {
                      const prev = i > 0 ? feed[i - 1] : null;
                      const speaking =
                        item.sender.kind === "member" &&
                        voice.speakingSlug === item.sender.id &&
                        lastMsgIdByMember.get(item.sender.id) === item.id;
                      return (
                        <Bubble
                          key={item.id}
                          message={item}
                          grouped={!!prev && sameVoice(prev, item)}
                          speaking={speaking}
                        />
                      );
                    })}

                    {typingMember && (
                      <Bubble
                        key={`typing-${typingMember}`}
                        isTyping
                        message={{
                          id: `typing-${typingMember}`,
                          sender: { kind: "member", id: typingMember },
                          timestamp: "",
                          content: "",
                        }}
                      />
                    )}

                    {awaiting && (
                      <ThinkingIndicator
                        key="thinking"
                        candidates={thinkCandidates}
                      />
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          <Composer
            target={mode === "group" ? "group" : oneOnOneTarget}
            busy={busy || sessionLoading}
            voiceEnabled={voice.enabled}
            voiceUnavailable={voice.unavailable}
            onToggleVoice={toggleVoice}
            onSend={(t) => void handleSend(t)}
          />
        </motion.section>

        {/* Desktop — the friends sit along the right wall. */}
        <motion.aside
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block w-60 shrink-0 pt-1 overflow-y-auto"
        >
          <CouncilRail
            variant="side"
            state={councilState}
            mode={mode}
            activeId={oneOnOneTarget}
            onPick={enterOneOnOne}
            onEveryone={backToEveryone}
          />
        </motion.aside>
      </div>

      <SceneDrawer
        open={sceneOpen}
        onClose={() => setSceneOpen(false)}
        currentEnv={env.id as EnvironmentId}
        onChangeEnv={(id) => setEnvironmentId(id)}
        activeMemberId={
          isKnownMemberSlug(voice.speakingSlug) ? voice.speakingSlug : whoIsTalking
        }
      />

      {/* Toast — one soft line, then gone. */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4.5 py-2.5 rounded-full text-xs font-semibold bg-[#1a1620]/95 border border-white/[0.06] text-white/90 shadow-xl backdrop-blur-xl max-w-[92vw] text-center"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChatPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100dvh-9rem)] grid place-items-center text-white/45 text-sm">
          <span className="inline-flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/15 border-t-[var(--color-warm)]/70 animate-spin" />
            Walking into the room…
          </span>
        </div>
      }
    >
      <ChatRoom />
    </Suspense>
  );
}
