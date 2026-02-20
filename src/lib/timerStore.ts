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
  sessionsTarget: number;
  settings: TimerSettings;
  lastTick: number; // timestamp of last save, used to calc drift
}

export const DEFAULT_SETTINGS: TimerSettings = {
  study: 25 * 60,
  break: 5 * 60,
};
export const DEFAULT_SESSIONS_TARGET = 4;
export const MAX_SESSIONS_TARGET = 12;

const KEY = "analogix_timer_state";

export function loadTimerState(): TimerState {
  try {
    if (typeof window === "undefined") return getDefaultTimerState();
    const raw = localStorage.getItem(KEY);
    if (!raw) return getDefaultTimerState();
    const saved = JSON.parse(raw) as Partial<TimerState>;
    const settings = normalizeSettings(saved.settings);
    const phase: TimerPhase = saved.phase === "break" ? "break" : "study";
    const sessionsCompleted = toNonNegativeInt(saved.sessionsCompleted);
    const sessionsTarget = clampSessionsTarget(saved.sessionsTarget);
    const hasTimeLeft = typeof saved.timeLeft === "number" && Number.isFinite(saved.timeLeft);
    let timeLeft = hasTimeLeft ? Math.max(0, Math.floor(saved.timeLeft as number)) : settings[phase];
    let isActive = !!saved.isActive;
    let lastTick = typeof saved.lastTick === "number" && Number.isFinite(saved.lastTick)
      ? saved.lastTick
      : Date.now();
    if (isReloadNavigation()) {
      return {
        phase: "study",
        timeLeft: settings.study,
        isActive: false,
        sessionsCompleted: 0,
        sessionsTarget,
        settings,
        lastTick: Date.now(),
      };
    }
    // If timer was active, account for elapsed time while page was closed
    if (isActive && lastTick) {
      const elapsed = Math.floor((Date.now() - lastTick) / 1000);
      timeLeft = Math.max(0, timeLeft - elapsed);
      if (timeLeft === 0) isActive = false;
    }
    return {
      phase,
      timeLeft,
      isActive,
      sessionsCompleted,
      sessionsTarget,
      settings,
      lastTick
    };
  } catch {
    return getDefaultTimerState();
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

export function getDefaultTimerState(): TimerState {
  const settings = DEFAULT_SETTINGS;
  return {
    phase: "study",
    timeLeft: settings.study,
    isActive: false,
    sessionsCompleted: 0,
    sessionsTarget: DEFAULT_SESSIONS_TARGET,
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

function normalizeSettings(settings?: TimerSettings): TimerSettings {
  const base = loadSettings();
  if (!settings) return base;
  const study = typeof settings.study === "number" && Number.isFinite(settings.study) ? settings.study : base.study;
  const rest = typeof settings.break === "number" && Number.isFinite(settings.break) ? settings.break : base.break;
  return { study, break: rest };
}

function clampSessionsTarget(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SESSIONS_TARGET;
  return Math.min(MAX_SESSIONS_TARGET, Math.max(1, Math.floor(n)));
}

function toNonNegativeInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function isReloadNavigation(): boolean {
  if (typeof window === "undefined") return false;
  const navEntry = window.performance?.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined;
  if (navEntry?.type) return navEntry.type === "reload";
  const legacyType = window.performance?.navigation?.type;
  return legacyType === 1;
}
