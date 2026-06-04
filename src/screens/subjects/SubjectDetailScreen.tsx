/**
 * Subject detail — chapters/units, syllabus, study map shortcut.
 */
import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, IconButton, ActivityIndicator, Button } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SUBJECT_DETAIL } from "../../graphql/queries/subject";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

export default function SubjectDetailScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { subjectId, name } = route.params;
  const { data, loading } = useQuery(SUBJECT_DETAIL, { variables: { id: subjectId } });

  const chapters = data?.subject?.chapters ?? [];
  const subject = data?.subject;

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View>
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>Subject</Text>
          <Text variant="headlineLarge" style={styles.title}>{name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : !subject ? (
          <Text>Subject not found.</Text>
        ) : (
          <>
            <View style={[styles.statRow, { backgroundColor: `${brand.primary}22`, borderRadius: SHAPE.lg }]}>
              <Stat label="Chapters" value={chapters.length} />
              <Stat label="Topics" value={chapters.reduce((a: number, c: any) => a + (c.topics?.length ?? 0), 0)} />
              <Stat label="Hours" value={Math.round(chapters.length * 3)} />
            </View>

            <Button
              mode="contained"
              icon="map"
              buttonColor={brand.primary}
              style={{ borderRadius: SHAPE.xl, marginBottom: 16 }}
              onPress={() => navigation.navigate("StudyMapSubject", { subjectId, name })}
            >
              Open Study Map
            </Button>

            <Text variant="titleMedium" style={styles.sectionTitle}>Syllabus</Text>
            {chapters.map((c: any, idx: number) => (
              <View key={c.id} style={[styles.chapter, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
                <View style={styles.chapterHead}>
                  <View style={[styles.chapterNum, { backgroundColor: brand.primary }]}>
                    <Text style={{ color: "#fff", fontWeight: "800" }}>{idx + 1}</Text>
                  </View>
                  <Text variant="titleSmall" style={{ fontWeight: "800", flex: 1 }}>{c.name}</Text>
                </View>
                {c.topics?.map((t: any) => (
                  <View key={t.id} style={styles.topicRow}>
                    <Icon name="circle-small" size={20} color={paperTheme.colors.onSurfaceVariant} />
                    <Text variant="bodyMedium" style={{ flex: 1 }}>{t.name}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const paperTheme = useTheme();
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text variant="headlineSmall" style={{ fontWeight: "900" }}>{value}</Text>
      <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 8 },
  title: { fontWeight: "900" },
  list: { padding: 20, paddingBottom: 100 },
  statRow: { flexDirection: "row", padding: 16, marginBottom: 16 },
  sectionTitle: { fontWeight: "800", marginBottom: 8 },
  chapter: { padding: 16, marginBottom: 8 },
  chapterHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  chapterNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  topicRow: { flexDirection: "row", alignItems: "center", paddingLeft: 8 },
});
