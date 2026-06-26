import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { Text, useTheme, Card, IconButton, Switch, Button, Dialog, Portal } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@apollo/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DELETE_ACCOUNT } from "../../graphql/queries/user";
import { useAuth } from "../../context/AuthContext";
import { SHAPE } from "../../theme/tokens";

export default function SettingsScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const [deleteAccount] = useMutation(DELETE_ACCOUNT);
  const [showDialog, setShowDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notif, setNotif] = useState(true);
  const [streak, setStreak] = useState(true);
  const [review, setReview] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      setError(null);
      await deleteAccount();
      await signOut();
    } catch (e) {
      setDeleting(false);
      setShowDialog(false);
      setError(e instanceof Error ? e.message : "Could not delete account.");
    }
  };

  const handleResetData = async () => {
    setResetting(true);
    try {
      const keys = await AsyncStorage.getAllKeys();
      const localKeys = keys.filter((k) => k.startsWith("analogix_") || k.startsWith("onboarding_") || k.startsWith("custom_event_types"));
      await AsyncStorage.multiRemove(localKeys);
      setShowResetDialog(false);
      Alert.alert("Data reset", "Local data has been cleared. Please restart the app.", [{ text: "OK" }]);
    } catch {
      setShowResetDialog(false);
      Alert.alert("Error", "Failed to reset data.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface, paddingTop: insets.top + 4 }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}>
        <Text variant="titleSmall" style={[styles.sectionTitle, { color: paperTheme.colors.onSurfaceVariant }]}>NOTIFICATIONS</Text>
        <Card mode="outlined" style={styles.card}>
          <SettingSwitch label="Daily reminders" desc="When to study" value={notif} onToggle={setNotif} />
          <View style={[styles.divider, { backgroundColor: paperTheme.colors.outlineVariant }]} />
          <SettingSwitch label="Streak warnings" desc="Don't break the chain" value={streak} onToggle={setStreak} />
          <View style={[styles.divider, { backgroundColor: paperTheme.colors.outlineVariant }]} />
          <SettingSwitch label="Review reminders" desc="Flashcards due today" value={review} onToggle={setReview} />
        </Card>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: paperTheme.colors.onSurfaceVariant }]}>SYNC</Text>
        <Card mode="outlined" style={styles.card}>
          <SettingSwitch label="Auto-sync" desc="Background sync across devices" value={autoSync} onToggle={setAutoSync} />
        </Card>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: paperTheme.colors.onSurfaceVariant }]}>ACCOUNT</Text>
        <Card mode="outlined" style={styles.card}>
          <Pressable onPress={() => setShowDialog(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, styles.deleteRow]}>
            <Text style={{ color: paperTheme.colors.error, fontWeight: "600" }}>Delete account</Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Permanently remove all data</Text>
          </Pressable>
        </Card>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: paperTheme.colors.onSurfaceVariant }]}>DATA</Text>
        <Card mode="outlined" style={styles.card}>
          <Pressable onPress={() => setShowResetDialog(true)} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, styles.deleteRow]}>
            <Text style={{ color: paperTheme.colors.error, fontWeight: "600" }}>Reset all data</Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Clear local cache, settings, and onboarding</Text>
          </Pressable>
        </Card>

        {error && <Text variant="bodySmall" style={{ color: paperTheme.colors.error, textAlign: "center", marginTop: 8 }}>{error}</Text>}
      </ScrollView>

      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
          <Dialog.Icon icon="alert" />
          <Dialog.Title style={{ textAlign: "center" }}>Delete account?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: "center", color: paperTheme.colors.onSurfaceVariant }}>
              This action is permanent. All your study data, chat history, and progress will be lost.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: "center", gap: 8 }}>
            <Button onPress={() => setShowDialog(false)} disabled={deleting}>Cancel</Button>
            <Button textColor={paperTheme.colors.error} loading={deleting} disabled={deleting} onPress={handleConfirmDelete}>
              {deleting ? "Deleting\u2026" : "Delete"}
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={showResetDialog} onDismiss={() => setShowResetDialog(false)}>
          <Dialog.Icon icon="restart" />
          <Dialog.Title style={{ textAlign: "center" }}>Reset all local data?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ textAlign: "center", color: paperTheme.colors.onSurfaceVariant }}>
              This will clear your local cache, dashboard customisations, timer state, and onboarding progress. Your account and cloud data will remain intact.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: "center", gap: 8 }}>
            <Button onPress={() => setShowResetDialog(false)} disabled={resetting}>Cancel</Button>
            <Button textColor={paperTheme.colors.error} loading={resetting} disabled={resetting} onPress={handleResetData}>
              {resetting ? "Resetting\u2026" : "Reset"}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function SettingSwitch({ label, desc, value, onToggle }: { label: string; desc: string; value: boolean; onToggle: (v: boolean) => void }) {
  const paperTheme = useTheme();
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{label}</Text>
        <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  list: { padding: 16 },
  sectionTitle: { fontWeight: "700", letterSpacing: 1, marginTop: 12, marginBottom: 8 },
  card: { borderRadius: SHAPE.lg, overflow: "hidden" },
  divider: { height: 1, marginHorizontal: 16 },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  deleteRow: { paddingVertical: 14, paddingHorizontal: 16, gap: 2 },
});
