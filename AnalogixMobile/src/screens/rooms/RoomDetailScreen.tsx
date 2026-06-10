import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert, Pressable } from "react-native";
import { Text, useTheme, ActivityIndicator, TextInput, Button, IconButton, Portal, Modal, SegmentedButtons } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  ROOM_DETAIL,
  ROOM_MESSAGES_SUB,
  SEND_ROOM_MESSAGE,
  LEAVE_ROOM,
  UPDATE_ROOM_TIMER,
  SHARE_DOCUMENT_TO_ROOM,
  ROOM_PRESENCE_STREAM,
  ROOM_TIMER_STREAM,
  UPDATE_ROOM_MEMBER_ROLE,
} from "../../graphql/queries/room";
import { DOCUMENTS } from "../../graphql/queries/subject";
import { ME } from "../../graphql/queries/user";
import { TUTOR } from "../../graphql/queries/ai";
import { useAuth } from "../../context/AuthContext";
import { SHAPE } from "../../theme/tokens";
import { ExpressiveCard, ExpressiveEmptyState, ExpressiveScreen } from "../../components/expressive";
import Icon from "../../components/Icon";
import { MarkdownRenderer } from "../../components/MarkdownRenderer";

export default function RoomDetailScreen() {
  const paperTheme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { roomId, name } = route.params;
  const { data: meData } = useQuery(ME);
  const { data, loading, refetch } = useQuery(ROOM_DETAIL, { variables: { id: roomId } });
  const [sendMessage, { loading: sending }] = useMutation(SEND_ROOM_MESSAGE);
  const [leaveRoom] = useMutation(LEAVE_ROOM);
  const [updateTimer] = useMutation(UPDATE_ROOM_TIMER);
  const [shareDoc] = useMutation(SHARE_DOCUMENT_TO_ROOM);
  const [updateRole] = useMutation(UPDATE_ROOM_MEMBER_ROLE);
  const [tutorMutation] = useMutation(TUTOR);
  const [text, setText] = useState("");
  const [chatMode, setChatMode] = useState<"group" | "ai">("group");
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [timerState, setTimerState] = useState<{ state: string; duration: number; elapsed: number }>({
    state: "idle",
    duration: 1500,
    elapsed: 0,
  });
  const [localElapsed, setLocalElapsed] = useState(0);
  const [showShareDoc, setShowShareDoc] = useState(false);
  const [showTimerConfig, setShowTimerConfig] = useState(false);
  const [timerDurationMin, setTimerDurationMin] = useState("25");
  const [selectedDocId, setSelectedDocId] = useState("");

  const { data: docsData } = useQuery(DOCUMENTS);
  const allDocs = docsData?.documents ?? [];

  useSubscription(ROOM_MESSAGES_SUB, { variables: { roomId }, onData: () => refetch() });
  useSubscription(ROOM_PRESENCE_STREAM, { variables: { roomId }, onData: () => refetch() });
  useSubscription(ROOM_TIMER_STREAM, {
    variables: { roomId },
    onData: ({ data: result }) => {
      const t = result?.data?.roomTimerStream;
      if (!t) return;
      setTimerState({
        state: t.timerState ?? "idle",
        duration: t.timerDurationSeconds ?? 1500,
        elapsed: t.timerElapsedSeconds ?? 0,
      });
      setLocalElapsed(t.timerElapsedSeconds ?? 0);
    },
  });

  useEffect(() => {
    if (timerState.state !== "running") return;
    const id = setInterval(() => setLocalElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [timerState.state]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setText("");

    if (chatMode === "ai") {
      const userMsg = { role: "user" as const, text: content };
      setAiMessages((prev) => [...prev, userMsg]);
      setAiLoading(true);
      try {
        const history = [...aiMessages, userMsg].map((m) => ({ content: m.text, role: m.role }));
        const { data } = await tutorMutation({
          variables: {
            input: {
              subject: room?.subject ?? "General",
              topic: content,
              learningStyle: "balanced",
              difficultyLevel: "intermediate",
              responseFormat: "balanced",
              history,
            },
          },
        });
        const reply = data?.tutor?.message ?? "No response generated.";
        setAiMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      } catch {
        setAiMessages((prev) => [...prev, { role: "assistant", text: "Failed to get AI response." }]);
      } finally {
        setAiLoading(false);
      }
      return;
    }

    try {
      await sendMessage({ variables: { roomId, content } });
    } catch {
      setText(content);
    }
  };

  const handleShareDoc = async () => {
    if (!selectedDocId) return;
    try {
      await shareDoc({ variables: { roomId, documentId: selectedDocId, subjectId: "shared" } });
      setShowShareDoc(false);
      setSelectedDocId("");
    } catch (err) {
      console.error("Failed to share document:", err);
    }
  };

  const handleUpdateRole = (member: any, newRole: string) => {
    Alert.alert(
      newRole === "cohost" ? "Promote to co-host" : "Demote to member",
      `Change ${member.name ?? member.userId}'s role?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: newRole === "cohost" ? "Promote" : "Demote",
          onPress: () => updateRole({ variables: { roomId, userId: member.userId, role: newRole } }),
        },
      ]
    );
  };

  const handleTimerConfig = () => {
    const seconds = Math.max(60, parseInt(timerDurationMin, 10) || 25) * 60;
    updateTimer({
      variables: { roomId, state: timerState.state, durationSeconds: seconds, elapsedSeconds: localElapsed },
    });
    setShowTimerConfig(false);
  };

  const handleLeave = () => {
    Alert.alert("Leave room", "Are you sure you want to leave this room?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          await leaveRoom({ variables: { roomId } });
          navigation.goBack();
        },
      },
    ]);
  };

  const syncTimer = async (state: string, elapsedSeconds?: number) => {
    await updateTimer({
      variables: {
        roomId,
        state,
        durationSeconds: timerState.duration,
        elapsedSeconds: elapsedSeconds ?? localElapsed,
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const room = data?.room;
  const messages = [...(room?.messages ?? [])].reverse();
  const members = room?.members ?? [];
  const docs = room?.documents ?? [];
  const onlineCount = members.filter((m: any) => m.isOnline).length;
  const myUserId = meData?.me?.id ?? user?.id;
  const timerLabel = `${Math.floor(localElapsed / 60)}:${String(localElapsed % 60).padStart(2, "0")}`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: paperTheme.colors.background }]}
    >
      <ExpressiveScreen
        title={name ?? room?.title ?? "Room"}
        subtitle={`${onlineCount} online · ${members.length} members · ${docs.length} docs`}
        onBack={() => navigation.goBack()}
        scroll={false}
        contentStyle={styles.sessionContent}
        actions={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconButton icon="exit-to-app" iconColor={paperTheme.colors.error} onPress={handleLeave} accessibilityLabel="Leave room" />
          </View>
        }
      >
        <ExpressiveCard style={styles.timerCard} tone="low">
          <Text variant="labelMedium" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>Shared timer</Text>
          <Text variant="headlineSmall" style={{ fontWeight: "900", color: paperTheme.colors.primary, marginVertical: 4 }}>{timerLabel}</Text>
          <View style={styles.timerActions}>
            <Button compact mode="outlined" onPress={() => syncTimer("running", localElapsed)}>Start</Button>
            <Button compact mode="outlined" onPress={() => syncTimer("paused", localElapsed)}>Pause</Button>
            <Button compact mode="outlined" onPress={() => { setLocalElapsed(0); syncTimer("idle", 0); }}>Reset</Button>
          </View>
        </ExpressiveCard>

        <View style={styles.chatModeRow}>
          <SegmentedButtons
            value={chatMode}
            onValueChange={(v) => setChatMode(v as "group" | "ai")}
            buttons={[
              { value: "group", label: "Group" },
              { value: "ai", label: "AI tutor" },
            ]}
            style={{ marginHorizontal: 12, marginBottom: 8 }}
          />
        </View>

        {chatMode === "ai" ? (
          <FlatList
            data={aiMessages}
            keyExtractor={(_, i) => `ai-${i}`}
            inverted
            contentContainerStyle={styles.chat}
            ListEmptyComponent={
              <View style={{ transform: [{ scaleY: -1 }] }}>
                <ExpressiveEmptyState icon="robot-outline" title="AI tutor" subtitle="Ask anything about your room topic." />
              </View>
            }
            renderItem={({ item }) => {
              const isUser = item.role === "user";
              return (
                <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: isUser ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant,
                        borderBottomRightRadius: isUser ? 6 : 22,
                        borderBottomLeftRadius: isUser ? 22 : 6,
                      },
                    ]}
                  >
                    {isUser ? (
                      <Text style={{ color: paperTheme.colors.onPrimary, lineHeight: 20 }}>{item.text}</Text>
                    ) : (
                      <MarkdownRenderer content={item.text} />
                    )}
                  </View>
                </View>
              );
            }}
            ListFooterComponent={aiLoading ? (
              <View style={[styles.msgRow, { paddingVertical: 8 }]}>
                <View style={[styles.bubble, { backgroundColor: paperTheme.colors.surfaceVariant, flexDirection: "row", alignItems: "center", gap: 6 }]}>
                  <ActivityIndicator size={14} />
                  <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>Thinking…</Text>
                </View>
              </View>
            ) : null}
          />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            inverted
            contentContainerStyle={styles.chat}
            ListEmptyComponent={
              <View style={{ transform: [{ scaleY: -1 }] }}>
                <ExpressiveEmptyState icon="message-text-outline" title="Say hi" subtitle="Start the room conversation." />
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.user?.id === myUserId || item.userId === myUserId;
              return (
                <View style={[styles.msgRow, isMe && styles.msgRowUser]}>
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: isMe ? paperTheme.colors.primary : paperTheme.colors.surfaceVariant,
                        borderBottomRightRadius: isMe ? 6 : 22,
                        borderBottomLeftRadius: isMe ? 22 : 6,
                      },
                    ]}
                  >
                    {!isMe && item.user?.name && (
                      <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 2 }}>{item.user.name}</Text>
                    )}
                    <Text style={{ color: isMe ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface, lineHeight: 20 }}>
                      {item.text ?? item.content}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {docs.length > 0 && (
          <ExpressiveCard style={styles.docsCard} tone="low">
            <Text variant="labelMedium" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 4 }}>Shared docs</Text>
            {docs.map((d: any) => (
              <Text key={d.id} variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>· {d.title}</Text>
            ))}
          </ExpressiveCard>
        )}

        {room.isOwner && (
          <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 12, marginBottom: 8 }}>
            <Button compact mode="outlined" icon="file-document-plus" onPress={() => setShowShareDoc(true)}>
              Share doc
            </Button>
            <Button compact mode="outlined" icon="cog" onPress={() => { setTimerDurationMin(String(Math.round(timerState.duration / 60))); setShowTimerConfig(true); }}>
              Timer config
            </Button>
          </View>
        )}

        {members.length > 0 && (
          <ExpressiveCard style={styles.docsCard} tone="low">
            <Text variant="labelMedium" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 8 }}>Members</Text>
            {members.map((m: any) => {
              const isMe = m.userId === myUserId;
              const canManage = room.isOwner && !isMe;
              return (
                <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <View style={[styles.statusDot, { backgroundColor: m.isOnline ? "#22C55E" : paperTheme.colors.outlineVariant }]} />
                  <Text variant="bodyMedium" style={{ flex: 1, color: paperTheme.colors.onSurface, fontWeight: isMe ? "700" : "400" }}>
                    {m.user?.name ?? m.name ?? "User"} {isMe ? "(you)" : ""}
                  </Text>
                  <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>{m.role}</Text>
                  {canManage && (
                    <Pressable onPress={() => handleUpdateRole(m, m.role === "cohost" ? "member" : "cohost")} hitSlop={8}>
                      <Icon name={m.role === "cohost" ? "arrow-down" : "arrow-up"} size={16} color={paperTheme.colors.primary} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ExpressiveCard>
        )}

        <View
          style={[
            styles.composer,
            {
              backgroundColor: paperTheme.colors.surface,
              paddingBottom: insets.bottom + 8,
              borderTopColor: paperTheme.colors.outlineVariant,
            },
          ]}
        >
          <TextInput
            mode="outlined"
            value={text}
            onChangeText={setText}
            placeholder="Message…"
            style={[styles.input, { backgroundColor: paperTheme.colors.surfaceVariant }]}
            outlineStyle={{ borderRadius: SHAPE.pill }}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            right={
              <TextInput.Icon
                icon={sending ? "loading" : "send"}
                color={text.trim() && !sending ? paperTheme.colors.primary : paperTheme.colors.onSurfaceVariant}
                onPress={handleSend}
                disabled={sending || !text.trim()}
              />
            }
          />
        </View>

        <Portal>
          <Modal visible={showShareDoc} onDismiss={() => setShowShareDoc(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
            <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Share document</Text>
            {allDocs.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant }}>No documents to share.</Text>
            ) : (
              <View style={{ gap: 8, maxHeight: 300 }}>
                {allDocs.map((doc: any) => (
                  <Pressable
                    key={doc.id}
                    onPress={() => setSelectedDocId(doc.id)}
                    style={[styles.docRow, { backgroundColor: selectedDocId === doc.id ? paperTheme.colors.primary + "18" : paperTheme.colors.surfaceVariant, borderRadius: SHAPE.md }]}
                  >
                    <Icon name="file-document-outline" size={18} color={paperTheme.colors.onSurface} />
                    <Text variant="bodyMedium" style={{ flex: 1, color: paperTheme.colors.onSurface }}>{doc.title}</Text>
                    {selectedDocId === doc.id && <Icon name="check" size={18} color={paperTheme.colors.primary} />}
                  </Pressable>
                ))}
              </View>
            )}
            <Button mode="contained" onPress={handleShareDoc} disabled={!selectedDocId} style={{ marginTop: 16 }}>
              Share
            </Button>
          </Modal>
          <Modal visible={showTimerConfig} onDismiss={() => setShowTimerConfig(false)} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
            <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 16 }}>Timer duration</Text>
            <TextInput
              mode="outlined" label="Duration (minutes)" keyboardType="number-pad"
              value={timerDurationMin} onChangeText={setTimerDurationMin}
              style={{ marginBottom: 16 }}
            />
            <Button mode="contained" onPress={handleTimerConfig}>Apply</Button>
          </Modal>
        </Portal>
      </ExpressiveScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sessionContent: { flex: 1, paddingHorizontal: 0, paddingBottom: 0 },
  timerCard: { marginHorizontal: 12, marginBottom: 8 },
  timerActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  chatModeRow: { paddingHorizontal: 12, paddingTop: 8 },
  chat: { paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  msgRow: { flexDirection: "row" },
  msgRowUser: { justifyContent: "flex-end" },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22 },
  docsCard: { marginHorizontal: 12, marginBottom: 8 },
  composer: { paddingTop: 10, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  input: { borderRadius: SHAPE.pill },
  modal: { margin: 16, padding: 24, borderRadius: 26 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
