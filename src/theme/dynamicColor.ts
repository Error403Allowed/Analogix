import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  type TonalPalette,
} from "@material/material-color-utilities";
import type { MD3Theme } from "react-native-paper";

export interface DynamicColorScheme {
  source: string;
  light: MD3Theme["colors"];
  dark: MD3Theme["colors"];
}

type PaletteKey = "primary" | "secondary" | "tertiary" | "neutral" | "neutralVariant" | "error";

const ROLE_TO_PALETTE: Record<string, PaletteKey> = {
  primary: "primary",
  onPrimary: "primary",
  primaryContainer: "primary",
  onPrimaryContainer: "primary",
  inversePrimary: "primary",
  secondary: "secondary",
  onSecondary: "secondary",
  secondaryContainer: "secondary",
  onSecondaryContainer: "secondary",
  tertiary: "tertiary",
  onTertiary: "tertiary",
  tertiaryContainer: "tertiary",
  onTertiaryContainer: "tertiary",
  error: "error",
  onError: "error",
  errorContainer: "error",
  onErrorContainer: "error",
  background: "neutral",
  onBackground: "neutral",
  surface: "neutral",
  onSurface: "neutral",
  inverseSurface: "neutral",
  inverseOnSurface: "neutral",
  surfaceDim: "neutral",
  surfaceBright: "neutral",
  surfaceContainerLowest: "neutral",
  surfaceContainerLow: "neutral",
  surfaceContainer: "neutral",
  surfaceContainerHigh: "neutral",
  surfaceContainerHighest: "neutral",
  surfaceVariant: "neutralVariant",
  onSurfaceVariant: "neutralVariant",
  outline: "neutralVariant",
  outlineVariant: "neutralVariant",
};

const TONES: Record<string, number> = {
  primary: 40,
  onPrimary: 100,
  primaryContainer: 90,
  onPrimaryContainer: 10,
  secondary: 40,
  onSecondary: 100,
  secondaryContainer: 90,
  onSecondaryContainer: 10,
  tertiary: 40,
  onTertiary: 100,
  tertiaryContainer: 90,
  onTertiaryContainer: 10,
  error: 40,
  onError: 100,
  errorContainer: 90,
  onErrorContainer: 10,
  background: 98,
  onBackground: 10,
  surface: 98,
  onSurface: 10,
  surfaceVariant: 90,
  onSurfaceVariant: 30,
  outline: 50,
  outlineVariant: 80,
  inverseSurface: 20,
  inverseOnSurface: 95,
  inversePrimary: 80,
  surfaceDim: 87,
  surfaceBright: 98,
  surfaceContainerLowest: 100,
  surfaceContainerLow: 96,
  surfaceContainer: 94,
  surfaceContainerHigh: 92,
  surfaceContainerHighest: 90,
};

const DARK_TONES: Record<string, number> = {
  primary: 80,
  onPrimary: 20,
  primaryContainer: 30,
  onPrimaryContainer: 90,
  secondary: 80,
  onSecondary: 20,
  secondaryContainer: 30,
  onSecondaryContainer: 90,
  tertiary: 80,
  onTertiary: 20,
  tertiaryContainer: 30,
  onTertiaryContainer: 90,
  error: 80,
  onError: 20,
  errorContainer: 30,
  onErrorContainer: 80,
  background: 6,
  onBackground: 90,
  surface: 6,
  onSurface: 90,
  surfaceVariant: 30,
  onSurfaceVariant: 80,
  outline: 60,
  outlineVariant: 30,
  inverseSurface: 90,
  inverseOnSurface: 20,
  inversePrimary: 40,
  surfaceDim: 6,
  surfaceBright: 24,
  surfaceContainerLowest: 4,
  surfaceContainerLow: 10,
  surfaceContainer: 12,
  surfaceContainerHigh: 17,
  surfaceContainerHighest: 22,
};

function tone(
  palettes: Record<PaletteKey, TonalPalette>,
  role: string,
): number {
  const paletteKey = ROLE_TO_PALETTE[role];
  if (!paletteKey) return 0;
  const palette = palettes[paletteKey];
  if (!palette) return 0;
  return palette.tone(TONES[role] ?? 0);
}

function darkTone(
  palettes: Record<PaletteKey, TonalPalette>,
  role: string,
): number {
  const paletteKey = ROLE_TO_PALETTE[role];
  if (!paletteKey) return 0;
  const palette = palettes[paletteKey];
  if (!palette) return 0;
  return palette.tone(DARK_TONES[role] ?? 0);
}

function buildColors(
  palettes: Record<PaletteKey, TonalPalette>,
  isDark: boolean,
): MD3Theme["colors"] {
  const fn = isDark
    ? (r: string) => hexFromArgb(darkTone(palettes, r))
    : (r: string) => hexFromArgb(tone(palettes, r));

  const n = (t: number) => hexFromArgb(palettes.neutral.tone(t));

  return {
    primary: fn("primary"),
    onPrimary: fn("onPrimary"),
    primaryContainer: fn("primaryContainer"),
    onPrimaryContainer: fn("onPrimaryContainer"),
    secondary: fn("secondary"),
    onSecondary: fn("onSecondary"),
    secondaryContainer: fn("secondaryContainer"),
    onSecondaryContainer: fn("onSecondaryContainer"),
    tertiary: fn("tertiary"),
    onTertiary: fn("onTertiary"),
    tertiaryContainer: fn("tertiaryContainer"),
    onTertiaryContainer: fn("onTertiaryContainer"),
    error: fn("error"),
    onError: fn("onError"),
    errorContainer: fn("errorContainer"),
    onErrorContainer: fn("onErrorContainer"),
    background: fn("background"),
    onBackground: fn("onBackground"),
    surface: fn("surface"),
    onSurface: fn("onSurface"),
    surfaceVariant: fn("surfaceVariant"),
    onSurfaceVariant: fn("onSurfaceVariant"),
    outline: fn("outline"),
    outlineVariant: fn("outlineVariant"),
    inverseSurface: fn("inverseSurface"),
    inverseOnSurface: fn("inverseOnSurface"),
    inversePrimary: fn("inversePrimary"),
    surfaceDisabled: fn("surfaceVariant"),
    onSurfaceDisabled: fn("outline"),
    backdrop: fn("surfaceDim"),
    shadow: "#000000",
    scrim: "#000000",
    elevation: {
      level0: "transparent",
      level1: n(isDark ? 10 : 96),
      level2: n(isDark ? 12 : 94),
      level3: n(isDark ? 14 : 92),
      level4: n(isDark ? 16 : 90),
      level5: n(isDark ? 18 : 88),
    },
  };
}

export function generateDynamicScheme(seedHex: string): DynamicColorScheme {
  const source = argbFromHex(seedHex);
  const theme = themeFromSourceColor(source);

  const palettes: Record<PaletteKey, TonalPalette> = {
    primary: theme.palettes.primary,
    secondary: theme.palettes.secondary,
    tertiary: theme.palettes.tertiary,
    neutral: theme.palettes.neutral,
    neutralVariant: theme.palettes.neutralVariant,
    error: theme.palettes.error,
  };

  return {
    source: seedHex,
    light: buildColors(palettes, false),
    dark: buildColors(palettes, true),
  };
}
