import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme, Searchbar, FAB, Portal, Modal, Button, TextInput } from "react-native-paper";
import { useQuery } from "@apollo/client";
import { useNavigation } from "@react-navigation/native";
import { CHAT_SESSIONS } from "../../graphql/queries/chat";
import { SHAPE } from "../../theme/tokens";
import {
  ExpressiveEmptyState,
  ExpressiveHeroPanel,
  ExpressiveListRow,
  ExpressiveScreen,
  ExpressiveSection,
} from "../../components/expressive";

export default function ChatListScreen() {
  const paperTheme = useTheme();
  const navigation = useNavigation<any>();
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const { data, loading } = useQuery(CHAT_SESSIONS);
  const sessions = data?.chatSessions ?? [];
  const filtered = q ? sessions.filter((s: any) => (s.name ?? s.subject ?? "").toLowerCase().includes(q.toLowerCase())) : sessions;

  return (
    <ExpressiveScreen
      title="Tutor"
      eyebrow="AI"
      subtitle={`${filtered.length} conversation${filtered.length !== 1 ? "s" : ""}`}
      leadingIcon="robot"
    >
      <ExpressiveHeroPanel style={styles.hero}>
        <Text variant="headlineSmall" style={{ color: paperTheme.colors.onPrimaryContainer, fontWeight: "900" }}>
          Ask, revise, explain, repeat.
        </Text>
        <Text variant="bodyMedium" style={{ color: paperTheme.colors.onPrimaryContainer }}>
          Keep each subject in its own focused thread.
        </Text>
      </ExpressiveHeroPanel>
      <Searchbar
        placeholder="Search conversations"
        value={q}
        onChangeText={setQ}
        style={[styles.search, { backgroundColor: paperTheme.colors.surfaceVariant }]}
        inputStyle={{ fontSize: 14 }}
      />

      <ExpressiveSection title="Conversations">
        <View style={styles.list}>
        {filtered.length === 0 ? (
          <ExpressiveEmptyState icon="message-text-outline" title="No conversations yet" subtitle="Tap New chat to start studying with AI." />
        ) : (
          filtered.map((s: any) => (
            <ExpressiveListRow
              key={s.id}
              title={s.name ?? s.subject ?? "Chat"}
              subtitle={s.lastMessage ?? "No messages yet"}
              icon="robot"
              onPress={() => navigation.navigate("ChatSession", { sessionId: s.id })}
              trailing={
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, maxWidth: 72 }} numberOfLines={1}>
                  {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : ""}
                </Text>
              }
            />
          ))
        )}
        </View>
      </ExpressiveSection>

      <FAB icon="plus" label="New chat" color={paperTheme.colors.onPrimary} style={[styles.fab, { backgroundColor: paperTheme.colors.primary }]} onPress={() => setShowNew(true)} />

      <Portal>
        <Modal visible={showNew} onDismiss={() => setShowNew(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
          <Text variant="titleLarge" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 16 }}>
            New conversation
          </Text>
          <TextInput mode="outlined" label="Subject / topic" placeholder="e.g. Calculus, Shakespeare..." style={{ marginBottom: 12 }} />
          <Button mode="contained" buttonColor={paperTheme.colors.primary} style={{ borderRadius: SHAPE.lg }} onPress={() => { setShowNew(false); navigation.navigate("ChatSession", { sessionId: "new" }); }}>
            Start
          </Button>
        </Modal>
      </Portal>
    </ExpressiveScreen>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 150, gap: 8, justifyContent: "center" },
  search: { borderRadius: SHAPE.pill },
  list: { gap: 8 },
  fab: { position: "absolute", right: 16, bottom: 100, borderRadius: SHAPE.lg },
  modal: { margin: 20, padding: 24, borderRadius: SHAPE.xl },
});
