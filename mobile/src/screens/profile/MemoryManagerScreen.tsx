import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { Text, useTheme, Card, IconButton, Button, ActivityIndicator, TextInput, Portal, Modal, Snackbar } from "react-native-paper";
import { useQuery, useMutation } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { USER_STATS, FORGET_MEMORY, REMEMBER_MEMORY } from "../../graphql/queries/user";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import Icon from "../../components/Icon";

export default function MemoryManagerScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation();
  const { data, loading } = useQuery(USER_STATS);
  const [forgetMemory] = useMutation(FORGET_MEMORY, { refetchQueries: [{ query: USER_STATS }] });
  const [rememberMemory] = useMutation(REMEMBER_MEMORY, { refetchQueries: [{ query: USER_STATS }] });
  const memories = data?.userStats?.memories ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) return;
    setSaving(true);
    try {
      await rememberMemory({ variables: { input: { key: newKey.trim(), value: newValue.trim() } } });
      setShowAdd(false);
      setNewKey("");
      setNewValue("");
      setSnack("Memory saved.");
    } catch (e: any) {
      setSnack(e.message ?? "Failed to save memory.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: paperTheme.colors.surface }]}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>Memory</Text>
        <IconButton icon="plus" onPress={() => setShowAdd(true)} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 16, paddingHorizontal: 4 }}>
          Things the AI has learned about you. Add things you want it to remember, or clear any you'd rather it forget.
        </Text>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : memories.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="brain" size={64} color={paperTheme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 16 }}>
              No memories yet. Tap + to add one, or chat with the AI and it will remember your preferences.
            </Text>
            <Button mode="contained" buttonColor={brand.primary} onPress={() => setShowAdd(true)} style={{ marginTop: 24, borderRadius: SHAPE.lg }}>
              Add a memory
            </Button>
          </View>
        ) : (
          <>
            <Button mode="contained" buttonColor={brand.primary} icon="plus" onPress={() => setShowAdd(true)} style={{ marginBottom: 12, borderRadius: SHAPE.lg }}>
              Add memory
            </Button>
            {memories.map((m: any) => (
              <Card key={m.id} mode="outlined" style={styles.memoryCard}>
                <Card.Content style={styles.memoryRow}>
                  <View style={[styles.iconWrap, { backgroundColor: brand.primary + "18" }]}>
                    <Icon name="brain" size={20} color={brand.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }}>{m.key}</Text>
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{m.value}</Text>
                  </View>
                  <Button compact textColor={paperTheme.colors.error} onPress={() => forgetMemory({ variables: { id: m.id } })}>
                    Forget
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      <Portal>
        <Modal visible={showAdd} onDismiss={() => setShowAdd(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Add a memory</Text>
          <TextInput mode="outlined" label="What to remember (key)" value={newKey} onChangeText={setNewKey} style={{ marginBottom: 12 }} placeholder="e.g., Learning style" />
          <TextInput mode="outlined" label="Details (value)" value={newValue} onChangeText={setNewValue} style={{ marginBottom: 16 }} placeholder="e.g., Visual explanations work best" multiline numberOfLines={3} />
          <Button mode="contained" buttonColor={brand.primary} onPress={handleAdd} loading={saving} disabled={!newKey.trim() || !newValue.trim() || saving}>
            Save memory
          </Button>
        </Modal>
      </Portal>
      <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={2000}>{snack}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: 50, paddingHorizontal: 4 },
  list: { padding: 16, paddingBottom: 100, gap: 8 },
  empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  memoryCard: { borderRadius: SHAPE.lg },
  memoryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: SHAPE.md, alignItems: "center", justifyContent: "center" },
  modal: { margin: 20, padding: 24, borderRadius: 26 },
});
