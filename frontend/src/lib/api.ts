/**
 * Typed fetch client for the ManyMinds backend.
 *
 * - Reads the base URL from NEXT_PUBLIC_API_URL (default: http://localhost:8000).
 * - Attaches the bearer token from localStorage when present.
 * - On 401 it auto-tries a refresh, retries once, and only then throws.
 * - Throws ApiError with a human-readable message for non-2xx responses.
 */

export const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8000";

const ACCESS_KEY = "manyminds:access_token";
const REFRESH_KEY = "manyminds:refresh_token";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string | null, refresh?: string | null) {
  if (typeof window === "undefined") return;
  if (access) window.localStorage.setItem(ACCESS_KEY, access);
  else window.localStorage.removeItem(ACCESS_KEY);
  if (refresh !== undefined) {
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
    else window.localStorage.removeItem(REFRESH_KEY);
  }
}

export function clearTokens() {
  setTokens(null, null);
}

function extractDetail(body: unknown): string {
  if (!body || typeof body !== "object") return "Request failed";
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg;
  }
  return "Request failed";
}

async function rawFetch<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!init.skipAuth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, body, extractDetail(body));
  }
  return body as T;
}

let refreshing: Promise<string | null> | null = null;
async function tryRefresh(): Promise<string | null> {
  if (refreshing) return refreshing;
  const refresh = getRefreshToken();
  if (!refresh) return null;
  refreshing = (async () => {
    try {
      const out = await rawFetch<{ access_token: string; expires_in: number }>(
        "/api/v1/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify({ refresh_token: refresh }),
          skipAuth: true,
        },
      );
      setTokens(out.access_token, refresh);
      return out.access_token;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * Public helper — fetch with auth + auto-refresh. Use for every backend call.
 */
export async function api<T = unknown>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  try {
    return await rawFetch<T>(path, init);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && !init.skipAuth) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return await rawFetch<T>(path, init);
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Types matching backend Pydantic schemas
// ---------------------------------------------------------------------------

export interface UserPublic {
  id: string;
  email: string;
  username: string;
  onboarding_step: number;
  is_verified: boolean;
}

export interface TokenBundle {
  access_token: string;
  refresh_token?: string | null;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: UserPublic;
  tokens: TokenBundle;
}

export interface CouncilMember {
  id: string;
  slug: string;
  name: string;
  role: string;
  personality_type: string;
  tone: string | null;
  expertise_areas: string[];
  behavioral_constraints: Record<string, unknown>;
  color_theme: string | null;
  position_order: number;
  is_active: boolean;
  one_liner: string | null;
  portrait: string | null;
}

export interface Environment {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mood: string | null;
  thumbnail_url: string | null;
  scene_url: string | null;
  ambient_audio_url: string | null;
}

export interface ChatSession {
  id: string;
  title: string | null;
  session_type: string;
  environment_id: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  council_member_id: string | null;
  member_slug: string | null;
  member_name: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  content_type: "text" | "image" | "voice" | "multimodal";
  image_url: string | null;
  voice_audio_url: string | null;
  created_at: string;
}

export interface MessageTurn {
  user_message: ChatMessage;
  member_messages: ChatMessage[];
}

export interface PersonalityProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  dominant_trait?: string | null;
}

export interface QuizResult {
  profile: PersonalityProfile;
  onboarding_step: number;
  council_seeded: boolean;
}
