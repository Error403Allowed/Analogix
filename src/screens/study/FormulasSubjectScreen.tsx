import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, IconButton } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { FORMULA_SHEETS } from "../../graphql/queries/misc";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import FormulaRenderer from "../../components/FormulaRenderer";
import Icon from "../../components/Icon";

export default function FormulasSubjectScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { data, loading } = useQuery(FORMULA_SHEETS);
  const sheet = (data?.formulaSheets ?? []).find((s: any) => s.subjectId === route.params.subjectId);

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineLarge" style={styles.title}>{sheet?.subjectName ?? route.params.subjectId}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <Text>Loading…</Text>
        ) : !sheet ? (
          <Text>Sheet not found.</Text>
        ) : (
          sheet.categories?.map((cat: any) => (
            <View key={cat.name} style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>{cat.name}</Text>
              {cat.formulas.map((f: any) => (
                <View key={f.id} style={[styles.card, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
                  <Text variant="titleSmall" style={{ fontWeight: "700" }}>{f.name}</Text>
                  <FormulaRenderer math={f.latex} style={{ marginTop: 8, minHeight: 32 }} />
                  {f.description ? (
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 8 }}>
                      {f.description}
                    </Text>
                  ) : null}
                </View>
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
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 8 },
  title: { fontWeight: "900" },
  list: { padding: 20, paddingBottom: 80 },
  section: { marginBottom: 16 },
  sectionTitle: { fontWeight: "800", marginBottom: 8 },
  card: { padding: 16, marginBottom: 8 },
});
