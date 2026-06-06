import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, ActivityIndicator, Button } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ME, USER_STATS } from "../../graphql/queries/user";
import { SHAPE } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icon";
import {
  ExpressiveHeroPanel,
  ExpressiveListRow,
  ExpressiveRailCard,
  ExpressiveScreen,
  ExpressiveSection,
} from "../../components/expressive";

const MENU_ITEMS = [
  { title: "Theme & color", icon: "palette", screen: "ThemePicker" },
  { title: "AI personality", icon: "robot", screen: "PersonalityEditor" },
  { title: "Memory", icon: "brain", screen: "MemoryManager" },
  { title: "Achievements", icon: "trophy", screen: "Achievements" },
  { title: "Settings", icon: "cog", screen: "Settings" },
  { title: "Support", icon: "help-circle", screen: "Support" },
  { title: "Privacy", icon: "shield-account", screen: "Privacy" },
];

export default function ProfileScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation<any>();
  const { data: meData, loading: meLoading } = useQuery(ME);
  const { data: statsData, loading: statsLoading } = useQuery(USER_STATS);
  const { signOut } = useAuth();
  const me = meData?.me;
  const stats = statsData?.userStats;

  if (meLoading || statsLoading) return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
      <ActivityIndicator />
    </View>
  );

  return (
    <ExpressiveScreen title="Profile" eyebrow="Account" subtitle={me?.email ?? "Your study profile"} leadingIcon="account-circle">
        <ExpressiveHeroPanel style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={[styles.avatar, { backgroundColor: paperTheme.colors.primary }]}>
                <Text style={[styles.avatarLetter, { color: paperTheme.colors.onPrimary }]}>{(me?.name ?? "?").charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headlineSmall" style={{ fontWeight: "900", color: paperTheme.colors.onPrimaryContainer }}>{me?.name ?? "You"}</Text>
                {me?.email && <Text variant="bodySmall" style={{ color: paperTheme.colors.onPrimaryContainer }}>{me.email}</Text>}
              </View>
            </View>
            <View style={styles.levelRow}>
              <Chip label="Level" value={stats?.level ?? 1} />
              <Chip label="Streak" value={`${stats?.currentStreak ?? 0}d`} />
            </View>
        </ExpressiveHeroPanel>

        <ExpressiveSection title="Stats">
          <View style={styles.statRow}>
            <ExpressiveRailCard value={stats?.xp ?? 0} label="XP" icon="star-four-points" />
            <ExpressiveRailCard value={stats?.quizzesCompleted ?? 0} label="Quizzes" icon="clipboard-check" />
            <ExpressiveRailCard value={stats?.cardsReviewed ?? 0} label="Cards" icon="cards" />
          </View>
        </ExpressiveSection>

        <ExpressiveSection title="Account">
          <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => (
            <ExpressiveListRow key={item.screen} title={item.title} icon={item.icon} onPress={() => navigation.navigate(item.screen)} />
          ))}
          </View>
        </ExpressiveSection>

        <Button mode="outlined" icon="logout" onPress={signOut} textColor={paperTheme.colors.error} style={{ borderRadius: SHAPE.lg, marginHorizontal: 16 }}>
          Sign out
        </Button>
    </ExpressiveScreen>
  );
}

function Chip({ label, value }: { label: string; value: number | string }) {
  const paperTheme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: paperTheme.colors.surface }]}>
      <Text style={{ color: paperTheme.colors.primary, fontSize: 12, fontWeight: "800" }}>{label}: {value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: { gap: 14 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  avatar: { width: 72, height: 72, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: 22 },
  levelRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: SHAPE.xs },
  statRow: { flexDirection: "row", gap: 8 },
  menuSection: { gap: 8 },
});
