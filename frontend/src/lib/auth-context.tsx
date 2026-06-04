"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ApiError,
  AuthResponse,
  UserPublic,
  api,
  clearTokens,
  getAccessToken,
  setTokens,
} from "./api";

interface AuthState {
  user: UserPublic | null;
  status: "loading" | "authenticated" | "anonymous";
}

interface AuthContextValue extends AuthState {
  signup: (input: { email: string; username: string; password: string }) => Promise<UserPublic>;
  login: (input: { email: string; password: string }) => Promise<UserPublic>;
  logout: () => Promise<void>;
  refresh: () => Promise<UserPublic | null>;
  setUser: (u: UserPublic | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, status: "loading" });
  const bootedRef = useRef(false);

  const setUser = useCallback((user: UserPublic | null) => {
    setState({ user, status: user ? "authenticated" : "anonymous" });
  }, []);

  const refresh = useCallback(async (): Promise<UserPublic | null> => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const me = await api<{ user: UserPublic }>("/api/v1/auth/me");
      setUser(me.user);
      return me.user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearTokens();
      }
      setUser(null);
      return null;
    }
  }, [setUser]);

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    void refresh();
  }, [refresh]);

  const signup = useCallback(
    async (input: { email: string; username: string; password: string }) => {
      const out = await api<AuthResponse>("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify(input),
        skipAuth: true,
      });
      setTokens(out.tokens.access_token, out.tokens.refresh_token ?? null);
      setUser(out.user);
      return out.user;
    },
    [setUser],
  );

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const out = await api<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
        skipAuth: true,
      });
      setTokens(out.tokens.access_token, out.tokens.refresh_token ?? null);
      setUser(out.user);
      return out.user;
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    try {
      await api("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: null }),
      });
    } catch {
      // best-effort; still clear locally
    }
    clearTokens();
    setUser(null);
  }, [setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signup, login, logout, refresh, setUser }),
    [state, signup, login, logout, refresh, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
