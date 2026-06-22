import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { FORMULA_SHEET } from "../../graphql/queries/misc";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import BatchFormulaRenderer from "../../components/BatchFormulaRenderer";
import { ExpressiveScreen, ExpressiveEmptyState } from "../../components/expressive";

export default function FormulasSubjectScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const subjectId = route.params?.subjectId;

  const { data, loading } = useQuery(FORMULA_SHEET, {
    variables: { subjectId },
    skip: !subjectId,
  });

  const sheet = data?.formulaSheet;
  const categories = useMemo(() => sheet?.categories ?? [], [sheet]);
  const formulaCount = useMemo(() =>
    categories.reduce((sum: number, cat: any) => sum + (cat.formulas?.length ?? 0), 0),
    [categories]
  );
  const catCount = categories.length;

  const [activeCat, setActiveCat] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (!activeCat) return categories;
    return categories.filter((c: any) => c.name === activeCat);
  }, [categories, activeCat]);

  return (
    <ExpressiveScreen
      title={sheet?.subjectName ?? route.params?.subjectId ?? "Formulas"}
      subtitle={`${formulaCount} formula${formulaCount !== 1 ? "s" : ""} \u2022 ${catCount} categor${catCount !== 1 ? "ies" : "y"}`}
      leadingIcon="sigma"
      onBack={() => navigation.goBack()}
      scroll={false}
      contentStyle={{ padding: 0, gap: 0 }}
    >
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={brand.primary} size="large" />
        </View>
      ) : !sheet ? (
        <View style={styles.centerState}>
          <ExpressiveEmptyState icon="sigma" title="Not found" subtitle="This formula sheet could not be found." />
        </View>
      ) : (
        <>
          {catCount > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pressable
                onPress={() => setActiveCat(null)}
                style={[styles.filterChip, { backgroundColor: !activeCat ? brand.primary : paperTheme.colors.surfaceVariant }]}
              >
                <Text variant="labelSmall" style={{ color: !activeCat ? "#fff" : paperTheme.colors.onSurface, fontWeight: "600" }}>
                  All
                </Text>
              </Pressable>
              {categories.map((cat: any) => (
                <Pressable
                  key={cat.name}
                  onPress={() => setActiveCat(activeCat === cat.name ? null : cat.name)}
                  style={[styles.filterChip, { backgroundColor: activeCat === cat.name ? brand.primary : paperTheme.colors.surfaceVariant }]}
                >
                  <Text variant="labelSmall" style={{ color: activeCat === cat.name ? "#fff" : paperTheme.colors.onSurface, fontWeight: "600" }}>
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <BatchFormulaRenderer categories={filteredCategories} />
          </ScrollView>
        </>
      )}
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  chipRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: SHAPE.xl },
  scrollContent: { padding: 12, paddingBottom: 40 },
});
