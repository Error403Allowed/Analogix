// activityLog.ts — stores per-day session counts for the last 30 days
const KEY = "analogix_activity_log_v1";

export interface DayActivity { date: string; count: number; } // date = "YYYY-MM-DD"

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): DayActivity[] {
  try {
    const r = typeof window !== "undefined" && localStorage.getItem(KEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

function save(log: DayActivity[]) {
  try { localStorage.setItem(KEY, JSON.stringify(log)); } catch {}
}

export const activityLog = {
  record() {
    const log = load();
    const d = today();
    const idx = log.findIndex(e => e.date === d);
    if (idx >= 0) log[idx].count++;
    else log.push({ date: d, count: 1 });
    // keep last 30 days only
    const trimmed = log.sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    save(trimmed);
  },

  getLast7(): DayActivity[] {
    const log = load();
    const result: DayActivity[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const found = log.find(e => e.date === dateStr);
      result.push({ date: dateStr, count: found?.count ?? 0 });
    }
    return result;
  },
};
