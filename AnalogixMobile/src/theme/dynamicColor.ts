import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  TonalPalette,
  Hct,
  type TonalPalette as TonalPaletteType,
} from "@material/material-color-utilities";
import type { MD3Theme } from "react-native-paper";

export interface DynamicColorScheme {
  source: string;
  light: ExpressiveColors;
  dark: ExpressiveColors;
}

export type ExpressiveColors = MD3Theme["colors"] & {
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
};

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

// Light tones — standard M3 spec
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

// Dark tones — surfaces pushed higher so cards stand out; primaries
// bumped to tone 75–78 so they look vibrant rather than washed-out pastel.
const DARK_TONES: Record<string, number> = {
  primary: 78,
  onPrimary: 18,
  primaryContainer: 28,
  onPrimaryContainer: 92,
  secondary: 76,
  onSecondary: 18,
  secondaryContainer: 28,
  onSecondaryContainer: 92,
  tertiary: 78,
  onTertiary: 18,
  tertiaryContainer: 28,
  onTertiaryContainer: 92,
  error: 80,
  onError: 20,
  errorContainer: 30,
  onErrorContainer: 80,
  background: 6,
  onBackground: 92,
  surface: 6,
  onSurface: 92,
  surfaceVariant: 30,
  onSurfaceVariant: 80,
  outline: 60,
  outlineVariant: 30,
  inverseSurface: 90,
  inverseOnSurface: 20,
  inversePrimary: 40,
  surfaceDim: 6,
  surfaceBright: 32,
  surfaceContainerLowest: 4,
  surfaceContainerLow: 10,
  surfaceContainer: 16,
  surfaceContainerHigh: 24,
  surfaceContainerHighest: 30,
};

function getTone(
  palettes: Record<PaletteKey, TonalPaletteType>,
  role: string,
  dark: boolean,
): number {
  const tones = dark ? DARK_TONES : TONES;
  return tones[role] ?? 0;
}

function buildColors(
  palettes: Record<PaletteKey, TonalPaletteType>,
  isDark: boolean,
): ExpressiveColors {
  const fn = (role: string) => {
    const paletteKey = ROLE_TO_PALETTE[role];
    if (!paletteKey) return "#000000";
    const palette = palettes[paletteKey];
    if (!palette) return "#000000";
    return hexFromArgb(palette.tone(getTone(palettes, role, isDark)));
  };

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
    surfaceDim: fn("surfaceDim"),
    surfaceBright: fn("surfaceBright"),
    surfaceContainerLowest: fn("surfaceContainerLowest"),
    surfaceContainerLow: fn("surfaceContainerLow"),
    surfaceContainer: fn("surfaceContainer"),
    surfaceContainerHigh: fn("surfaceContainerHigh"),
    surfaceContainerHighest: fn("surfaceContainerHighest"),
    surfaceDisabled: fn("surfaceVariant"),
    onSurfaceDisabled: fn("outline"),
    backdrop: fn("surfaceDim"),
    shadow: "#000000",
    scrim: "#000000",
    elevation: {
      level0: "transparent",
      level1: n(isDark ? 10 : 96),
      level2: n(isDark ? 14 : 94),
      level3: n(isDark ? 18 : 92),
      level4: n(isDark ? 22 : 90),
      level5: n(isDark ? 26 : 88),
    },
  } as ExpressiveColors;
}

export function generateDynamicScheme(seedHex: string): DynamicColorScheme {
  const source = argbFromHex(seedHex);
  const theme = themeFromSourceColor(source);

  // Extract the seed hue + chroma so we can build a custom neutral palette.
  // M3's default neutral has chroma ~4 — barely any colour, making all
  // surfaces look grey regardless of theme. We use chroma 18 to give
  // surfaces a clear, tasteful tint of the brand colour.
  // For true monochrome themes (Slate / Notion-like), the seed has near-zero
  // chroma, so we keep chroma 0 to preserve a pure black-and-white feel.
  const seedHct = Hct.fromInt(source);
  const seedHue = seedHct.hue;
  const seedChroma = seedHct.chroma;
  const isMonochrome = seedChroma < 10;
  const neutralChroma = isMonochrome ? 0 : 18;
  const variantChroma = isMonochrome ? 0 : 22;
  const tintedNeutral = TonalPalette.fromHueAndChroma(seedHue, neutralChroma);
  // Boost neutralVariant chroma too so onSurfaceVariant (inactive icons/text)
  // carries a real colour tint instead of landing as pure grey.
  const tintedNeutralVariant = TonalPalette.fromHueAndChroma(seedHue + 8, variantChroma);

  const palettes: Record<PaletteKey, TonalPaletteType> = {
    primary: theme.palettes.primary,
    secondary: theme.palettes.secondary,
    tertiary: theme.palettes.tertiary,
    // Replace the auto-derived grey neutral with our colour-tinted one
    neutral: tintedNeutral,
    neutralVariant: tintedNeutralVariant,
    error: theme.palettes.error,
  };

  return {
    source: seedHex,
    light: buildColors(palettes, false),
    dark: buildColors(palettes, true),
  };
}
