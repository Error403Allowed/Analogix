// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AppearanceSection from "@/components/AppearanceSection";

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  applyThemeByName: vi.fn(),
  theme: { resolvedTheme: "dark" as string | undefined },
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme: mocks.setTheme, resolvedTheme: mocks.theme.resolvedTheme }),
}));

vi.mock("@/components/ThemeSelector", () => ({
  themes: [
    { name: "Classic Blue", g: ["#2563eb", "#4f46e5", "#4338ca"] },
    { name: "Forest Glow", g: ["#16a34a", "#22c55e", "#15803d"] },
    { name: "Paper", g: ["#373530", "#787774", "#9B9B9B"] },
  ],
  applyThemeByName: (name: string) => {
    mocks.applyThemeByName(name);
    localStorage.setItem("app-theme", name);
  },
}));

const fireThemeUpdated = () => {
  act(() => {
    window.dispatchEvent(new Event("themeUpdated"));
  });
};

describe("AppearanceSection", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.setTheme.mockClear();
    mocks.applyThemeByName.mockClear();
    mocks.theme.resolvedTheme = "dark";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders mode controls, paper toggle and colour themes", () => {
    render(<AppearanceSection />);
    expect(screen.getByTestId("appearance-section")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Mode" })).toBeTruthy();
    expect(screen.getByTestId("paper-mode-toggle")).toBeTruthy();
    const options = screen.getAllByTestId("theme-option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute("data-theme-name", "Classic Blue");
    expect(options[1]).toHaveAttribute("data-theme-name", "Forest Glow");
  });

  it("switches to light mode", () => {
    render(<AppearanceSection />);
    const light = screen.getAllByTestId("theme-mode-option").find((el) => el.getAttribute("data-mode") === "light");
    expect(light).toBeTruthy();
    if (!light) return;
    fireEvent.click(light);
    expect(mocks.setTheme).toHaveBeenCalledWith("light");
  });

  it("switches to dark mode", () => {
    mocks.theme.resolvedTheme = "light";
    render(<AppearanceSection />);
    const dark = screen.getAllByTestId("theme-mode-option").find((el) => el.getAttribute("data-mode") === "dark");
    expect(dark).toBeTruthy();
    if (!dark) return;
    fireEvent.click(dark);
    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
  });

  it("applies a colour theme and persists it", () => {
    render(<AppearanceSection />);
    fireEvent.click(screen.getAllByTestId("theme-option")[0]);
    expect(mocks.applyThemeByName).toHaveBeenCalledWith("Classic Blue");
    expect(localStorage.getItem("app-theme")).toBe("Classic Blue");
  });

  it("selecting a theme exits paper mode", () => {
    localStorage.setItem("paper-mode", "true");
    render(<AppearanceSection />);
    const forest = screen.getAllByTestId("theme-option").find((el) => el.getAttribute("data-theme-name") === "Forest Glow");
    expect(forest).toBeTruthy();
    if (!forest) return;
    fireEvent.click(forest);
    expect(mocks.applyThemeByName).toHaveBeenCalledWith("Forest Glow");
    expect(localStorage.getItem("paper-mode")).toBe("false");
  });

  it("toggles paper mode", () => {
    render(<AppearanceSection />);
    fireEvent.click(screen.getByTestId("paper-mode-toggle"));
    expect(mocks.applyThemeByName).toHaveBeenCalledWith("Paper");
    expect(localStorage.getItem("paper-mode")).toBe("true");
    expect(localStorage.getItem("app-theme")).toBe("Paper");
  });

  it("stays in sync when the theme changes elsewhere", () => {
    render(<AppearanceSection />);
    localStorage.setItem("app-theme", "Forest Glow");
    localStorage.setItem("paper-mode", "false");
    fireThemeUpdated();
    const forest = screen.getAllByTestId("theme-option").find((el) => el.getAttribute("data-theme-name") === "Forest Glow");
    expect(forest).toBeTruthy();
    expect(forest?.className).toContain("border-primary");
  });

  it("keeps the previous colour theme when paper mode is toggled off", () => {
    render(<AppearanceSection />);
    const forest = screen.getAllByTestId("theme-option").find((el) => el.getAttribute("data-theme-name") === "Forest Glow");
    expect(forest).toBeTruthy();
    if (!forest) return;
    fireEvent.click(forest);
    fireEvent.click(screen.getByTestId("paper-mode-toggle"));
    expect(mocks.applyThemeByName).toHaveBeenLastCalledWith("Paper");
    fireEvent.click(screen.getByTestId("paper-mode-toggle"));
    expect(mocks.applyThemeByName).toHaveBeenLastCalledWith("Forest Glow");
  });
});
