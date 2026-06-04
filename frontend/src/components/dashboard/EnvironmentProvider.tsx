"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ENVIRONMENTS,
  ENVIRONMENT_STORAGE_KEY,
  Environment,
  findEnvironment,
  getDefaultEnvironment,
} from "@/lib/environments";

interface EnvironmentContextValue {
  current: Environment;
  setEnvironmentId: (id: string) => void;
  all: ReadonlyArray<Environment>;
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [currentId, setCurrentId] = useState<string>(() => getDefaultEnvironment().id);

  // Restore from localStorage on mount (client-only).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ENVIRONMENT_STORAGE_KEY);
      if (stored) setCurrentId(stored);
    } catch {
      // localStorage might be blocked — silently fall back to default.
    }
  }, []);

  const value = useMemo<EnvironmentContextValue>(() => {
    return {
      current: findEnvironment(currentId),
      setEnvironmentId: (id: string) => {
        setCurrentId(id);
        try {
          window.localStorage.setItem(ENVIRONMENT_STORAGE_KEY, id);
        } catch {
          // no-op
        }
      },
      all: ENVIRONMENTS,
    };
  }, [currentId]);

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment(): EnvironmentContextValue {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) {
    // Safe fallback when used outside provider (e.g. unit-test mount).
    return {
      current: getDefaultEnvironment(),
      setEnvironmentId: () => {},
      all: ENVIRONMENTS,
    };
  }
  return ctx;
}
