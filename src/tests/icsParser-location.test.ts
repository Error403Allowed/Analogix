import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseICS } from '@/utils/icsParser';

function icsDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `T${p(d.getHours())}${p(d.getMinutes())}00`
  );
}

function mockFileReaderWith(content: string) {
  // parseICS uses `new FileReader()` + `readAsText(file)`.
  // Stub it so the test runs in the node environment.
  (globalThis as any).FileReader = class {
    result: string | null = null;
    onload: ((e: any) => void) | null = null;
    onerror: (() => void) | null = null;
    readAsText(_file: any) {
      this.result = content;
      queueMicrotask(() => this.onload?.({ target: { result: content } }));
    }
  };
}

describe('parseICS location support (Sentral rooms)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves LOCATION on a single event', async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:single-1',
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      'SUMMARY:Maths Class',
      'DESCRIPTION:Algebra lesson',
      'LOCATION:Room B12',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    mockFileReaderWith(ics);
    const events = (await parseICS({} as any)) as any[];

    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Maths Class');
    expect(events[0].location).toBe('Room B12');
  });

  it('preserves LOCATION on recurring occurrences', async () => {
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 50 * 60 * 1000);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:recur-1',
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      'RRULE:FREQ=WEEKLY;COUNT=3',
      'SUMMARY:Science Lesson',
      'LOCATION:Lab 4',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    mockFileReaderWith(ics);
    const events = (await parseICS({} as any)) as any[];

    expect(events.length).toBeGreaterThanOrEqual(2);
    for (const e of events) {
      expect(e.location).toBe('Lab 4');
    }
  });

  it('omits location when the ICS has no LOCATION field', async () => {
    const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:no-loc-1',
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      'SUMMARY:Study Session',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    mockFileReaderWith(ics);
    const events = (await parseICS({} as any)) as any[];

    expect(events).toHaveLength(1);
    expect(events[0].location).toBeUndefined();
  });
});
