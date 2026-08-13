"use client";

import { applyThemeByName, themes } from "@/components/theme/ThemeSelector";

export { applyThemeByName };

// The colour schemes users can pick from, in the order the picker shows them.
// "Paper" is excluded because it is a monochrome / distraction-free mode, not
// one of the main colours we cycle through.
export const LANDING_COLOR_THEMES = themes
  .filter((t) => t.name !== "Paper")
  .map((t) => t.name);

const LANDING_COLOR_KEY = "landing-color-cycle";

/**
 * Index of the next colour scheme to show on the landing page. Advances on
 * every visit/refresh and wraps around so the colours cycle forever.
 */
export function getNextLandingColorIndex(): number {
  const raw = parseInt(localStorage.getItem(LANDING_COLOR_KEY) ?? "-1", 10);
  const prev = Number.isFinite(raw) && raw >= 0 ? raw : -1;
  return (prev + 1) % LANDING_COLOR_THEMES.length;
}

/**
 * Advance the landing-page colour cycle and apply the new theme. Returns the
 * applied theme name, or null when paper mode is active (that preference wins).
 */
export function cycleLandingColor(): string | null {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem("paper-mode") === "true") return null;

  const index = getNextLandingColorIndex();
  localStorage.setItem(LANDING_COLOR_KEY, String(index));
  const name = LANDING_COLOR_THEMES[index];
  applyThemeByName(name);
  return name;
}