import { describe, expect, it } from "vitest";
import type { AppEvent } from "@/types/events";
import {
  DEFAULT_EVENT_DURATION_MINUTES,
  formatMinutesForTimeInput,
  getEventDurationMinutes,
  normalizeMinuteRange,
  snapMinutes,
} from "@/views/calendar/timeGridUtils";

function makeEvent(
  start: string,
  end?: string,
  source: AppEvent["source"] = "manual",
): AppEvent {
  return {
    id: "event-1",
    title: "Event",
    date: new Date(start),
    endDate: end ? new Date(end) : undefined,
    type: "event",
    source,
  };
}

describe("timeGridUtils", () => {
  it("snaps grid math to 15-minute increments", () => {
    expect(snapMinutes(8)).toBe(15);
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(38)).toBe(45);
  });

  it("keeps dragged ranges at or above the minimum duration", () => {
    expect(normalizeMinuteRange(600, 600)).toEqual({ startMin: 600, endMin: 615 });
    expect(normalizeMinuteRange(630, 600)).toEqual({ startMin: 600, endMin: 630 });
  });

  it("uses explicit event durations when available", () => {
    const explicit = makeEvent("2026-03-23T09:00:00", "2026-03-23T09:45:00");
    const implicit = makeEvent("2026-03-23T09:00:00");

    expect(getEventDurationMinutes(explicit)).toBe(45);
    expect(getEventDurationMinutes(implicit)).toBe(DEFAULT_EVENT_DURATION_MINUTES);
  });

  it("infers legacy import durations from the next event on the same day", () => {
    const first = makeEvent("2026-03-23T09:00:00", undefined, "import");
    const second = { ...makeEvent("2026-03-23T09:58:00", undefined, "import"), id: "event-2" };

    expect(getEventDurationMinutes(first, DEFAULT_EVENT_DURATION_MINUTES, [first, second])).toBe(58);
  });

  it("keeps time inputs aligned to selectable steps", () => {
    expect(formatMinutesForTimeInput(9 * 60 + 30)).toBe("09:30");
    expect(formatMinutesForTimeInput(24 * 60)).toBe("23:45");
  });
});
