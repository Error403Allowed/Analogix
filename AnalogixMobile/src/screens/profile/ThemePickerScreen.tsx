import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, TextInput } from "react-native";
import { Text, useTheme, Card, IconButton, SegmentedButtons } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext, BRAND_THEMES as BRANDS } from "../../theme/ThemeContext";
import { DYNAMIC_SEED_COLORS } from "../../theme/WallpaperColor";
import { SHAPE } from "../../theme/tokens";

const LABELS: Record<string, string> = {
  cosmic: "Cosmic", paper: "Paper", sunrise: "Sunrise", forest: "Forest",
  rose: "Rose", midnight: "Midnight", coral: "Coral", candy: "Candy",
  cyber: "Cyber", prismatic: "Prismatic",
};

const DESCRIPTIONS: Record<string, string> = {
  cosmic: "Deep purple + cyan", paper: "Soft monochrome", sunrise: "Warm orange + gold",
  forest: "Calming green", rose: "Soft pink + plum", midnight: "Navy + amber",
  coral: "Warm coral blush", candy: "Vibrant pop", cyber: "Electric neon",
  prismatic: "Multi-hue shift",
};

export default function ThemePickerScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation();
  const { brand, setBrand, colorMode, setColorMode, dynamicSeed, setDynamicSeed } = useThemeContext();
  const [hexInput, setHexInput] = useState(dynamicSeed);
  const isDynamic = colorMode === "dynamic";

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Theme</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="titleSmall" style={[styles.section, { color: paperTheme.colors.onSurfaceVariant }]}>APPEARANCE</Text>
        <SegmentedButtons
          value={colorMode}
          onValueChange={(v) => setColorMode(v as any)}
          buttons={[
            { value: "light", label: "Light", icon: "white-balance-sunny" },
            { value: "dark", label: "Dark", icon: "weather-night" },
            { value: "system", label: "Auto", icon: "theme-light-dark" },
            { value: "dynamic", label: "Dynamic", icon: "palette-swatch" },
          ]}
          style={{ marginBottom: 20 }}
        />

        {isDynamic && (
          <>
            <Text variant="titleSmall" style={[styles.section, { color: paperTheme.colors.onSurfaceVariant }]}>SEED COLOR</Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Pick a source color for your dynamic palette.
            </Text>
            <View style={styles.seedGrid}>
              {DYNAMIC_SEED_COLORS.map((c) => (
                <Pressable key={c.hex} onPress={() => { setDynamicSeed(c.hex); setHexInput(c.hex); }}>
                  <View style={[styles.seedSwatch, { backgroundColor: c.hex }, dynamicSeed === c.hex && { borderWidth: 3, borderColor: paperTheme.colors.onSurface }]}>
                    {dynamicSeed === c.hex && <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{'\u2713'}</Text>}
                  </View>
                </Pressable>
              ))}
            </View>
            <View style={styles.hexRow}>
              <View style={[styles.hexInputWrap, { borderColor: paperTheme.colors.outline, backgroundColor: paperTheme.colors.surfaceVariant }]}>
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
                  style={{ color: paperTheme.colors.onSurface, fontSize: 15, fontWeight: "600", padding: 10 }}
                />
              </View>
              <View style={[styles.hexPreview, { backgroundColor: dynamicSeed }]} />
            </View>
          </>
        )}

        <Text variant="titleSmall" style={[styles.section, { color: paperTheme.colors.onSurfaceVariant }]}>
          {isDynamic ? "FALLBACK BRAND" : "COLOR THEME"}
        </Text>
        {BRANDS.map((b) => (
          <Pressable key={b.id} onPress={() => setBrand(b.id)}>
            <Card mode="outlined" style={[styles.brandCard, brand.id === b.id && { borderColor: b.primary, borderWidth: 2 }]}>
              <Card.Content style={styles.brandRow}>
                <View style={styles.swatches}>
                  <View style={[styles.swatch, { backgroundColor: b.primary }]} />
                  <View style={[styles.swatch, { backgroundColor: b.secondary }]} />
                  <View style={[styles.swatch, { backgroundColor: b.tertiary }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{LABELS[b.id] ?? b.id}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{DESCRIPTIONS[b.id] ?? ""}</Text>
                </View>
                {brand.id === b.id && (
                  <View style={[styles.check, { backgroundColor: b.primary }]}>
                    <Text style={{ color: "#fff", fontWeight: "900" }}>{'\u2713'}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 100 },
  section: { fontWeight: "700", letterSpacing: 1, marginTop: 8, marginBottom: 10 },
  seedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  seedSwatch: { width: 44, height: 44, borderRadius: SHAPE.lg, alignItems: "center", justifyContent: "center" },
  hexRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 24 },
  hexInputWrap: { flex: 1, borderRadius: SHAPE.lg, borderWidth: 1 },
  hexPreview: { width: 40, height: 40, borderRadius: SHAPE.lg },
  brandCard: { borderRadius: SHAPE.lg, marginBottom: 6 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  swatches: { flexDirection: "row", gap: 4 },
  swatch: { width: 24, height: 24, borderRadius: SHAPE.xs },
  check: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
