/**
 * ThemeContext — current theme + brand picker + mode (light/dark/system/dynamic).
 * Persists to MMKV; the user's pick survives app restarts.
 *
 * "Dynamic" mode generates a full M3 color scheme from a user-chosen seed color
 * using Material Color Utilities — no native code required.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { MMKV } from "../storage/mmkv";
import { lightTheme, darkTheme, BRAND_THEMES, type BrandTheme, type BrandThemeId } from "./paperTheme";
import { MOTION, SHAPE } from "./tokens";
import { generateDynamicScheme } from "./dynamicColor";
import type { MD3Theme } from "react-native-paper";

const storage = new MMKV({ id: "analogix.theme" });
const THEME_KEY = "activeTheme";
const MODE_KEY = "colorMode";
const DYNAMIC_SEED_KEY = "dynamicSeed";

export type ColorMode = "light" | "dark" | "system" | "dynamic";

interface ThemeContextValue {
  theme: typeof lightTheme;
  isDark: boolean;
  brand: BrandTheme;
  colorMode: ColorMode;
  dynamicSeed: string;
  setBrand: (id: BrandThemeId) => void;
  setColorMode: (mode: ColorMode) => void;
  setDynamicSeed: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function buildTonalTheme(isDark: boolean, seedHex: string): MD3Theme {
  const base = isDark ? darkTheme : lightTheme;
  const scheme = generateDynamicScheme(seedHex);
  const colors = isDark ? scheme.dark : scheme.light;
  return { ...base, colors: { ...base.colors, ...colors } };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [colorMode, setColorModeState] = useState<ColorMode>(
    (storage.getString(MODE_KEY) as ColorMode) ?? "system"
  );
  const [brandId, setBrandIdState] = useState<BrandThemeId>(
    (storage.getString(THEME_KEY) as BrandThemeId) ?? "Cosmic"
  );
  const [dynamicSeedHex, setDynamicSeedHex] = useState<string>(
    storage.getString(DYNAMIC_SEED_KEY) ?? "#6750A4"
  );

  const isDark = useMemo(() => {
    if (colorMode === "system") return systemScheme === "dark";
    if (colorMode === "dynamic") return systemScheme === "dark";
    return colorMode === "dark";
  }, [colorMode, systemScheme]);

  const brand = useMemo(() => BRAND_THEMES.find((b) => b.id === brandId) ?? BRAND_THEMES[0]!, [brandId]);

  const theme = useMemo(() => {
    const seed = colorMode === "dynamic" ? dynamicSeedHex : brand.primary;
    return buildTonalTheme(isDark, seed);
  }, [isDark, brand, colorMode, dynamicSeedHex]);

  const setBrand = useCallback((id: BrandThemeId) => {
    setBrandIdState(id);
    storage.set(THEME_KEY, id);
  }, []);

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    storage.set(MODE_KEY, mode);
  }, []);

  const setDynamicSeed = useCallback((hex: string) => {
    setDynamicSeedHex(hex);
    storage.set(DYNAMIC_SEED_KEY, hex);
  }, []);

  const value = useMemo(
    () => ({
      theme, isDark, brand, colorMode, dynamicSeed: dynamicSeedHex,
      setBrand, setColorMode, setDynamicSeed,
    }),
    [theme, isDark, brand, colorMode, dynamicSeedHex, setBrand, setColorMode, setDynamicSeed]
  );

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used inside ThemeProvider");
  return ctx;
}

export { SHAPE, MOTION, BRAND_THEMES };
