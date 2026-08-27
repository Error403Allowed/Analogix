"use client";

import { applyThemeScoped } from "@/components/theme/ThemeSelector";

export { applyThemeScoped };

/**
 * The fixed brand identity shown on the marketing/landing page. This used to
 * cycle through every theme in the picker on each visit/refresh, which meant
 * anonymous visitors never saw a consistent brand colour - the single
 * biggest thing standing in the way of Analogix being recognisable at a
 * glance. The landing page now always shows this one deliberate colour,
 * regardless of what a signed-in user has personalised their own dashboard
 * to. In-app personalisation (the theme picker in Settings/Sidebar) is
 * untouched - only the anonymous first impression is pinned.
 */
export const LANDING_BRAND_THEME = "Ocean";

/**
 * Apply the fixed brand theme to `target`. Scoped to the given element so a
 * signed-in visitor's own saved theme (localStorage + DB) is never touched -
 * this only affects the landing page root.
 */
export function applyLandingBrand(target: HTMLElement | null): string | null {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem("paper-mode") === "true") return null;
  if (target) applyThemeScoped(LANDING_BRAND_THEME, target);
  return LANDING_BRAND_THEME;
}
