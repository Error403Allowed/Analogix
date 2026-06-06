/**
 * paperTheme.ts
 *
 * Design tokens, base light/dark M3 themes, and the BRAND_THEMES catalogue.
 *
 * HOW COLOURS WORK
 * ─────────────────────────────────────────────────────────────────
 * Each BrandTheme supplies a `primary` seed hex.  ThemeContext feeds
 * that seed into generateDynamicScheme() (Material Color Utilities) which
 * derives the FULL M3 palette — primary, secondary, tertiary, neutral,
 * surface containers, everything — from that single hue.
 *
 * The M3 algorithm always targets:
 *   • primary     → HCT chroma 48,  tone 40  (light) / 80  (dark)
 *   • secondary   → HCT chroma 16,  tone 40  (light) / 80  (dark)
 *   • tertiary    → hue+60°, chroma 24
 *   • neutral     → same hue, chroma ~4  → subtle tint on surfaces
 *
 * This means the seed's EXACT saturation/lightness matters less than
 * its HUE — the algorithm normalises it.  Seeds are chosen so their
 * hue sits at good perceptual positions in the HCT space.
 *
 * COLOUR PSYCHOLOGY NOTES (research-backed)
 * ─────────────────────────────────────────────────────────────────
 * Indigo/Blue   Intellectual concentration, focus, calm, trust
 * Cyan/Teal     Clarity, technology, precision, freshness
 * Green         Balance, growth, calm; best for long focus sessions
 * Amber/Orange  Motivation, energy, creativity, social warmth
 * Red           Urgency, passion, attention (exam mode)
 * Violet        Creativity, luxury, imagination, wisdom
 * Rose/Magenta  Warmth, boldness, editorial character
 * Neutral       Professional, distraction-free minimalism
 */

import {
  MD3LightTheme,
  MD3DarkTheme,
  configureFonts,
  type MD3Theme,
} from "react-native-paper";

// ─── Shape & motion tokens ────────────────────────────────────────────────────

export const SHAPE = {
  none: 0,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  28,
  pill: 9999,
} as const;

export const MOTION = {
  entry:  { damping: 24, stiffness: 260, mass: 0.6 },
  tap:    { damping: 18, stiffness: 350, mass: 0.4 },
  sheet:  { damping: 28, stiffness: 300, mass: 0.7 },
  exit:   { damping: 22, stiffness: 240, mass: 0.8 },
  duration: { short: 150, medium: 300, long: 500 },
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

const fontConfig = {
  displayLarge:   { fontWeight: "700" as const, fontSize: 57, lineHeight: 64,  letterSpacing: -0.25 },
  displayMedium:  { fontWeight: "700" as const, fontSize: 45, lineHeight: 52,  letterSpacing: 0    },
  displaySmall:   { fontWeight: "700" as const, fontSize: 36, lineHeight: 44,  letterSpacing: 0    },
  headlineLarge:  { fontWeight: "600" as const, fontSize: 32, lineHeight: 40,  letterSpacing: 0    },
  headlineMedium: { fontWeight: "600" as const, fontSize: 28, lineHeight: 36,  letterSpacing: 0    },
  headlineSmall:  { fontWeight: "600" as const, fontSize: 24, lineHeight: 32,  letterSpacing: 0    },
  titleLarge:     { fontWeight: "600" as const, fontSize: 22, lineHeight: 28,  letterSpacing: 0    },
  titleMedium:    { fontWeight: "600" as const, fontSize: 16, lineHeight: 24,  letterSpacing: 0.15 },
  titleSmall:     { fontWeight: "600" as const, fontSize: 14, lineHeight: 20,  letterSpacing: 0.1  },
  bodyLarge:      { fontWeight: "400" as const, fontSize: 16, lineHeight: 24,  letterSpacing: 0.5  },
  bodyMedium:     { fontWeight: "400" as const, fontSize: 14, lineHeight: 20,  letterSpacing: 0.25 },
  bodySmall:      { fontWeight: "400" as const, fontSize: 12, lineHeight: 16,  letterSpacing: 0.4  },
  labelLarge:     { fontWeight: "500" as const, fontSize: 14, lineHeight: 20,  letterSpacing: 0.1  },
  labelMedium:    { fontWeight: "500" as const, fontSize: 12, lineHeight: 16,  letterSpacing: 0.5  },
  labelSmall:     { fontWeight: "500" as const, fontSize: 11, lineHeight: 16,  letterSpacing: 0.5  },
};

// ─── Base themes (colours are overridden by the dynamic scheme) ───────────────

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: SHAPE.md,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    background: "#FFFBFE",
    surface:    "#FFFBFE",
    onSurface:  "#1C1B1F",
    elevation: {
      level0: "transparent",
      level1: "#F5F0F7",
      level2: "#F0EBF3",
      level3: "#ECE6F0",
      level4: "#EBE5EF",
      level5: "#E9E2ED",
    },
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: SHAPE.md,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    background: "#141218",
    surface:    "#141218",
    onSurface:  "#E6E1E5",
    elevation: {
      level0: "transparent",
      level1: "#1E1B23",
      level2: "#222028",
      level3: "#26242D",
      level4: "#282530",
      level5: "#2B2832",
    },
  },
};

