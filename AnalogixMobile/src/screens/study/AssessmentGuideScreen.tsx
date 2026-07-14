import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { Text, useTheme, ActivityIndicator, Button, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@apollo/client/react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { GENERATE_ASSESSMENT_GUIDE } from "../../graphql/queries/ai";
import Icon from "../../components/Icon";
import { SHAPE } from "../../theme/tokens";
import { useThemeContext } from "../../theme/ThemeContext";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";

interface GuideWeek {
  week: number;
  label: string;
  tasks: string[];
}

interface AssessmentGuide {
  weeks: GuideWeek[];
  summary: string;
}

export default function AssessmentGuideScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const c = paperTheme.colors as any;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [text, setText] = useState(route.params?.text ?? "");
  const [guide, setGuide] = useState<AssessmentGuide | null>(null);

  const [generateGuide, { loading }] = useMutation(GENERATE_ASSESSMENT_GUIDE);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const content = await readAsStringAsync(file.uri);
      setText(content.substring(0, 50000));
    } catch (err) {
      console.warn("[assessment-guide] file picker error", err);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    const trimmed = text.trim();
    if (trimmed.length < 50) {
      Alert.alert("Not enough text", "Please provide at least 50 characters of assessment content.");
      return;
    }
    try {
      const { data } = await generateGuide({
        variables: {
          input: {
            text: trimmed.substring(0, 50000),
            subjectId: route.params?.subjectId,
          },
        },
      });
      if (data?.generateAssessmentGuide) {
        setGuide(data.generateAssessmentGuide);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to generate assessment guide");
    }
  }, [text, route.params?.subjectId, generateGuide]);

  return (
    <View style={[styles.screen, { backgroundColor: c.surface ?? paperTheme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.outlineVariant }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
        <Text variant="titleMedium" style={{ color: paperTheme.colors.onSurface, fontWeight: "700", flex: 1 }}>
          Assessment Guide
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {!guide && (
          <View style={styles.setup}>
            <View style={styles.hero}>
              <Icon name="file-document-outline" size={48} color={brand.primary} />
              <Text variant="titleLarge" style={[styles.heroTitle, { color: paperTheme.colors.onSurface }]}>
                Create a study guide
              </Text>
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}>
                Paste an assessment notification or upload a document to generate a week-by-week study guide.
              </Text>
            </View>

            <TextInput
              mode="outlined"
              label="Assessment description"
              placeholder="Paste your assessment notification, rubric, or topic list here..."
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={8}
              style={{ minHeight: 160 }}
              outlineStyle={{ borderRadius: SHAPE.md }}
            />

            <Button
              mode="outlined"
              onPress={handlePickFile}
              icon="file-upload"
              style={{ borderRadius: SHAPE.md }}
            >
              Upload document
            </Button>

            <Button
              mode="contained"
              onPress={handleGenerate}
              loading={loading}
              disabled={loading || text.trim().length < 50}
              style={{ borderRadius: SHAPE.md }}
              contentStyle={{ height: 48 }}
            >
              {loading ? "Generating..." : "Generate Guide"}
            </Button>
          </View>
        )}

        {guide && (
          <>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurface, marginBottom: 16, lineHeight: 22 }}>
              {guide.summary}
            </Text>

            {guide.weeks.map((week, i) => (
              <View key={i} style={[styles.weekCard, { backgroundColor: c.surfaceContainerLow ?? paperTheme.colors.surfaceVariant }]}>
                <View style={styles.weekHeader}>
                  <View style={[styles.weekBadge, { backgroundColor: brand.primary }]}>
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>W{week.week}</Text>
                  </View>
                  <Text variant="labelLarge" style={{ color: paperTheme.colors.onSurface, fontWeight: "600", flex: 1 }}>
                    {week.label}
                  </Text>
                </View>
                {week.tasks.map((task, j) => (
                  <View key={j} style={styles.taskRow}>
                    <Icon name="check-circle-outline" size={16} color={brand.primary} />
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurface, flex: 1 }}>
                      {task}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            <Button
              mode="outlined"
              onPress={() => setGuide(null)}
              style={{ marginTop: 16, borderRadius: SHAPE.md }}
            >
              Create Another
            </Button>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 16,
    paddingBottom: 40,
  },
  setup: {
    gap: 16,
  },
  hero: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
  },
  heroTitle: {
    fontWeight: "700",
    textAlign: "center",
  },
  weekCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  weekBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
});
