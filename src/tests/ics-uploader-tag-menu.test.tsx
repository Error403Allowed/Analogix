// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ICSUploader from "@/components/shared/ICSUploader";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/utils/eventStore", () => ({
  eventStore: { addMultiple: vi.fn() },
}));

const makeTypes = (count: number) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, i) => [
      `tag-${i}`,
      { color: "#3b82f6", label: `Tag ${i}`, icon: "📌" },
    ]),
  );

function pickFile() {
  render(<ICSUploader allTypes={makeTypes(10)} />);
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["BEGIN:VCALENDAR\nEND:VCALENDAR"], "timetable.ics", {
    type: "text/calendar",
  });
  fireEvent.change(input, { target: { files: [file] } });
  return input;
}

describe("ICSUploader tag menu", () => {
  it("opens a scrollable menu listing every tag", () => {
    pickFile();

    fireEvent.click(screen.getByTestId("ics-tag-toggle"));
    const menu = screen.getByTestId("ics-tag-menu");

    // All 10 tags must be reachable in the menu.
    expect(menu.querySelectorAll('[role="option"]')).toHaveLength(10);
    expect(screen.getByTestId("ics-tag-option-tag-9")).toBeTruthy();

    // Regression: `overflow-hidden` used to cancel out `overflow-y-auto`
    // (shorthand wins depending on CSS order), so the list could not scroll.
    expect(menu.classList.contains("overflow-y-auto")).toBe(true);
    expect(menu.classList.contains("overflow-hidden")).toBe(false);
  });

  it("selects a tag and closes the menu", () => {
    pickFile();

    fireEvent.click(screen.getByTestId("ics-tag-toggle"));
    fireEvent.click(screen.getByTestId("ics-tag-option-tag-7"));

    expect(screen.queryByTestId("ics-tag-menu")).toBeNull();
    expect(screen.getByTestId("ics-tag-toggle").textContent).toContain("Tag 7");
  });

  it("closes the menu on Escape", () => {
    pickFile();

    fireEvent.click(screen.getByTestId("ics-tag-toggle"));
    expect(screen.queryByTestId("ics-tag-menu")).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("ics-tag-menu")).toBeNull();
  });
});
