import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, StyleSheet, FlatList, KeyboardAvoidingView, Platform,
  Pressable, Modal, ScrollView, ActionSheetIOS, Alert,
} from "react-native";
import { Text, useTheme, ActivityIndicator, TextInput, Button, SegmentedButtons, Snackbar } from "react-native-paper";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import { CHAT_MESSAGES, CHAT_STREAM, STREAM_CHAT_MESSAGE } from "../../graphql/queries/chat";
import { ME, UPDATE_AI_PERSONALITY, USER_STATS } from "../../graphql/queries/user";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useThemeContext } from "../../theme/ThemeContext";
import { SHAPE } from "../../theme/tokens";
import { useScreenSize } from "../../hooks/useResponsive";
import { AI_MODELS, type AiModel } from "../../utils/models";
import Icon from "../../components/Icon";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  pending?: boolean;
}

interface AttachedFile {
  name: string;
  content: string;
  type: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function readFileAsBase64(uri: string): Promise<string> {
  try {
    return await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  } catch {
    return "";
  }
}

async function pickFiles(): Promise<AttachedFile[]> {
  try {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (result.canceled) return [];
    const files: AttachedFile[] = [];
    for (const asset of result.assets ?? []) {
      if (asset.size && asset.size > MAX_FILE_SIZE) {
        Alert.alert("File too large", `${asset.name} exceeds the 10 MB limit.`);
        continue;
      }
      const content = await readFileAsBase64(asset.uri);
      files.push({ name: asset.name, content, type: asset.mimeType ?? "application/octet-stream" });
    }
    return files;
  } catch {
    return [];
  }
}

async function pickImage(): Promise<AttachedFile[]> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, base64: true });
    if (result.canceled) return [];
    return result.assets.map((a) => ({
      name: a.fileName ?? "image.jpg",
      content: a.base64 ?? "",
      type: a.mimeType ?? "image/jpeg",
    }));
  } catch {
    return [];
  }
}

function modelForId(id: string): AiModel {
  return AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[2];
}

const MODEL_STORAGE_KEY = "analogix_chat_model";

function loadSavedModel(): string {
  try { return localStorage.getItem(MODEL_STORAGE_KEY) ?? "llama-3.3-70b"; } catch { return "llama-3.3-70b"; }
}

function saveModelId(id: string) {
  try { localStorage.setItem(MODEL_STORAGE_KEY, id); } catch {}
}

