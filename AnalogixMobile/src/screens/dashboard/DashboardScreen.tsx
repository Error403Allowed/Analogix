import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Text, useTheme, ProgressBar } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ME, USER_STATS } from "../../graphql/queries/user";
import { SUBJECTS } from "../../graphql/queries/subject";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import {
  ExpressiveCard,
  ExpressiveHeroPanel,
  ExpressiveListRow,
  ExpressiveRailCard,
  ExpressiveScreen,
  ExpressiveSection,
  PressableScale,
} from "../../components/expressive";
import Icon from "../../components/Icon";

// Quick-action definitions with individual accent colours for variety
const ACTIONS = [
  { label: "Flashcards", icon: "cards",        screen: "Flashcards", accent: "#5865F2" },
  { label: "Quiz",       icon: "help-circle",  screen: "Quiz",       accent: "#23a55a" },
  { label: "Tutor",      icon: "message-text", screen: "ChatList",   accent: "#9b59b6" },
  { label: "Timer",      icon: "timer",        screen: "Timer",      accent: "#1abc9c" },
];

export default function DashboardScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();

  const { data: meData }      = useQuery(ME);
  const { data: statsData }   = useQuery(USER_STATS);
  const { data: subjectsData } = useQuery(SUBJECTS);

  const me        = meData?.me;
  const stats     = statsData?.userStats;
  const studyMap  = subjectsData?.studyMap ?? [];
  const firstName = me?.name?.split(" ")[0] ?? "there";
  const c         = paperTheme.colors as any;

  // Exact card pixel width avoids Animated.View-inside-Pressable % bug
  const H_PAD    = 16;
  const GRID_GAP = 10;
  const actionCardW = Math.floor((screenWidth - H_PAD * 2 - GRID_GAP) / 2);

  return (
    <ExpressiveScreen
      title={`Hi, ${firstName}`}
      eyebrow="Analogix"
      subtitle={`${stats?.currentStreak ?? 0}-day streak 🔥`}
      leadingIcon="school"
      actions={
        <PressableScale
          onPress={() => navigation.navigate("Profile")}
          style={[styles.avatar, { backgroundColor: paperTheme.colors.primary }]}
          accessibilityLabel="Open profile"
          accessibilityRole="button"
        >
          <Text style={[styles.avatarLetter, { color: paperTheme.colors.onPrimary }]}>
            {(me?.name ?? "U").charAt(0)}
          </Text>
        </PressableScale>
      }
    >
      {/* ── Level hero ───────────────────────────────────────────── */}
      <ExpressiveHeroPanel>
        <View style={styles.heroTop}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="labelLarge" style={{ color: paperTheme.colors.onPrimaryContainer, fontWeight: "800" }}>
              Current level
            </Text>
            <Text variant="displaySmall" numberOfLines={1} adjustsFontSizeToFit style={{ color: paperTheme.colors.onPrimaryContainer, fontWeight: "900" }}>
              Level {stats?.level ?? 1}
            </Text>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onPrimaryContainer, opacity: 0.8 }}>
              {stats?.xp ?? 0} XP earned this term
            </Text>
          </View>
          <View style={[styles.heroBadge, { backgroundColor: paperTheme.colors.primary + "22" }]}>
            <Icon name="trophy" size={32} color={paperTheme.colors.primary} />
          </View>
        </View>

        <ProgressBar
          progress={Math.min((stats?.xp ?? 0) / 500, 1)}
          color={paperTheme.colors.primary}
          style={[styles.xpBar, { backgroundColor: paperTheme.colors.onPrimaryContainer + "28" }]}
        />

        <View style={styles.heroChips}>
          <PressableScale
            onPress={() => navigation.navigate("Achievements")}
            style={[styles.heroChip, { backgroundColor: paperTheme.colors.primary + "22" }]}
            accessibilityLabel="View achievements"
            accessibilityRole="button"
          >
            <Icon name="trophy" size={16} color={paperTheme.colors.onPrimaryContainer} />
            <Text variant="labelMedium" style={{ color: paperTheme.colors.onPrimaryContainer, fontWeight: "700" }}>
              Achievements
            </Text>
          </PressableScale>

          <PressableScale
            onPress={() => navigation.navigate("Study")}
            style={[styles.heroChip, { backgroundColor: paperTheme.colors.primary }]}
            accessibilityLabel="Study now"
            accessibilityRole="button"
          >
            <Icon name="book-open-variant" size={16} color={paperTheme.colors.onPrimary} />
            <Text variant="labelMedium" style={{ color: paperTheme.colors.onPrimary, fontWeight: "700" }}>
              Study now
            </Text>
          </PressableScale>
        </View>
      </ExpressiveHeroPanel>

      {/* ── Quick actions ────────────────────────────────────────── */}
      <ExpressiveSection title="Quick actions">
        <View style={[styles.quickGrid, { gap: GRID_GAP }]}>
          {ACTIONS.map((a) => (
            <PressableScale
              key={a.screen}
              onPress={() => navigation.navigate(a.screen)}
              accessibilityLabel={a.label}
              accessibilityRole="button"
              style={[
                styles.quickCard,
                {
                  width: actionCardW,
                  backgroundColor: c.surfaceContainerHigh,
                  borderColor: c.outlineVariant,
                },
              ]}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: a.accent + "22" }]}>
                <Icon name={a.icon} size={24} color={a.accent} />
              </View>
              <Text
                variant="titleSmall"
                style={{ fontWeight: "800", color: paperTheme.colors.onSurface }}
              >
                {a.label}
              </Text>
              {/* accent strip at the bottom edge */}
              <View style={[styles.quickStrip, { backgroundColor: a.accent }]} />
            </PressableScale>
          ))}
        </View>
      </ExpressiveSection>

      {/* ── In progress ──────────────────────────────────────────── */}
      {studyMap.length > 0 ? (
        <ExpressiveSection
          title="In progress"
          actionLabel="Open map"
          onAction={() => navigation.navigate("Subjects")}
        >
          <View style={styles.listGroup}>
            {studyMap.slice(0, 3).map((s: any) => (
              <ExpressiveListRow
                key={s.subjectId}
                title={s.subjectName ?? s.subjectId}
                subtitle={`${Math.round(s.progressPercent ?? 0)}% complete`}
                icon="school"
                onPress={() =>
                  navigation.navigate("SubjectDetail", {
                    subjectId: s.subjectId,
                    name: s.subjectName,
                  })
                }
                trailing={
                  <Text variant="labelLarge" style={{ color: paperTheme.colors.primary, fontWeight: "900" }}>
                    {Math.round(s.progressPercent ?? 0)}%
                  </Text>
                }
              />
            ))}
          </View>
        </ExpressiveSection>
      ) : null}

      {/* ── Quick stats ──────────────────────────────────────────── */}
      <ExpressiveSection title="Quick stats">
        <View style={styles.statsRow}>
          <ExpressiveRailCard value={stats?.quizzesCompleted ?? 0} label="Quizzes" icon="clipboard-check" />
          <ExpressiveRailCard value={stats?.cardsReviewed ?? 0}    label="Cards"   icon="cards"           />
          <ExpressiveRailCard value={Math.round((stats?.minutesStudied ?? 0) / 60)} label="Hours" icon="clock-outline" />
        </View>
      </ExpressiveSection>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: SHAPE.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontWeight: "800", fontSize: 16 },

  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  heroBadge: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  xpBar: { height: 8, borderRadius: SHAPE.pill, marginTop: 16 },
  heroChips: { flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: SHAPE.pill,
  },

  quickGrid: { flexDirection: "row", flexWrap: "wrap" },
  quickCard: {
    minHeight: 120,
    borderRadius: SHAPE.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  // thin coloured bar at the card bottom
  quickStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: SHAPE.xl,
    borderBottomRightRadius: SHAPE.xl,
    opacity: 0.9,
  },

  listGroup: { gap: 8 },
  statsRow: { flexDirection: "row", gap: 8 },
});
