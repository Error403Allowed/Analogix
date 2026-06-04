/**
 * Formulas list — search + subject picker.
 */
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Searchbar, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { FORMULA_SHEETS } from "../../graphql/queries/misc";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize } from "../../hooks/useResponsive";
import Icon from "../../components/Icon";

export default function FormulasScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const [q, setQ] = useState("");
  const { data, loading } = useQuery(FORMULA_SHEETS);
  const sheets = data?.formulaSheets ?? [];
  const filtered = q ? sheets.filter((s: any) => s.subjectName.toLowerCase().includes(q.toLowerCase())) : sheets;
  const size = useScreenSize();
  const isCompact = size === "compact";

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.header, { paddingTop: isCompact ? 40 : 56 }]}>
        <Text variant={isCompact ? "headlineMedium" : "headlineLarge"} style={styles.title}>Formulas</Text>
      </View>
      <Searchbar value={q} onChangeText={setQ} placeholder="Search formulas" style={[styles.search, { borderRadius: SHAPE.xl }]} />
      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="sigma" size={64} color={paperTheme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 16, textAlign: "center" }}>
              No formula sheets available yet. Migrate the data from AnalogixWeb into the shared package.
            </Text>
          </View>
        ) : (
          filtered.map((s: any) => (
            <Pressable key={s.subjectId} onPress={() => navigation.navigate("FormulasSubject", { subjectId: s.subjectId })}>
              <View style={[styles.row, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
                <View style={[styles.iconWrap, { backgroundColor: `${brand.primary}22` }]}>
                  <Icon name="sigma" size={20} color={brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall">{s.subjectName}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                    {s.categories?.reduce((acc: number, c: any) => acc + c.formulas.length, 0) ?? 0} formulas
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={paperTheme.colors.onSurfaceVariant} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontWeight: "900" },
  search: { marginHorizontal: 16, marginBottom: 8 },
  list: { padding: 16, gap: 8, paddingBottom: 100 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, marginBottom: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
