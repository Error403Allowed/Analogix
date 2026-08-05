// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  ResponsiveSheet,
  ResponsiveSheetTrigger,
  ResponsiveSheetContent,
  ResponsiveSheetHeader,
  ResponsiveSheetTitle,
  ResponsiveSheetDescription,
  ResponsiveSheetClose,
} from "@/components/ui/responsive-sheet";

const useIsMobileMock = vi.fn();

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobileMock(),
  useMediaQuery: () => false,
  useBreakpoint: () => false,
}));

const matchMediaMock = (matches: boolean) =>
  (window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    media: "",
    onchange: null,
    dispatchEvent: vi.fn(),
  }));

describe("ResponsiveSheet", () => {
  beforeEach(() => {
    useIsMobileMock.mockReturnValue(false);
    matchMediaMock(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderSheet = () =>
    render(
      <ResponsiveSheet>
        <ResponsiveSheetTrigger asChild>
          <button>Open</button>
        </ResponsiveSheetTrigger>
        <ResponsiveSheetContent>
          <ResponsiveSheetHeader>
            <ResponsiveSheetTitle>Sheet title</ResponsiveSheetTitle>
            <ResponsiveSheetDescription>Sheet description</ResponsiveSheetDescription>
          </ResponsiveSheetHeader>
          <button>Inside</button>
          <ResponsiveSheetClose asChild>
            <button>Dismiss</button>
          </ResponsiveSheetClose>
        </ResponsiveSheetContent>
      </ResponsiveSheet>,
    );

  it("renders a centered dialog on desktop", async () => {
    renderSheet();
    fireEvent.click(screen.getByText("Open"));
    await waitFor(() => expect(screen.getByText("Sheet title")).toBeTruthy());
    expect(screen.getByText("Sheet title").className).toContain("text-lg");
    expect(screen.getByText("Inside")).toBeTruthy();
  });

  it("renders a bottom-sheet drawer on mobile", async () => {
    useIsMobileMock.mockReturnValue(true);
    renderSheet();
    fireEvent.click(screen.getByText("Open"));
    await waitFor(() => expect(screen.getByText("Sheet title")).toBeTruthy());
    expect(screen.getByText("Inside")).toBeTruthy();
  });

  it("closes the sheet from a close trigger", async () => {
    renderSheet();
    fireEvent.click(screen.getByText("Open"));
    await waitFor(() => expect(screen.getByText("Inside")).toBeTruthy());
    fireEvent.click(screen.getByText("Dismiss"));
    await waitFor(() => expect(screen.queryByText("Inside")).toBeNull());
  });
});
