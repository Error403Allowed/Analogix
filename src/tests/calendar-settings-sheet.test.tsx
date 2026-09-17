// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CalendarSettingsSheet } from "@/views/calendar/components/CalendarSettingsSheet";
import { DEFAULT_CALENDAR_SETTINGS } from "@/views/calendar/settings";

vi.mock("@/components/ui/responsive-sheet", () => ({
  ResponsiveSheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="settings-sheet">{children}</div> : null,
  ResponsiveSheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveSheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ResponsiveSheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const allTypes = {
  event: { color: "#3b82f6", label: "Event", icon: "📌" },
  exam: { color: "#ef4444", label: "Exam", icon: "🎯" },
};

function renderSheet(patch = {}) {
  const onChange = vi.fn();
  render(
    <CalendarSettingsSheet
      open
      onOpenChange={() => {}}
      settings={{ ...DEFAULT_CALENDAR_SETTINGS, ...patch }}
      onChange={onChange}
      allTypes={allTypes}
      onManageTags={() => {}}
    />,
  );
  return onChange;
}

describe("CalendarSettingsSheet", () => {
  it("renders all sections", () => {
    renderSheet();
    expect(screen.getByTestId("settings-sheet").textContent).toContain("Calendar settings");
    expect(screen.getByText("Default view")).toBeTruthy();
    expect(screen.getByText("Density")).toBeTruthy();
    expect(screen.getByText("Visible tags")).toBeTruthy();
  });

  it("changes density via segmented control", () => {
    const onChange = renderSheet();
    fireEvent.click(screen.getByTestId("cal-density-compact"));
    expect(onChange).toHaveBeenCalledWith({ density: "compact" });
  });

  it("toggles weekends off", () => {
    const onChange = renderSheet({ showWeekends: true });
    fireEvent.click(screen.getByTestId("cal-show-weekends"));
    expect(onChange).toHaveBeenCalledWith({ showWeekends: false });
  });

  it("hides a tag via the visibility toggle", () => {
    const onChange = renderSheet();
    fireEvent.click(screen.getByTestId("cal-tag-visibility-exam"));
    expect(onChange).toHaveBeenCalledWith({ hiddenTags: ["exam"] });
  });

  it("resets to defaults", () => {
    const onChange = renderSheet({ density: "compact", showWeekends: false });
    fireEvent.click(screen.getByTestId("cal-reset-settings"));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_CALENDAR_SETTINGS });
  });
});
