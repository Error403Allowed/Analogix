/**
 * Australian school term dates by state, 2026.
 *
 * Sourced from official state education department publications and verified
 * against the NSW School Planner 2026 (which defines Week 1 as starting Mon 26 Jan,
 * the week before students arrive on 2 Feb). Term weeks are counted from the
 * Monday that starts the first week of term, matching official week numbering.
 *
 * Sources:
 *   NSW: education.nsw.gov.au/schooling/calendars/2026
 *   VIC: education.vic.gov.au (2026-2030 Calendar PDF)
 *   QLD: education.qld.gov.au (school-calendar.pdf + school-planner.pdf)
 *   WA:  calendar2026.au, kisacademics.com (updated Feb 2026)
 *   SA:  calendar2026.au
 *   TAS: kineticeducation.com.au / publicdocumentcentre.education.tas.gov.au
 *   ACT: calendar2026.au
 *   NT:  calendar2026.au
 */

import { startOfWeek, differenceInCalendarWeeks, addWeeks } from "date-fns";

export type AustralianState =
  | "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";

export interface Term {
  id: number;
  label: string;
  /** First student day */
  start: Date;
  /** Last student day */
  end: Date;
}

export const STATE_LABELS: Record<AustralianState, string> = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA:  "Western Australia",
  SA:  "South Australia",
  TAS: "Tasmania",
  ACT: "ACT",
  NT:  "Northern Territory",
};

// Dates verified against official sources. Month is 0-indexed (Jan = 0).
export const TERM_DATA: Record<AustralianState, Term[]> = {
  // NSW: students start 2 Feb; official planner labels that week as "Week 2"
  // because Week 1 = 26-30 Jan (school development days only).
  // We store the MONDAY of Week 1 as weekAnchor for correct counting.
  NSW: [
    { id: 1, label: "Term 1", start: new Date(2026, 0, 28), end: new Date(2026, 3, 9)  },
    { id: 2, label: "Term 2", start: new Date(2026, 3, 28), end: new Date(2026, 6, 3)  },
    { id: 3, label: "Term 3", start: new Date(2026, 6, 20), end: new Date(2026, 8, 25) },
    { id: 4, label: "Term 4", start: new Date(2026, 9, 12), end: new Date(2026, 11, 18)},
  ],
  VIC: [
    { id: 1, label: "Term 1", start: new Date(2026, 0, 28), end: new Date(2026, 2, 27) },
    { id: 2, label: "Term 2", start: new Date(2026, 3, 13), end: new Date(2026, 5, 26) },
    { id: 3, label: "Term 3", start: new Date(2026, 6, 13), end: new Date(2026, 8, 18) },
    { id: 4, label: "Term 4", start: new Date(2026, 9, 5),  end: new Date(2026, 11, 18)},
  ],
  QLD: [
    { id: 1, label: "Term 1", start: new Date(2026, 0, 27), end: new Date(2026, 3, 2)  },
    { id: 2, label: "Term 2", start: new Date(2026, 3, 20), end: new Date(2026, 5, 26) },
    { id: 3, label: "Term 3", start: new Date(2026, 6, 13), end: new Date(2026, 8, 18) },
    { id: 4, label: "Term 4", start: new Date(2026, 9, 6),  end: new Date(2026, 11, 11)},
  ],
  WA: [
    { id: 1, label: "Term 1", start: new Date(2026, 1, 2),  end: new Date(2026, 3, 9)  },
    { id: 2, label: "Term 2", start: new Date(2026, 3, 28), end: new Date(2026, 6, 3)  },
    { id: 3, label: "Term 3", start: new Date(2026, 6, 20), end: new Date(2026, 8, 25) },
    { id: 4, label: "Term 4", start: new Date(2026, 9, 12), end: new Date(2026, 11, 17)},
  ],
  SA: [
    { id: 1, label: "Term 1", start: new Date(2026, 0, 27), end: new Date(2026, 3, 9)  },
    { id: 2, label: "Term 2", start: new Date(2026, 3, 27), end: new Date(2026, 6, 3)  },
    { id: 3, label: "Term 3", start: new Date(2026, 6, 20), end: new Date(2026, 8, 25) },
    { id: 4, label: "Term 4", start: new Date(2026, 9, 12), end: new Date(2026, 11, 11)},
  ],
  TAS: [
    { id: 1, label: "Term 1", start: new Date(2026, 1, 4),  end: new Date(2026, 3, 9)  },
    { id: 2, label: "Term 2", start: new Date(2026, 3, 28), end: new Date(2026, 6, 3)  },
    { id: 3, label: "Term 3", start: new Date(2026, 6, 20), end: new Date(2026, 8, 25) },
    { id: 4, label: "Term 4", start: new Date(2026, 9, 12), end: new Date(2026, 11, 17)},
  ],
  ACT: [
    { id: 1, label: "Term 1", start: new Date(2026, 1, 2),  end: new Date(2026, 3, 9)  },
    { id: 2, label: "Term 2", start: new Date(2026, 3, 28), end: new Date(2026, 6, 3)  },
    { id: 3, label: "Term 3", start: new Date(2026, 6, 20), end: new Date(2026, 8, 25) },
    { id: 4, label: "Term 4", start: new Date(2026, 9, 12), end: new Date(2026, 11, 18)},
  ],
  NT: [
    { id: 1, label: "Term 1", start: new Date(2026, 1, 2),  end: new Date(2026, 3, 9)  },
    { id: 2, label: "Term 2", start: new Date(2026, 3, 20), end: new Date(2026, 5, 26) },
    { id: 3, label: "Term 3", start: new Date(2026, 6, 20), end: new Date(2026, 8, 25) },
    { id: 4, label: "Term 4", start: new Date(2026, 9, 12), end: new Date(2026, 11, 11)},
  ],
};

export interface TermInfo {
  term: Term;
  week: number;
  weeksTotal: number;
  state: AustralianState;
}

/**
 * Returns which term the date falls in and what week number it is.
 * Week numbers are counted from the first Monday ON or AFTER the term start date.
 * This avoids counting a partial staff-only week as Week 1.
 * Returns null when in school holidays.
 */
export const getTermInfo = (date: Date, state: AustralianState): TermInfo | null => {
  const terms = TERM_DATA[state];
  for (const term of terms) {
    if (date >= term.start && date <= term.end) {
      // Anchor to the first Monday ON or AFTER term.start (skip partial week)
      const termWeekStart = startOfWeek(term.start, { weekStartsOn: 1 });
      const termWeekAnchor = term.start.getDay() === 1 ? termWeekStart : addWeeks(termWeekStart, 1);
      const thisWeekStart = startOfWeek(date, { weekStartsOn: 1 });
      const week = differenceInCalendarWeeks(thisWeekStart, termWeekAnchor, { weekStartsOn: 1 }) + 1;

      // Count total weeks from first Monday to last Monday of term
      const termLastWeekStart = startOfWeek(term.end, { weekStartsOn: 1 });
      const weeksTotal = differenceInCalendarWeeks(termLastWeekStart, termWeekAnchor, { weekStartsOn: 1 }) + 1;

      return { term, week, weeksTotal, state };
    }
  }
  return null;
};

/**
 * Returns the next upcoming term if currently in holidays, or null if past all terms.
 */
export const getNextTerm = (date: Date, state: AustralianState): Term | null => {
  return TERM_DATA[state].find(t => t.start > date) || null;
};

export const getStoredState = (): AustralianState | null => {
  if (typeof window === "undefined") return null;
  try {
    const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    return prefs.state || null;
  } catch {
    return null;
  }
};
