import React, { useCallback } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, useWindowDimensions } from "react-native";
import { Text, Card, useTheme } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { ME, USER_STATS, ACTIVITY_LOG } from "../../graphql/queries/user";
import { EVENTS } from "../../graphql/queries/calendar";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize, useResponsive, useContentPadding, useScaledFontSize } from "../../hooks/useResponsive";
import Animated, { FadeInDown } from "react-native-reanimated";
import Icon from "../../components/Icon";

export default function DashboardScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { width: screenW } = useWindowDimensions();
  const size = useScreenSize();
  const pad = useContentPadding();

  const me = useQuery(ME);
  const stats = useQuery(USER_STATS);
  const activity = useQuery(ACTIVITY_LOG, { variables: { days: 30 } });
  const events = useQuery(EVENTS);

  const refreshing = me.loading || stats.loading;
  const onRefresh = useCallback(() => {
    me.refetch();
    stats.refetch();
    activity.refetch();
    events.refetch();
  }, [me, stats, activity, events]);

  const greeting = greetingFor(new Date());
  const name = me.data?.me?.name ?? "there";
  const streak = stats.data?.userStats?.currentStreak ?? 0;
  const accuracy = stats.data?.userStats?.accuracy ?? 0;
  const topSubject = stats.data?.userStats?.topSubject ?? "\u2014";
  const conversations = stats.data?.userStats?.conversationsCount ?? 0;
  const deadlines = events.data?.deadlines ?? [];

  const titleSize = useScaledFontSize(26, 32);
  const streakSize = useScaledFontSize(40, 56);
  const sectionTitleSize = useScaledFontSize(16, 20);
  const gap = useResponsive(12, 16, 20);
  const isCompact = size === "compact";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: paperTheme.colors.background }]}
      contentContainerStyle={{ padding: pad.h, paddingBottom: 80, gap }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.primary} />
      }
    >
      <View style={[styles.header, { marginTop: Math.max(16, screenW * 0.08) }]}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>
            {greeting},
          </Text>
          <Text style={[styles.greeting, { fontSize: titleSize }]}>
            {name} {"\uD83D\uDC4B"}
          </Text>
        </View>
        <Pressable
          onPress={() => navigation.getParent()?.navigate("Profile", { screen: "Settings" })}
          hitSlop={8}
        >
          <Icon name="cog" size={isCompact ? 22 : 24} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.duration(400)}>
        <Card
          style={[
            styles.streakCard,
            { backgroundColor: paperTheme.colors.primaryContainer, borderRadius: SHAPE.xl },
          ]}
        >
          <Card.Content style={styles.streakContent}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onPrimaryContainer }}>
                Current streak
              </Text>
              <Text
                style={[
                  styles.streakNumber,
                  { fontSize: streakSize, color: paperTheme.colors.onPrimaryContainer },
                ]}
              >
                {streak} {"\uD83D\uDD25"}
              </Text>
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onPrimaryContainer }}>
                {streak === 0 ? "Start a study session to begin" : "days in a row"}
              </Text>
            </View>
            {!isCompact && (
              <Icon name="fire" size={isCompact ? 48 : 64} color={paperTheme.colors.onPrimaryContainer} />
            )}
          </Card.Content>
        </Card>
      </Animated.View>

      <View style={[styles.quickActions, { gap: isCompact ? 6 : 8 }]}>
        <QuickAction
          label="AI Tutor"
          icon="message-text"
          color={brand.primary}
          onPress={() => navigation.getParent()?.navigate("Tutor")}
          compact={isCompact}
        />
        <QuickAction
          label="Flashcards"
          icon="card-multiple"
          color={brand.secondary}
          onPress={() => navigation.getParent()?.navigate("Study", { screen: "Flashcards" })}
          compact={isCompact}
        />
        <QuickAction
          label="Quiz"
          icon="clipboard-list"
          color={brand.tertiary}
          onPress={() => navigation.getParent()?.navigate("Study", { screen: "Quiz" })}
          compact={isCompact}
        />
        <QuickAction
          label="Timer"
          icon="timer-outline"
          color="#FF8A4A"
          onPress={() => navigation.getParent()?.navigate("Study", { screen: "Timer" })}
          compact={isCompact}
        />
      </View>

      <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize }]}>
        Upcoming deadlines
      </Text>
      {deadlines.length === 0 ? (
        <Card style={[styles.empty, { borderRadius: SHAPE.lg }]}>
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center" }}>
              No deadlines yet. Add one from the Calendar tab.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        deadlines.slice(0, 4).map((d: any) => (
          <Card key={d.id} style={[styles.deadline, { borderRadius: SHAPE.lg }]}>
            <Card.Content style={styles.deadlineContent}>
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" numberOfLines={1}>{d.title}</Text>
                <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>
                  {new Date(d.dueDate).toLocaleDateString()} {"\u00B7"} {d.subject ?? "General"}
                </Text>
              </View>
              <Icon
                name={
                  d.priority === "high" ? "alert-circle" : d.priority === "low" ? "circle-outline" : "circle-medium"
                }
                size={isCompact ? 20 : 24}
                color={d.priority === "high" ? paperTheme.colors.error : paperTheme.colors.onSurfaceVariant}
              />
            </Card.Content>
          </Card>
        ))
      )}

      <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize }]}>
        Your stats
      </Text>
      <View style={[styles.statRow, { gap: isCompact ? 6 : 8 }]}>
        <StatCard label="Accuracy" value={`${accuracy}%`} icon="bullseye-arrow" color={brand.primary} compact={isCompact} />
        <StatCard label="Top subject" value={topSubject} icon="school" color={brand.secondary} compact={isCompact} />
        <StatCard label="Conversations" value={String(conversations)} icon="message" color={brand.tertiary} compact={isCompact} />
      </View>
    </ScrollView>
  );
}

function QuickAction({
  label, icon, color, onPress, compact,
}: {
  label: string; icon: string; color: string; onPress: () => void; compact: boolean;
}) {
  const paperTheme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.85 : 1 }]}>
      <Card style={[styles.quickCard, { borderRadius: SHAPE.lg, backgroundColor: paperTheme.colors.surface }]}>
        <Card.Content style={[styles.quickCardContent, compact && { paddingVertical: 10, gap: 4 }]}>
          <View style={[styles.quickIcon, compact && { width: 36, height: 36, borderRadius: 18 }]}>
            <Icon name={icon} size={compact ? 20 : 24} color={color} />
          </View>
          <Text variant={compact ? "labelSmall" : "labelMedium"} style={{ fontWeight: "700" }}>
            {label}
          </Text>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

function StatCard({
  label, value, icon, color, compact,
}: {
  label: string; value: string; icon: string; color: string; compact: boolean;
}) {
  return (
    <View style={[{ flex: 1, padding: 12, borderRadius: 16, alignItems: "center", gap: 4, backgroundColor: `${color}11` }, compact && { padding: 10, gap: 2 }]}>
      <Icon name={icon} size={compact ? 18 : 20} color={color} />
      <Text
        style={[{ color, fontSize: compact ? 16 : 20 }, statsValue]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text variant="labelSmall" style={{ color: "#888", textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const statsValue = { fontWeight: "800" as const };

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontWeight: "900" },
  streakCard: {},
  streakContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  streakNumber: { fontWeight: "900" },
  quickActions: { flexDirection: "row" },
  quickCard: { flex: 1 },
  quickCardContent: { alignItems: "center", paddingVertical: 16, gap: 8 },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontWeight: "800", marginTop: 4 },
  empty: { padding: 16 },
  deadline: {},
  deadlineContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statRow: { flexDirection: "row" },
});
