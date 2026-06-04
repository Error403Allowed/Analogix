/**
 * Study map — visual node graph for a subject. v1 renders as a vertical timeline of topics.
 */
import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, IconButton, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SUBJECT_DETAIL } from "../../graphql/queries/subject";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

export default function StudyMapSubjectScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { subjectId, name } = route.params;
  const { data, loading } = useQuery(SUBJECT_DETAIL, { variables: { id: subjectId } });
  const chapters = data?.subject?.chapters ?? [];

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View>
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>Study Map</Text>
          <Text variant="headlineLarge" style={styles.title}>{name}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.timeline}>
            {chapters.map((c: any, i: number) => (
              <View key={c.id} style={styles.nodeRow}>
                <View style={styles.lineCol}>
                  <View style={[styles.node, { backgroundColor: brand.primary }]}>
                    <Text style={{ color: "#fff", fontWeight: "900" }}>{i + 1}</Text>
                  </View>
                  {i < chapters.length - 1 && <View style={[styles.connector, { backgroundColor: paperTheme.colors.outline }]} />}
                </View>
                <View style={[styles.card, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
                  <Text variant="titleMedium" style={{ fontWeight: "800" }}>{c.name}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
                    {c.topics?.length ?? 0} topics
                  </Text>
                  <View style={styles.topicChips}>
                    {c.topics?.slice(0, 4).map((t: any) => (
                      <View key={t.id} style={[styles.chip, { backgroundColor: `${brand.primary}22`, borderRadius: SHAPE.pill }]}>
                        <Text variant="labelSmall" style={{ color: brand.primary }}>{t.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 8 },
  title: { fontWeight: "900" },
  list: { padding: 20, paddingBottom: 100 },
  timeline: {},
  nodeRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  lineCol: { alignItems: "center" },
  node: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  connector: { width: 2, flex: 1, marginTop: 4 },
  card: { flex: 1, padding: 16, marginBottom: 8 },
  topicChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 4 },
});
