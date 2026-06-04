// localStorage helper for keeping last-5 game results.

export type GameResultRecord = {
  id: string;
  game: "chess" | "truth-or-dare" | "ludo";
  outcome: "win" | "loss" | "draw" | "finished";
  detail?: string; // free-form summary
  ts: number; // unix ms
};

const KEY = "manyminds:games";
const MAX = 5;

export function loadGameHistory(): GameResultRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX);
  } catch {
    return [];
  }
}

export function recordGameResult(record: Omit<GameResultRecord, "id" | "ts">): void {
  if (typeof window === "undefined") return;
  try {
    const prev = loadGameHistory();
    const entry: GameResultRecord = {
      ...record,
      id: `${record.game}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
    };
    const next = [entry, ...prev].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function gameHistorySummary(): {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  last?: GameResultRecord;
} {
  const list = loadGameHistory();
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const r of list) {
    if (r.outcome === "win") wins++;
    else if (r.outcome === "loss") losses++;
    else if (r.outcome === "draw") draws++;
  }
  // streak = consecutive wins/losses from most recent
  let streak = 0;
  if (list.length > 0) {
    const first = list[0].outcome;
    if (first === "win" || first === "loss") {
      for (const r of list) {
        if (r.outcome === first) streak++;
        else break;
      }
      if (first === "loss") streak = -streak;
    }
  }
  return { total: list.length, wins, losses, draws, streak, last: list[0] };
}
