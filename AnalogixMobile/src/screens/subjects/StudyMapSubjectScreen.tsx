import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, Card, IconButton, ActivityIndicator, Chip } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SUBJECT_DETAIL } from "../../graphql/queries/subject";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";

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
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Study Map</Text>
          <Text variant="titleLarge" style={{ fontWeight: "700" }}>{name}</Text>
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
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>{i + 1}</Text>
                  </View>
                  {i < chapters.length - 1 && <View style={[styles.connector, { backgroundColor: paperTheme.colors.outlineVariant }]} />}
                </View>
                <Card mode="outlined" style={styles.card}>
                  <Card.Content>
                    <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{c.name}</Text>
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
                      {c.topics?.length ?? 0} topics
                    </Text>
                    <View style={styles.chipRow}>
                      {c.topics?.slice(0, 4).map((t: any) => (
                        <Chip key={t.id} mode="outlined" style={styles.chip} textStyle={{ fontSize: 11 }}>{t.name}</Chip>
                      ))}
                    </View>
                  </Card.Content>
                </Card>
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
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 100 },
  timeline: {},
  nodeRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  lineCol: { alignItems: "center", width: 32 },
  node: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  connector: { width: 2, flex: 1, marginTop: 4 },
  card: { flex: 1, borderRadius: SHAPE.lg },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  chip: { height: 28, borderRadius: SHAPE.xs },
});
