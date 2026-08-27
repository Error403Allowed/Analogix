// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LANDING_BRAND_THEME, applyLandingBrand } from "@/utils/landingColorCycle";

const mocks = vi.hoisted(() => ({ applyThemeScoped: vi.fn() }));

vi.mock("@/components/theme/ThemeSelector", () => ({
  themes: [
    { name: "Ocean", p: {} },
    { name: "Forest", p: {} },
    { name: "Sunset", p: {} },
    { name: "Paper", p: {} },
  ],
  applyThemeScoped: (name: string, target: HTMLElement) => {
    mocks.applyThemeScoped(name, target);
  },
}));

describe("landingColorCycle", () => {
  const target = () => document.createElement("div");

  beforeEach(() => {
    localStorage.clear();
    mocks.applyThemeScoped.mockClear();
  });

  it("always applies the fixed brand theme, not a cycled one", () => {
    expect(LANDING_BRAND_THEME).toBe("Ocean");
  });

  it("applies the brand theme to the given element only, without touching the saved app theme", () => {
    const el = target();
    applyLandingBrand(el);
    expect(mocks.applyThemeScoped).toHaveBeenLastCalledWith("Ocean", el);
    expect(localStorage.getItem("app-theme")).toBeNull();

    // Calling it again (e.g. on a re-render) still applies the same brand theme.
    applyLandingBrand(el);
    expect(mocks.applyThemeScoped).toHaveBeenLastCalledWith("Ocean", el);
    expect(localStorage.getItem("app-theme")).toBeNull();
  });

  it("does nothing to the saved app theme when no element is given", () => {
    localStorage.setItem("app-theme", "Ocean");
    applyLandingBrand(null);
    expect(mocks.applyThemeScoped).not.toHaveBeenCalled();
    expect(localStorage.getItem("app-theme")).toBe("Ocean");
  });

  it("does not apply a theme when paper mode is active", () => {
    const el = target();
    localStorage.setItem("paper-mode", "true");
    expect(applyLandingBrand(el)).toBeNull();
    expect(mocks.applyThemeScoped).not.toHaveBeenCalled();
  });
});
