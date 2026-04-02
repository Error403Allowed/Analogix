import { describe, expect, it } from "vitest";
import { layoutEvents } from "@/views/calendar/layoutEvents";
import type { AppEvent } from "@/types/events";

const HOUR_H = 56;

function makeEvent(
  id: string,
  start: string,
  end?: string,
  source: AppEvent["source"] = "manual",
): AppEvent {
  return {
    id,
    title: id,
    date: new Date(start),
    endDate: end ? new Date(end) : undefined,
    type: "event",
    source,
  };
}

describe("layoutEvents", () => {
  it("does not narrow same-time events that fall on different days", () => {
    const laidOut = layoutEvents(
      [
        makeEvent("mon", "2026-03-23T11:20:00"),
        makeEvent("tue", "2026-03-24T11:20:00"),
      ],
      HOUR_H,
    );

    expect(laidOut).toHaveLength(2);
    expect(laidOut.every((entry) => entry.totalCols === 1)).toBe(true);
    expect(laidOut.every((entry) => entry.col === 0)).toBe(true);
    expect(laidOut.every((entry) => entry.span === 1)).toBe(true);
  });

  it("still narrows events that overlap on the same day", () => {
    const laidOut = layoutEvents(
      [
        makeEvent("a", "2026-03-23T11:20:00", "2026-03-23T12:20:00"),
        makeEvent("b", "2026-03-23T11:45:00", "2026-03-23T12:30:00"),
      ],
      HOUR_H,
    );

    expect(laidOut).toHaveLength(2);
    expect(laidOut.map((entry) => entry.totalCols)).toEqual([2, 2]);
    expect(new Set(laidOut.map((entry) => entry.col))).toEqual(new Set([0, 1]));
    expect(laidOut.map((entry) => entry.span)).toEqual([1, 1]);
  });

  it("lets later events expand back into free columns", () => {
    const laidOut = layoutEvents(
      [
        makeEvent("a", "2026-03-23T09:00:00", "2026-03-23T12:00:00"),
        makeEvent("b", "2026-03-23T09:00:00", "2026-03-23T10:00:00"),
        makeEvent("c", "2026-03-23T09:00:00", "2026-03-23T10:00:00"),
        makeEvent("d", "2026-03-23T10:00:00", "2026-03-23T11:00:00"),
      ],
      HOUR_H,
    );

    const expanded = laidOut.find((entry) => entry.event.id === "d");

    expect(expanded).toBeDefined();
    expect(expanded?.totalCols).toBe(3);
    expect(expanded?.col).toBe(1);
    expect(expanded?.span).toBe(2);
  });

  it("treats legacy imported events without end times as sequential when the next class starts shortly after", () => {
    const laidOut = layoutEvents(
      [
        makeEvent("a", "2026-03-23T09:00:00", undefined, "import"),
        makeEvent("b", "2026-03-23T09:58:00", undefined, "import"),
      ],
      HOUR_H,
    );

    expect(laidOut).toHaveLength(2);
    expect(laidOut.every((entry) => entry.totalCols === 1)).toBe(true);
    expect(laidOut.every((entry) => entry.col === 0)).toBe(true);
  });
});
