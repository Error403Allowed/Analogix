import { MMKV } from "../storage/mmkv";

const store = new MMKV({ id: "analogix.streak" });
const KEY = "activityLog";
const TS_KEY = "lastUpdated";

type ActivityEntry = { date: string; count: number };

export function getCachedActivity(): ActivityEntry[] {
  try {
    const raw = store.getString(KEY);
    if (raw) return JSON.parse(raw) as ActivityEntry[];
  } catch { /* ignore */ }
  return [];
}

export function setCachedActivity(log: ActivityEntry[]): void {
  try {
    store.set(KEY, JSON.stringify(log));
    store.set(TS_KEY, Date.now());
  } catch { /* ignore */ }
}

export function getCacheAge(): number | null {
  try {
    const ts = store.getString(TS_KEY);
    return ts ? Date.now() - Number(ts) : null;
  } catch { return null; }
}
