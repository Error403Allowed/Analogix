import ICAL from "ical.js";

export interface ParsedIcsEvent {
  title: string;
  date: string;
  endDate: string | null;
  type: string | null;
  location: string | null;
  description: string | null;
}

/**
 * Parse a string of ICS calendar data into events. Mirrors the parser
 * in AnalogixWeb/src/utils/icsParser.ts.
 */
export function parseIcs(ics: string): ParsedIcsEvent[] {
  if (ics.length > 1_000_000) {
    return [];
  }
  try {
    const jcal = ICAL.parse(ics);
    const comp = new ICAL.Component(jcal);
    const vevents = comp.getAllSubcomponents("vevent");
    return vevents.map((v) => {
      const e = new ICAL.Event(v);
      return {
        title: e.summary || "Untitled event",
        date: e.startDate.toJSDate().toISOString(),
        endDate: e.endDate ? e.endDate.toJSDate().toISOString() : null,
        type: (v.getFirstPropertyValue("class") as string) ?? null,
        location: e.location || null,
        description: e.description || null,
      };
    });
  } catch {
    return [];
  }
}
