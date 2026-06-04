/**
 * Voice client — hits the backend's /api/v1/voice/{slug}/speak endpoint,
 * which streams mp3 from ElevenLabs (or 503s gracefully when no key).
 *
 * The frontend never holds an ElevenLabs API key — that's a backend concern.
 */

import { API_BASE, getAccessToken } from "./api";

export interface VoiceStatus {
  available: boolean;
}

export async function fetchVoiceStatus(): Promise<VoiceStatus> {
  const token = getAccessToken();
  if (!token) return { available: false };
  try {
    const res = await fetch(`${API_BASE}/api/v1/voice/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { available: false };
    return (await res.json()) as VoiceStatus;
  } catch {
    return { available: false };
  }
}

/**
 * Fetches the synthesized audio for one council member's reply and starts
 * playback. Returns an object you can call `.stop()` on to cancel mid-stream
 * (used when a newer message arrives or the user toggles voice off).
 */
export interface VoiceHandle {
  stop: () => void;
}

export async function speak(
  memberSlug: string,
  text: string,
): Promise<VoiceHandle> {
  const token = getAccessToken();
  if (!token) return { stop: () => {} };

  const controller = new AbortController();
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;

  try {
    const res = await fetch(
      `${API_BASE}/api/v1/voice/${encodeURIComponent(memberSlug)}/speak`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      // 503 (no key configured) or upstream issue — silently no-op so the UI
      // stays usable.
      return { stop: () => controller.abort() };
    }
    const blob = await res.blob();
    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    audio.preload = "auto";
    audio.onended = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    void audio.play().catch(() => {
      // Autoplay can be blocked until the user interacts; the next message
      // (sent by them) will be in a user gesture and will play fine.
    });
  } catch {
    /* network/abort errors: silent */
  }

  return {
    stop: () => {
      controller.abort();
      if (audio) {
        audio.pause();
        audio.src = "";
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
  };
}
