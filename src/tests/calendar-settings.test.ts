// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_CALENDAR_SETTINGS,
  hourHeightForDensity,
  loadCalendarSettings,
  sanitizeCalendarSettings,
  saveCalendarSettings,
  visibleHoursForSettings,
} from '@/views/calendar/settings';

describe('calendar settings model', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads defaults when nothing is stored', () => {
    expect(loadCalendarSettings()).toEqual(DEFAULT_CALENDAR_SETTINGS);
  });

  it('round-trips through localStorage', () => {
    saveCalendarSettings({
      ...DEFAULT_CALENDAR_SETTINGS,
      density: 'compact',
      weekStartsOn: 0,
      workDayStart: 9,
      workDayEnd: 17,
      hiddenTags: ['sport'],
    });
    const loaded = loadCalendarSettings();
    expect(loaded.density).toBe('compact');
    expect(loaded.weekStartsOn).toBe(0);
    expect(loaded.hiddenTags).toEqual(['sport']);
  });

  it('sanitizes corrupt or out-of-range values back to safe defaults', () => {
    const clean = sanitizeCalendarSettings({
      defaultView: 'year',
      weekStartsOn: 3,
      workDayStart: -5,
      workDayEnd: 99,
      defaultDurationMinutes: 37,
      hiddenTags: ['ok', 42, null],
    });
    expect(clean.defaultView).toBe(DEFAULT_CALENDAR_SETTINGS.defaultView);
    expect(clean.weekStartsOn).toBe(1);
    expect(clean.workDayStart).toBe(0);
    expect(clean.workDayEnd).toBe(24);
    expect(clean.defaultDurationMinutes).toBe(60);
    expect(clean.hiddenTags).toEqual(['ok']);
  });

  it('keeps the work-day window at least one hour wide', () => {
    const clean = sanitizeCalendarSettings({ workDayStart: 17, workDayEnd: 9 });
    expect(clean.workDayEnd).toBeGreaterThan(clean.workDayStart);
  });

  it('derives visible hours from the work-day window', () => {
    expect(visibleHoursForSettings({ workHoursOnly: false, workDayStart: 8, workDayEnd: 18 }))
      .toHaveLength(24);
    expect(visibleHoursForSettings({ workHoursOnly: true, workDayStart: 8, workDayEnd: 18 }))
      .toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });

  it('gives compact density a smaller hour height', () => {
    expect(hourHeightForDensity('compact')).toBeLessThan(hourHeightForDensity('comfortable'));
  });
});
