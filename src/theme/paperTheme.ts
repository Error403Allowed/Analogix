/**
 * Material 3 Expressive theme for AnalogixMobile.
 *
 * Built on react-native-paper v5's MD3 foundation, with the shape scale,
 * spring motion, Space Grotesk typography, and emphasis styles matching
 * Google Pixel's M3 Expressive (Spring 2025) design language.
 *
 * - Space Grotesk font for editorial-scale typography
 * - Expressive shape radii (12–36 dp)
 * - Spring-based motion tokens for Reanimated
 * - 10 brand themes (mirroring AnalogixWeb)
 * - Dynamic color support via MCU engine
 */
import {
  MD3LightTheme,
  MD3DarkTheme,
  configureFonts,
  type MD3Theme,
} from "react-native-paper";

export const FONT_FAMILY = "SpaceGrotesk";

// -----------------------------------------------------------------------------
// M3 Expressive shape scale — pushed past default MD3 (4-28dp) to (8-36dp)
// -----------------------------------------------------------------------------
export const SHAPE = {
  none: 0,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
  pill: 9999,
} as const;

// -----------------------------------------------------------------------------
// M3 Expressive motion tokens — Reanimated 3 spring configs
// -----------------------------------------------------------------------------
export const MOTION = {
  entry: { damping: 18, stiffness: 220, mass: 1 },
  tap: { damping: 14, stiffness: 320, mass: 0.6 },
  sheet: { damping: 24, stiffness: 200, mass: 0.9 },
  exit: { damping: 22, stiffness: 240, mass: 0.8 },
  duration: { short: 150, medium: 250, long: 400 },
} as const;

