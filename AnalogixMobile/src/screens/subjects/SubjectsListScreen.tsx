/**
 * Subjects list — shows the user's enrolled subjects from their profile.
 */
import React from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ME } from "../../graphql/queries/user";
import { SUBJECTS } from "../../graphql/queries/subject";
import { CURRICULUM_DATA } from "../../shared/curriculum/data";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize } from "../../hooks/useResponsive";
import Icon from "../../components/Icon";

const ICONS: Record<string, string> = {
  Mathematics: "math-integral",
  Science: "atom",
  English: "book-open-variant",
  History: "castle",
  Geography: "earth",
  "Computer Science": "code-tags",
  Physics: "lightning-bolt",
  Chemistry: "flask",
  Biology: "leaf",
};

export default function SubjectsListScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { data: meData, loading: meLoading } = useQuery(ME);
  const { data: subjectsData, loading: subjectsLoading } = useQuery(SUBJECTS);
  const enrolledNames = (meData?.me?.subjects as string[] | undefined) ?? [];
  const studyMap = subjectsData?.studyMap ?? [];

  // Resolve enrolled subjects from the curriculum catalog
  const subjects = enrolledNames
    .map((name) => {
      const entry = CURRICULUM_DATA.find(
        (c) => c.name.toLowerCase() === name.toLowerCase() || c.id.toLowerCase() === name.toLowerCase()
      );
      if (entry) {
        return { id: entry.id, name: entry.name, icon: entry.icon, color: entry.color };
      }
      return { id: name.toLowerCase().replace(/\s+/g, "-"), name, icon: ICONS[name] ?? "book", color: brand.primary };
    });

  const size = useScreenSize();
  const isCompact = size === "compact";

  if (meLoading || subjectsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.header, { paddingTop: isCompact ? 40 : 56 }]}>
        <Text variant={isCompact ? "headlineMedium" : "headlineLarge"} style={styles.title}>Subjects</Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
          {subjects.length > 0 ? `${subjects.length} subject${subjects.length === 1 ? "" : "s"}` : "No subjects yet"}
        </Text>
      </View>
      <ScrollView contentContainerStyle={[styles.grid, { padding: isCompact ? 12 : 16, gap: isCompact ? 8 : 12 }]}>
        {subjects.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", paddingTop: 40 }}>
            Set your subjects in onboarding to see them here.
          </Text>
        ) : (
          subjects.map((s) => {
            const progress = studyMap.find((m: any) => m.subjectId === s.id)?.progressPercent ?? 0;
            return (
              <Pressable
                key={s.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: s.color,
                    borderRadius: SHAPE.xxl,
                  },
                ]}
                onPress={() => navigation.navigate("SubjectDetail", { subjectId: s.id, name: s.name })}
              >
                <View style={styles.cardTop}>
                  <View style={styles.iconBubble}>
                    <Icon name={s.icon} size={28} color={s.color} />
                  </View>
                  <Text variant="bodySmall" style={styles.cardKicker}>
                    {progress}% done
                  </Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text variant="headlineSmall" style={styles.cardTitle}>{s.name}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingBottom: 100 },
  card: {
    width: "47%",
    aspectRatio: 0.9,
    margin: 4,
    padding: 16,
    justifyContent: "space-between",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconBubble: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  cardKicker: { color: "#fff", opacity: 0.85, fontWeight: "700" },
  cardTitle: { color: "#fff", fontWeight: "900" },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)", marginTop: 8, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: "#fff", borderRadius: 2 },
});
