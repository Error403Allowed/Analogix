/**
 * Study home — grid of feature cards (Flashcards, Quiz, Calendar, Formulas, Resources, Timer).
 */
import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize } from "../../hooks/useResponsive";
import Icon from "../../components/Icon";
import Animated, { FadeInUp } from "react-native-reanimated";

const ITEMS: Array<{ key: string; title: string; description: string; icon: string; route: string; color: string }> = [
  { key: "flashcards", title: "Flashcards", description: "Review with spaced repetition", icon: "card-multiple", route: "Flashcards", color: "#5B5FE9" },
  { key: "quiz", title: "Quiz Hub", description: "Generate and take adaptive quizzes", icon: "clipboard-list", route: "Quiz", color: "#9D5BFF" },
  { key: "calendar", title: "Calendar", description: "Events, deadlines, study time", icon: "calendar", route: "Calendar", color: "#00C2A8" },
  { key: "formulas", title: "Formulas", description: "Subject-specific cheat sheets", icon: "sigma", route: "Formulas", color: "#FF6B35" },
  { key: "resources", title: "Resources", description: "PDFs, slides, study materials", icon: "folder", route: "Resources", color: "#1F8B4C" },
  { key: "timer", title: "Study Timer", description: "Pomodoro-style focus sessions", icon: "timer-outline", route: "Timer", color: "#D6336C" },
];

export default function StudyHomeScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const size = useScreenSize();
  const isCompact = size === "compact";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: paperTheme.colors.background }]}
      contentContainerStyle={{ padding: isCompact ? 16 : 20, paddingTop: isCompact ? 40 : 56, paddingBottom: 80, gap: isCompact ? 12 : 16 }}
    >
      <View style={[styles.header, { gap: 2, marginBottom: isCompact ? 4 : 8 }]}>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>Ready to</Text>
        <Text variant={isCompact ? "headlineMedium" : "headlineLarge"} style={styles.title}>Study</Text>
      </View>
      <View style={[styles.grid, { gap: isCompact ? 8 : 12 }]}>
        {ITEMS.map((item, i) => (
          <Animated.View
            key={item.key}
            entering={FadeInUp.delay(i * 60).duration(300)}
            style={{ width: "48%" }}
          >
            <Pressable
              onPress={() => navigation.navigate(item.route)}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.card, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.xl }]}>
                <View style={[styles.iconWrap, { backgroundColor: `${item.color}22` }]}>
                  <Icon name={item.icon} size={28} color={item.color} />
                </View>
                <Text variant="titleMedium" style={styles.cardTitle}>{item.title}</Text>
                <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }} numberOfLines={2}>
                  {item.description}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 8 },
  title: { fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: { padding: 16, minHeight: 130, justifyContent: "space-between" },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontWeight: "800", marginTop: 6 },
});
