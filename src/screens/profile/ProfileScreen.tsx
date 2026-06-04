/**
 * Profile screen — streak, level, stats, links to settings.
 */
import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, ActivityIndicator, Button, List } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ME, USER_STATS } from "../../graphql/queries/user";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import { useScreenSize, useContentPadding } from "../../hooks/useResponsive";
import Icon from "../../components/Icon";

export default function ProfileScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const { data: meData, loading: meLoading } = useQuery(ME);
  const { data: statsData, loading: statsLoading } = useQuery(USER_STATS);
  const { signOut } = useAuth();
  const me = meData?.me;
  const stats = statsData?.userStats;

  const size = useScreenSize();
  const pad = useContentPadding();
  const isCompact = size === "compact";

  if (meLoading || statsLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={{ backgroundColor: paperTheme.colors.background }} contentContainerStyle={styles.list}>
      <View style={[styles.header, { paddingTop: isCompact ? 40 : 56 }]}>
        <View style={[styles.avatar, { backgroundColor: brand.primary }]}>
          <Text variant={isCompact ? "titleLarge" : "headlineLarge"} style={{ color: "#fff", fontWeight: "900" }}>
            {(me?.name ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text variant={isCompact ? "titleLarge" : "headlineSmall"} style={{ fontWeight: "900" }}>{me?.name ?? "You"}</Text>
        {!isCompact && (
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>{me?.email}</Text>
        )}
        <View style={[styles.levelRow, { gap: isCompact ? 6 : 8 }]}>
          <View style={[styles.levelPill, { backgroundColor: `${brand.primary}22`, borderRadius: SHAPE.pill }]}>
            <Text variant="labelMedium" style={{ color: brand.primary, fontWeight: "800" }}>
              Level {stats?.level ?? 1}
            </Text>
          </View>
          <View style={[styles.levelPill, { backgroundColor: `${brand.tertiary}22`, borderRadius: SHAPE.pill }]}>
            <Text variant="labelMedium" style={{ color: brand.tertiary, fontWeight: "800" }}>
              {stats?.currentStreak ?? 0}-day streak
            </Text>
          </View>
        </View>
      </View>

      {me?.grade && (
        <View style={[styles.infoCard, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
          <InfoRow label="Year" value={me.grade} />
          {me.state && <InfoRow label="State" value={me.state} />}
          {me.subjects?.length ? (
            <InfoRow label="Subjects" value={me.subjects.join(", ")} />
          ) : null}
        </View>
      )}

      <View style={[styles.statCard, { backgroundColor: paperTheme.colors.surface, borderRadius: SHAPE.lg }]}>
        <Stat label="XP" value={stats?.xp ?? 0} compact={isCompact} />
        <Stat label="Quizzes" value={stats?.quizzesCompleted ?? 0} compact={isCompact} />
        <Stat label="Cards" value={stats?.cardsReviewed ?? 0} compact={isCompact} />
        <Stat label="Hours" value={Math.round((stats?.minutesStudied ?? 0) / 60)} compact={isCompact} />
      </View>

      <List.Section>
        <List.Subheader style={{ paddingLeft: 0 }}>Preferences</List.Subheader>
        <List.Item
          title="Theme & color"
          left={() => <List.Icon icon="palette" />}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => navigation.navigate("ThemePicker")}
          style={styles.itemBorder}
        />
        <List.Item
          title="AI personality"
          left={() => <List.Icon icon="robot" />}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => navigation.navigate("PersonalityEditor")}
          style={styles.itemBorder}
        />
        <List.Item
          title="Memory"
          left={() => <List.Icon icon="brain" />}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => navigation.navigate("MemoryManager")}
          style={styles.itemBorder}
        />
        <List.Item
          title="Achievements"
          left={() => <List.Icon icon="trophy" />}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => navigation.navigate("Achievements")}
          style={styles.itemBorder}
        />
        <List.Item
          title="Settings"
          left={() => <List.Icon icon="cog" />}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => navigation.navigate("Settings")}
          style={styles.itemBorder}
        />
        <List.Item
          title="Support"
          left={() => <List.Icon icon="help-circle" />}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => navigation.navigate("Support")}
          style={styles.itemBorder}
        />
        <List.Item
          title="Privacy"
          left={() => <List.Icon icon="shield-account" />}
          right={() => <List.Icon icon="chevron-right" />}
          onPress={() => navigation.navigate("Privacy")}
          style={styles.itemBorder}
        />
      </List.Section>

      <Button
        mode="outlined"
        icon="logout"
        onPress={signOut}
        style={{ marginHorizontal: pad.h, marginVertical: pad.v, borderRadius: SHAPE.xl }}
        textColor={paperTheme.colors.error}
      >
        Sign out
      </Button>
    </ScrollView>
  );
}

function Stat({ label, value, compact }: { label: string; value: number; compact: boolean }) {
  const paperTheme = useTheme();
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text variant={compact ? "titleMedium" : "titleLarge"} style={{ fontWeight: "900" }}>{value}</Text>
      <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const paperTheme = useTheme();
  return (
    <View style={infoRowStyles.row}>
      <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, fontWeight: "600" }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ fontWeight: "600" }}>{value}</Text>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: "column",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
});

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 100 },
  header: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  levelRow: { flexDirection: "row", marginTop: 10 },
  levelPill: { paddingHorizontal: 10, paddingVertical: 4 },
  statCard: { flexDirection: "row", padding: 14, marginTop: 6 },
  infoCard: { padding: 4, marginTop: 6 },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.06)" },
});
