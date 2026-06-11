import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, useTheme, ActivityIndicator, Button, Portal, Modal, Searchbar } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { ME, USER_STATS, UPDATE_PROFILE } from "../../graphql/queries/user";
import { SHAPE } from "../../theme/tokens";
import { useAuth } from "../../context/AuthContext";
import { SUBJECT_CATALOG } from "../../shared/subjects/catalog";
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
  const [updateProfile, { loading: saving }] = useMutation(UPDATE_PROFILE);
  const { signOut } = useAuth();
  const me = meData?.me;
  const stats = statsData?.userStats;
  const enrolledNames: string[] = me?.subjects ?? [];
  const [showSubjects, setShowSubjects] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");

  const toggleSubject = async (label: string) => {
    const updated = enrolledNames.includes(label)
      ? enrolledNames.filter((s) => s !== label)
      : [...enrolledNames, label];
    try {
      await updateProfile({ variables: { input: { subjects: updated } } });
    } catch (err) {
      console.error("Failed to update subjects:", err);
    }
  };

  const filteredCatalog = subjectSearch
    ? SUBJECT_CATALOG.filter((s) => s.label.toLowerCase().includes(subjectSearch.toLowerCase()))
    : SUBJECT_CATALOG;

  if (meLoading || statsLoading) return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
      <ActivityIndicator />
    </View>
  );

  return (
    <ExpressiveScreen title="Profile" subtitle={me?.email ?? "Your profile"} leadingIcon="account-circle">
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
            <ExpressiveListRow
              title="Manage subjects"
              icon="school"
              subtitle={`${enrolledNames.length} subjects`}
              onPress={() => setShowSubjects(true)}
            />
          {MENU_ITEMS.map((item) => (
            <ExpressiveListRow key={item.screen} title={item.title} icon={item.icon} onPress={() => {
              if (item.screen === "Achievements") {
                navigation.navigate("Home", { screen: "Achievements" });
              } else {
                navigation.navigate(item.screen);
              }
            }} />
          ))}
          </View>
        </ExpressiveSection>

        <Button mode="outlined" icon="logout" onPress={signOut} textColor={paperTheme.colors.error} style={{ borderRadius: SHAPE.lg, marginHorizontal: 16 }}>
          Sign out
        </Button>

        <Portal>
          <Modal visible={showSubjects} onDismiss={() => setShowSubjects(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
            <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 12 }}>Manage subjects</Text>
            <Searchbar
              placeholder="Search subjects…"
              value={subjectSearch}
              onChangeText={setSubjectSearch}
              style={[styles.search, { backgroundColor: paperTheme.colors.surfaceVariant }]}
              inputStyle={{ fontSize: 14 }}
            />
            <View style={styles.subjectGrid}>
              {filteredCatalog.map((s) => {
                const selected = enrolledNames.includes(s.label);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => toggleSubject(s.label)}
                    style={[styles.subjectChip, {
                      backgroundColor: selected ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant,
                      borderRadius: SHAPE.pill,
                      flexDirection: "row", alignItems: "center", gap: 6,
                    }]}
                  >
                    <Icon name={s.icon} size={16} color={selected ? paperTheme.colors.onPrimary : paperTheme.colors.onSurfaceVariant} />
                    <Text style={{ color: selected ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface, fontWeight: "700" }}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Modal>
        </Portal>
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
  modal: { margin: 16, padding: 24, borderRadius: 26, maxHeight: "75%" },
  search: { borderRadius: SHAPE.lg, marginBottom: 12 },
  subjectGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 8 },
});
