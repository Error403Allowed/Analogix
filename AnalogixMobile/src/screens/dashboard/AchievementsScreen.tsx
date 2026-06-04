/**
 * Achievements screen — locked + unlocked badges in a grid.
 */
import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Card, useTheme, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { ACHIEVEMENTS } from "../../graphql/queries/misc";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize } from "../../hooks/useResponsive";
import Icon from "../../components/Icon";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function AchievementsScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const { data, loading } = useQuery(ACHIEVEMENTS);
  const achievements = data?.achievements ?? [];
  const unlocked = new Set((data?.unlockedAchievements ?? []).map((u: any) => u.achievementId));
  const size = useScreenSize();
  const isCompact = size === "compact";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: paperTheme.colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: isCompact ? 40 : 56 }]}
    >
      <View style={styles.header}>
        <Text variant="headlineLarge" style={styles.title}>Achievements</Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
          {unlocked.size} of {achievements.length} unlocked
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} />
      ) : achievements.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="trophy-outline" size={64} color={paperTheme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 16, textAlign: "center" }}>
            No achievements defined yet.
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {achievements.map((a: any, i: number) => {
            const isUnlocked = unlocked.has(a.id);
            return (
              <Animated.View
                key={a.id}
                entering={FadeInDown.delay(i * 40).duration(300)}
                style={{ width: "48%" }}
              >
                <Card
                  style={[
                    styles.card,
                    {
                      backgroundColor: isUnlocked ? `${brand.primary}22` : paperTheme.colors.surface,
                      borderRadius: SHAPE.xl,
                      opacity: isUnlocked ? 1 : 0.6,
                    },
                  ]}
                >
                  <Card.Content style={styles.cardContent}>
                    <Icon
                      name={isUnlocked ? "trophy" : "trophy-outline"}
                      size={40}
                      color={isUnlocked ? brand.primary : paperTheme.colors.onSurfaceVariant}
                    />
                    <Text variant="titleSmall" style={{ fontWeight: "700", textAlign: "center", marginTop: 8 }}>
                      {a.title}
                    </Text>
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 4 }} numberOfLines={2}>
                      {a.description}
                    </Text>
                  </Card.Content>
                </Card>
              </Animated.View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 80 },
  header: { gap: 4, marginBottom: 8 },
  title: { fontWeight: "900" },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  card: { padding: 8 },
  cardContent: { alignItems: "center", paddingVertical: 16 },
});
