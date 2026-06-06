import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Card, Searchbar, IconButton, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { FORMULA_SHEETS } from "../../graphql/queries/misc";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

export default function FormulasScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const [q, setQ] = useState("");
  const { data, loading } = useQuery(FORMULA_SHEETS);
  const sheets = data?.formulaSheets ?? [];
  const filtered = q ? sheets.filter((s: any) => s.subjectName.toLowerCase().includes(q.toLowerCase())) : sheets;

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Formulas</Text>
      </View>

      <Searchbar
        placeholder="Search formulas"
        value={q}
        onChangeText={setQ}
        style={[styles.search, { backgroundColor: paperTheme.colors.surfaceVariant }]}
        inputStyle={{ fontSize: 14 }}
      />

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
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
  list: { padding: 16, paddingBottom: 100, gap: 8 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  sheetCard: { borderRadius: SHAPE.lg },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: SHAPE.md, alignItems: "center", justifyContent: "center" },
});
