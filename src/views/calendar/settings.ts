import { HOURS } from "./constants";
import type { CalendarView } from "./types";

export type CalendarDensity = "comfortable" | "compact";

/** 0 = Sunday, 1 = Monday — the only two options date-fns needs here. */
export type WeekStartsOn = 0 | 1;

export interface CalendarSettings {
  defaultView: CalendarView;
  weekStartsOn: WeekStartsOn;
  showWeekends: boolean;
  density: CalendarDensity;
  /** Work-day window, whole hours in 0-23. End is exclusive. */
  workDayStart: number;
  workDayEnd: number;
  /** When true the time grid collapses to the work-day window. */
  workHoursOnly: boolean;
  defaultDurationMinutes: 15 | 30 | 45 | 60 | 90 | 120;
  /** Tag key pre-selected in the ICS import picker. */
  defaultImportTag: string;
  /** Tag keys hidden from every calendar surface. */
  hiddenTags: string[];
}

export const CALENDAR_SETTINGS_KEY = "analogix_calendar_settings";
export const CALENDAR_VIEW_KEY = "analogix_calendar_view";
export const CALENDAR_FILTER_KEY = "analogix_calendar_filter";

export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
  defaultView: "week",
  weekStartsOn: 1,
  showWeekends: true,
  density: "comfortable",
  workDayStart: 8,
  workDayEnd: 18,
  workHoursOnly: true,
  defaultDurationMinutes: 60,
  defaultImportTag: "event",
  hiddenTags: [],
};

/** Hour-row height in px. Comfortable is roomier than the legacy fixed 56. */
export function hourHeightForDensity(density: CalendarDensity): number {
  return density === "compact" ? 42 : 64;
}

export function visibleHoursForSettings(s: Pick<CalendarSettings, "workHoursOnly" | "workDayStart" | "workDayEnd">): number[] {
  if (!s.workHoursOnly) return HOURS;
  const start = Math.min(Math.max(Math.floor(s.workDayStart), 0), 23);
  const end = Math.min(Math.max(Math.ceil(s.workDayEnd), start + 1), 24);
  const hours: number[] = [];
  for (let h = start; h < end; h += 1) hours.push(h);
  return hours;
}

function isCalendarView(v: unknown): v is CalendarView {
  return v === "month" || v === "week" || v === "day" || v === "schedule";
}

function isValidDuration(v: unknown): v is CalendarSettings["defaultDurationMinutes"] {
  return v === 15 || v === 30 || v === 45 || v === 60 || v === 90 || v === 120;
}

export function sanitizeCalendarSettings(raw: unknown): CalendarSettings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const start = typeof r.workDayStart === "number" ? Math.min(Math.max(Math.floor(r.workDayStart), 0), 23) : DEFAULT_CALENDAR_SETTINGS.workDayStart;
  const endRaw = typeof r.workDayEnd === "number" ? Math.min(Math.max(Math.ceil(r.workDayEnd), 1), 24) : DEFAULT_CALENDAR_SETTINGS.workDayEnd;
  const end = Math.max(endRaw, start + 1);
  return {
    defaultView: isCalendarView(r.defaultView) ? r.defaultView : DEFAULT_CALENDAR_SETTINGS.defaultView,
    weekStartsOn: r.weekStartsOn === 0 ? 0 : 1,
    showWeekends: typeof r.showWeekends === "boolean" ? r.showWeekends : DEFAULT_CALENDAR_SETTINGS.showWeekends,
    density: r.density === "compact" ? "compact" : "comfortable",
    workDayStart: start,
    workDayEnd: Math.min(end, 24),
    workHoursOnly: typeof r.workHoursOnly === "boolean" ? r.workHoursOnly : DEFAULT_CALENDAR_SETTINGS.workHoursOnly,
    defaultDurationMinutes: isValidDuration(r.defaultDurationMinutes) ? r.defaultDurationMinutes : DEFAULT_CALENDAR_SETTINGS.defaultDurationMinutes,
    defaultImportTag: typeof r.defaultImportTag === "string" && r.defaultImportTag ? r.defaultImportTag : DEFAULT_CALENDAR_SETTINGS.defaultImportTag,
    hiddenTags: Array.isArray(r.hiddenTags) ? r.hiddenTags.filter((t): t is string => typeof t === "string") : [],
  };
}

export function loadCalendarSettings(): CalendarSettings {
  if (typeof window === "undefined") return { ...DEFAULT_CALENDAR_SETTINGS };
  try {
    const raw = window.localStorage.getItem(CALENDAR_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_CALENDAR_SETTINGS };
    return sanitizeCalendarSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_CALENDAR_SETTINGS };
  }
}

export function saveCalendarSettings(settings: CalendarSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage full / private mode — settings simply don't persist */
  }
}

function loadString(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveString(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function loadLastView(fallback: CalendarView): CalendarView {
  const v = loadString(CALENDAR_VIEW_KEY);
  return isCalendarView(v) ? v : fallback;
}

export function saveLastView(view: CalendarView): void {
  saveString(CALENDAR_VIEW_KEY, view);
}

export function loadLastFilter(): string {
  return loadString(CALENDAR_FILTER_KEY) ?? "all";
}

export function saveLastFilter(filter: string): void {
  saveString(CALENDAR_FILTER_KEY, filter);
}
