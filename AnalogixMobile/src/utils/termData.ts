export interface Term {
  id: number;
  label: string;
  start: Date;
  end: Date;
}

export type AustralianState = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";

const YEAR = new Date().getFullYear();

export const TERM_DATA: Record<AustralianState, Term[]> = {
  NSW: [
    { id: 1, label: "Term 1", start: new Date(YEAR, 0, 28), end: new Date(YEAR, 3, 11) },
    { id: 2, label: "Term 2", start: new Date(YEAR, 3, 28), end: new Date(YEAR, 6, 4) },
    { id: 3, label: "Term 3", start: new Date(YEAR, 6, 21), end: new Date(YEAR, 8, 26) },
    { id: 4, label: "Term 4", start: new Date(YEAR, 9, 13), end: new Date(YEAR, 11, 19) },
  ],
  VIC: [
    { id: 1, label: "Term 1", start: new Date(YEAR, 0, 29), end: new Date(YEAR, 3, 4) },
    { id: 2, label: "Term 2", start: new Date(YEAR, 3, 22), end: new Date(YEAR, 6, 27) },
    { id: 3, label: "Term 3", start: new Date(YEAR, 6, 14), end: new Date(YEAR, 8, 19) },
    { id: 4, label: "Term 4", start: new Date(YEAR, 9, 6), end: new Date(YEAR, 11, 20) },
  ],
  QLD: [
    { id: 1, label: "Term 1", start: new Date(YEAR, 0, 27), end: new Date(YEAR, 3, 4) },
    { id: 2, label: "Term 2", start: new Date(YEAR, 3, 22), end: new Date(YEAR, 6, 27) },
    { id: 3, label: "Term 3", start: new Date(YEAR, 6, 14), end: new Date(YEAR, 8, 19) },
    { id: 4, label: "Term 4", start: new Date(YEAR, 9, 6), end: new Date(YEAR, 11, 12) },
  ],
  WA: [
    { id: 1, label: "Term 1", start: new Date(YEAR, 1, 3), end: new Date(YEAR, 3, 11) },
    { id: 2, label: "Term 2", start: new Date(YEAR, 3, 28), end: new Date(YEAR, 6, 4) },
    { id: 3, label: "Term 3", start: new Date(YEAR, 6, 21), end: new Date(YEAR, 8, 26) },
    { id: 4, label: "Term 4", start: new Date(YEAR, 9, 13), end: new Date(YEAR, 11, 19) },
  ],
  SA: [
    { id: 1, label: "Term 1", start: new Date(YEAR, 0, 28), end: new Date(YEAR, 3, 11) },
    { id: 2, label: "Term 2", start: new Date(YEAR, 3, 28), end: new Date(YEAR, 6, 4) },
    { id: 3, label: "Term 3", start: new Date(YEAR, 6, 21), end: new Date(YEAR, 8, 26) },
    { id: 4, label: "Term 4", start: new Date(YEAR, 9, 13), end: new Date(YEAR, 11, 19) },
  ],
  TAS: [
    { id: 1, label: "Term 1", start: new Date(YEAR, 1, 5), end: new Date(YEAR, 3, 11) },
    { id: 2, label: "Term 2", start: new Date(YEAR, 3, 28), end: new Date(YEAR, 6, 4) },
    { id: 3, label: "Term 3", start: new Date(YEAR, 6, 21), end: new Date(YEAR, 8, 26) },
    { id: 4, label: "Term 4", start: new Date(YEAR, 9, 13), end: new Date(YEAR, 11, 19) },
  ],
  ACT: [
    { id: 1, label: "Term 1", start: new Date(YEAR, 1, 5), end: new Date(YEAR, 3, 11) },
    { id: 2, label: "Term 2", start: new Date(YEAR, 3, 28), end: new Date(YEAR, 6, 4) },
    { id: 3, label: "Term 3", start: new Date(YEAR, 6, 21), end: new Date(YEAR, 8, 26) },
    { id: 4, label: "Term 4", start: new Date(YEAR, 9, 13), end: new Date(YEAR, 11, 19) },
  ],
  NT: [
    { id: 1, label: "Term 1", start: new Date(YEAR, 1, 3), end: new Date(YEAR, 3, 11) },
    { id: 2, label: "Term 2", start: new Date(YEAR, 3, 28), end: new Date(YEAR, 6, 4) },
    { id: 3, label: "Term 3", start: new Date(YEAR, 6, 21), end: new Date(YEAR, 8, 26) },
    { id: 4, label: "Term 4", start: new Date(YEAR, 9, 13), end: new Date(YEAR, 11, 19) },
  ],
};

export interface TermInfo {
  term: Term;
  week: number;
  totalWeeks: number;
  progress: number;
}

export function getTermInfo(date: Date, state: AustralianState): TermInfo | null {
  const terms = TERM_DATA[state];
  for (const term of terms) {
    if (date >= term.start && date <= term.end) {
      const totalMs = term.end.getTime() - term.start.getTime();
      const elapsedMs = date.getTime() - term.start.getTime();
      const week = Math.floor(elapsedMs / (7 * 86400000)) + 1;
      const totalWeeks = Math.ceil(totalMs / (7 * 86400000));
      const progress = Math.min(1, elapsedMs / totalMs);
      return { term, week, totalWeeks, progress: Math.round(progress * 100) };
    }
  }
  return null;
}
