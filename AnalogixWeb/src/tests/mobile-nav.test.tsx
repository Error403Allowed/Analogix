// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileBottomNav, {
  MOBILE_NAV_ITEMS,
  getActiveTabForPath,
} from "@/components/nav/MobileBottomNav";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/chat",
}));

describe("MOBILE_NAV_ITEMS", () => {
  it("exposes exactly the six app tabs in order", () => {
    expect(MOBILE_NAV_ITEMS.map((i) => i.label)).toEqual([
      "Home",
      "Tutor",
      "Study",
      "Subjects",
      "Rooms",
      "Profile",
    ]);
    expect(MOBILE_NAV_ITEMS.map((i) => i.path)).toEqual([
      "/dashboard",
      "/chat",
      "/study",
      "/subjects",
      "/rooms",
      "/profile",
    ]);
  });
});

describe("getActiveTabForPath", () => {
  it("matches exact routes", () => {
    expect(getActiveTabForPath("/dashboard")).toBe("/dashboard");
    expect(getActiveTabForPath("/chat")).toBe("/chat");
    expect(getActiveTabForPath("/study")).toBe("/study");
    expect(getActiveTabForPath("/profile")).toBe("/profile");
  });

  it("matches nested dynamic routes to their parent tab", () => {
    expect(getActiveTabForPath("/subjects/maths")).toBe("/subjects");
    expect(getActiveTabForPath("/subjects/maths/document/doc-1")).toBe("/subjects");
    expect(getActiveTabForPath("/rooms/room-1")).toBe("/rooms");
  });

  it("does not match sibling prefixes", () => {
    expect(getActiveTabForPath("/study-map")).toBeNull();
    expect(getActiveTabForPath("/subjects-extra")).toBeNull();
  });

  it("returns null for unrelated routes", () => {
    expect(getActiveTabForPath("/login")).toBeNull();
    expect(getActiveTabForPath("/")).toBeNull();
  });
});

describe("MobileBottomNav", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("renders one button per tab", () => {
    render(<MobileBottomNav />);
    expect(screen.getAllByTestId("mobile-nav-item")).toHaveLength(6);
  });

  it("marks the active route with aria-current and data-active", () => {
    render(<MobileBottomNav />);
    const tutorItem = screen.getAllByTestId("mobile-nav-item").find((el) => el.textContent === "Tutor");
    expect(tutorItem).toHaveAttribute("aria-current", "page");
    expect(tutorItem).toHaveAttribute("data-active", "true");
    const homeItem = screen.getAllByTestId("mobile-nav-item").find((el) => el.textContent === "Home");
    expect(homeItem).toHaveAttribute("data-active", "false");
    expect(homeItem).not.toHaveAttribute("aria-current");
  });

  it("navigates when a tab is clicked", () => {
    render(<MobileBottomNav />);
    const rooms = screen.getAllByTestId("mobile-nav-item").find((el) => el.textContent === "Rooms");
    expect(rooms).toBeTruthy();
    fireEvent.click(rooms as HTMLElement);
    expect(pushMock).toHaveBeenCalledWith("/rooms");
  });
});
