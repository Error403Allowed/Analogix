import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Card, IconButton, Button, ActivityIndicator, SegmentedButtons, Snackbar } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigation } from "@react-navigation/native";
import { ME, UPDATE_AI_PERSONALITY } from "../../graphql/queries/user";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

const TONES = ["friendly", "professional", "socratic", "playful", "concise"] as const;
const FOCUSES = ["balanced", "exam-prep", "deep-understanding", "memorization"] as const;

const TONE_ICONS: Record<string, string> = {
  friendly: "emoticon-happy",
  professional: "tie",
  socratic: "help-circle",
  playful: "party-popper",
  concise: "lightning-bolt",
};

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

  const handleSave = async () => {
    try {
      await updateAiPersonality({ variables: { input: { tone, focus, verbosity, creativity } } });
      setSnack("AI personality saved.");
    } catch (e: any) {
      setSnack(e.message ?? "Save failed.");
    }
  };

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
        {/* Tone */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="account-tie" size={20} color={brand.primary} />
            <Text variant="titleSmall" style={styles.sectionLabel}>Tone</Text>
          </View>
          <Text variant="bodySmall" style={styles.sectionDesc}>How the AI speaks to you</Text>
          <View style={styles.chipRow}>
            {TONES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTone(t)}
                style={[styles.chip, { backgroundColor: tone === t ? brand.primary : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.lg, borderWidth: tone === t ? 0 : 1, borderColor: paperTheme.colors.outline }]}
              >
                <Icon name={TONE_ICONS[t]} size={16} color={tone === t ? "#fff" : paperTheme.colors.onSurface} />
                <Text style={{ color: tone === t ? "#fff" : paperTheme.colors.onSurface, fontWeight: "700", fontSize: 13, marginLeft: 6 }}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Focus */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="target" size={20} color={brand.primary} />
            <Text variant="titleSmall" style={styles.sectionLabel}>Focus</Text>
          </View>
          <Text variant="bodySmall" style={styles.sectionDesc}>What the AI prioritises</Text>
          <SegmentedButtons
            value={focus}
            onValueChange={setFocus}
            buttons={FOCUSES.map((f) => ({ value: f, label: f.replace("-", " ") }))}
          />
        </View>

        {/* Verbosity */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="format-align-left" size={20} color={brand.primary} />
            <Text variant="titleSmall" style={styles.sectionLabel}>Verbosity</Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginLeft: 8 }}>{verbosity}%</Text>
          </View>
          <Text variant="bodySmall" style={styles.sectionDesc}>How detailed the AI's responses should be</Text>
          <View style={styles.sliderContainer}>
            <View style={styles.barRow}>
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setVerbosity(v)}
                  style={[styles.bar, {
                    backgroundColor: verbosity >= v ? brand.primary : paperTheme.colors.surfaceVariant,
                    borderRadius: SHAPE.xs,
                    height: verbosity === v ? 28 : 20,
                  }]}
                />
              ))}
            </View>
            <View style={styles.sliderLabels}>
              <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Concise</Text>
              <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Detailed</Text>
            </View>
          </View>
        </View>

        {/* Creativity */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Icon name="lightbulb" size={20} color={brand.primary} />
            <Text variant="titleSmall" style={styles.sectionLabel}>Creativity</Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginLeft: 8 }}>{creativity}%</Text>
          </View>
          <Text variant="bodySmall" style={styles.sectionDesc}>How creative and unexpected the AI's responses should be</Text>
          <View style={styles.sliderContainer}>
            <View style={styles.barRow}>
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setCreativity(v)}
                  style={[styles.bar, {
                    backgroundColor: creativity >= v ? brand.tertiary : paperTheme.colors.surfaceVariant,
                    borderRadius: SHAPE.xs,
                    height: creativity === v ? 28 : 20,
                  }]}
                />
              ))}
            </View>
            <View style={styles.sliderLabels}>
              <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Predictable</Text>
              <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Creative</Text>
            </View>
          </View>
        </View>

        {/* Save */}
        <Card mode="contained" style={[styles.saveCard, { backgroundColor: brand.primary }]}>
          <Card.Content style={styles.saveContent}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ color: "#fff", fontWeight: "700" }}>Ready to save?</Text>
              <Text variant="bodySmall" style={{ color: "rgba(255,255,255,0.8)", marginTop: 2 }}>Your AI will use these settings right away</Text>
            </View>
            <Button
              mode="contained"
              buttonColor="#fff"
              textColor={brand.primary}
              onPress={handleSave}
              loading={saving}
              style={{ borderRadius: SHAPE.lg }}
              contentStyle={{ height: 44, paddingHorizontal: 20 }}
            >
              Save
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
      <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={2000}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 100, gap: 16 },
  sectionCard: {
    backgroundColor: "transparent",
    borderRadius: SHAPE.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.15)",
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  sectionLabel: { fontWeight: "700", marginLeft: 8, color: "inherit" },
  sectionDesc: { color: "inherit", opacity: 0.6, marginBottom: 12, marginLeft: 28, fontSize: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center" },
  barRow: { flexDirection: "row", gap: 4, alignItems: "flex-end" },
  bar: { flex: 1 },
  sliderContainer: { gap: 4 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  saveCard: { marginTop: 8, borderRadius: SHAPE.lg },
  saveContent: { flexDirection: "row", alignItems: "center", gap: 12 },
});
