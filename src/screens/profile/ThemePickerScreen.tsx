/**
 * Theme picker — light/dark/system + dynamic (custom seed) + 10 brand themes.
 */
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import { Text, useTheme, IconButton, SegmentedButtons } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext, BRAND_THEMES as BRANDS } from "../../theme/ThemeContext";
import { DYNAMIC_SEED_COLORS } from "../../theme/WallpaperColor";
import { SHAPE } from "../../theme/tokens";

const DESCRIPTIONS: Record<string, string> = {
  cosmic: "Deep purple + cyan",
  paper: "Warm paper + ink",
  sunrise: "Coral + gold",
  forest: "Green + moss",
  rose: "Pink + plum",
  midnight: "Navy + amber",
  coral: "Warm coral blush",
  candy: "Vibrant pop",
  cyber: "Electric neon",
  prismatic: "Multi-hue shift",
};

const LABELS: Record<string, string> = {
  cosmic: "Cosmic",
  paper: "Paper",
  sunrise: "Sunrise",
  forest: "Forest",
  rose: "Rose",
  midnight: "Midnight",
  coral: "Coral",
  candy: "Candy",
  cyber: "Cyber",
  prismatic: "Prismatic",
};

export default function ThemePickerScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation();
  const { brand, setBrand, colorMode, setColorMode, dynamicSeed, setDynamicSeed } = useThemeContext();
  const [hexInput, setHexInput] = useState(dynamicSeed);

  const isDynamic = colorMode === "dynamic";

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineLarge" style={styles.title}>Theme</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="titleMedium" style={styles.section}>Appearance</Text>
        <SegmentedButtons
          value={colorMode}
          onValueChange={(v) => setColorMode(v as "light" | "dark" | "system" | "dynamic")}
          buttons={[
            { value: "light", label: "Light", icon: "white-balance-sunny" },
            { value: "dark", label: "Dark", icon: "weather-night" },
            { value: "system", label: "Auto", icon: "theme-light-dark" },
            { value: "dynamic", label: "Dynamic", icon: "palette-swatch" },
          ]}
          style={{ marginBottom: 24 }}
        />

        {isDynamic && (
          <>
            <Text variant="titleMedium" style={styles.section}>Seed color</Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Pick a source color — Analogix generates a full M3 palette from it.
            </Text>

            <View style={styles.seedGrid}>
              {DYNAMIC_SEED_COLORS.map((c) => (
                <Pressable
                  key={c.hex}
                  onPress={() => { setDynamicSeed(c.hex); setHexInput(c.hex); }}
                >
                  <View
                    style={[
                      styles.seedSwatch,
                      { backgroundColor: c.hex },
                      dynamicSeed === c.hex && { borderWidth: 3, borderColor: paperTheme.colors.onSurface },
                    ]}
                  >
                    {dynamicSeed === c.hex && (
                      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>✓</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={styles.hexRow}>
              <TextInput
                value={hexInput}
                onChangeText={setHexInput}
                onBlur={() => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
                    setDynamicSeed(hexInput);
                  } else {
                    setHexInput(dynamicSeed);
                  }
                }}
                placeholder="#HEX"
                placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                style={[
                  styles.hexInput,
                  {
                    backgroundColor: paperTheme.colors.surfaceVariant,
                    color: paperTheme.colors.onSurface,
                    borderColor: paperTheme.colors.outline,
                  },
                ]}
              />
              <View style={[styles.hexPreview, { backgroundColor: dynamicSeed }]} />
            </View>
          </>
        )}

        <Text variant="titleMedium" style={styles.section}>
          {isDynamic ? "Fallback brand" : "Color"}
        </Text>
        {BRANDS.map((b) => (
          <Pressable key={b.id} onPress={() => setBrand(b.id)}>
            <View
              style={[
                styles.row,
                {
                  backgroundColor: paperTheme.colors.surface,
                  borderRadius: SHAPE.lg,
                  borderWidth: brand.id === b.id ? 2 : 0,
                  borderColor: b.primary,
                },
              ]}
            >
              <View style={styles.swatches}>
                <View style={[styles.swatch, { backgroundColor: b.primary }]} />
                <View style={[styles.swatch, { backgroundColor: b.secondary }]} />
                <View style={[styles.swatch, { backgroundColor: b.tertiary }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={{ fontWeight: "800" }}>{LABELS[b.id] ?? b.id}</Text>
                <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                  {DESCRIPTIONS[b.id] ?? ""}
                </Text>
              </View>
              {brand.id === b.id && (
                <View style={[styles.check, { backgroundColor: b.primary, borderRadius: 999 }]}>
                  <Text style={{ color: "#fff", fontWeight: "900" }}>✓</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 8 },
  title: { fontWeight: "900" },
  list: { padding: 20, paddingBottom: 100 },
  section: { fontWeight: "800", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, marginBottom: 8 },
  swatches: { flexDirection: "row", gap: 4 },
  swatch: { width: 24, height: 24, borderRadius: 12 },
  check: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  seedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  seedSwatch: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  hexRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  hexInput: { flex: 1, borderRadius: SHAPE.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, fontWeight: "600", borderWidth: 1 },
  hexPreview: { width: 40, height: 40, borderRadius: 20 },
});
