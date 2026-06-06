import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, ActivityIndicator, ProgressBar } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ME } from "../../graphql/queries/user";
import { SUBJECTS } from "../../graphql/queries/subject";
import { CURRICULUM_DATA } from "../../shared/curriculum/data";
import { useThemeContext } from "../../theme/ThemeContext";
import { ExpressiveCard, ExpressiveEmptyState, ExpressiveScreen, ExpressiveSection } from "../../components/expressive";
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

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const subjects = enrolledNames
    .map((name) => {
      const entry = CURRICULUM_DATA.find(
        (c) => c.name.toLowerCase() === name.toLowerCase() || c.id.toLowerCase() === name.toLowerCase()
      );
      if (entry) return { id: entry.id, name: entry.name, icon: entry.icon, color: entry.color };
      return { id: name.toLowerCase().replace(/\s+/g, "-"), name: capitalize(name), icon: ICONS[name] ?? "book", color: brand.primary };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (meLoading || subjectsLoading) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ExpressiveScreen
      title="Subjects"
      subtitle={`${subjects.length} subject${subjects.length === 1 ? "" : "s"}`}
      leadingIcon="school"
    >
      <ExpressiveSection title="Your subjects">
        <View style={styles.grid}>
        {subjects.length === 0 ? (
          <ExpressiveEmptyState icon="school-outline" title="No subjects yet" subtitle="Set your subjects in onboarding to see them here." />
        ) : (
          subjects.map((s) => {
            const progress = studyMap.find((m: any) => m.subjectId === s.id)?.progressPercent ?? 0;
            return (
              <ExpressiveCard
                key={s.id}
                onPress={() => navigation.navigate("SubjectDetail", { subjectId: s.id, name: s.name })}
                style={styles.card}
                tone="high"
              >
                <View style={styles.cardTop}>
                  <View style={[styles.iconWrap, { backgroundColor: paperTheme.colors.secondaryContainer }]}>
                    <Icon name={ICONS[s.name] ?? "book-open-variant"} size={24} color={paperTheme.colors.onSecondaryContainer} />
                  </View>
                  <Text variant="labelLarge" style={{ color: paperTheme.colors.primary, fontWeight: "900" }}>
                    {Math.round(progress)}%
                  </Text>
                </View>
                <Text variant="titleMedium" numberOfLines={2} style={{ fontWeight: "900", color: paperTheme.colors.onSurface, marginTop: 14 }}>
                  {s.name}
                </Text>
                <ProgressBar progress={progress / 100} color={paperTheme.colors.primary} style={[styles.progressBar, { backgroundColor: paperTheme.colors.surfaceVariant }]} />
              </ExpressiveCard>
            );
          })
        )}
        </View>
      </ExpressiveSection>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "48%", minHeight: 158, justifyContent: "space-between" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  iconWrap: { width: 52, height: 52, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  progressBar: { height: 8, borderRadius: 999, marginTop: 14, overflow: "hidden" },
});