// -----------------------------------------------------------------------------
// Expressive typography — Space Grotesk with heavy weights for editorial feel
// -----------------------------------------------------------------------------
const fontConfig = {
  displayLarge: { fontFamily: FONT_FAMILY, fontWeight: "800" as const, fontSize: 64, lineHeight: 72, letterSpacing: -1.5 },
  displayMedium: { fontFamily: FONT_FAMILY, fontWeight: "800" as const, fontSize: 48, lineHeight: 56, letterSpacing: -1 },
  displaySmall: { fontFamily: FONT_FAMILY, fontWeight: "700" as const, fontSize: 36, lineHeight: 44, letterSpacing: -0.5 },
  headlineLarge: { fontFamily: FONT_FAMILY, fontWeight: "700" as const, fontSize: 32, lineHeight: 40, letterSpacing: -0.25 },
  headlineMedium: { fontFamily: FONT_FAMILY, fontWeight: "700" as const, fontSize: 28, lineHeight: 36, letterSpacing: 0 },
  headlineSmall: { fontFamily: FONT_FAMILY, fontWeight: "600" as const, fontSize: 24, lineHeight: 32, letterSpacing: 0 },
  titleLarge: { fontFamily: FONT_FAMILY, fontWeight: "600" as const, fontSize: 20, lineHeight: 28, letterSpacing: 0 },
  titleMedium: { fontFamily: FONT_FAMILY, fontWeight: "600" as const, fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  titleSmall: { fontFamily: FONT_FAMILY, fontWeight: "600" as const, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  bodyLarge: { fontFamily: FONT_FAMILY, fontWeight: "400" as const, fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  bodyMedium: { fontFamily: FONT_FAMILY, fontWeight: "400" as const, fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  bodySmall: { fontFamily: FONT_FAMILY, fontWeight: "400" as const, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  labelLarge: { fontFamily: FONT_FAMILY, fontWeight: "600" as const, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  labelMedium: { fontFamily: FONT_FAMILY, fontWeight: "600" as const, fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
  labelSmall: { fontFamily: FONT_FAMILY, fontWeight: "600" as const, fontSize: 11, lineHeight: 16, letterSpacing: 0.5 },
};

// -----------------------------------------------------------------------------
// Light color tokens — Cosmic Aurora default palette
// -----------------------------------------------------------------------------
const lightPrimary = "#5B5FE9";
const lightOnPrimary = "#FFFFFF";
const lightPrimaryContainer = "#E0E1FF";
const lightOnPrimaryContainer = "#0D0E47";
const lightSecondary = "#9D5BFF";
const lightOnSecondary = "#FFFFFF";
const lightSecondaryContainer = "#F1E5FF";
const lightOnSecondaryContainer = "#22005C";
const lightTertiary = "#00C2A8";
const lightOnTertiary = "#FFFFFF";
const lightTertiaryContainer = "#B3F1E5";
const lightOnTertiaryContainer = "#003830";
const lightError = "#FF3B5B";
const lightBackground = "#FBFAFF";
const lightSurface = "#FFFFFF";
const lightSurfaceVariant = "#EBE9F2";
const lightOnSurface = "#1B1B22";
const lightOnSurfaceVariant = "#46464F";
const lightOutline = "#777685";

// -----------------------------------------------------------------------------
// Dark color tokens
// -----------------------------------------------------------------------------
const darkPrimary = "#BFC0FF";
const darkOnPrimary = "#1F1F75";
const darkPrimaryContainer = "#3737A0";
const darkOnPrimaryContainer = "#E0E1FF";
const darkSecondary = "#D2B7FF";
const darkOnSecondary = "#3D1B7A";
const darkSecondaryContainer = "#5A2BAB";
const darkOnSecondaryContainer = "#F1E5FF";
const darkTertiary = "#85D9CC";
const darkOnTertiary = "#003830";
const darkTertiaryContainer = "#005048";
const darkOnTertiaryContainer = "#B3F1E5";
const darkError = "#FF8A9A";
const darkBackground = "#0B0F1A";
const darkSurface = "#131826";
const darkSurfaceVariant = "#1E2235";
const darkOnSurface = "#E4E4F0";
const darkOnSurfaceVariant = "#C5C5D2";
const darkOutline = "#8E8E9B";

// -----------------------------------------------------------------------------
// Themes
// -----------------------------------------------------------------------------
export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: SHAPE.md,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: lightPrimary,
    onPrimary: lightOnPrimary,
    primaryContainer: lightPrimaryContainer,
    onPrimaryContainer: lightOnPrimaryContainer,
    secondary: lightSecondary,
    onSecondary: lightOnSecondary,
    secondaryContainer: lightSecondaryContainer,
    onSecondaryContainer: lightOnSecondaryContainer,
    tertiary: lightTertiary,
    onTertiary: lightOnTertiary,
    tertiaryContainer: lightTertiaryContainer,
    onTertiaryContainer: lightOnTertiaryContainer,
    error: lightError,
    background: lightBackground,
    onBackground: lightOnSurface,
    surface: lightSurface,
    onSurface: lightOnSurface,
    surfaceVariant: lightSurfaceVariant,
    onSurfaceVariant: lightOnSurfaceVariant,
    outline: lightOutline,
    elevation: {
      level0: "transparent",
      level1: "#F4F2FA",
      level2: "#EEEBF6",
      level3: "#E8E4F0",
      level4: "#E4DFEC",
      level5: "#DDD7E5",
    },
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: SHAPE.md,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkPrimary,
    onPrimary: darkOnPrimary,
    primaryContainer: darkPrimaryContainer,
    onPrimaryContainer: darkOnPrimaryContainer,
    secondary: darkSecondary,
    onSecondary: darkOnSecondary,
    secondaryContainer: darkSecondaryContainer,
    onSecondaryContainer: darkOnSecondaryContainer,
    tertiary: darkTertiary,
    onTertiary: darkOnTertiary,
    tertiaryContainer: darkTertiaryContainer,
    onTertiaryContainer: darkOnTertiaryContainer,
    error: darkError,
    background: darkBackground,
    onBackground: darkOnSurface,
    surface: darkSurface,
    onSurface: darkOnSurface,
    surfaceVariant: darkSurfaceVariant,
    onSurfaceVariant: darkOnSurfaceVariant,
    outline: darkOutline,
    elevation: {
      level0: "transparent",
      level1: "#171B2D",
      level2: "#1A1F33",
      level3: "#1E2235",
      level4: "#20243A",
      level5: "#252A45",
    },
  },
};

// -----------------------------------------------------------------------------
// Brand theme variants (10 themes, mirrors AnalogixWeb)
// -----------------------------------------------------------------------------
export type BrandThemeId =
  | "cosmic" | "paper" | "sunrise" | "forest" | "rose"
  | "midnight" | "coral" | "candy" | "cyber" | "prismatic";

export interface BrandTheme {
  id: BrandThemeId;
  name: string;
  description: string;
  primary: string;
  secondary: string;
  tertiary: string;
  bgLight: string;
  surfaceLight: string;
  bgDark: string;
  surfaceDark: string;
  preview: [string, string];
}

export const BRAND_THEMES: BrandTheme[] = [
  {
    id: "cosmic",
    name: "Cosmic Aurora",
    description: "Deep space purples and electric pinks",
    primary: lightPrimary,
    secondary: lightSecondary,
    tertiary: lightTertiary,
    bgLight: "#F6F3FF",
    surfaceLight: "#FFFFFF",
    bgDark: "#0B0D1A",
    surfaceDark: "#12142A",
    preview: [lightPrimary, lightSecondary],
  },
  {
    id: "paper",
    name: "Paper",
    description: "Soft monochrome for long study sessions",
    primary: "#5A5A6A",
    secondary: "#8A8A95",
    tertiary: "#B5B5C0",
    bgLight: "#F8F8FA",
    surfaceLight: "#FFFFFF",
    bgDark: "#121217",
    surfaceDark: "#1A1A22",
    preview: ["#5A5A6A", "#B5B5C0"],
  },
  {
    id: "sunrise",
    name: "Sunrise",
    description: "Warm oranges and golds for energy",
    primary: "#FF6B35",
    secondary: "#FFB800",
    tertiary: "#FF8C42",
    bgLight: "#FFF8F0",
    surfaceLight: "#FFFFFF",
    bgDark: "#1A1210",
    surfaceDark: "#241A14",
    preview: ["#FF6B35", "#FFB800"],
  },
  {
    id: "forest",
    name: "Forest",
    description: "Calming greens for focused work",
    primary: "#1F8B4C",
    secondary: "#7CB342",
    tertiary: "#26A69A",
    bgLight: "#F0FAF2",
    surfaceLight: "#FFFFFF",
    bgDark: "#0E1A12",
    surfaceDark: "#142418",
    preview: ["#1F8B4C", "#26A69A"],
  },
  {
    id: "rose",
    name: "Rose Garden",
    description: "Soft pinks and warm neutrals",
    primary: "#D6336C",
    secondary: "#F06595",
    tertiary: "#FFA8A8",
    bgLight: "#FFF5F7",
    surfaceLight: "#FFFFFF",
    bgDark: "#1A0E12",
    surfaceDark: "#24141A",
    preview: ["#D6336C", "#F06595"],
  },
  {
    id: "midnight",
    name: "Midnight Gold",
    description: "Deep navy with warm amber accents",
    primary: "#3949AB",
    secondary: "#F9A825",
    tertiary: "#7E57C2",
    bgLight: "#F0F2FF",
    surfaceLight: "#FFFFFF",
    bgDark: "#0A0D1A",
    surfaceDark: "#11152A",
    preview: ["#3949AB", "#F9A825"],
  },
  {
    id: "coral",
    name: "Coral Blush",
    description: "Warm coral with soft rose undertones",
    primary: "#E53935",
    secondary: "#F06292",
    tertiary: "#FF8A80",
    bgLight: "#FFF5F5",
    surfaceLight: "#FFFFFF",
    bgDark: "#1A0E0E",
    surfaceDark: "#241414",
    preview: ["#E53935", "#F06292"],
  },
  {
    id: "candy",
    name: "Candy Pop",
    description: "Vibrant purple-pink energy",
    primary: "#AD1457",
    secondary: "#E040FB",
    tertiary: "#FF80AB",
    bgLight: "#FFF3F8",
    surfaceLight: "#FFFFFF",
    bgDark: "#1A0E14",
    surfaceDark: "#24141C",
    preview: ["#AD1457", "#E040FB"],
  },
  {
    id: "cyber",
    name: "Cyber Neon",
    description: "Electric cyan and magenta",
    primary: "#00BCD4",
    secondary: "#E040FB",
    tertiary: "#00E676",
    bgLight: "#F0FFFE",
    surfaceLight: "#FFFFFF",
    bgDark: "#0A141A",
    surfaceDark: "#0E1A1E",
    preview: ["#00BCD4", "#E040FB"],
  },
  {
    id: "prismatic",
    name: "Prismatic",
    description: "Multi-hue shifting palette",
    primary: "#6200EA",
    secondary: "#00BFA5",
    tertiary: "#FF6D00",
    bgLight: "#F8F3FF",
    surfaceLight: "#FFFFFF",
    bgDark: "#100E1A",
    surfaceDark: "#16142A",
    preview: ["#6200EA", "#00BFA5"],
  },
];
