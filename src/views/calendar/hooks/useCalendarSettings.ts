"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CALENDAR_SETTINGS_KEY,
  loadCalendarSettings,
  saveCalendarSettings,
  type CalendarSettings,
} from "../settings";

export function useCalendarSettings() {
  const [settings, setSettings] = useState<CalendarSettings>(() => loadCalendarSettings());

  const update = useCallback((patch: Partial<CalendarSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      saveCalendarSettings(next);
      return next;
    });
  }, []);

  // Keep multiple open tabs / components in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CALENDAR_SETTINGS_KEY) setSettings(loadCalendarSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { settings, update };
}
