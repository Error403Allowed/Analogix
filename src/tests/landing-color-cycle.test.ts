// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  LANDING_COLOR_THEMES,
  getNextLandingColorIndex,
  cycleLandingColor,
} from "@/utils/landingColorCycle";

const mocks = vi.hoisted(() => ({ applyThemeByName: vi.fn() }));

vi.mock("@/components/theme/ThemeSelector", () => ({
  themes: [
    { name: "Classic Blue", p: {} },
    { name: "Oceanic Blue", p: {} },
    { name: "Forest Glow", p: {} },
    { name: "Paper", p: {} },
  ],
  applyThemeByName: (name: string) => {
    mocks.applyThemeByName(name);
  },
}));

describe("landingColorCycle", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.applyThemeByName.mockClear();
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

  it("applies the cycled theme and persists the index", () => {
    cycleLandingColor();
    expect(mocks.applyThemeByName).toHaveBeenLastCalledWith("Classic Blue");

    cycleLandingColor();
    expect(mocks.applyThemeByName).toHaveBeenLastCalledWith("Oceanic Blue");
    expect(localStorage.getItem("landing-color-cycle")).toBe("1");
  });

  it("resumes the cycle from where it left off", () => {
    localStorage.setItem("landing-color-cycle", "1");
    cycleLandingColor();
    expect(mocks.applyThemeByName).toHaveBeenLastCalledWith("Forest Glow");
    expect(localStorage.getItem("landing-color-cycle")).toBe("2");
  });

  it("does not cycle when paper mode is active", () => {
    localStorage.setItem("paper-mode", "true");
    expect(cycleLandingColor()).toBeNull();
    expect(mocks.applyThemeByName).not.toHaveBeenCalled();
  });
});
