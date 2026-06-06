import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput as RNTextInput } from "react-native";
import { Text, useTheme, ActivityIndicator } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { CHAT_MESSAGES, CREATE_CHAT_SESSION, STREAM_CHAT_MESSAGE, CHAT_STREAM } from "../../graphql/queries/chat";
import Icon from "../../components/Icon";
import { ExpressiveEmptyState } from "../../components/expressive";
import { GroqModelId, getGroqModelConfig, getGroqModelString } from "../../types/groq-models";
import ChatOptionsSheet from "./ChatOptionsSheet";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatSessionScreen() {
  const paperTheme = useTheme();
  const c = paperTheme.colors as any;
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { sessionId } = route.params;

  const isNew = sessionId === "new";
  const [realSessionId, setRealSessionId] = useState<string | null>(isNew ? null : sessionId);
  const activeSessionId = realSessionId ?? "new";

  const { data, loading, refetch } = useQuery(CHAT_MESSAGES, {
    variables: { sessionId: activeSessionId },
    skip: !realSessionId,
    fetchPolicy: "network-only",
  });

  const [createSession] = useMutation(CREATE_CHAT_SESSION);
  const [streamMessage, { loading: streaming }] = useMutation(STREAM_CHAT_MESSAGE);
  const [text, setText] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [pendingUserText, setPendingUserText] = useState("");
  const [selectedModel, setSelectedModel] = useState<GroqModelId>("auto");
  const [researchMode, setResearchMode] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [inputContentHeight, setInputContentHeight] = useState(20);
  const hasStreaming = streamingText.length > 0;
  const sending = streaming;
  const currentModel = getGroqModelConfig(selectedModel);

  useSubscription(CHAT_STREAM, {
    variables: { sessionId: activeSessionId },
    skip: !realSessionId,
    shouldResubscribe: true,
    onData: ({ data: result }) => {
      const d = result?.data?.chatStream;
      if (!d) return;
      if (d.done) {
        setStreamingText("");
        setPendingUserText("");
        refetch();
      } else {
        setStreamingText(d.fullText ?? "");
      }
    },
    onError: (err) => {
      console.warn("[chat] CHAT_STREAM error", err);
    },
  });

  const messages = [...(data?.chatMessages ?? [])].reverse();

  const handleUploadFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      try {
        const textContent = await readAsStringAsync(file.uri);
        setText((prev) => {
          const sep = prev ? "\n" : "";
          return prev + `${sep}[File: ${file.name}]\n${textContent.substring(0, 10000)}`;
        });
      } catch {
        setText((prev) => {
          const sep = prev ? "\n" : "";
          return prev + `${sep}[Attached: ${file.name}]`;
        });
      }
    } catch (err) {
      console.warn("[chat] file picker error", err);
    }
  }, []);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setText("");

    try {
      let sid = realSessionId;

      if (!sid) {
        const { data: created, errors: createErrors } = await createSession({
          variables: { subjectId: "general" },
        });
        if (createErrors?.length || !created?.createChatSession?.id) {
          console.warn("[chat] createSession error", createErrors ?? "no id");
          setText(content);
          return;
        }
        sid = created.createChatSession.id;
        setRealSessionId(sid);
      }

      setPendingUserText(content);

      const { errors: streamErrors } = await streamMessage({
        variables: { sessionId: sid, content, model: getGroqModelString(selectedModel) },
      });
      if (streamErrors?.length) {
        console.warn("[chat] streamMessage error", streamErrors);
      }

      if (isNew && sid && sid !== sessionId) {
        navigation.replace("ChatSession", { sessionId: sid });
      }
    } catch (err) {
      console.warn("[chat] handleSend caught", err);
      setText(content);
    }
  };

  const allItems: any[] = [];
  if (hasStreaming) allItems.push({ _streaming: true, content: streamingText });
  if (pendingUserText) allItems.push({ _pending: true, content: pendingUserText });
  allItems.push(...messages);

  if (loading && !isNew)
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: c.surface ?? paperTheme.colors.background }]}
      >
        <ActivityIndicator />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.surfaceContainerLowest ?? paperTheme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: c.surfaceContainer ?? paperTheme.colors.surface,
            borderBottomColor: c.outlineVariant,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerChats}
          accessibilityLabel="Chats"
          accessibilityRole="button"
        >
          <Icon name="menu" size={22} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
        <Pressable
          onPress={() => setShowOptions(true)}
          style={styles.headerModel}
          accessibilityLabel="Change model"
          accessibilityRole="button"
        >
          <Icon name="robot" size={16} color={paperTheme.colors.primary} />
          <Text
            variant="labelSmall"
            style={[styles.headerModelText, { color: paperTheme.colors.primary }]}
            numberOfLines={1}
          >
            {currentModel.name.replace(" (Recommended)", "")}
          </Text>
          <Icon name="chevron-down" size={14} color={paperTheme.colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => navigation.replace("ChatSession", { sessionId: "new" })}
          style={styles.headerNewChat}
          accessibilityLabel="New chat"
          accessibilityRole="button"
        >
          <Icon name="plus" size={22} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
      </View>

      <FlatList
        data={allItems}
        keyExtractor={(_, i) => String(i)}
        inverted
        contentContainerStyle={styles.chatList}
        style={{ backgroundColor: c.surfaceContainerLowest ?? paperTheme.colors.background }}
        ListEmptyComponent={
          <View style={{ transform: [{ scaleY: -1 }], paddingTop: 40 }}>
            <ExpressiveEmptyState
              icon="robot"
              title="Start the conversation"
              subtitle="Ask for an explanation, a quiz, or a study plan."
            />
          </View>
        }
        renderItem={({ item }) => {
          if ("_pending" in item) {
            return (
              <View style={[styles.msgRow, styles.msgRowUser]}>
                <View style={{ maxWidth: "80%" }}>
                  <View
                    style={[
                      styles.bubble,
                      styles.bubbleSent,
                      {
                        backgroundColor:
                          c.primaryContainer ?? paperTheme.colors.primaryContainer,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: c.onPrimaryContainer ?? paperTheme.colors.onPrimary,
                        fontSize: 15,
                        lineHeight: 21,
                      }}
                    >
                      {item.content}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }
          if ("_streaming" in item) {
            return (
              <Text style={{ color: paperTheme.colors.onSurface, fontSize: 15, lineHeight: 22, paddingHorizontal: 16, marginBottom: 8 }}>
                {item.content}
                <Text style={{ color: paperTheme.colors.primary }}>▌</Text>
              </Text>
            );
          }

          const isUser = item.role === "user";
          if (isUser) {
            return (
              <View style={[styles.msgRow, styles.msgRowUser]}>
                <View style={{ maxWidth: "80%" }}>
                  <View
                    style={[
                      styles.bubble,
                      styles.bubbleSent,
                      {
                        backgroundColor:
                          c.primaryContainer ?? paperTheme.colors.primaryContainer,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: c.onPrimaryContainer ?? paperTheme.colors.onPrimary,
                        fontSize: 15,
                        lineHeight: 21,
                      }}
                    >
                      {item.content}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.timestamp,
                      styles.timestampRight,
                      { color: paperTheme.colors.onSurfaceVariant },
                    ]}
                  >
                    {item.createdAt ? formatTime(item.createdAt) : ""}
                  </Text>
                </View>
              </View>
            );
          }
          return (
            <Text style={{ color: paperTheme.colors.onSurface, fontSize: 15, lineHeight: 22, paddingHorizontal: 16, marginBottom: 8 }}>
              {item.content}
            </Text>
          );
        }}
      />

      <View
        style={[
          styles.composer,
          {
            backgroundColor: c.surfaceContainer ?? paperTheme.colors.surface,
            paddingBottom: insets.bottom + 4,
            borderTopColor: c.outlineVariant,
          },
        ]}
      >
        <View
          style={[
            styles.composerInner,
            { backgroundColor: c.surfaceContainerHigh ?? paperTheme.colors.surfaceVariant },
          ]}
        >
          <Pressable
            onPress={() => setShowOptions(true)}
            style={styles.composerOptionsBtn}
            accessibilityLabel="Chat options"
            accessibilityRole="button"
          >
            <Icon name="tune" size={16} color={paperTheme.colors.onSurfaceVariant} />
          </Pressable>
          <RNTextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={paperTheme.colors.onSurfaceVariant}
            multiline
            onContentSizeChange={(e) => {
              const h = e.nativeEvent.contentSize.height;
              if (h > 0) setInputContentHeight(Math.min(h, MAX_INPUT_HEIGHT));
            }}
            style={[
              styles.input,
              { color: paperTheme.colors.onSurface, height: Math.min(inputContentHeight, MAX_INPUT_HEIGHT) },
            ]}
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !text.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  text.trim() && !sending ? paperTheme.colors.primary : "transparent",
              },
            ]}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            {sending ? (
              <ActivityIndicator size={16} color={paperTheme.colors.onPrimary} />
            ) : (
              <Icon
                name="send"
                size={16}
                color={text.trim() ? paperTheme.colors.onPrimary : paperTheme.colors.onSurfaceVariant}
              />
            )}
          </Pressable>
        </View>
      </View>

      <ChatOptionsSheet
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        researchMode={researchMode}
        onToggleResearch={setResearchMode}
        onUploadFile={handleUploadFile}
      />
    </KeyboardAvoidingView>
  );
}

const MAX_INPUT_HEIGHT = 120;

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  headerChats: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerModel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerModelText: {
    fontWeight: "600",
  },
  headerNewChat: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  chatList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },

  msgRow: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 8,
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },

  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bubbleSent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },

  timestamp: {
    fontSize: 11,
    marginTop: 3,
    marginHorizontal: 4,
  },
  timestampRight: {
    textAlign: "right",
  },

  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  composerInner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 4,
    overflow: "hidden",
  },
  composerOptionsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: MAX_INPUT_HEIGHT,
    backgroundColor: "transparent",
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
