import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, useTheme, IconButton, List, Switch, Button, Dialog, Portal } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@apollo/client";
import { DELETE_ACCOUNT } from "../../graphql/queries/user";
import { useAuth } from "../../context/AuthContext";
import { SHAPE } from "../../theme/tokens";

export default function SettingsScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const [deleteAccount] = useMutation(DELETE_ACCOUNT);
  const [showDialog, setShowDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      setError(e instanceof Error ? e.message : "Could not delete account. Try again later.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="headlineLarge" style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <List.Section>
          <List.Subheader style={{ paddingLeft: 0 }}>Notifications</List.Subheader>
          <List.Item
            title="Daily reminders"
            description="When to study"
            style={{ paddingLeft: 0 }}
            right={() => <Switch value={notif} onValueChange={setNotif} />}
          />
          <List.Item
            title="Streak warnings"
            description="Don't break the chain"
            style={{ paddingLeft: 0 }}
            right={() => <Switch value={streak} onValueChange={setStreak} />}
          />
          <List.Item
            title="Review reminders"
            description="Flashcards due today"
            style={{ paddingLeft: 0 }}
            right={() => <Switch value={review} onValueChange={setReview} />}
          />
        </List.Section>

        <List.Section>
          <List.Subheader style={{ paddingLeft: 0 }}>Sync</List.Subheader>
          <List.Item
            title="Auto-sync"
            description="Background sync across devices"
            style={{ paddingLeft: 0 }}
            right={() => <Switch value={autoSync} onValueChange={setAutoSync} />}
          />
        </List.Section>

        <List.Section>
          <List.Subheader style={{ paddingLeft: 0 }}>Account</List.Subheader>
          <List.Item
            title="Delete account"
            titleStyle={{ color: paperTheme.colors.error }}
            left={() => <List.Icon icon="delete" color={paperTheme.colors.error} />}
            right={() => <List.Icon icon="chevron-right" color={paperTheme.colors.error} />}
            onPress={() => setShowDialog(true)}
          />
        </List.Section>

        {error && (
          <Text variant="bodySmall" style={{ color: paperTheme.colors.error, textAlign: "center", marginTop: 8 }}>
            {error}
          </Text>
        )}
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
            <Button onPress={() => setShowDialog(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              textColor={paperTheme.colors.error}
              loading={deleting}
              disabled={deleting}
              onPress={handleConfirmDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 8 },
  title: { fontWeight: "900" },
  list: { padding: 20, paddingBottom: 100 },
  version: { textAlign: "center", marginTop: 24 },
});
