// Shared timer state via localStorage so TimerWidget and /timer page stay in sync

export type TimerPhase = "study" | "break";

export interface TimerSettings {
  study: number;
  break: number;
}

export interface TimerState {
  phase: TimerPhase;
  timeLeft: number;
  isActive: boolean;
  sessionsCompleted: number;
  settings: TimerSettings;
  lastTick: number; // timestamp of last save, used to calc drift
}

export const DEFAULT_SETTINGS: TimerSettings = {
  study: 25 * 60,
  break: 5 * 60,
};

const KEY = "analogix_timer_state";

export function loadTimerState(): TimerState {
  try {
    if (typeof window === "undefined") return defaultState();
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const saved: TimerState = JSON.parse(raw);
    // If timer was active, account for elapsed time while page was closed
    if (saved.isActive && saved.lastTick) {
      const elapsed = Math.floor((Date.now() - saved.lastTick) / 1000);
      saved.timeLeft = Math.max(0, saved.timeLeft - elapsed);
      if (saved.timeLeft === 0) saved.isActive = false;
    }
    return saved;
  } catch {
    return defaultState();
  }
}

export function saveTimerState(state: TimerState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, lastTick: Date.now() }));
    // NOTE: Do NOT dispatch a synthetic storage event here.
    // The native `storage` event only fires in *other* tabs, not the current one,
    // so manually dispatching it in the same window causes an infinite loop:
    // save → storage event → load state → setState → re-render → save → ...
  } catch {}
}

function defaultState(): TimerState {
  const settings = loadSettings();
  return {
    phase: "study",
    timeLeft: settings.study,
    isActive: false,
    sessionsCompleted: 0,
    settings,
    lastTick: Date.now(),
  };
}

export function loadSettings(): TimerSettings {
  try {
    const s = typeof window !== "undefined" && localStorage.getItem("pomodoroSettings");
    return s ? JSON.parse(s) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
