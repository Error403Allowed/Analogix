import React, { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, Card, IconButton, Searchbar, ProgressBar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ACHIEVEMENTS } from "../../graphql/queries/misc";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import type { AchievementCategory } from "../../shared/types/achievement";

const ICON_MAP: Record<string, string> = {
  "first-chat": "message-text", "quiz-novice": "help-circle", "flashcard-debut": "cards",
  "streak-3": "fire", "streak-7": "fire", "streak-30": "fire",
  "perfect-quiz": "star", "quiz-10": "clipboard-check", "formula-saved": "sigma",
  "room-joined": "account-group", "room-created": "plus-circle", "doc-shared": "file-document",
};

const CATEGORIES: { key: AchievementCategory | "all"; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "view-grid" },
  { key: "starter", label: "Starter", icon: "rocket-launch" },
  { key: "streak", label: "Streak", icon: "fire" },
  { key: "mastery", label: "Mastery", icon: "school" },
  { key: "social", label: "Social", icon: "account-group" },
];

export default function AchievementsScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const navigation = useNavigation();
  const { data } = useQuery(ACHIEVEMENTS);
  const allAchievements = useMemo(() => data?.achievements ?? [], [data]);
  const unlockedAchievements = useMemo(() => data?.unlockedAchievements ?? [], [data]);
  const unlockedIds = useMemo(() => new Set(unlockedAchievements.map((u: any) => u.achievementId)), [unlockedAchievements]);
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | "all">("all");
  const [search, setSearch] = useState("");

  const filteredAchievements = useMemo(() => {
    let result = allAchievements;
    if (activeCategory !== "all") {
      result = result.filter((a: any) => a.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((a: any) => a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
    }
    return result;
  }, [allAchievements, activeCategory, search]);

  const progress = allAchievements.length > 0 ? unlockedIds.size / allAchievements.length : 0;

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Achievements</Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
          {unlockedIds.size}/{allAchievements.length}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <ProgressBar progress={progress} color={brand.primary} style={{ height: 8, borderRadius: 999, backgroundColor: paperTheme.colors.surfaceVariant }} />
        <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "right", marginTop: 4 }}>
          {Math.round(progress * 100)}% complete
        </Text>
      </View>

      {allAchievements.length > 0 && (
        <Searchbar placeholder="Search achievements" value={search} onChangeText={setSearch} style={{ marginHorizontal: 12, marginTop: 8 }} />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <Card
              key={cat.key}
              mode={isActive ? "contained" : "outlined"}
              style={[styles.chip, { backgroundColor: isActive ? brand.primary : paperTheme.colors.surface, borderColor: isActive ? brand.primary : paperTheme.colors.outline }]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Card.Content style={styles.chipContent}>
                <Icon name={cat.icon} size={16} color={isActive ? "#fff" : paperTheme.colors.onSurface} />
                <Text variant="labelMedium" style={{ color: isActive ? "#fff" : paperTheme.colors.onSurface, fontWeight: "700" }}>{cat.label}</Text>
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 32 }]}>
        {filteredAchievements.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="trophy" size={64} color={paperTheme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 16, textAlign: "center" }}>
              {search || activeCategory !== "all" ? "No achievements match your filter." : "No achievements loaded."}
            </Text>
          </View>
        ) : (
          filteredAchievements.map((a: any) => {
            const unlocked = unlockedIds.has(a.id);
            return (
              <Card
                key={a.id}
                mode="elevated"
                style={[styles.card, { opacity: unlocked ? 1 : 0.45 }]}
                accessibilityLabel={`${a.title}: ${a.description}. ${unlocked ? "Unlocked" : "Locked"}`}
              >
                <Card.Content style={{ alignItems: "center" }}>
                  <View style={[styles.iconWrap, { backgroundColor: unlocked ? brand.primary + "18" : paperTheme.colors.surfaceVariant }]}>
                    <Icon name={ICON_MAP[a.id] ?? a.icon ?? "trophy"} size={28} color={unlocked ? brand.primary : paperTheme.colors.onSurfaceVariant} />
                  </View>
                  <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginTop: 8, textAlign: "center" }}>
                    {a.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 2 }}>
                    {a.description}
                  </Text>
                  {unlocked && (
                    <Text variant="labelSmall" style={{ color: brand.primary, marginTop: 6, fontWeight: "600" }}>
                      Unlocked
                    </Text>
                  )}
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, gap: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 12 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  card: { width: "47%", borderRadius: SHAPE.lg },
  iconWrap: { width: 52, height: 52, borderRadius: SHAPE.lg, alignItems: "center", justifyContent: "center" },
  chip: { borderRadius: SHAPE.xl },
  chipContent: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2, paddingHorizontal: 4 },
});
