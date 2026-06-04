import { useWindowDimensions } from "react-native";

export type ScreenSize = "compact" | "medium" | "expanded";

/** Standard Material 3 breakpoints. */
export const BREAKPOINTS = { compact: 480, medium: 768 } as const;

/** Returns the current screen size category. */
export function useScreenSize(): ScreenSize {
  const { width } = useWindowDimensions();
  if (width < BREAKPOINTS.compact) return "compact";
  if (width < BREAKPOINTS.medium) return "medium";
  return "expanded";
}

/** Clamps `value` between `min` and `max`. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Returns a responsive value based on screen width.
 * Supply values for compact / medium / expanded breakpoints.
 */
export function useResponsive<T>(compact: T, medium: T, expanded: T): T {
  const size = useScreenSize();
  if (size === "compact") return compact;
  if (size === "medium") return medium;
  return expanded;
}

/**
 * Scales a font size proportionally to screen width (clamped).
 * Reference: 375px (iPhone SE) -> `base` size, scales up to 768px -> `max`.
 */
export function useScaledFontSize(base: number, max: number): number {
  const { width } = useWindowDimensions();
  const ratio = clamp(width / 375, 1, width >= 768 ? max / base : 1);
  return Math.round(base * ratio);
}

/**
 * Returns responsive horizontal/vertical padding based on screen size.
 */
export function useContentPadding(): { h: number; v: number } {
  const size = useScreenSize();
  if (size === "compact") return { h: 16, v: 12 };
  if (size === "medium") return { h: 24, v: 16 };
  return { h: 32, v: 20 };
}

/**
 * Returns the number of columns for a grid layout.
 */
export function useGridColumns(
  compact: number,
  medium: number,
  expanded: number
): number {
  return useResponsive(compact, medium, expanded);
}
