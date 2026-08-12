// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MobileAppBar from "@/components/nav/MobileAppBar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/subjects/maths",
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: ({ className }: { className?: string }) => (
    <button type="button" className={className} aria-label="Toggle Sidebar">
      Menu
    </button>
  ),
}));

describe("MobileAppBar", () => {
  it("shows a sidebar trigger", () => {
    render(<MobileAppBar />);
    expect(screen.getByRole("button", { name: /toggle sidebar/i })).toBeInTheDocument();
  });

  it("derives the page title from the pathname", () => {
    render(<MobileAppBar />);
    expect(screen.getByText("Subject")).toBeInTheDocument();
  });
});
