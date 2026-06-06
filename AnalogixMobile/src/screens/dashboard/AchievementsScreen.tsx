import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, Card, IconButton } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { USER_STATS } from "../../graphql/queries/user";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

const ACHIEVEMENTS = [
  { id: "first_quiz", icon: "help-circle", title: "First Quiz", desc: "Complete your first quiz", xp: 50 },
  { id: "streak_7", icon: "fire", title: "Week Warrior", desc: "7-day study streak", xp: 100 },
  { id: "streak_30", icon: "fire", title: "Monthly Master", desc: "30-day study streak", xp: 500 },
  { id: "cards_100", icon: "cards", title: "Card Collector", desc: "Review 100 flashcards", xp: 150 },
  { id: "quiz_perfect", icon: "star", title: "Perfect Score", desc: "Get 100% on a quiz", xp: 200 },
  { id: "hours_10", icon: "clock", title: "Dedicated", desc: "Study for 10 hours total", xp: 300 },
];

export default function AchievementsScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const { brand } = useThemeContext();
  const navigation = useNavigation();
  const { data } = useQuery(USER_STATS);
  const stats = data?.userStats;
  const earned = stats?.achievements ?? [];

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Achievements</Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
          {earned.length}/{ACHIEVEMENTS.length}
        </Text>
      </View>
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 32 }]}>
        {ACHIEVEMENTS.map((a) => {
          const unlocked = earned.includes(a.id);
          return (
            <Card
              key={a.id}
              mode="elevated"
              style={[styles.card, { opacity: unlocked ? 1 : 0.45 }]}
              accessibilityLabel={`${a.title}: ${a.desc}. ${unlocked ? "Unlocked" : "Locked"}. ${a.xp} XP`}
            >
              <Card.Content style={{ alignItems: "center" }}>
                <View style={[styles.iconWrap, { backgroundColor: unlocked ? brand.primary + "18" : paperTheme.colors.surfaceVariant }]}>
                  <Icon name={a.icon} size={28} color={unlocked ? brand.primary : paperTheme.colors.onSurfaceVariant} />
                </View>
                <Text variant="titleSmall" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginTop: 8, textAlign: "center" }}>
                  {a.title}
                </Text>
                <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 2 }}>
                  {a.desc}
                </Text>
                <Text variant="labelSmall" style={{ color: brand.primary, marginTop: 6, fontWeight: "600" }}>
                  {a.xp} XP
                </Text>
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, gap: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 12 },
  card: { width: "47%", borderRadius: SHAPE.lg },
  iconWrap: { width: 52, height: 52, borderRadius: SHAPE.lg, alignItems: "center", justifyContent: "center" },
});
