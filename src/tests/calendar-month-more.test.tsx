// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { setHours, setMinutes, format } from "date-fns";
import { MonthView } from "@/views/calendar/components/MonthView";
import type { AppEvent } from "@/types/events";

const allTypes = {
  event: { color: "#3b82f6", label: "Event", icon: "📌" },
};

function makeEvents(day: Date, count: number): AppEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `e-${i}`,
    title: `Event ${i}`,
    date: setMinutes(setHours(new Date(day), 9 + i), 0),
    type: "event",
    source: "manual" as const,
  }));
}

describe("MonthView overflow popover", () => {
  it("opens a popover listing every event when '+n more' is clicked", () => {
    const today = new Date();
    const events = makeEvents(today, 5);
    const dayKey = format(today, "yyyy-MM-dd");
    render(
      <MonthView
        date={today}
        events={events}
        allTypes={allTypes}
        onSelectDay={() => {}}
        onSelectEvent={() => {}}
        onClickCreate={() => {}}
      />,
    );

    // Only 3 chips render inline; the rest hide behind the overflow button.
    fireEvent.click(screen.getByTestId(`month-more-${dayKey}`));

    const list = screen.getByTestId("month-more-list");
    for (let i = 0; i < 5; i += 1) {
      expect(list.textContent).toContain(`Event ${i}`);
    }
  });

  it("selects an event from the popover", () => {
    const today = new Date();
    const events = makeEvents(today, 4);
    const dayKey = format(today, "yyyy-MM-dd");
    const onSelectEvent = vi.fn();
    render(
      <MonthView
        date={today}
        events={events}
        allTypes={allTypes}
        onSelectDay={() => {}}
        onSelectEvent={onSelectEvent}
        onClickCreate={() => {}}
      />,
    );

    fireEvent.click(screen.getByTestId(`month-more-${dayKey}`));
    fireEvent.click(screen.getByText("Event 3"));
    expect(onSelectEvent).toHaveBeenCalledWith(expect.objectContaining({ id: "e-3" }));
  });

  it("closes the popover on backdrop click", () => {
    const today = new Date();
    const events = makeEvents(today, 4);
    const dayKey = format(today, "yyyy-MM-dd");
    render(
      <MonthView
        date={today}
        events={events}
        allTypes={allTypes}
        onSelectDay={() => {}}
        onSelectEvent={() => {}}
        onClickCreate={() => {}}
      />,
    );

    fireEvent.click(screen.getByTestId(`month-more-${dayKey}`));
    expect(screen.queryByTestId("month-more-list")).not.toBeNull();
    fireEvent.click(screen.getByTestId("month-more-backdrop"));
    expect(screen.queryByTestId("month-more-list")).toBeNull();
  });
});
