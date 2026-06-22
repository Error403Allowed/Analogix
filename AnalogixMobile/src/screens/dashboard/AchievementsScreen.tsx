import React, { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Dimensions, Pressable } from "react-native";
import { Text, useTheme, IconButton, Searchbar, ActivityIndicator } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ACHIEVEMENTS } from "../../graphql/queries/misc";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import type { AchievementCategory } from "../../shared/types/achievement";

function getAchievementIcon(id: string, fallbackIcon?: string): string {
  if (id.startsWith("streak_")) return "fire";
  if (id.startsWith("quiz_")) return "clipboard-check";
  if (id.startsWith("chat_")) return "message-text";
  if (id.startsWith("flash_")) return "cards";
  if (id.startsWith("doc_")) return "file-text";
  if (id.startsWith("guide_")) return "book-open";
  if (id.startsWith("accuracy_") || id.startsWith("perfect_") || id === "perfect_score") return "target";
  if (id.startsWith("diverse_")) return "badge-check";
  if (id.startsWith("specialist_")) return "medal";
  if (id.startsWith("balanced_")) return "badge-check";
  if (id.startsWith("time_") || id.startsWith("endurance_")) return "clock";
  if (id.startsWith("early_")) return "weather-sunny";
  if (id.startsWith("night_")) return "weather-night";
  if (id.startsWith("weekend_") || id.startsWith("calendar_")) return "calendar";
  if (id.startsWith("ai_")) return "auto-fix";
  if (id.startsWith("special_")) return "party-popper";
  if (id.startsWith("improve_")) return "star";
  if (id.startsWith("comeback_")) return "heart";
  if (id.startsWith("speed_")) return "lightning-bolt";
  if (id.startsWith("grad_")) return "school";
  if (id.startsWith("write_")) return "pen";
  if (id.startsWith("insight_")) return "lightbulb";
  if (id.startsWith("start_")) return "rocket-launch";
  return fallbackIcon ?? "trophy";
}

const CATEGORIES: { key: AchievementCategory | "all"; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "view-grid" },
  { key: "starter", label: "Starter", icon: "rocket-launch" },
  { key: "streak", label: "Streak", icon: "fire" },
  { key: "mastery", label: "Mastery", icon: "school" },
  { key: "social", label: "Social", icon: "account-group" },
];

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 12;
const CARD_PADDING = 16;

export default function AchievementsScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { data, loading } = useQuery(ACHIEVEMENTS);
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

  const cardWidth = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Achievements</Text>
        <View style={[styles.badge, { backgroundColor: brand.primary + "18" }]}>
          <Text variant="labelLarge" style={{ color: brand.primary, fontWeight: "900" }}>{unlockedIds.size}</Text>
          <Text variant="labelSmall" style={{ color: brand.primary + "99" }}>/{allAchievements.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={[styles.center]}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 12 }}>Loading achievements...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: CARD_PADDING, paddingTop: 12 }}>
            <View style={[styles.progressTrack, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: brand.primary }]} />
            </View>
            <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "right", marginTop: 4 }}>
              {Math.round(progress * 100)}% complete
            </Text>
          </View>

          {allAchievements.length > 0 && (
            <Searchbar
              placeholder="Search achievements"
              value={search}
              onChangeText={setSearch}
              style={{ marginHorizontal: CARD_PADDING, marginTop: 12 }}
            />
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: CARD_PADDING, paddingVertical: 12, gap: 8 }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setActiveCategory(cat.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? brand.primary : paperTheme.colors.surfaceVariant,
                    },
                  ]}
                >
                  <Icon
                    name={cat.icon}
                    size={14}
                    color={isActive ? "#fff" : paperTheme.colors.onSurface}
                  />
                  <Text
                    variant="labelSmall"
                    style={{
                      fontWeight: "700",
                      color: isActive ? "#fff" : paperTheme.colors.onSurface,
                    }}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
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
                  <View
                    key={a.id}
                    style={[
                      styles.card,
                      {
                        width: cardWidth,
                        opacity: unlocked ? 1 : 0.55,
                        backgroundColor: paperTheme.colors.surface,
                        borderColor: unlocked ? brand.primary + "30" : paperTheme.colors.outlineVariant,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: unlocked ? brand.primary + "18" : paperTheme.colors.surfaceVariant },
                      ]}
                    >
                      <Icon
                        name={getAchievementIcon(a.id, a.icon)}
                        size={28}
                        color={unlocked ? brand.primary : paperTheme.colors.onSurfaceVariant}
                      />
                    </View>
                    <Text
                      variant="titleSmall"
                      style={{
                        fontWeight: "700",
                        color: paperTheme.colors.onSurface,
                        marginTop: 8,
                        textAlign: "center",
                        lineHeight: 18,
                      }}
                    >
                      {a.title}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{
                        color: paperTheme.colors.onSurfaceVariant,
                        textAlign: "center",
                        marginTop: 4,
                        lineHeight: 16,
                      }}
                    >
                      {a.description}
                    </Text>
                    {unlocked && (
                      <View style={[styles.unlockedBadge, { backgroundColor: brand.primary + "18" }]}>
                        <Text variant="labelSmall" style={{ color: brand.primary, fontWeight: "700" }}>
                          Unlocked
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, gap: 4 },
  progressTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: CARD_PADDING, gap: CARD_GAP },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32, width: "100%" },
  card: {
    borderRadius: SHAPE.lg,
    padding: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: SHAPE.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockedBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SHAPE.pill,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: SHAPE.pill,
  },
});
