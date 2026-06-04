import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { Text, useTheme, ActivityIndicator, Button, TextInput } from "react-native-paper";
import { useMutation, useQuery } from "@apollo/client";
import { CHAT_SESSIONS, CREATE_CHAT_SESSION } from "../../graphql/queries/chat";
import { useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize } from "../../hooks/useResponsive";
import Icon from "../../components/Icon";

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function ChatListScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const navigation = useNavigation<any>();
  const size = useScreenSize();
  const isCompact = size === "compact";

  const sessions = useQuery(CHAT_SESSIONS);
  const [createSession] = useMutation(CREATE_CHAT_SESSION);

  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const items: any[] = sessions.data?.chatSessions ?? [];

  const handleNew = async () => {
    if (!newTitle.trim()) return;
    try {
      const { data } = await createSession({
        variables: { subjectId: "general", title: newTitle.trim() || "New chat" },
      });
      setShowNew(false);
      setNewTitle("");
      navigation.navigate("ChatSession", {
        sessionId: data.createChatSession.id,
        title: newTitle.trim() || "New chat",
      });
    } catch {}
  };

  return (
    <View style={[styles.container, { backgroundColor: paperTheme.colors.background }]}>
      <View style={[styles.header, { paddingTop: isCompact ? 40 : 56 }]}>
        <View style={{ flex: 1 }}>
          <Text variant={isCompact ? "headlineMedium" : "headlineLarge"} style={styles.title}>Tutor chats</Text>
        </View>
        <Pressable
          onPress={() => setShowNew(true)}
          style={[styles.newBtn, { backgroundColor: brand.primary }]}
        >
          <Icon name="plus" size={22} color="#fff" />
        </Pressable>
      </View>

      {items.length === 0 && !sessions.loading ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: `${brand.primary}15` }]}>
            <Icon name="message-text-outline" size={48} color={brand.primary} />
          </View>
          <Text variant="titleMedium" style={{ fontWeight: "700", marginTop: 16 }}>
            No chats yet
          </Text>
          <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 4, marginBottom: 20, paddingHorizontal: 32 }}>
            Tap the + button to start a conversation with your AI tutor.
          </Text>
          <Button
            mode="contained"
            buttonColor={brand.primary}
            onPress={() => setShowNew(true)}
            style={{ borderRadius: SHAPE.pill }}
          >
            Start a chat
          </Button>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: isCompact ? 16 : 20, paddingBottom: 100, gap: 6 }}
          refreshControl={<RefreshControl refreshing={sessions.loading} onRefresh={sessions.refetch} tintColor={brand.primary} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate("ChatSession", {
                  sessionId: item.id,
                  title: item.title ?? "Chat",
                })
              }
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.row, { backgroundColor: paperTheme.colors.surface }]}>
                <View style={[styles.rowIcon, { backgroundColor: `${brand.primary}12` }]}>
                  <Icon name="message-text" size={18} color={brand.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ fontWeight: "600" }} numberOfLines={1}>
                    {item.title ?? "Chat"}
                  </Text>
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }} numberOfLines={1}>
                    {item.lastMessage ?? "Tap to start chatting"}
                  </Text>
                </View>
                <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, alignSelf: "flex-start", marginTop: 2 }}>
                  {timeAgo(new Date(item.updatedAt))}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {showNew && (
        <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setShowNew(false); setNewTitle(""); }} />
          <View style={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
            <Text variant="titleLarge" style={{ fontWeight: "800", marginBottom: 4 }}>New chat</Text>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 16 }}>
              What would you like to talk about?
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Ask anything…"
              value={newTitle}
              onChangeText={setNewTitle}
              onSubmitEditing={handleNew}
              style={{ borderRadius: SHAPE.lg, marginBottom: 12 }}
              autoFocus
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
              <Button
                mode="text"
                onPress={() => { setShowNew(false); setNewTitle(""); }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                buttonColor={brand.primary}
                onPress={handleNew}
                disabled={!newTitle.trim()}
                style={{ borderRadius: SHAPE.pill }}
              >
                Start
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontWeight: "900" },
  newBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderRadius: 16,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  modal: {
    width: "85%",
    maxWidth: 400,
    padding: 24,
    borderRadius: 24,
    elevation: 8,
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
  },
});