// ─── Brand themes ─────────────────────────────────────────────────────────────

/**
 * BrandThemeId — one ID per theme.
 * preview[0] + preview[1] are the two swatch colours shown in the theme picker.
 * `primary`   is the M3 seed — its HUE determines the whole generated palette.
 * `secondary` / `tertiary` are display-only (shown in picker, not fed to M3).
 */
export type BrandThemeId =
  | "Cosmic"
  | "Midnight"
  | "Aurora"
  | "Jade"
  | "Forest"
  | "Lime"
  | "Solar"
  | "Ember"
  | "Crimson"
  | "Sakura"
  | "Amethyst"
  | "Slate";

export interface BrandTheme {
  id: BrandThemeId;
  name: string;
  primary: string;
  secondary: string;
  tertiary: string;
  preview: [string, string];
}

// A small catalogue of brand themes used by the theme picker. The `primary`
// value acts as the dynamic seed for Material Color Utilities.
export const BRAND_THEMES: BrandTheme[] = [
  { id: "Cosmic",   name: "Cosmic",   primary: "#6750A4", secondary: "#5B5FC7", tertiary: "#8B5CF6", preview: ["#6750A4","#7C6BC7"] },
  { id: "Midnight", name: "Midnight", primary: "#1E3A8A", secondary: "#2546A6", tertiary: "#3B82F6", preview: ["#1E3A8A","#2546A6"] },
  { id: "Aurora",   name: "Aurora",   primary: "#06B6D4", secondary: "#0891B2", tertiary: "#34D4E6", preview: ["#06B6D4","#0891B2"] },
  { id: "Jade",     name: "Jade",     primary: "#0F766E", secondary: "#0EA5A4", tertiary: "#2DD4BF", preview: ["#0F766E","#0EA5A4"] },
  { id: "Forest",   name: "Forest",   primary: "#12723A", secondary: "#16A34A", tertiary: "#4ADE80", preview: ["#12723A","#16A34A"] },
  { id: "Lime",     name: "Lime",     primary: "#84CC16", secondary: "#A3E635", tertiary: "#D9F99D", preview: ["#84CC16","#A3E635"] },
  { id: "Solar",    name: "Solar",    primary: "#B45309", secondary: "#F59E0B", tertiary: "#FFD166", preview: ["#B45309","#F59E0B"] },
  { id: "Ember",    name: "Ember",    primary: "#C2410C", secondary: "#FB923C", tertiary: "#FDBA74", preview: ["#C2410C","#FB923C"] },
  { id: "Crimson",  name: "Crimson",  primary: "#C0262E", secondary: "#EF4444", tertiary: "#FCA5A5", preview: ["#C0262E","#EF4444"] },
  { id: "Sakura",   name: "Sakura",   primary: "#C51676", secondary: "#FB7185", tertiary: "#FBCFE8", preview: ["#C51676","#FB7185"] },
  { id: "Amethyst", name: "Amethyst", primary: "#7C3AED", secondary: "#8B5CF6", tertiary: "#C4B5FD", preview: ["#7C3AED","#8B5CF6"] },
  { id: "Slate",    name: "Slate",    primary: "#475569", secondary: "#64748B", tertiary: "#94A3B8", preview: ["#475569","#64748B"] },
];
