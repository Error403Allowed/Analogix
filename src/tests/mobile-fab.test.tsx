// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Pen } from "lucide-react";
import MobileFAB from "@/components/nav/MobileFAB";

describe("MobileFAB", () => {
  it("renders a labeled action button with an accessible label", () => {
    render(<MobileFAB label="New chat" onClick={() => {}} />);
    const fab = screen.getByTestId("mobile-fab");
    expect(fab).toBeTruthy();
    expect(fab).toHaveAttribute("aria-label", "New chat");
    expect(fab.textContent).toContain("New chat");
  });

  it("falls back to the label for aria-label when not provided", () => {
    render(<MobileFAB label="Create" onClick={() => {}} />);
    expect(screen.getByTestId("mobile-fab")).toHaveAttribute("aria-label", "Create");
  });

  it("renders a custom icon", () => {
    render(<MobileFAB icon={Pen} onClick={() => {}} />);
    expect(screen.getByTestId("mobile-fab").querySelector("svg")).toBeTruthy();
  });

  it("fires onClick when pressed", () => {
    const onClick = vi.fn();
    render(<MobileFAB label="Go" onClick={onClick} />);
    fireEvent.click(screen.getByTestId("mobile-fab"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is hidden on desktop breakpoints", () => {
    render(<MobileFAB label="Go" onClick={() => {}} />);
    expect(screen.getByTestId("mobile-fab").className).toContain("md:hidden");
  });
});