export default function ChatSessionScreen() {
  const paperTheme = useTheme();
  const { brand } = useThemeContext();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { sessionId, title } = route.params;
  const size = useScreenSize();
  const isCompact = size === "compact";

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(loadSavedModel());
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const listRef = useRef<FlatList<UiMessage>>(null);

  const [showPersonalitySheet, setShowPersonalitySheet] = useState(false);
  const [editTone, setEditTone] = useState("friendly");
  const [editFocus, setEditFocus] = useState("balanced");
  const [editVerbosity, setEditVerbosity] = useState(50);
  const [editCreativity, setEditCreativity] = useState(50);
  const [personalitySnack, setPersonalitySnack] = useState<string | null>(null);

  const { data: meData } = useQuery(ME);
  const { data: statsData } = useQuery(USER_STATS);
  const personality = meData?.me?.aiPersonality;
  const memoryCount = statsData?.userStats?.memories?.length ?? 0;

  const [updateAiPersonality, { loading: savingPersonality }] = useMutation(UPDATE_AI_PERSONALITY);

  const openPersonalitySheet = useCallback(() => {
    setEditTone(personality?.tone ?? "friendly");
    setEditFocus(personality?.focus ?? "balanced");
    setEditVerbosity(personality?.verbosity ?? 50);
    setEditCreativity(personality?.creativity ?? 50);
    setShowPersonalitySheet(true);
  }, [personality]);

  const savePersonality = useCallback(async () => {
    try {
      await updateAiPersonality({
        variables: { input: { tone: editTone, focus: editFocus, verbosity: editVerbosity, creativity: editCreativity } },
      });
      setPersonalitySnack("Personality saved");
      setShowPersonalitySheet(false);
    } catch {
      setPersonalitySnack("Save failed");
    }
  }, [editTone, editFocus, editVerbosity, editCreativity, updateAiPersonality]);

  const [streamMessage] = useMutation(STREAM_CHAT_MESSAGE);

  const messagesQuery = useQuery(CHAT_MESSAGES, {
    variables: { sessionId, limit: 200 },
    skip: !sessionId,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    if (messagesQuery.data?.chatMessages) {
      setMessages(
        messagesQuery.data.chatMessages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      );
    }
  }, [messagesQuery.data]);

  useSubscription(CHAT_STREAM, {
    variables: { sessionId },
    skip: !sessionId || !streaming,
    shouldResubscribe: true,
    onData: ({ data: { data: subData } }) => {
      const token = subData?.chatStream?.token ?? "";
      const done = subData?.chatStream?.done;
      if (done) {
        setStreaming(false);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            return [...prev.slice(0, -1), { ...last, streaming: false }];
          }
          return prev;
        });
      } else if (token) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && (last.streaming || last.pending)) {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + token, streaming: true, pending: false },
            ];
          }
          return [...prev, { id: "streaming", role: "assistant", content: token, streaming: true }];
        });
      }
    },
    onError: () => {
      setStreaming(false);
    },
  });

  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && attachedFiles.length === 0) || streaming) return;

    let fullContent = text;
    if (attachedFiles.length > 0) {
      const fileSection = attachedFiles
        .map((f) => `[Attached: ${f.name}]\n${f.content}`)
        .join("\n\n");
      fullContent = text ? `${text}\n\n${fileSection}` : fileSection;
    }

    setInput("");
    setAttachedFiles([]);

    const m = modelForId(selectedModel);
    const apiModel = m.apiModel === "auto" ? undefined : m.apiModel;

    const userMsg: UiMessage = { id: `user-${Date.now()}`, role: "user", content: fullContent };
    const placeholder: UiMessage = { id: `pending-${Date.now()}`, role: "assistant", content: "", pending: true };
    setMessages((prev) => [...prev, userMsg, placeholder]);
    setStreaming(true);

    try {
      await streamMessage({ variables: { sessionId, content: fullContent, model: apiModel } });
    } catch {
      setMessages((prev) => {
        const withoutPending = prev[prev.length - 1]?.pending ? prev.slice(0, -1) : prev;
        return [...withoutPending, { id: `err-${Date.now()}`, role: "assistant", content: "Sorry, the AI service is unavailable." }];
      });
      setStreaming(false);
    }
  }, [input, attachedFiles, streaming, sessionId, selectedModel, streamMessage]);

  const handlePickFiles = async () => {
    const files = await pickFiles();
    if (files.length > 0) setAttachedFiles((prev) => [...prev, ...files]);
  };

  const handlePickImage = async () => {
    const files = await pickImage();
    if (files.length > 0) setAttachedFiles((prev) => [...prev, ...files]);
  };

  const handleAttach = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Photos", "Files"], cancelButtonIndex: 0 },
        (i) => { if (i === 1) handlePickImage(); if (i === 2) handlePickFiles(); }
      );
    } else {
      setShowAttachPicker(true);
    }
  };

  const currentModel = modelForId(selectedModel);
  const canSend = input.trim().length > 0 || attachedFiles.length > 0;

  const renderMessage = ({ item }: { item: UiMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: `${brand.primary}18` }]}>
            <Icon name="lightning-bolt" size={13} color={brand.primary} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: brand.primary, borderBottomRightRadius: 4 }
              : { backgroundColor: paperTheme.colors.surface, borderBottomLeftRadius: 4 },
            !isUser && paperTheme.dark && { backgroundColor: paperTheme.colors.surfaceVariant },
          ]}
        >
          {item.pending ? (
            <View style={styles.typingRow}>
              <ActivityIndicator size={10} color={paperTheme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, marginLeft: 8 }}>
                Thinking
              </Text>
            </View>
          ) : (
            <Text
              variant="bodyMedium"
              style={{
                color: isUser ? "#fff" : paperTheme.colors.onSurface,
                lineHeight: 22,
              }}
              selectable
            >
              {item.content}
              {item.streaming && <Text style={{ opacity: 0.5 }}>▍</Text>}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: paperTheme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={[styles.header, { borderBottomColor: paperTheme.colors.outline + "40" }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Icon name="arrow-left" size={22} color={paperTheme.colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text variant="titleSmall" style={{ fontWeight: "700" }} numberOfLines={1}>
            {title ?? "Tutor"}
          </Text>
          <Text variant="labelSmall" style={{ color: streaming ? brand.primary : paperTheme.colors.onSurfaceVariant }}>
            {streaming ? "Typing\u2026" : currentModel.name}
          </Text>
        </View>
        <Pressable
          onPress={() => setShowModelPicker(true)}
          style={[styles.modelBadge, { backgroundColor: `${brand.primary}12` }]}
        >
          <Text variant="labelSmall" style={{ color: brand.primary, fontWeight: "700" }}>
            {currentModel.id === "auto" ? "Auto" : currentModel.name.split(" ").pop()}
          </Text>
        </Pressable>
        <Pressable
          onPress={openPersonalitySheet}
          style={[styles.personalityBadge, { backgroundColor: `${brand.tertiary}18` }]}
        >
          <Icon name="lightning-bolt" size={13} color={brand.tertiary} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={renderMessage}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: `${brand.primary}12` }]}>
              <Icon name="lightning-bolt" size={26} color={brand.primary} />
            </View>
            <Text variant="titleMedium" style={{ fontWeight: "700", marginTop: 10 }}>
              Ask me anything
            </Text>
            <Text variant="bodyMedium" style={{ color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 4, paddingHorizontal: 40 }}>
              I can help you study, explain concepts, quiz you, or just chat.
            </Text>
          </View>
        }
      />

      {attachedFiles.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.attachStrip}
        >
          {attachedFiles.map((f, i) => (
            <View key={i} style={[styles.attachChip, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
              <Icon name="paperclip" size={12} color={paperTheme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" numberOfLines={1} style={{ maxWidth: 90, marginHorizontal: 4 }}>
                {f.name}
              </Text>
              <Pressable onPress={() => setAttachedFiles((prev) => prev.filter((_, j) => j !== i))} hitSlop={6}>
                <Icon name="close-circle" size={14} color={paperTheme.colors.onSurfaceVariant} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={[styles.footer, { backgroundColor: paperTheme.colors.surface }]}>
        <View style={[styles.inputBar, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
          <Pressable onPress={handleAttach} hitSlop={8} style={styles.iconBtn}>
            <Icon name="paperclip" size={20} color={paperTheme.colors.onSurfaceVariant} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={attachedFiles.length > 0 ? "Add a message\u2026" : "Ask a question\u2026"}
            placeholderTextColor={paperTheme.colors.onSurfaceVariant + "99"}
            mode="flat"
            multiline
            style={styles.input}
            contentStyle={styles.inputContent}
            underlineStyle={{ display: "none" }}
            onSubmitEditing={send}
            maxLength={4000}
          />
          <Pressable
            onPress={send}
            disabled={!canSend || streaming}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: canSend && !streaming ? brand.primary : paperTheme.colors.surfaceVariant },
              pressed && { opacity: 0.7 },
            ]}
          >
            {streaming ? (
              <ActivityIndicator size={14} color="#fff" />
            ) : (
              <Icon
                name="send"
                size={16}
                color={canSend ? "#fff" : paperTheme.colors.onSurfaceVariant}
              />
            )}
          </Pressable>
        </View>
      </View>

      <Modal visible={showModelPicker} transparent animationType="slide" onRequestClose={() => setShowModelPicker(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowModelPicker(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: paperTheme.colors.surface }]}>
            <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 8, paddingHorizontal: 4 }}>
              Choose model
            </Text>
            {AI_MODELS.map((m) => {
              const active = selectedModel === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => { setSelectedModel(m.id); saveModelId(m.id); setShowModelPicker(false); }}
                  style={[styles.modelRow, active && { backgroundColor: `${brand.primary}10` }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: active ? "700" : "500" }}>
                      {m.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 1 }}>
                      {m.description}
                    </Text>
                  </View>
                  {active && <Icon name="check-circle" size={20} color={brand.primary} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showAttachPicker} transparent animationType="fade" onRequestClose={() => setShowAttachPicker(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowAttachPicker(false)}>
          <Pressable style={[styles.sheetSmall, { backgroundColor: paperTheme.colors.surface }]}>
            <Pressable style={styles.actionRow} onPress={() => { setShowAttachPicker(false); handlePickFiles(); }}>
              <Icon name="file-document-outline" size={22} color={paperTheme.colors.onSurface} />
              <Text variant="bodyMedium" style={{ marginLeft: 14 }}>Attach files</Text>
            </Pressable>
            <View style={[styles.divider, { backgroundColor: paperTheme.colors.outline }]} />
            <Pressable style={styles.actionRow} onPress={() => { setShowAttachPicker(false); handlePickImage(); }}>
              <Icon name="image-outline" size={22} color={paperTheme.colors.onSurface} />
              <Text variant="bodyMedium" style={{ marginLeft: 14 }}>Photos</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showPersonalitySheet} transparent animationType="slide" onRequestClose={() => setShowPersonalitySheet(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowPersonalitySheet(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: paperTheme.colors.surface }]}>
            <Text variant="titleMedium" style={{ fontWeight: "800", marginBottom: 2, paddingHorizontal: 4 }}>
              AI Personality
            </Text>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 16, paddingHorizontal: 4 }}>
              {editTone} \u00B7 {editFocus}
            </Text>

            <Text variant="labelMedium" style={{ fontWeight: "700", marginBottom: 8 }}>Tone</Text>
            <View style={styles.toneRow}>
              {["friendly", "professional", "socratic", "playful", "concise"].map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setEditTone(t)}
                  style={[
                    styles.toneChip,
                    {
                      backgroundColor: editTone === t ? brand.primary : paperTheme.colors.surfaceVariant,
                      borderRadius: SHAPE.pill,
                    },
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    style={{ color: editTone === t ? "#fff" : paperTheme.colors.onSurface, fontWeight: "700" }}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text variant="labelMedium" style={{ fontWeight: "700", marginTop: 16, marginBottom: 8 }}>Focus</Text>
            <SegmentedButtons
              value={editFocus}
              onValueChange={setEditFocus}
              buttons={[
                { value: "balanced", label: "Balanced" },
                { value: "exam-prep", label: "Exam" },
                { value: "deep-understanding", label: "Deep" },
                { value: "memorization", label: "Memorize" },
              ]}
              style={{ marginBottom: 16 }}
            />

            <View style={styles.sliderRow}>
              <View style={{ flex: 1 }}>
                <Text variant="labelSmall" style={{ fontWeight: "600", marginBottom: 4 }}>Verbosity: {editVerbosity}</Text>
                <View style={styles.barRow}>
                  {[0, 25, 50, 75, 100].map((v) => (
                    <Pressable
                      key={v}
                      onPress={() => setEditVerbosity(v)}
                      style={[
                        styles.barSeg,
                        {
                          backgroundColor: editVerbosity >= v ? brand.primary : paperTheme.colors.surfaceVariant,
                          borderRadius: SHAPE.sm,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
              <View style={{ width: 16 }} />
              <View style={{ flex: 1 }}>
                <Text variant="labelSmall" style={{ fontWeight: "600", marginBottom: 4 }}>Creativity: {editCreativity}</Text>
                <View style={styles.barRow}>
                  {[0, 25, 50, 75, 100].map((v) => (
                    <Pressable
                      key={v}
                      onPress={() => setEditCreativity(v)}
                      style={[
                        styles.barSeg,
                        {
                          backgroundColor: editCreativity >= v ? brand.tertiary : paperTheme.colors.surfaceVariant,
                          borderRadius: SHAPE.sm,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: paperTheme.colors.outline, marginVertical: 16 }]} />

            <View style={styles.memoryRow}>
              <Icon name="lightning-bolt" size={18} color={paperTheme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ marginLeft: 8, flex: 1 }}>
                {memoryCount > 0
                  ? `The AI remembers ${memoryCount} thing${memoryCount === 1 ? "" : "s"} about you`
                  : "No memories yet. Chat to build them."}
              </Text>
              <Pressable
                onPress={() => { setShowPersonalitySheet(false); navigation.navigate("Profile", { screen: "MemoryManager" }); }}
                hitSlop={8}
              >
                <Text variant="labelSmall" style={{ color: brand.primary, fontWeight: "700" }}>View</Text>
              </Pressable>
            </View>

            <Button
              mode="contained"
              buttonColor={brand.primary}
              onPress={savePersonality}
              loading={savingPersonality}
              style={{ borderRadius: SHAPE.xl, marginTop: 16 }}
            >
              Save
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      <Snackbar visible={!!personalitySnack} onDismiss={() => setPersonalitySnack(null)} duration={2000}>
        {personalitySnack ?? ""}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  modelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  list: { padding: 16, paddingTop: 8, gap: 10, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  rowUser: { justifyContent: "flex-end" },
  rowAssistant: { justifyContent: "flex-start" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  typingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  attachStrip: {
    paddingHorizontal: 14,
    paddingBottom: 6,
    gap: 6,
    flexDirection: "row",
  },
  attachChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingLeft: 6,
    paddingRight: 4,
    paddingVertical: 2,
    gap: 4,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "transparent",
    fontSize: 16,
    maxHeight: 100,
  },
  inputContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 36,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetSmall: {
    marginHorizontal: 20,
    marginBottom: 28,
    borderRadius: 16,
    overflow: "hidden",
  },
  modelRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginVertical: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  divider: { height: StyleSheet.hairlineWidth },
  personalityBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  toneRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  toneChip: { paddingHorizontal: 12, paddingVertical: 6 },
  sliderRow: { flexDirection: "row", alignItems: "flex-start" },
  barRow: { flexDirection: "row", gap: 4, marginBottom: 4 },
  barSeg: { flex: 1, height: 20 },
  memoryRow: { flexDirection: "row", alignItems: "center" },
});
