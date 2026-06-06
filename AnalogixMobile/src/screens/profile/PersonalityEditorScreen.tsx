import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Card, IconButton, Button, ActivityIndicator, SegmentedButtons, Snackbar } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ME, UPDATE_AI_PERSONALITY } from "../../graphql/queries/user";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";

const TONES = ["friendly", "professional", "socratic", "playful", "concise"] as const;
const FOCUSES = ["balanced", "exam-prep", "deep-understanding", "memorization"] as const;

export default function PersonalityEditorScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation();
  const { data, loading } = useQuery(ME);
  const [updateAiPersonality, { loading: saving }] = useMutation(UPDATE_AI_PERSONALITY);
  const [snack, setSnack] = useState<string | null>(null);
  const initial = data?.me?.aiPersonality;
  const [tone, setTone] = useState<string>(initial?.tone ?? "friendly");
  const [focus, setFocus] = useState<string>(initial?.focus ?? "balanced");
  const [verbosity, setVerbosity] = useState<number>(initial?.verbosity ?? 50);
  const [creativity, setCreativity] = useState<number>(initial?.creativity ?? 50);

  useEffect(() => {
    if (initial) {
      setTone(initial.tone ?? "friendly");
      setFocus(initial.focus ?? "balanced");
      setVerbosity(initial.verbosity ?? 50);
      setCreativity(initial.creativity ?? 50);
    }
  }, [initial]);

  if (loading) return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
      <ActivityIndicator />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>AI Personality</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="titleSmall" style={styles.sectionLabel}>Tone</Text>
        <View style={styles.chipRow}>
          {TONES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTone(t)}
              style={[styles.chip, { backgroundColor: tone === t ? brand.primary : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.lg }]}
            >
              <Text style={{ color: tone === t ? "#fff" : paperTheme.colors.onSurface, fontWeight: "600", fontSize: 13 }}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <Text variant="titleSmall" style={styles.sectionLabel}>Focus</Text>
        <SegmentedButtons
          value={focus}
          onValueChange={setFocus}
          buttons={FOCUSES.map((f) => ({ value: f, label: f.replace("-", " ") }))}
          style={{ marginBottom: 20 }}
        />

        <Text variant="titleSmall" style={styles.sectionLabel}>Verbosity: {verbosity}</Text>
        <View style={styles.barRow}>
          {[0, 25, 50, 75, 100].map((v) => (
            <Pressable
              key={v}
              onPress={() => setVerbosity(v)}
              style={[styles.bar, { backgroundColor: verbosity >= v ? brand.primary : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.xs }]}
            />
          ))}
        </View>

        <Text variant="titleSmall" style={styles.sectionLabel}>Creativity: {creativity}</Text>
        <View style={styles.barRow}>
          {[0, 25, 50, 75, 100].map((v) => (
            <Pressable
              key={v}
              onPress={() => setCreativity(v)}
              style={[styles.bar, { backgroundColor: creativity >= v ? brand.tertiary : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.xs }]}
            />
          ))}
        </View>

        <Button
          mode="contained"
          buttonColor={brand.primary}
          onPress={async () => {
            try {
              await updateAiPersonality({ variables: { input: { tone, focus, verbosity, creativity } } });
              setSnack("AI personality saved.");
            } catch (e: any) {
              setSnack(e.message ?? "Save failed.");
            }
          }}
          loading={saving}
          style={{ borderRadius: SHAPE.lg, marginTop: 16 }}
          contentStyle={{ height: 48 }}
        >
          Save
        </Button>
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={2000}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 100 },
  sectionLabel: { fontWeight: "700", marginTop: 16, marginBottom: 8, color: "inherit" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10 },
  barRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  bar: { flex: 1, height: 24 },
});
