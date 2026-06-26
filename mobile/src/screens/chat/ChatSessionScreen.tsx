import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput as RNTextInput, Alert, Modal } from "react-native";
import { Text, useTheme, ActivityIndicator, Searchbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { CHAT_MESSAGES, CREATE_CHAT_SESSION, STREAM_CHAT_MESSAGE, CHAT_STREAM } from "../../graphql/queries/chat";
import { SEARCH_RESEARCH, EXTRACT_TEXT, REEXPLAIN } from "../../graphql/queries/ai";
import { GENERATE_FLASHCARDS } from "../../graphql/queries/flashcard";
import { GENERATE_QUIZ } from "../../graphql/queries/quiz";
import FormulaRenderer from "../../components/FormulaRenderer";
import { SUBJECTS } from "../../graphql/queries/subject";
import Icon from "../../components/Icon";
import { ReadAloudButton } from "../../components/ReadAloudButton";
import { MarkdownRenderer } from "../../components/MarkdownRenderer";
import { ThinkingBlock } from "../../components/ThinkingBlock";
import { parseThinkingBlock } from "../../utils/parseThinkingBlock";
import { usePythonExecution } from "../../hooks/usePythonExecution";
import { ChatQuickActions } from "../../components/ChatQuickActions";
import { GroqModelId, getGroqModelConfig, getGroqModelString } from "../../types/groq-models";
import ChatOptionsSheet from "./ChatOptionsSheet";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { useQuery as useApolloQuery } from "@apollo/client";
import { ME } from "../../graphql/queries/user";
import { FORMULA_SHEETS } from "../../graphql/queries/misc";

interface AttachedFile {
  name: string;
  mimeType: string;
  extractedText: string;
  uri: string;
  isImage: boolean;
}

function extractFileName(text: string): string | null {
  const match = text.match(/^\[File: (.+?)\]/);
  return match ? match[1] : null;
}

function FileChip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return (
    <View style={styles.fileChip}>
      <Icon name="description" size={14} color="#6366f1" />
      <Text style={styles.fileChipText} numberOfLines={1}>{name}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Icon name="close" size={14} color="#999" />
        </Pressable>
      )}
    </View>
  );
}

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Greeting({ name }: { name: string }) {
  const paperTheme = useTheme();
  const displayName = name?.split(" ")[0] ?? "there";
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 120 }}>
      <Text style={{ fontSize: 26, fontWeight: "700", color: paperTheme.colors.onSurface, textAlign: "center", lineHeight: 34 }}>
        What can I help with?
      </Text>
      <Text style={{ fontSize: 14, color: paperTheme.colors.onSurfaceVariant, textAlign: "center", marginTop: 10, lineHeight: 20 }}>
        Ask me anything — I'm here to help you learn.
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 28, flexWrap: "wrap", justifyContent: "center" }}>
        {["Explain a concept", "Make a quiz", "Study plan", "Simplify this"].map((suggestion) => (
          <Pressable key={suggestion}
            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: paperTheme.colors.surfaceVariant }}
          >
            <Text style={{ fontSize: 13, color: paperTheme.colors.onSurfaceVariant }}>{suggestion}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
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
  const [searchResearch] = useMutation(SEARCH_RESEARCH);
  const [extractText] = useMutation(EXTRACT_TEXT);
  const [reexplain] = useMutation(REEXPLAIN);
  const [text, setText] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [pendingUserText, setPendingUserText] = useState("");
  const [selectedModel, setSelectedModel] = useState<GroqModelId>("auto");
  const [researchMode, setResearchMode] = useState(false);
  const { data: userData } = useApolloQuery(ME);
  const userHobbies: string[] = useMemo(() => userData?.me?.hobbies ?? [], [userData]);
  const userHobbyIds: string[] = useMemo(() => userData?.me?.hobbyIds ?? [], [userData]);

  const [showOptions, setShowOptions] = useState(false);
  const [inputContentHeight, setInputContentHeight] = useState(20);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [analogyModeEnabled, setAnalogyModeEnabled] = useState(true);
  const hasStreaming = streamingText.length > 0;
  const sending = streaming;
  const currentModel = getGroqModelConfig(selectedModel);

  // Subject picker
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const { data: subjectsData } = useQuery(SUBJECTS);
  const allSubjects: { id: string; name: string; icon?: string }[] = subjectsData?.subjects ?? [];
  const currentSubjectId = route.params?.subjectId ?? "general";
  const currentSubject = allSubjects.find(s => s.id === currentSubjectId);
  const filteredSubjects = subjectSearch
    ? allSubjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase()))
    : allSubjects;

  // Re-explain anchor picker
  const [reExplainMessageId, setReExplainMessageId] = useState<string | null>(null);
  const [reExplainingId, setReExplainingId] = useState<string | null>(null);

  // Research sources
  const [researchSources, setResearchSources] = useState<any[]>([]);

  // Formula panel
  const [showFormulaPanel, setShowFormulaPanel] = useState(false);
  const [formulaSearch, setFormulaSearch] = useState("");
  const { data: formulaData } = useQuery(FORMULA_SHEETS);
  const formulaSheets: any[] = useMemo(() => formulaData?.formulaSheets ?? [], [formulaData]);
  const currentFormulaSheet = useMemo(() => {
    return formulaSheets.find((s: any) => s.subjectId === currentSubjectId) ?? null;
  }, [formulaSheets, currentSubjectId]);

  // Generate from files
  const [generateFlashcards] = useMutation(GENERATE_FLASHCARDS);
  const [generateQuiz] = useMutation(GENERATE_QUIZ);
  const [generatingFromFiles, setGeneratingFromFiles] = useState(false);

  const messages = [...(data?.chatMessages ?? [])].reverse();

  const pyExec = usePythonExecution();

  const findAnchor = useCallback((text: string): string | null => {
    if (!analogyModeEnabled || userHobbyIds.length === 0) return null;
    const lower = text.toLowerCase();
    const matched = userHobbyIds.find((h) => lower.includes(h.toLowerCase()));
    return matched || null;
  }, [analogyModeEnabled, userHobbyIds]);

  const handleRunCode = useCallback((code: string) => {
    Alert.alert("Execute Python", "Run this code?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Run",
        onPress: async () => {
          const result = await pyExec.executeCode(code);
          if (result) {
            let msg = "";
            if (result.stdout) msg += `Stdout:\n${result.stdout}\n\n`;
            if (result.stderr) msg += `Stderr:\n${result.stderr}\n\n`;
            if (result.error) msg += `Error:\n${result.error}\n\n`;
            msg += `Duration: ${result.durationMs}ms`;
            Alert.alert("Execution Result", msg.trim());
          } else if (pyExec.error) {
            Alert.alert("Execution Error", pyExec.error);
          }
        },
      },
    ]);
  }, [pyExec]);

  const handleRegenerate = useCallback(async () => {
    if (sending) return;
    const lastAssistantIdx = messages.findIndex(m => m.role === "assistant");
    if (lastAssistantIdx === -1) return;
    const target = messages[lastAssistantIdx];
    const prevUserIdx = lastAssistantIdx + 1;
    if (prevUserIdx >= messages.length || messages[prevUserIdx]?.role !== "user") return;

    const history = messages.slice(prevUserIdx + 1).map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      setPendingUserText(messages[prevUserIdx].content);
      setStreamingText("");
      const { errors: streamErrors } = await streamMessage({
        variables: { sessionId: realSessionId, content: messages[prevUserIdx].content, model: getGroqModelString(selectedModel) },
      });
      if (streamErrors?.length) {
        console.warn("[chat] regenerate stream error", streamErrors);
      }
    } catch (err) {
      console.warn("[chat] regenerate error", err);
    }
  }, [sending, messages, realSessionId, selectedModel, streamMessage]);

  const handleReExplain = useCallback(async (messageId: string, anchor?: string) => {
    if (sending) return;
    const target = messages.find(m => m.id === messageId);
    if (!target || target.role !== "assistant") return;

    setReExplainMessageId(null);
    setReExplainingId(messageId);

    try {
      const { data: result } = await reexplain({
        variables: {
          input: {
            text: target.content,
            style: anchor || "simpler",
            anchor: anchor || undefined,
          },
        },
      });
      const explanation = result?.reexplain?.text;
      if (explanation) {
        setStreamingText(explanation);
      }
    } catch (err) {
      console.warn("[chat] re-explain error", err);
    } finally {
      setReExplainingId(null);
    }
  }, [sending, messages, reexplain]);

  const handleGenerateFromFiles = useCallback(async (type: "flashcards" | "quiz") => {
    if (attachedFiles.length === 0 || generatingFromFiles) return;
    setGeneratingFromFiles(true);
    try {
      const combinedText = attachedFiles.map(f => f.extractedText).join("\n\n").substring(0, 12000);
      if (type === "flashcards") {
        const { data } = await generateFlashcards({
          variables: { input: { text: combinedText, subjectId: currentSubjectId, count: 10 } },
        });
        if (data?.generateFlashcards) {
          Alert.alert("Flashcards Created", `${data.generateFlashcards.length} flashcards generated from your files.`, [
            { text: "OK" },
            { text: "View Flashcards", onPress: () => navigation.navigate("Study", { screen: "Flashcards" }) },
          ]);
        }
      } else {
        const { data } = await generateQuiz({
          variables: { input: { text: combinedText, subjectId: currentSubjectId, difficulty: "intermediate", questionCount: 8 } },
        });
        if (data?.generateQuiz) {
          Alert.alert("Quiz Created", `"${data.generateQuiz.title}" with ${data.generateQuiz.questions?.length} questions.`, [
            { text: "OK" },
            { text: "Take Quiz", onPress: () => navigation.navigate("Study", { screen: "Quiz" }) },
          ]);
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to generate from files.");
    } finally {
      setGeneratingFromFiles(false);
    }
  }, [attachedFiles, generatingFromFiles, generateFlashcards, generateQuiz, currentSubjectId, navigation]);

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

  const handleUploadFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const isImage = file.mimeType?.startsWith("image/") ?? false;
      try {
        const raw = await readAsStringAsync(file.uri, { encoding: "base64" });
        const { data: extracted } = await extractText({
          variables: { input: { base64: raw, fileName: file.name, mimeType: file.mimeType ?? "text/plain" } },
        });
        const textContent = extracted?.extractText?.text ?? "";
        setAttachedFiles(prev => [...prev, {
          name: file.name,
          mimeType: file.mimeType ?? "text/plain",
          extractedText: textContent.substring(0, 10000),
          uri: file.uri,
          isImage,
        }]);
      } catch {
        try {
          const textContent = await readAsStringAsync(file.uri);
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            mimeType: file.mimeType ?? "text/plain",
            extractedText: textContent.substring(0, 10000),
            uri: file.uri,
            isImage,
          }]);
        } catch {
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            mimeType: file.mimeType ?? "text/plain",
            extractedText: "",
            uri: file.uri,
            isImage,
          }]);
        }
      }
    } catch (err) {
      console.warn("[chat] file picker error", err);
    }
  }, [extractText]);

  const removeAttachedFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setText("");

    try {
      let sid = realSessionId;
      let messageContent = content;

      if (researchMode) {
        const { data: researchData } = await searchResearch({
          variables: { input: { query: content, limit: 8 } },
        });
        const sources = researchData?.searchResearch?.sources ?? [];
        if (sources.length > 0) {
          setResearchSources(sources);
          const sourceBlock = sources
            .slice(0, 8)
            .map((s: any, i: number) => `[${i + 1}] ${s.title}${s.authors ? ` (${s.authors})` : ""}${s.year ? `, ${s.year}` : ""}${s.url ? `\n${s.url}` : ""}`)
            .join("\n\n");
          messageContent = `${content}\n\nResearch sources:\n${sourceBlock}`;
        } else {
          setResearchSources([]);
        }
      } else {
        setResearchSources([]);
      }

      if (!sid) {
        const { data: created, errors: createErrors } = await createSession({
          variables: { subjectId: route.params?.subjectId ?? "general" },
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
      setAttachedFiles([]);

      let augmentedContent = messageContent;
      if (attachedFiles.length > 0) {
        const fileList = attachedFiles.map(f => `- ${f.name}`).join("\n");
        const fileContents = attachedFiles.map(f =>
          `--- ${f.name} ---\n${f.extractedText}`
        ).join("\n\n");
        augmentedContent = `${messageContent}\n\n[Attached files]\n${fileList}\n\n[File contents]\n${fileContents}`;
      }

      const anchor = findAnchor(content);
      if (anchor) {
        augmentedContent += `\n\n[Analogy anchor: ${anchor}]`;
      }

      const { errors: streamErrors } = await streamMessage({
        variables: { sessionId: sid, content: augmentedContent, model: getGroqModelString(selectedModel) },
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
      style={{ flex: 1, backgroundColor: paperTheme.colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 4,
            backgroundColor: "transparent",
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.headerSide}
          accessibilityLabel="Back to chats"
          accessibilityRole="button"
        >
          <Icon name="chevron-left" size={22} color={paperTheme.colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => setShowSubjectPicker(true)}
          style={[styles.modelPill, { backgroundColor: c.surfaceContainerHigh ?? paperTheme.colors.surfaceVariant + "80" }]}
        >
          <Icon name="school" size={13} color={paperTheme.colors.primary} />
          <Text variant="labelSmall" style={{ fontWeight: "600", color: paperTheme.colors.primary }} numberOfLines={1}>
            {currentSubject?.name ?? "General"}
          </Text>
          <Icon name="chevron-down" size={11} color={paperTheme.colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("Profile", { screen: "PersonalityEditor" })}
          style={styles.headerSide}
          accessibilityLabel="AI Personality"
        >
          <Icon name="robot" size={18} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("Profile", { screen: "MemoryManager" })}
          style={styles.headerSide}
          accessibilityLabel="Memory"
        >
          <Icon name="brain" size={18} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
        <Pressable
          onPress={() => navigation.replace("ChatSession", { sessionId: "new" })}
          style={styles.headerSide}
        >
          <Icon name="plus" size={20} color={paperTheme.colors.onSurfaceVariant} />
        </Pressable>
      </View>

      <FlatList
        data={allItems}
        keyExtractor={(_, i) => String(i)}
        inverted
        contentContainerStyle={styles.chatList}
        style={{ backgroundColor: "transparent" }}
        ListEmptyComponent={
          <View style={{ transform: [{ scaleY: -1 }], flex: 1 }}>
            <Greeting name={userData?.me?.name ?? userData?.me?.email ?? ""} />
          </View>
        }
        renderItem={({ item }) => {
          if ("_pending" in item) {
            return (
              <View style={[styles.msgRow, styles.msgRowUser]}>
                <View style={{ maxWidth: "78%" }}>
                  <View style={[styles.bubbleUser, { backgroundColor: paperTheme.colors.primary }]}>
                    <Text style={{ color: paperTheme.colors.onPrimary, fontSize: 15, lineHeight: 21 }}>
                      {item.content}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }
          if ("_streaming" in item) {
            const parsed = parseThinkingBlock(item.content, false);
            return (
              <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                {parsed.thinking && <ThinkingBlock content={parsed.thinking} />}
                {parsed.response ? (
                  <MarkdownRenderer content={parsed.response} onRunCode={handleRunCode} />
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: paperTheme.colors.primary }}>
                    <View style={{ position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: paperTheme.colors.primary, opacity: 0.4 }} />
                  </View>
                  <Text style={{ fontSize: 12, color: paperTheme.colors.onSurfaceVariant, fontWeight: "500" }}>Streaming response...</Text>
                </View>
              </View>
            );
          }

          const isUser = item.role === "user";
          if (isUser) {
            const attachMatch = item.content.match(/^\[Attached files\]([\s\S]*?)\n\n\[File contents\][\s\S]*/);
            const userMsg = attachMatch
              ? item.content.replace(/^\[Attached files\][\s\S]*?\[File contents\][\s\S]*/, "").trim()
              : item.content;
            const fileNames = attachMatch
              ? item.content.match(/^\[Attached files\]\n((?:- .+\n?)*)/)?.[1]
                  ?.split("\n")
                  .map((l: string) => l.replace(/^- /, "").trim())
                  .filter(Boolean) ?? []
              : [];
            return (
              <View style={[styles.msgRow, styles.msgRowUser]}>
                <View style={{ maxWidth: "78%" }}>
                  {fileNames.length > 0 && (
                    <View style={[styles.fileRow, { justifyContent: "flex-end" }]}>
                      {fileNames.map((name: string, i: number) => (
                        <FileChip key={i} name={name} />
                      ))}
                    </View>
                  )}
                  <View style={[styles.bubbleUser, { backgroundColor: paperTheme.colors.primary }]}>
                    <Text style={{ color: paperTheme.colors.onPrimary, fontSize: 15, lineHeight: 21 }}>
                      {userMsg}
                    </Text>
                  </View>
                  {item.createdAt && (
                    <Text style={[styles.timestamp, styles.timestampRight, { color: paperTheme.colors.onSurfaceVariant }]}>
                      {formatTime(item.createdAt)}
                    </Text>
                  )}
                </View>
              </View>
            );
          }
          const parsed = parseThinkingBlock(item.content, true);
          const isLastAssistant = messages.length > 0 && messages[0]?.id === item.id && item.role === "assistant";
          const isReExplaining = reExplainingId === item.id;
          const responseTime =
            item.role === "assistant" && item.createdAt
              ? (() => {
                  const idx = messages.findIndex(m => m.id === item.id);
                  const prev = idx >= 0 && idx < messages.length - 1 ? messages[idx + 1] : null;
                  if (prev?.role === "user" && prev.createdAt) {
                    return Math.max(
                      1,
                      Math.round(
                        (new Date(item.createdAt).getTime() - new Date(prev.createdAt).getTime()) / 1000,
                      ),
                    );
                  }
                  return null;
                })()
              : null;
          return (
            <Pressable
              onLongPress={() => setReExplainMessageId(item.id)}
              style={{ marginBottom: 4 }}
            >
              <View style={styles.assistantMsg}>
                {parsed.thinking && <ThinkingBlock content={parsed.thinking} />}
                {parsed.response ? (
                  <MarkdownRenderer content={parsed.response} onRunCode={handleRunCode} />
                ) : null}
              </View>
              <View style={styles.assistantActions}>
                <ReadAloudButton text={parsed.response || parsed.thinking || ""} size={15} />
                {isLastAssistant && !hasStreaming && (
                  <Pressable
                    onPress={handleRegenerate}
                    disabled={sending}
                    style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 1 : 0.5 }]}
                  >
                    <Icon name="refresh" size={13} color={paperTheme.colors.onSurfaceVariant} />
                  </Pressable>
                )}
                {responseTime !== null ? (
                  <Text style={{ fontSize: 11, color: paperTheme.colors.onSurfaceVariant }}>
                    {responseTime}s
                  </Text>
                ) : item.createdAt ? (
                  <Text style={{ fontSize: 11, color: paperTheme.colors.onSurfaceVariant }}>
                    {formatTime(item.createdAt)}
                  </Text>
                ) : null}
                {isReExplaining && (
                  <ActivityIndicator size={12} color={paperTheme.colors.primary} style={{ marginLeft: 4 }} />
                )}
              </View>
              {researchSources.length > 0 && isLastAssistant && (
                <View style={styles.researchSourcesContainer}>
                  <Text variant="labelSmall" style={[styles.researchLabel, { color: paperTheme.colors.onSurfaceVariant }]}>
                    Research Sources
                  </Text>
                  {researchSources.slice(0, 5).map((source: any, i: number) => (
                    <View key={source.id ?? i} style={[styles.researchCard, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
                      <Text variant="labelSmall" style={{ fontWeight: "600", color: paperTheme.colors.onSurface }} numberOfLines={2}>
                        {source.title}
                      </Text>
                      {(source.authors || source.year) && (
                        <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 2 }}>
                          {[source.authors, source.year].filter(Boolean).join(", ")}
                        </Text>
                      )}
                      {source.url && (
                        <Text variant="labelSmall" style={{ color: paperTheme.colors.primary, marginTop: 2 }} numberOfLines={1}>
                          {source.url}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
              <ChatQuickActions content={parsed.response} />
            </Pressable>
          );
        }}
      />

        <View
          style={[
            styles.composer,
            {
              paddingBottom: insets.bottom + 4,
            },
          ]}
        >
          {attachedFiles.length > 0 && (
            <View style={styles.fileChipRow}>
              {attachedFiles.map((f, i) => (
                <FileChip key={i} name={f.name} onRemove={() => removeAttachedFile(i)} />
              ))}
              <View style={styles.fileActions}>
                <Pressable
                  style={({ pressed }) => [styles.fileActionBtn, { borderColor: paperTheme.colors.primary, opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => handleGenerateFromFiles("flashcards")}
                  disabled={generatingFromFiles}
                >
                  {generatingFromFiles ? (
                    <ActivityIndicator size={10} color={paperTheme.colors.primary} />
                  ) : (
                    <Text variant="labelSmall" style={{ color: paperTheme.colors.primary }}>Flashcards</Text>
                  )}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.fileActionBtn, { borderColor: paperTheme.colors.primary, opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => handleGenerateFromFiles("quiz")}
                  disabled={generatingFromFiles}
                >
                  {generatingFromFiles ? (
                    <ActivityIndicator size={10} color={paperTheme.colors.primary} />
                  ) : (
                    <Text variant="labelSmall" style={{ color: paperTheme.colors.primary }}>Quiz</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
          <View style={styles.composerWrap}>
            <View style={[styles.composerPill, { backgroundColor: c.surfaceContainerHigh ?? paperTheme.colors.surfaceVariant }]}>
              <Pressable
                onPress={() => setShowOptions(true)}
                style={styles.composerAttach}
                accessibilityLabel="Attach or configure"
              >
                <Icon name="plus" size={20} color={paperTheme.colors.onSurfaceVariant} />
              </Pressable>
              <RNTextInput
                value={text}
                onChangeText={setText}
                placeholder="Ask anything..."
                placeholderTextColor={paperTheme.colors.onSurfaceVariant}
                multiline
                onContentSizeChange={(e) => {
                  const h = e.nativeEvent.contentSize.height;
                  if (h > 0) setInputContentHeight(Math.min(h, MAX_INPUT_HEIGHT));
                }}
                style={[
                  styles.input,
                  { color: paperTheme.colors.onSurface, height: Math.min(inputContentHeight, MAX_INPUT_HEIGHT) },
                  Platform.OS === "web" ? ({ outline: "none" } as any) : {},
                ]}
              />
              <Pressable
                onPress={handleSend}
                disabled={sending || !text.trim()}
                style={[
                  styles.composerSend,
                  {
                    backgroundColor: text.trim() && !sending ? paperTheme.colors.primary : "transparent",
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator size={18} color={text.trim() ? paperTheme.colors.onPrimary : paperTheme.colors.onSurfaceVariant} />
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
        </View>

      <ChatOptionsSheet
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        researchMode={researchMode}
        onToggleResearch={setResearchMode}
        analogyMode={analogyModeEnabled}
        onToggleAnalogy={setAnalogyModeEnabled}
        onUploadFile={handleUploadFile}
        onOpenFormulas={currentFormulaSheet ? () => { setShowOptions(false); setShowFormulaPanel(true); } : undefined}
        onOpenPersonality={() => { setShowOptions(false); navigation.navigate("Profile", { screen: "PersonalityEditor" }); }}
        onOpenMemory={() => { setShowOptions(false); navigation.navigate("Profile", { screen: "MemoryManager" }); }}
      />

      {/* Subject Picker */}
      <Modal visible={showSubjectPicker} animationType="slide" onRequestClose={() => setShowSubjectPicker(false)} transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>Select Subject</Text>
              <Pressable onPress={() => setShowSubjectPicker(false)} style={styles.closeBtn}>
                <Icon name="close" size={22} color={paperTheme.colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <Searchbar
              placeholder="Search subjects..."
              value={subjectSearch}
              onChangeText={setSubjectSearch}
              style={{ marginBottom: 12, borderRadius: 16 }}
              inputStyle={{ fontSize: 14 }}
            />
            <FlatList
              data={filteredSubjects}
              keyExtractor={s => s.id}
              renderItem={({ item: s }) => (
                <Pressable
                  style={[styles.subjectRow, { backgroundColor: s.id === currentSubjectId ? paperTheme.colors.primaryContainer : "transparent" }]}
                  onPress={() => {
                    navigation.setParams({ subjectId: s.id });
                    setShowSubjectPicker(false);
                    setSubjectSearch("");
                  }}
                >
                  <Icon name={s.icon || "book"} size={20} color={paperTheme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={{ flex: 1, marginLeft: 12 }}>{s.name}</Text>
                  {s.id === currentSubjectId && <Icon name="check" size={18} color={paperTheme.colors.primary} />}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Re-explain Anchor Picker */}
      <Modal visible={reExplainMessageId !== null} animationType="slide" onRequestClose={() => setReExplainMessageId(null)} transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: paperTheme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>Explain differently</Text>
              <Pressable onPress={() => setReExplainMessageId(null)} style={styles.closeBtn}>
                <Icon name="close" size={22} color={paperTheme.colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Anchor the explanation to an interest for a personalised analogy.
            </Text>
            <Pressable
              style={[styles.anchorRow, { backgroundColor: paperTheme.colors.surfaceVariant }]}
              onPress={() => reExplainMessageId && handleReExplain(reExplainMessageId)}
            >
              <Icon name="dice" size={20} color={paperTheme.colors.primary} />
              <Text variant="bodyMedium" style={{ flex: 1, marginLeft: 12, fontWeight: "600" }}>Surprise me</Text>
            </Pressable>
            {userHobbies.map((hobby: string) => (
              <Pressable
                key={hobby}
                style={[styles.anchorRow, { backgroundColor: paperTheme.colors.surfaceVariant }]}
                onPress={() => reExplainMessageId && handleReExplain(reExplainMessageId, hobby)}
              >
                <Text variant="bodyMedium" style={{ flex: 1 }}>{hobby}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Formula Panel */}
      <Modal visible={showFormulaPanel} animationType="slide" onRequestClose={() => setShowFormulaPanel(false)} transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: paperTheme.colors.surface, maxHeight: "70%" }]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>
                {currentFormulaSheet?.subjectName ?? "Formulas"}
              </Text>
              <Pressable onPress={() => setShowFormulaPanel(false)} style={styles.closeBtn}>
                <Icon name="close" size={22} color={paperTheme.colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <Searchbar
              placeholder="Search formulas..."
              value={formulaSearch}
              onChangeText={setFormulaSearch}
              style={{ marginBottom: 12, borderRadius: 16 }}
              inputStyle={{ fontSize: 14 }}
            />
            <FlatList
              data={(() => {
                if (!currentFormulaSheet) return [];
                const query = formulaSearch.trim().toLowerCase();
                const allFormulas = currentFormulaSheet.categories?.flatMap((c: any) => c.formulas ?? []) ?? [];
                if (query) {
                  return allFormulas.filter((f: any) =>
                    f.name?.toLowerCase().includes(query) ||
                    f.description?.toLowerCase().includes(query) ||
                    f.category?.toLowerCase().includes(query)
                  );
                }
                return allFormulas;
              })()}
              keyExtractor={(f: any) => f.id}
              renderItem={({ item: formula }: any) => (
                <View style={[styles.formulaCard, { backgroundColor: paperTheme.colors.surfaceVariant }]}>
                  {formula.category && (
                    <Text variant="labelSmall" style={{ color: paperTheme.colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {formula.category}
                    </Text>
                  )}
                  <Text variant="bodyMedium" style={{ fontWeight: "600", marginTop: 2 }}>{formula.name}</Text>
                  {formula.latex && (
                    <FormulaRenderer math={formula.latex} minHeight={32} style={{ marginTop: 4 }} />
                  )}
                  {formula.description && (
                    <Text variant="bodySmall" style={{ color: paperTheme.colors.onSurfaceVariant, marginTop: 4 }}>
                      {formula.description}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
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
    paddingBottom: 4,
    height: 52,
  },
  headerSide: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },

  chatList: {
    flex: 1,
    paddingHorizontal: 4,
    paddingTop: 4,
  },

  msgRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  msgRowUser: {
    justifyContent: "flex-end",
    paddingRight: 12,
  },

  bubbleUser: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 6,
  },

  assistantMsg: {
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  assistantActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 6,
    marginBottom: 6,
    gap: 8,
  },

  timestamp: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 4,
  },
  timestampRight: {
    textAlign: "right",
  },

  fileRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 4,
  },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "rgba(99,102,241,0.1)",
    borderWidth: 1,
    borderColor: "rgba(99,102,241,0.2)",
    maxWidth: 160,
  },
  fileChipText: {
    fontSize: 11,
    color: "#6366f1",
    flex: 1,
  },
  fileChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },

  composer: {
    paddingTop: 4,
  },
  composerWrap: {
    paddingHorizontal: 12,
  },
  composerPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
    gap: 4,
  },
  composerAttach: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: MAX_INPUT_HEIGHT,
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  composerSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  fileActions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  fileActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },

  researchSourcesContainer: {
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  researchLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  researchCard: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  anchorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  formulaCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
});
