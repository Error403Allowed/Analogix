import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert, Pressable, ScrollView, Image } from "react-native";
import { Text, useTheme, ActivityIndicator, TextInput, Button, IconButton, Portal, Modal, SegmentedButtons } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  ROOM_DETAIL,
  ROOM_MESSAGES_SUB,
  SEND_ROOM_MESSAGE,
  LEAVE_ROOM,
  DELETE_ROOM,
  UPDATE_ROOM_TIMER,
  SHARE_DOCUMENT_TO_ROOM,
  ROOM_PRESENCE_STREAM,
  ROOM_TIMER_STREAM,
  UPDATE_ROOM_MEMBER_ROLE,
} from "../../graphql/queries/room";
import { DOCUMENTS, CREATE_DOCUMENT } from "../../graphql/queries/subject";
import { ME } from "../../graphql/queries/user";
import { TUTOR } from "../../graphql/queries/ai";
import { useAuth } from "../../context/AuthContext";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { ExpressiveCard, ExpressiveEmptyState, ExpressiveScreen } from "../../components/expressive";
import Icon from "../../components/Icon";
import { MarkdownRenderer } from "../../components/MarkdownRenderer";

export default function RoomDetailScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { roomId, name, initialData } = route.params || {};
  const { data: meData } = useQuery(ME);
  const { data, loading, error, refetch } = useQuery(ROOM_DETAIL, {
    variables: { id: roomId },
    skip: !roomId,
  });
  const [didRetry, setDidRetry] = useState(false);
  useEffect(() => {
    if (!loading && !data?.room && !error && !didRetry && roomId) {
      const t = setTimeout(() => { refetch(); setDidRetry(true); }, 1500);
      return () => clearTimeout(t);
    }
  }, [loading, data, error, didRetry, roomId, refetch]);
  const [sendMessage, { loading: sending }] = useMutation(SEND_ROOM_MESSAGE);
  const [leaveRoom] = useMutation(LEAVE_ROOM);
  const [deleteRoom] = useMutation(DELETE_ROOM);
  const [updateTimer] = useMutation(UPDATE_ROOM_TIMER);
  const [shareDoc] = useMutation(SHARE_DOCUMENT_TO_ROOM);
  const [updateRole] = useMutation(UPDATE_ROOM_MEMBER_ROLE);
  const [tutorMutation] = useMutation(TUTOR);
  const [createDocument] = useMutation(CREATE_DOCUMENT);
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
  const [editingTimer, setEditingTimer] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasTitle, setCanvasTitle] = useState("");
  const [canvasContent, setCanvasContent] = useState("");
  const [savingCanvas, setSavingCanvas] = useState(false);
  const [timerDurationMin, setTimerDurationMin] = useState("25");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [section, setSection] = useState<"chat" | "docs" | "members">("chat");

  const { data: docsData } = useQuery(DOCUMENTS);
  const allDocs = docsData?.documents ?? [];

  const syncTimer = useCallback(async (state: string, elapsedSeconds?: number) => {
    setTimerState((prev) => ({ ...prev, state }));
    await updateTimer({
      variables: {
        roomId,
        state,
        durationSeconds: timerState.duration,
        elapsedSeconds: elapsedSeconds ?? localElapsed,
      },
    });
  }, [localElapsed, roomId, timerState.duration, updateTimer]);

  const skipSub = !roomId;
  useSubscription(ROOM_MESSAGES_SUB, { variables: { roomId }, skip: skipSub, onData: () => refetch() });
  useSubscription(ROOM_PRESENCE_STREAM, { variables: { roomId }, skip: skipSub, onData: () => refetch() });
  useSubscription(ROOM_TIMER_STREAM, {
    variables: { roomId },
    skip: skipSub,
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
    const id = setInterval(() => {
      setLocalElapsed((e) => {
        const next = e + 1;
        if (next >= timerState.duration) {
          return timerState.duration;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerState.state, timerState.duration]);

  useEffect(() => {
    if (timerState.state === "running" && localElapsed >= timerState.duration) {
      syncTimer("paused", timerState.duration);
    }
  }, [localElapsed, syncTimer, timerState.state, timerState.duration]);

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
        const reply = data?.tutor?.text ?? "No response generated.";
        setAiMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      } catch {
        setAiMessages((prev) => [...prev, { role: "assistant", text: "Failed to get AI response." }]);
      } finally {
        setAiLoading(false);
      }
      return;
    }

    try {
      await sendMessage({
        variables: { roomId, content },
        refetchQueries: ["RoomDetail"],
      });
    } catch (e) {
      console.error("sendMessage failed:", e);
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

  const handleSaveCanvas = async () => {
    if (!canvasContent.trim()) {
      Alert.alert("Error", "Canvas content cannot be empty.");
      return;
    }
    setSavingCanvas(true);
    try {
      const { data } = await createDocument({
        variables: {
          input: {
            subjectId: room?.subject ?? "general",
            title: canvasTitle.trim() || "Canvas notes",
            content: canvasContent,
            role: "note",
          },
        },
      });
      setShowCanvas(false);
      setCanvasTitle("");
      setCanvasContent("");
      const doc = data?.createDocument;
      if (doc?.id) {
        navigation.navigate("DocumentEditor", { subjectId: doc.subjectId, documentId: doc.id });
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save canvas.");
    } finally {
      setSavingCanvas(false);
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

  const handleDeleteRoom = () => {
    Alert.alert("Delete room", "This will permanently delete the room for everyone. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRoom({ variables: { roomId } });
            navigation.goBack();
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Could not delete room.");
          }
        },
      },
    ]);
  };

  const room = data?.room ?? initialData ?? null;
  if (loading && !room) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={[styles.container, { backgroundColor: paperTheme.colors.background, alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <ExpressiveEmptyState icon="door-open" title="Room not found" subtitle="This room may have been deleted or you don't have access." />
      </View>
    );
  }
  const messages = [...(room?.messages ?? [])].reverse();
  const members = room?.members ?? [];
  const docs = room?.documents ?? [];
  const onlineCount = members.filter((m: any) => m.isOnline).length;
  const myUserId = meData?.me?.id ?? user?.id;
  const remaining = Math.max(0, timerState.duration - localElapsed);
  const timerLabel = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

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
            {room?.isOwner ? (
              <IconButton icon="delete" iconColor={paperTheme.colors.error} onPress={handleDeleteRoom} accessibilityLabel="Delete room" />
            ) : (
              <IconButton icon="exit-to-app" iconColor={paperTheme.colors.error} onPress={handleLeave} accessibilityLabel="Leave room" />
            )}
          </View>
        }
      >
        <ExpressiveCard style={styles.timerCard} tone="low">
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text variant="labelMedium" style={{ fontWeight: "700", color: paperTheme.colors.onSurface }}>Shared timer</Text>
            {(room?.isOwner || room?.viewerRole === "host" || room?.viewerRole === "cohost") && (
              <Pressable onPress={() => setEditingTimer(!editingTimer)} hitSlop={8}>
                <Icon name={editingTimer ? "close" : "pencil"} size={16} color={paperTheme.colors.primary} />
              </Pressable>
            )}
          </View>
          <Text variant="headlineSmall" style={{ fontWeight: "900", color: paperTheme.colors.primary, marginVertical: 4 }}>{timerLabel}</Text>
          {editingTimer && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <TextInput
                mode="outlined"
                value={timerDurationMin}
                onChangeText={setTimerDurationMin}
                keyboardType="number-pad"
                style={{ width: 80, height: 40 }}
                outlineStyle={{ borderRadius: SHAPE.md }}
              />
              <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant }}>min</Text>
              <Button
                compact
                mode="contained"
                buttonColor={brand.primary}
                onPress={() => {
                  const seconds = Math.max(60, parseInt(timerDurationMin, 10) || 25) * 60;
                  updateTimer({
                    variables: { roomId, state: timerState.state, durationSeconds: seconds, elapsedSeconds: localElapsed },
                  });
                  setEditingTimer(false);
                }}
              >
                Set
              </Button>
            </View>
          )}
          <View style={styles.timerActions}>
            <Button compact mode="outlined" onPress={() => syncTimer("running", localElapsed)}>Start</Button>
            <Button compact mode="outlined" onPress={() => syncTimer("paused", localElapsed)}>Pause</Button>
            <Button compact mode="outlined" onPress={() => { setLocalElapsed(0); syncTimer("idle", 0); }}>Reset</Button>
          </View>
        </ExpressiveCard>

        <View style={styles.sectionTabs}>
          <SegmentedButtons
            value={section}
            onValueChange={(v) => setSection(v as "chat" | "docs" | "members")}
            buttons={[
              { value: "chat", label: "Chat", icon: "message-text" },
              { value: "docs", label: "Docs", icon: "file-document" },
              { value: "members", label: "Members", icon: "account-group" },
            ]}
            style={{ marginHorizontal: 12, marginBottom: 8 }}
          />
        </View>

        <View style={styles.sectionContent}>
          {section === "chat" && (
            <View style={{ flex: 1 }}>
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

              <View style={styles.chatArea}>
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
                          {!isUser && (
                            <View style={[styles.avatar, { backgroundColor: brand.primary + "18" }]}>
                              <Icon name="robot" size={20} color={brand.primary} />
                            </View>
                          )}
                          <View style={{ flex: 1, alignItems: isUser ? "flex-end" : "flex-start" }}>
                            <Text
                              variant="labelSmall"
                              style={{
                                color: isUser ? brand.primary : paperTheme.colors.onSurfaceVariant,
                                fontWeight: "600", marginBottom: 2, marginHorizontal: 4,
                              }}
                            >
                              {isUser ? "You" : "AI Tutor"}
                            </Text>
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
                      const senderName = item.user?.name || item.name || (item.messageType === "ai" ? "AI Tutor" : "Unknown");
                      return (
                        <View style={[styles.msgRow, isMe && styles.msgRowUser]}>
                          {!isMe && (
                            <View style={styles.avatar}>
                              {item.user?.avatarUrl ? (
                                <Image source={{ uri: item.user.avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                              ) : (
                                <Icon name="account-circle" size={32} color={paperTheme.colors.onSurfaceVariant} />
                              )}
                            </View>
                          )}
                          <View style={{ flex: 1, alignItems: isMe ? "flex-end" : "flex-start" }}>
                            <Text
                              variant="labelSmall"
                              style={{
                                color: isMe ? brand.primary : paperTheme.colors.onSurfaceVariant,
                                fontWeight: "600", marginBottom: 2, marginHorizontal: 4,
                              }}
                            >
                              {isMe ? "You" : senderName.split(" ")[0]}
                            </Text>
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
                              <Text style={{ color: isMe ? paperTheme.colors.onPrimary : paperTheme.colors.onSurface, lineHeight: 20 }}>
                                {item.text ?? item.content}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    }}
                  />
                )}
              </View>

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
            </View>
          )}

          {section === "docs" && (
            <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.tabContentPad}>
              {docs.length > 0 ? (
                <ExpressiveCard style={styles.docsCard} tone="low">
                  <Text variant="labelMedium" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 10 }}>Shared documents</Text>
                  {docs.map((d: any) => (
                    <Pressable
                      key={d.id}
                      onPress={() => navigation.navigate("DocumentEditor", { documentId: d.documentId ?? d.id, subjectId: room.subject ?? "general" })}
                      style={({ pressed }) => [
                        styles.docItem,
                        { backgroundColor: pressed ? paperTheme.colors.surfaceVariant : "transparent" },
                      ]}
                    >
                      <Icon name="file-document-outline" size={18} color={paperTheme.colors.onSurfaceVariant} />
                      <Text variant="bodyMedium" style={{ flex: 1, color: paperTheme.colors.onSurface }}>{d.title}</Text>
                      <Icon name="chevron-right" size={18} color={paperTheme.colors.outlineVariant} />
                    </Pressable>
                  ))}
                </ExpressiveCard>
              ) : (
                <ExpressiveEmptyState icon="file-document-outline" title="No docs yet" subtitle="Share a document to get started." />
              )}

              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                {room?.isOwner && (
                  <Button compact mode="outlined" icon="file-document-plus" onPress={() => setShowShareDoc(true)}>Share doc</Button>
                )}
                <Button compact mode="outlined" icon="notebook" onPress={() => setShowCanvas(true)}>Canvas</Button>
              </View>
            </ScrollView>
          )}

          {section === "members" && (
            <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.tabContentPad}>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                <Button compact mode="outlined" icon="notebook" onPress={() => setShowCanvas(true)}>Canvas</Button>
              </View>

              <ExpressiveCard style={styles.docsCard} tone="low">
                <Text variant="labelMedium" style={{ fontWeight: "700", color: paperTheme.colors.onSurface, marginBottom: 8 }}>Members</Text>
                {members.map((m: any) => {
                  const isMe = m.userId === myUserId;
                  const canManage = room?.isOwner && !isMe;
                  return (
                    <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <View style={[styles.statusDot, { backgroundColor: m.isOnline ? "#22C55E" : paperTheme.colors.outlineVariant }]} />
                      <Text variant="bodyMedium" style={{ flex: 1, color: paperTheme.colors.onSurface, fontWeight: isMe ? "700" : "400" }}>
                        {m.user?.name ?? m.name ?? "User"} {isMe ? "(you)" : ""}
                      </Text>
                      <View style={[styles.roleBadge, { backgroundColor: m.role === "host" ? "#FBBF24" + "20" : m.role === "cohost" ? "#6366F1" + "20" : "transparent" }]}>
                        <Icon
                          name={m.role === "host" ? "crown" : m.role === "cohost" ? "shield-check" : "account"}
                          size={14}
                          color={m.role === "host" ? "#D97706" : m.role === "cohost" ? "#6366F1" : paperTheme.colors.onSurfaceVariant}
                        />
                      </View>
                      <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginLeft: 2 }}>{m.role}</Text>
                      {canManage && (
                        <Pressable onPress={() => handleUpdateRole(m, m.role === "cohost" ? "member" : "cohost")} hitSlop={8}>
                          <Icon name={m.role === "cohost" ? "arrow-down" : "arrow-up"} size={16} color={paperTheme.colors.primary} />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </ExpressiveCard>
            </ScrollView>
          )}
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
            <Button mode="contained" onPress={handleShareDoc} disabled={!selectedDocId} style={{ marginTop: 16 }}>Share</Button>
          </Modal>

          <Modal visible={showCanvas} onDismiss={() => { setShowCanvas(false); setCanvasTitle(""); setCanvasContent(""); }} contentContainerStyle={[styles.modal, { backgroundColor: paperTheme.colors.surface }]}>
            <Text variant="titleLarge" style={{ fontWeight: "700", marginBottom: 4 }}>New document</Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 16 }}>
              Will be saved to {(room?.subject ?? "general")} documents
            </Text>
            <TextInput mode="outlined" label="Title" value={canvasTitle} onChangeText={setCanvasTitle} placeholder="Canvas notes" style={{ marginBottom: 12 }} />
            <TextInput mode="outlined" label="Content" value={canvasContent} onChangeText={setCanvasContent} placeholder="Start writing..." multiline style={{ minHeight: 200, maxHeight: 350 }} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <Button mode="outlined" onPress={() => { setShowCanvas(false); setCanvasTitle(""); setCanvasContent(""); }} style={{ flex: 1, borderRadius: SHAPE.lg }}>Cancel</Button>
              <Button mode="contained" buttonColor={brand.primary} onPress={handleSaveCanvas} loading={savingCanvas} style={{ flex: 1, borderRadius: SHAPE.lg }}>Save</Button>
            </View>
          </Modal>
        </Portal>
      </ExpressiveScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sessionContent: { flex: 1, paddingHorizontal: 0, paddingBottom: 0 },
  timerCard: { marginHorizontal: 12, marginBottom: 6 },
  timerActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  sectionTabs: { paddingTop: 4 },
  sectionContent: { flex: 1, minHeight: 0 },
  sectionScroll: { flex: 1 },
  tabContentPad: { padding: 12, gap: 10, paddingBottom: 40 },
  chatModeRow: { paddingHorizontal: 12, paddingTop: 4 },
  chatArea: { flex: 1, minHeight: 0 },
  chat: { paddingHorizontal: 16, paddingTop: 12, gap: 6 },
  msgRow: { flexDirection: "row", gap: 8, paddingHorizontal: 4 },
  msgRowUser: { justifyContent: "flex-end" },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", alignSelf: "flex-end", marginBottom: 2 },
  bubble: { maxWidth: "78%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22 },
  docsCard: { marginHorizontal: 0, marginBottom: 0 },
  composer: { paddingTop: 10, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  input: { borderRadius: SHAPE.pill },
  modal: { margin: 16, padding: 24, borderRadius: 26 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  docItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  roleBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
