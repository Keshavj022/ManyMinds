"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Bubble from "@/components/chat/Bubble";
import ChatHeaderStrip from "@/components/chat/ChatHeaderStrip";
import Composer from "@/components/chat/Composer";
import EmptyState from "@/components/chat/EmptyState";
import MemberRail from "@/components/chat/MemberRail";
import ScenePane from "@/components/chat/ScenePane";
import { useEnvironment } from "@/components/dashboard/EnvironmentProvider";
import {
  INITIAL_COUNCIL_STATE,
  type ChatMessage as UiChatMessage,
  type CouncilStateRow,
  type Feed,
  type MemberStatus,
} from "@/lib/chat-fixtures";
import { COUNCIL_MEMBERS, type CouncilMemberId } from "@/lib/design-tokens";
import type { EnvironmentId } from "@/lib/environments";
import {
  ApiError,
  ChatMessage as ApiChatMessage,
  ChatSession,
  MessageTurn,
  api,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { VoiceHandle, fetchVoiceStatus, speak } from "@/lib/voice";

type Mode = "group" | "one_on_one";

const MEMBER_IDS = COUNCIL_MEMBERS.map((m) => m.id);
const KNOWN_SLUGS = new Set<string>(MEMBER_IDS);

function formatClockTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function isKnownMemberSlug(slug: string | null | undefined): slug is CouncilMemberId {
  return !!slug && KNOWN_SLUGS.has(slug);
}

function backendToFeed(msg: ApiChatMessage, userName: string): Feed {
  if (msg.role === "user") {
    return {
      id: msg.id,
      sender: { kind: "user", name: userName },
      timestamp: formatClockTime(msg.created_at),
      content: msg.content,
    };
  }
  if (isKnownMemberSlug(msg.member_slug)) {
    return {
      id: msg.id,
      sender: { kind: "member", id: msg.member_slug },
      timestamp: formatClockTime(msg.created_at),
      content: msg.content,
    };
  }
  // Fallback — unknown member, render as a generic member bubble using "sage" tone.
  return {
    id: msg.id,
    sender: { kind: "member", id: "sage" },
    timestamp: formatClockTime(msg.created_at),
    content: msg.content,
  };
}

const CHAT_SESSION_KEY = "manyminds:chat-session-id";

export default function ChatPage() {
  const { user } = useAuth();
  const userName = user?.username ? user.username.split("@")[0] : "You";

  const [feed, setFeed] = useState<Feed[]>([]);
  const [target, setTarget] = useState<CouncilMemberId | "group">("group");
  const [mode, setMode] = useState<Mode>("group");
  const [oneOnOneTarget, setOneOnOneTarget] = useState<CouncilMemberId>("aria");
  const [voiceOn, setVoiceOn] = useState(false);
  const { current: env, setEnvironmentId } = useEnvironment();
  const currentEnv = env.id as EnvironmentId;
  const setCurrentEnv = (id: EnvironmentId) => setEnvironmentId(id);
  const [councilState, setCouncilState] =
    useState<CouncilStateRow[]>([...INITIAL_COUNCIL_STATE]);
  const [whoIsTalking, setWhoIsTalking] = useState<CouncilMemberId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSceneDrawer, setShowSceneDrawer] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const voiceRef = useRef<VoiceHandle | null>(null);

  // Probe whether the backend has ELEVENLABS_API_KEY configured. The toggle
  // remains visible regardless (a UI control) but we use this to set the
  // toast copy accurately.
  useEffect(() => {
    void fetchVoiceStatus().then((s) => setVoiceAvailable(s.available));
  }, []);

  // Clean up any in-flight audio when leaving the page or toggling off.
  useEffect(() => {
    return () => {
      voiceRef.current?.stop();
      voiceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!voiceOn) {
      voiceRef.current?.stop();
      voiceRef.current = null;
    }
  }, [voiceOn]);

  // Auto-scroll to latest
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [feed.length]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Initialise: try to restore an existing session id from localStorage,
  // otherwise create a fresh one. Then load its history.
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setSessionLoading(true);
      let sid: string | null = null;
      try {
        sid = window.localStorage.getItem(CHAT_SESSION_KEY);
      } catch {
        /* ignore */
      }

      try {
        // Validate stored session belongs to current user. /chat/sessions/:id
        // returns 404 if not.
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
          try {
            window.localStorage.setItem(CHAT_SESSION_KEY, sid);
          } catch {
            /* ignore */
          }
        }

        if (cancelled) return;
        setSessionId(sid);

        const history = await api<ApiChatMessage[]>(
          `/api/v1/chat/sessions/${sid}/messages?limit=100`,
        );
        if (cancelled) return;
        setFeed(history.map((m) => backendToFeed(m, userName)));
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
            ? `Couldn't open the chat: ${err.message}`
            : "Couldn't open the chat. Backend reachable?",
        );
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [userName]);

  const onModeChange = (m: Mode) => {
    setMode(m);
    setTarget(m === "group" ? "group" : oneOnOneTarget);
  };

  const onOneOnOneChange = (id: CouncilMemberId) => {
    setOneOnOneTarget(id);
    if (mode === "one_on_one") setTarget(id);
  };

  const handleClearChat = async () => {
    if (!sessionId) return;
    try {
      const created = await api<ChatSession>("/api/v1/chat/sessions", {
        method: "POST",
        body: JSON.stringify({ title: null, environment_id: null }),
      });
      try {
        window.localStorage.setItem(CHAT_SESSION_KEY, created.id);
      } catch {
        /* ignore */
      }
      setSessionId(created.id);
      setFeed([]);
      setWhoIsTalking(null);
      setToast("Fresh page.");
    } catch (err) {
      setToast(
        err instanceof ApiError
          ? `Couldn't start a new chat: ${err.message}`
          : "Couldn't start a new chat.",
      );
    }
  };

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionId || sending) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      // Optimistically append the user message so the UI feels instant.
      const localId = `local-${Date.now()}`;
      const localMessage: UiChatMessage = {
        id: localId,
        sender: { kind: "user", name: userName },
        timestamp: new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
        content: trimmed,
      };
      setFeed((prev) => [...prev, localMessage]);

      // Mark a likely responder as thinking — purely visual.
      const responderHint: CouncilMemberId =
        target === "group"
          ? MEMBER_IDS[Math.floor(Math.random() * MEMBER_IDS.length)]
          : target;
      setCouncilState((prev) =>
        prev.map((r) =>
          r.id === responderHint
            ? { ...r, status: "typing" as MemberStatus }
            : { ...r, status: "listening" as MemberStatus },
        ),
      );

      setSending(true);
      try {
        const out = await api<MessageTurn>(
          `/api/v1/chat/sessions/${sessionId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({
              content: trimmed,
              content_type: "text",
              target_member_id: target === "group" ? null : target,
            }),
          },
        );

        // Replace optimistic local id with the canonical user message,
        // then append each member reply.
        setFeed((prev) => {
          const filtered = prev.filter((f) => f.id !== localId);
          const incoming: Feed[] = [
            backendToFeed(out.user_message, userName),
            ...out.member_messages.map((m) => backendToFeed(m, userName)),
          ];
          return [...filtered, ...incoming];
        });

        const lastReply = out.member_messages[out.member_messages.length - 1];
        if (lastReply && isKnownMemberSlug(lastReply.member_slug)) {
          setWhoIsTalking(lastReply.member_slug);
          setCouncilState((prev) =>
            prev.map((r) =>
              r.id === lastReply.member_slug
                ? { ...r, status: "talking" as MemberStatus }
                : { ...r, status: "listening" as MemberStatus },
            ),
          );
          // Voice playback — only if the toggle is on and the backend has
          // ElevenLabs configured. Stop any prior playback so we don't
          // overlap members.
          if (voiceOn && voiceAvailable) {
            voiceRef.current?.stop();
            voiceRef.current = await speak(lastReply.member_slug, lastReply.content);
          }
        } else {
          setCouncilState((prev) =>
            prev.map((r) => ({ ...r, status: "listening" as MemberStatus })),
          );
        }
      } catch (err) {
        setFeed((prev) => prev.filter((f) => f.id !== localId));
        setCouncilState((prev) =>
          prev.map((r) => ({ ...r, status: "listening" as MemberStatus })),
        );
        setToast(
          err instanceof ApiError
            ? `Couldn't send: ${err.message}`
            : "Couldn't send. Try again.",
        );
      } finally {
        setSending(false);
      }
    },
    [sessionId, sending, target, userName],
  );

  const cycleTarget = () => {
    if (target === "group") {
      setTarget(MEMBER_IDS[0]);
      return;
    }
    const idx = MEMBER_IDS.indexOf(target);
    const next = idx === MEMBER_IDS.length - 1 ? "group" : MEMBER_IDS[idx + 1];
    setTarget(next);
  };

  const hasMessages = useMemo(() => feed.length > 0, [feed]);

  return (
    <div className="relative h-[calc(100dvh-9rem)] lg:h-[calc(100vh-9rem)] flex flex-col">
      {/* Mobile scene-drawer toggle */}
      <div className="lg:hidden flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setShowSceneDrawer(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/[0.05] border border-white/10 text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <span className="material-symbols-outlined text-[14px]">visibility</span>
          Show scene
        </button>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 lg:gap-5">
        {/* LEFT — conversation */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong rounded-2xl overflow-hidden flex flex-col min-h-0"
        >
          <ChatHeaderStrip
            mode={mode}
            oneOnOneTarget={oneOnOneTarget}
            voiceOn={voiceOn}
            currentEnv={currentEnv}
            onToggleVoice={() => {
              const next = !voiceOn;
              setVoiceOn(next);
              if (!next) {
                setToast("Voice off");
              } else if (voiceAvailable) {
                setToast("Voice on — listening for replies");
              } else {
                setToast("Voice toggle on, but no ELEVENLABS_API_KEY on the server");
              }
            }}
            onSwitchMode={onModeChange}
            onChangeOneOnOne={onOneOnOneChange}
            onClearChat={handleClearChat}
          />

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 flex flex-col"
          >
            {sessionLoading ? (
              <div className="flex-1 grid place-items-center text-white/45 text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/15 border-t-white/55 animate-spin" />
                  Opening the room…
                </span>
              </div>
            ) : !hasMessages ? (
              <EmptyState onPick={(label) => void handleSend(label)} />
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence initial={false}>
                  {feed.map((item) => {
                    if ("kind" in item && item.kind === "agreement") {
                      return null;
                    }
                    return (
                      <Bubble
                        key={(item as UiChatMessage).id}
                        message={item as UiChatMessage}
                      />
                    );
                  })}
                </AnimatePresence>

                {sending && (
                  <AnimatePresence>
                    {councilState
                      .filter((s) => s.status === "typing")
                      .map((s) => (
                        <Bubble
                          key={`typing-${s.id}`}
                          isTyping
                          message={{
                            id: `typing-${s.id}`,
                            sender: { kind: "member", id: s.id },
                            timestamp: "",
                            content: "",
                          }}
                        />
                      ))}
                  </AnimatePresence>
                )}
              </div>
            )}
          </div>

          <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-white/5">
            <MemberRail
              state={councilState}
              target={target}
              onSelect={(id) => setTarget(id)}
            />
            <Composer
              target={target}
              onChangeTarget={cycleTarget}
              onSend={(t) => void handleSend(t)}
              onToast={(m) => setToast(m)}
            />
          </div>
        </motion.section>

        {/* RIGHT — scene */}
        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex flex-col min-h-0"
        >
          <ScenePane
            currentEnv={currentEnv}
            onChangeEnv={setCurrentEnv}
            activeMemberId={whoIsTalking}
            onPopOut={() => setToast("Pop-out scene — coming soon")}
          />
        </motion.aside>
      </div>

      {/* Mobile scene drawer */}
      <AnimatePresence>
        {showSceneDrawer && (
          <motion.div
            key="scene-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            onClick={() => setShowSceneDrawer(false)}
          >
            <motion.div
              key="scene-drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-0 bottom-0 w-[90%] max-w-md p-4 bg-[#0a0910] border-l border-white/8 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white font-[var(--font-headline)]">
                  Scene
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSceneDrawer(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <ScenePane
                  currentEnv={currentEnv}
                  onChangeEnv={setCurrentEnv}
                  activeMemberId={whoIsTalking}
                  onPopOut={() => setToast("Pop-out scene — coming soon")}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-semibold bg-[#100e16]/95 border border-white/10 text-white/90 shadow-xl backdrop-blur-xl max-w-[92vw] text-center"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
