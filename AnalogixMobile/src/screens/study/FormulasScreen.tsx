import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Card, Searchbar, IconButton, ActivityIndicator, SegmentedButtons } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { FORMULA_SHEETS } from "../../graphql/queries/misc";
import { ME } from "../../graphql/queries/user";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import { SkeletonList } from "../../components/SkeletonLoader";

export default function FormulasScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const [q, setQ] = useState("");
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const { data, loading } = useQuery(FORMULA_SHEETS);
  const { data: meData } = useQuery(ME);
  const sheets = useMemo(() => data?.formulaSheets ?? [], [data]);
  const userState = meData?.me?.state;
  const subjectNames = useMemo(() => sheets.map((s: any) => s.subjectName), [sheets]);

  const filtered = useMemo(() => {
    let result = sheets;
    if (activeSubject) {
      result = result.filter((s: any) => s.subjectName === activeSubject);
    }
    if (q.trim()) {
      const query = q.trim().toLowerCase();
      result = result.filter((s: any) =>
        s.subjectName.toLowerCase().includes(query) ||
        s.categories?.some((c: any) =>
          c.formulas.some((f: any) =>
            f.name?.toLowerCase().includes(query) || f.description?.toLowerCase().includes(query)
          )
        )
      );
    }
    return result;
  }, [sheets, q, activeSubject]);

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Formulas</Text>
      </View>

      <Searchbar
        placeholder="Search formulas or subjects"
        value={q}
        onChangeText={setQ}
        style={[styles.search, { backgroundColor: paperTheme.colors.surfaceVariant }]}
        inputStyle={{ fontSize: 14 }}
      />

      {subjectNames.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable
            onPress={() => setActiveSubject(null)}
            style={[styles.filterChip, { backgroundColor: !activeSubject ? brand.primary : paperTheme.colors.surfaceVariant }]}
          >
            <Text variant="labelSmall" style={{ color: !activeSubject ? "#fff" : paperTheme.colors.onSurface, fontWeight: "600" }}>All</Text>
          </Pressable>
          {subjectNames.map((name: string) => (
            <Pressable
              key={name}
              onPress={() => setActiveSubject(activeSubject === name ? null : name)}
              style={[styles.filterChip, { backgroundColor: activeSubject === name ? brand.primary : paperTheme.colors.surfaceVariant }]}
            >
              <Text variant="labelSmall" style={{ color: activeSubject === name ? "#fff" : paperTheme.colors.onSurface, fontWeight: "600" }}>{name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {userState && (
        <View style={styles.stateBanner}>
          <Icon name="map-marker" size={14} color={brand.primary} />
          <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginLeft: 4 }}>
            Showing content for {userState}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <SkeletonList count={3} style={{ marginTop: 16 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="sigma" size={64} color={paperTheme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 16, textAlign: "center" }}>
              No formula sheets available yet.
            </Text>
          </View>
        ) : (
          filtered.map((s: any) => (
            <Card key={s.subjectId} mode="outlined" style={styles.sheetCard} onPress={() => navigation.navigate("FormulasSubject", { subjectId: s.subjectId })}>
              <Card.Content style={styles.sheetRow}>
                <View style={[styles.iconWrap, { backgroundColor: brand.primary + "18" }]}>
                  <Icon name="sigma" size={22} color={brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{s.subjectName}</Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                    {s.categories?.reduce((acc: number, c: any) => acc + c.formulas.length, 0) ?? 0} formulas
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={paperTheme.colors.onSurfaceVariant} />
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  search: { marginHorizontal: 16, marginBottom: 8, borderRadius: SHAPE.lg },
  chipRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: SHAPE.xl },
  stateBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  list: { padding: 16, paddingBottom: 100, gap: 8 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  sheetCard: { borderRadius: SHAPE.lg },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: SHAPE.md, alignItems: "center", justifyContent: "center" },
});
