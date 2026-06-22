import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Card, Searchbar, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { FORMULA_SHEETS, SEARCH_FORMULAS } from "../../graphql/queries/misc";
import { ME } from "../../graphql/queries/user";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import { ExpressiveScreen, ExpressiveEmptyState } from "../../components/expressive";
import { SkeletonList } from "../../components/SkeletonLoader";

export default function FormulasScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const [q, setQ] = useState("");
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const { data, loading } = useQuery(FORMULA_SHEETS);
  const { data: searchData, loading: searchLoading } = useQuery(SEARCH_FORMULAS, {
    variables: { query: q.trim() },
    skip: q.trim().length < 2,
  });
  const sheets = useMemo(() => data?.formulaSheets ?? [], [data]);
  const searchResults = useMemo(() => searchData?.searchFormulas ?? [], [searchData]);
  const isSearching = q.trim().length >= 2;

  const subjectNames = useMemo(() => [...new Set(sheets.map((s: any) => s.subjectName))] as string[], [sheets]);

  const filtered = useMemo(() => {
    if (isSearching) return sheets;
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
  }, [sheets, q, activeSubject, isSearching]);

  const resultsBySubject = useMemo(() => {
    if (!isSearching || searchResults.length === 0) return [];
    const map = new Map<string, { subjectId: string; subjectName: string; formulas: any[] }>();
    searchResults.forEach((f: any) => {
      const key = f.subjectId ?? "general";
      if (!map.has(key)) {
        map.set(key, {
          subjectId: key,
          subjectName: f.subjectId ? key.charAt(0).toUpperCase() + key.slice(1) : "General",
          formulas: [],
        });
      }
      map.get(key)!.formulas.push(f);
    });
    return Array.from(map.values());
  }, [isSearching, searchResults]);

  return (
    <ExpressiveScreen
      title="Formulas"
      subtitle={`${sheets.length} subject${sheets.length !== 1 ? "s" : ""}`}
      leadingIcon="sigma"
      onBack={() => navigation.goBack()}
      scroll={false}
      contentStyle={{ padding: 0, gap: 0 }}
    >
      <Searchbar
        placeholder="Search formulas or subjects"
        value={q}
        onChangeText={setQ}
        style={[styles.search, { backgroundColor: paperTheme.colors.surfaceVariant }]}
        inputStyle={{ fontSize: 14 }}
      />

      {!isSearching && subjectNames.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable
            onPress={() => setActiveSubject(null)}
            style={[styles.filterChip, { backgroundColor: !activeSubject ? brand.primary : paperTheme.colors.surfaceVariant }]}
          >
            <Text variant="labelSmall" style={{ color: !activeSubject ? "#fff" : paperTheme.colors.onSurface, fontWeight: "600" }}>All</Text>
          </Pressable>
          {subjectNames.map((name) => (
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {loading || searchLoading ? (
          <SkeletonList count={3} style={{ marginTop: 16 }} />
        ) : isSearching && searchResults.length === 0 ? (
          <ExpressiveEmptyState icon="sigma" title="No results" subtitle="Try a different search term." />
        ) : isSearching ? (
          resultsBySubject.map((group) => (
            <View key={group.subjectId} style={{ marginBottom: 16 }}>
              <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 8, paddingHorizontal: 4 }}>
                {group.subjectName}
              </Text>
              {group.formulas.map((f: any) => (
                <Card key={f.id} mode="outlined" style={styles.resultCard} onPress={() => navigation.navigate("FormulasSubject", { subjectId: group.subjectId })}>
                  <Card.Content>
                    <Text variant="bodyMedium" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>
                      {f.name}
                    </Text>
                    {f.description && (
                      <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 2 }}>
                        {f.description}
                      </Text>
                    )}
                    <View style={[styles.subjectBadge, { backgroundColor: brand.primary + "18" }]}>
                      <Text variant="labelSmall" style={{ color: brand.primary, fontWeight: "700", fontSize: 10 }}>
                        {f.category}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
          ))
        ) : filtered.length === 0 ? (
          <ExpressiveEmptyState icon="sigma" title="No formula sheets" subtitle="No formula sheets available yet." />
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
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  search: { marginHorizontal: 16, marginTop: 8, marginBottom: 8, borderRadius: SHAPE.lg },
  chipRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: SHAPE.xl },
  list: { padding: 16, paddingBottom: 100, gap: 8 },
  sheetCard: { borderRadius: SHAPE.lg },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: SHAPE.md, alignItems: "center", justifyContent: "center" },
  resultCard: { borderRadius: SHAPE.lg, marginBottom: 6 },
  subjectBadge: { alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: SHAPE.pill },
});
