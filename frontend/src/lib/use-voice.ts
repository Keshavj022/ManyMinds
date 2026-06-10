"use client";

/**
 * Voice hooks — the council's voices in, and yours out.
 *
 * useVoicePlayback — TTS. Streams mp3 from the backend per member and plays
 *   replies through ONE shared <audio> element with a queue, so the friends
 *   never talk over each other. Persists the on/off preference.
 *
 * useSpeechInput — STT. Wraps the browser SpeechRecognition API (webkit
 *   prefixed on Safari/Chrome) with SSR-safe support detection. Interim
 *   transcripts stream while you talk; the final result fills the composer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE, getAccessToken } from "./api";

// ---------------------------------------------------------------------------
// Web Speech API typings — not in lib.dom, declared locally (no `any`).
// ---------------------------------------------------------------------------

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

// ---------------------------------------------------------------------------
// OUTPUT — useVoicePlayback
// ---------------------------------------------------------------------------

const VOICE_PREF_KEY = "manyminds:voice";

interface QueueItem {
  slug: string;
  text: string;
}

export interface VoicePlayback {
  /** Whether voice output is on (persisted). */
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  /** True after the backend said 503 — voice is taking a break. */
  unavailable: boolean;
  /** Slug of the member currently speaking out loud, if any. */
  speakingSlug: string | null;
  /** Queue one member reply for playback (no-op when off/unavailable). */
  speak: (slug: string, text: string) => void;
  /** Stop playback and empty the queue. */
  stop: () => void;
}

function readVoicePref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(VOICE_PREF_KEY) === "on";
  } catch {
    return false;
  }
}

function writeVoicePref(on: boolean) {
  try {
    window.localStorage.setItem(VOICE_PREF_KEY, on ? "on" : "off");
  } catch {
    /* localStorage blocked — preference just won't persist */
  }
}

export function useVoicePlayback(): VoicePlayback {
  const [enabled, setEnabledState] = useState<boolean>(readVoicePref);
  const [unavailable, setUnavailable] = useState(false);
  const [speakingSlug, setSpeakingSlug] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const pumpingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const resolvePlaybackRef = useRef<(() => void) | null>(null);
  const enabledRef = useRef(enabled);
  const unavailableRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const revokeCurrentUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    queueRef.current = [];
    abortRef.current?.abort();
    abortRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    // Unblock the pump if it's awaiting the current clip.
    resolvePlaybackRef.current?.();
    resolvePlaybackRef.current = null;
    revokeCurrentUrl();
    setSpeakingSlug(null);
  }, [revokeCurrentUrl]);

  const pump = useCallback(async () => {
    if (pumpingRef.current) return;
    pumpingRef.current = true;
    try {
      while (
        queueRef.current.length > 0 &&
        enabledRef.current &&
        !unavailableRef.current
      ) {
        const item = queueRef.current.shift();
        if (!item) break;
        const token = getAccessToken();
        if (!token) break;

        const controller = new AbortController();
        abortRef.current = controller;
        let res: Response;
        try {
          res = await fetch(
            `${API_BASE}/api/v1/voice/${encodeURIComponent(item.slug)}/speak`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ text: item.text }),
              signal: controller.signal,
            },
          );
        } catch {
          // Aborted or network hiccup — move on quietly.
          continue;
        }

        if (res.status === 503) {
          // Voice is taking a break — disable gracefully, once.
          unavailableRef.current = true;
          setUnavailable(true);
          queueRef.current = [];
          break;
        }
        if (!res.ok) continue;

        let url: string;
        try {
          const blob = await res.blob();
          url = URL.createObjectURL(blob);
        } catch {
          continue;
        }
        urlRef.current = url;

        if (!audioRef.current) audioRef.current = new Audio();
        const audio = audioRef.current;
        setSpeakingSlug(item.slug);

        await new Promise<void>((resolve) => {
          let settled = false;
          const settle = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          resolvePlaybackRef.current = settle;
          audio.onended = settle;
          audio.onerror = settle;
          audio.src = url;
          void audio.play().catch(() => {
            // Autoplay blocked until a user gesture — skip this clip.
            settle();
          });
        });

        resolvePlaybackRef.current = null;
        setSpeakingSlug(null);
        revokeCurrentUrl();
      }
    } finally {
      pumpingRef.current = false;
    }
  }, [revokeCurrentUrl]);

  const setEnabled = useCallback(
    (on: boolean) => {
      setEnabledState(on);
      enabledRef.current = on;
      writeVoicePref(on);
      if (on) {
        // Give voice another chance — the server may be back.
        unavailableRef.current = false;
        setUnavailable(false);
      } else {
        stop();
      }
    },
    [stop],
  );

  const speak = useCallback(
    (slug: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !enabledRef.current || unavailableRef.current) return;
      queueRef.current.push({ slug, text: trimmed });
      void pump();
    },
    [pump],
  );

  // Tidy up on unmount — no orphaned audio when you leave the room.
  useEffect(() => stop, [stop]);

  return useMemo(
    () => ({ enabled, setEnabled, unavailable, speakingSlug, speak, stop }),
    [enabled, setEnabled, unavailable, speakingSlug, speak, stop],
  );
}

// ---------------------------------------------------------------------------
// INPUT — useSpeechInput
// ---------------------------------------------------------------------------

export interface SpeechInput {
  /** False during SSR and on browsers without SpeechRecognition. */
  supported: boolean;
  listening: boolean;
  start: () => void;
  stop: () => void;
  /** Live transcript while you're still talking. */
  interim: string;
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeechInput(onFinal: (text: string) => void): SpeechInput {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  // SSR-safe support probe.
  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const start = useCallback(() => {
    if (recognitionRef.current) return; // already listening
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang =
      (typeof navigator !== "undefined" && navigator.language) || "en-US";

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      setInterim(interimText);
      const trimmed = finalText.trim();
      if (trimmed) onFinalRef.current(trimmed);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
    };
    recognition.onerror = () => {
      // onend fires right after and resets state.
    };

    recognitionRef.current = recognition;
    setInterim("");
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // Abort cleanly if the composer unmounts mid-sentence.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  return { supported, listening, start, stop, interim };
}
