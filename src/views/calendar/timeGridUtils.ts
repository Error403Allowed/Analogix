import { addMinutes, startOfDay } from "date-fns";
import type { AppEvent } from "@/types/events";

export const MINUTES_PER_DAY = 24 * 60;
export const TIME_GRID_SNAP_MINUTES = 15;
export const MIN_EVENT_DURATION_MINUTES = 15;
export const DEFAULT_EVENT_DURATION_MINUTES = 60;
export const MAX_INFERRED_IMPORT_DURATION_MINUTES = 180;

export function clampMinutes(minutes: number): number {
  return Math.min(Math.max(minutes, 0), MINUTES_PER_DAY);
}

export function snapMinutes(
  minutes: number,
  step = TIME_GRID_SNAP_MINUTES,
): number {
  return clampMinutes(Math.round(minutes / step) * step);
}

export function clampEventStartMinutes(
  minutes: number,
  durationMinutes: number,
): number {
  return Math.min(
    Math.max(minutes, 0),
    Math.max(MINUTES_PER_DAY - durationMinutes, 0),
  );
}

export function normalizeMinuteRange(
  startMinutes: number,
  endMinutes: number,
  minDurationMinutes = MIN_EVENT_DURATION_MINUTES,
): { startMin: number; endMin: number } {
  let startMin = clampMinutes(Math.min(startMinutes, endMinutes));
  let endMin = clampMinutes(Math.max(startMinutes, endMinutes));

  if (endMin - startMin >= minDurationMinutes) {
    return { startMin, endMin };
  }

  endMin = Math.min(startMin + minDurationMinutes, MINUTES_PER_DAY);
  startMin = Math.max(0, endMin - minDurationMinutes);

  return { startMin, endMin };
}

export function minutesToDate(day: Date, minutes: number): Date {
  return addMinutes(startOfDay(day), clampMinutes(minutes));
}

export function getEventStartMinutes(event: AppEvent): number {
  const start = new Date(event.date);
  return start.getHours() * 60 + start.getMinutes();
}

export function getEventDurationMinutes(
  event: AppEvent,
  fallbackDurationMinutes = DEFAULT_EVENT_DURATION_MINUTES,
  siblingEvents?: AppEvent[],
): number {
  if (event.endDate) {
    return Math.max(
      Math.round(
        (new Date(event.endDate).getTime() - new Date(event.date).getTime()) /
          60000,
      ),
      MIN_EVENT_DURATION_MINUTES,
    );
  }

  if (event.source === "import" && siblingEvents) {
    const startMinutes = getEventStartMinutes(event);
    const nextStartMinutes = siblingEvents
      .filter((candidate) => candidate.id !== event.id)
      .map((candidate) => getEventStartMinutes(candidate))
      .filter((candidateStart) => candidateStart > startMinutes)
      .sort((a, b) => a - b)[0];

    if (nextStartMinutes !== undefined) {
      const inferredDuration = nextStartMinutes - startMinutes;

      if (
        inferredDuration >= MIN_EVENT_DURATION_MINUTES &&
        inferredDuration <= MAX_INFERRED_IMPORT_DURATION_MINUTES
      ) {
        return inferredDuration;
      }
    }
  }

  return fallbackDurationMinutes;
}

export function formatMinutesForTimeInput(minutes: number): string {
  const clampedMinutes = Math.min(
    clampMinutes(minutes),
    MINUTES_PER_DAY - TIME_GRID_SNAP_MINUTES,
  );
  const hours = Math.floor(clampedMinutes / 60);
  const mins = clampedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
