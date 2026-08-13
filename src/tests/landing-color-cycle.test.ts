// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  LANDING_COLOR_THEMES,
  getNextLandingColorIndex,
  cycleLandingColor,
} from "@/utils/landingColorCycle";

const mocks = vi.hoisted(() => ({ applyThemeScoped: vi.fn() }));

vi.mock("@/components/theme/ThemeSelector", () => ({
  themes: [
    { name: "Classic Blue", p: {} },
    { name: "Oceanic Blue", p: {} },
    { name: "Forest Glow", p: {} },
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

  it("excludes the monochrome Paper theme from the cycle", () => {
    expect(LANDING_COLOR_THEMES).toEqual(["Classic Blue", "Oceanic Blue", "Forest Glow"]);
  });

  it("computes the next colour after the last applied one and wraps around", () => {
    expect(getNextLandingColorIndex()).toBe(0);
    localStorage.setItem("landing-color-cycle", "0");
    expect(getNextLandingColorIndex()).toBe(1);
    localStorage.setItem("landing-color-cycle", "1");
    expect(getNextLandingColorIndex()).toBe(2);
    localStorage.setItem("landing-color-cycle", "2");
    expect(getNextLandingColorIndex()).toBe(0);
  });

  it("applies the cycled theme to the given element only and persists the index", () => {
    const el = target();
    cycleLandingColor(el);
    expect(mocks.applyThemeScoped).toHaveBeenLastCalledWith("Classic Blue", el);
    expect(localStorage.getItem("app-theme")).toBeNull();

    cycleLandingColor(el);
    expect(mocks.applyThemeScoped).toHaveBeenLastCalledWith("Oceanic Blue", el);
    expect(localStorage.getItem("landing-color-cycle")).toBe("1");
    expect(localStorage.getItem("app-theme")).toBeNull();
  });

  it("resumes the cycle from where it left off", () => {
    const el = target();
    localStorage.setItem("landing-color-cycle", "1");
    cycleLandingColor(el);
    expect(mocks.applyThemeScoped).toHaveBeenLastCalledWith("Forest Glow", el);
    expect(localStorage.getItem("landing-color-cycle")).toBe("2");
    expect(localStorage.getItem("app-theme")).toBeNull();
  });

  it("does nothing to the saved app theme when no element is given", () => {
    localStorage.setItem("app-theme", "Oceanic Blue");
    cycleLandingColor(null);
    expect(mocks.applyThemeScoped).not.toHaveBeenCalled();
    expect(localStorage.getItem("app-theme")).toBe("Oceanic Blue");
  });

  it("does not cycle when paper mode is active", () => {
    const el = target();
    localStorage.setItem("paper-mode", "true");
    expect(cycleLandingColor(el)).toBeNull();
    expect(mocks.applyThemeScoped).not.toHaveBeenCalled();
  });
});
