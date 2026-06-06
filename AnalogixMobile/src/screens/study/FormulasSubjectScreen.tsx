import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, Card, IconButton, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { FORMULA_SHEETS } from "../../graphql/queries/misc";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import FormulaRenderer from "../../components/FormulaRenderer";

export default function FormulasSubjectScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { data, loading } = useQuery(FORMULA_SHEETS);
  const sheet = (data?.formulaSheets ?? []).find((s: any) => s.subjectId === route.params.subjectId);

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>{sheet?.subjectName ?? route.params.subjectId}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : !sheet ? (
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, padding: 16 }}>Sheet not found.</Text>
        ) : (
          sheet.categories?.map((cat: any) => (
            <View key={cat.name} style={styles.section}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: paperTheme.colors.onSurface }]}>{cat.name}</Text>
              {cat.formulas.map((f: any) => (
                <Card key={f.id} mode="outlined" style={styles.formulaCard}>
                  <Card.Content>
                    <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>{f.name}</Text>
                    <FormulaRenderer math={f.latex} style={{ marginTop: 8, minHeight: 32 }} />
                    {f.description ? (
                      <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 8 }}>{f.description}</Text>
                    ) : null}
                  </Card.Content>
                </Card>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 80, gap: 12 },
  section: { marginBottom: 8 },
  sectionTitle: { fontWeight: "700", marginBottom: 8 },
  formulaCard: { borderRadius: SHAPE.lg, marginBottom: 8 },
});
