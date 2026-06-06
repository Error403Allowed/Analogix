import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SUBJECT_DETAIL } from "../../graphql/queries/subject";
import {
  ExpressiveActionPill,
  ExpressiveCard,
  ExpressiveEmptyState,
  ExpressiveHeroPanel,
  ExpressiveRailCard,
  ExpressiveScreen,
  ExpressiveSection,
} from "../../components/expressive";
import Icon from "../../components/Icon";

export default function SubjectDetailScreen() {
  const paperTheme = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { subjectId, name } = route.params;
  const { data, loading } = useQuery(SUBJECT_DETAIL, { variables: { id: subjectId } });

  const chapters = data?.subject?.chapters ?? [];
  const subject = data?.subject;

  return (
    <ExpressiveScreen title={name ?? "Subject"} eyebrow="Subject" subtitle="Detailed study view" onBack={() => navigation.goBack()}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : !subject ? (
          <ExpressiveEmptyState icon="book-alert" title="Subject not found" subtitle="Go back and choose another subject." />
        ) : (
          <>
            <ExpressiveHeroPanel style={styles.hero} accent="tertiary">
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text variant="headlineSmall" style={{ color: paperTheme.colors.onTertiaryContainer, fontWeight: "900" }}>
                    {name}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: paperTheme.colors.onTertiaryContainer, marginTop: 6 }}>
                    {chapters.length} chapters · {chapters.reduce((a: number, c: any) => a + (c.topics?.length ?? 0), 0)} topics
                  </Text>
                </View>
                <View style={[styles.heroIcon, { backgroundColor: paperTheme.colors.surface }]}>
                  <Icon name="map" size={30} color={paperTheme.colors.tertiary} />
                </View>
              </View>
              <View style={styles.statRow}>
                <ExpressiveRailCard value={chapters.length} label="Chapters" icon="book-open-page-variant" />
                <ExpressiveRailCard value={chapters.reduce((a: number, c: any) => a + (c.topics?.length ?? 0), 0)} label="Topics" icon="format-list-bulleted" />
                <ExpressiveRailCard value={Math.round(chapters.length * 3)} label="Hours" icon="clock-outline" />
              </View>
              <ExpressiveActionPill label="Open Study Map" icon="map" onPress={() => navigation.navigate("StudyMapSubject", { subjectId, name })} />
            </ExpressiveHeroPanel>

            <ExpressiveSection title="Syllabus">
              <View style={styles.listGroup}>
            {chapters.map((c: any, idx: number) => (
              <ExpressiveCard key={c.id} tone="low">
                  <View style={styles.chapterHead}>
                    <View style={[styles.chapterNum, { backgroundColor: paperTheme.colors.primary }]}>
                      <Text style={{ color: paperTheme.colors.onPrimary, fontWeight: "900", fontSize: 12 }}>{idx + 1}</Text>
                    </View>
                    <Text variant="titleMedium" style={{ fontWeight: "900", color: paperTheme.colors.onSurface, flex: 1 }}>{c.name}</Text>
                  </View>
                  {c.topics?.map((t: any) => (
                    <View key={t.id} style={styles.topicRow}>
                      <Icon name="circle-small" size={18} color={paperTheme.colors.onSurfaceVariant} />
                      <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, flex: 1 }}>{t.name}</Text>
                    </View>
                  ))}
              </ExpressiveCard>
            ))}
              </View>
            </ExpressiveSection>
          </>
        )}
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { gap: 16 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  heroIcon: { width: 72, height: 72, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  statRow: { flexDirection: "row", gap: 8 },
  listGroup: { gap: 10 },
  chapterHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  chapterNum: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  topicRow: { flexDirection: "row", alignItems: "flex-start", gap: 4, paddingLeft: 32, paddingVertical: 3 },
});
