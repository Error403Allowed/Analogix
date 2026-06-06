import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";
import {
  ExpressiveHeroPanel,
  ExpressiveRailCard,
  ExpressiveScreen,
  ExpressiveSection,
  PressableScale,
} from "../../components/expressive";

// Each feature has its own accent colour so the grid has visual variety
const FEATURES = [
  { name: "Flashcards", icon: "cards",         screen: "Flashcards", desc: "Review and manage decks",       accent: "#5865F2" },
  { name: "Quiz",       icon: "help-circle",   screen: "Quiz",       desc: "Test your knowledge",           accent: "#23a55a" },
  { name: "Calendar",   icon: "calendar",      screen: "Calendar",   desc: "Schedule and events",           accent: "#f26522" },
  { name: "Formulas",   icon: "sigma",         screen: "Formulas",   desc: "Math & science formulas",       accent: "#9b59b6" },
  { name: "Resources",  icon: "folder",        screen: "Resources",  desc: "PDFs and study materials",      accent: "#e67e22" },
  { name: "Timer",      icon: "timer",         screen: "Timer",      desc: "Pomodoro study sessions",       accent: "#1abc9c" },
];

export default function StudyHomeScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();

  // Compute an exact pixel width so percentage widths inside PressableScale
  // don't suffer from the Animated.View-inside-Pressable sizing bug
  const H_PADDING = 16;
  const GRID_GAP = 12;
  const cardWidth = Math.floor((screenWidth - H_PADDING * 2 - GRID_GAP) / 2);

  const c = paperTheme.colors as any;

  return (
    <ExpressiveScreen
      title="Study"
      eyebrow="Tools"
      subtitle="Build, review, plan, and focus"
      leadingIcon="book-open-variant"
    >
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <ExpressiveHeroPanel accent="secondary" style={styles.hero}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text
            variant="headlineSmall"
            style={{ color: paperTheme.colors.onSecondaryContainer, fontWeight: "900" }}
          >
            Pick the right mode for this session.
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: paperTheme.colors.onSecondaryContainer, opacity: 0.8 }}
          >
            Review cards, take a quiz, manage deadlines, or start a timer.
          </Text>
        </View>
        <View style={styles.heroStats}>
          <ExpressiveRailCard value="6" label="Tools"    icon="apps"     />
          <ExpressiveRailCard value="∞" label="Practice" icon="creation" />
        </View>
      </ExpressiveHeroPanel>

      {/* ── Tool grid ────────────────────────────────────────────── */}
      <ExpressiveSection title="Study tools">
        <View style={[styles.grid, { gap: GRID_GAP }]}>
          {FEATURES.map((f) => (
            <PressableScale
              key={f.screen}
              onPress={() => navigation.navigate(f.screen)}
              accessibilityLabel={`${f.name}: ${f.desc}`}
              accessibilityRole="button"
              style={[
                styles.toolCard,
                {
                  width: cardWidth,
                  backgroundColor: c.surfaceContainer,
                  borderColor: c.outlineVariant,
                },
              ]}
            >
              {/* coloured icon badge */}
              <View style={[styles.iconBadge, { backgroundColor: f.accent + "22" }]}>
                <Icon name={f.icon} size={26} color={f.accent} />
              </View>

              <View style={{ gap: 2 }}>
                <Text
                  variant="titleSmall"
                  style={{ fontWeight: "800", color: paperTheme.colors.onSurface }}
                >
                  {f.name}
                </Text>
                <Text
                  variant="bodySmall"
                  numberOfLines={2}
                  style={{ color: paperTheme.colors.onSurfaceVariant, lineHeight: 15 }}
                >
                  {f.desc}
                </Text>
              </View>

              {/* subtle accent dot in bottom-right corner */}
              <View style={[styles.dot, { backgroundColor: f.accent + "33" }]} />
            </PressableScale>
          ))}
        </View>
      </ExpressiveSection>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 20 },
  heroStats: { flexDirection: "row", gap: 10 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  toolCard: {
    minHeight: 148,
    borderRadius: SHAPE.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    justifyContent: "space-between",
    overflow: "hidden",
  },

  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  // decorative circle in bottom-right corner
  dot: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: -24,
    right: -24,
  },
});
