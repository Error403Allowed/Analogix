import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Alert } from "react-native";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery as useApolloQuery } from "@apollo/client";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { CHAT_MESSAGES, CREATE_CHAT_SESSION, STREAM_CHAT_MESSAGE, CHAT_STREAM } from "../../../graphql/queries/chat";
import { SEARCH_RESEARCH, EXTRACT_TEXT, REEXPLAIN } from "../../../graphql/queries/ai";
import { GENERATE_FLASHCARDS } from "../../../graphql/queries/flashcard";
import { GENERATE_QUIZ } from "../../../graphql/queries/quiz";
import { SUBJECTS } from "../../../graphql/queries/subject";
import { ME } from "../../../graphql/queries/user";
import { FORMULA_SHEETS } from "../../../graphql/queries/misc";
import { usePythonExecution } from "../../../hooks/usePythonExecution";
import { GroqModelId, getGroqModelString } from "../../../types/groq-models";

interface AttachedFile {
  name: string;
  mimeType: string;
  extractedText: string;
  uri: string;
  isImage: boolean;
}

export function useChatSession(route: any, navigation: any) {
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
  const [generateFlashcards] = useMutation(GENERATE_FLASHCARDS);
  const [generateQuiz] = useMutation(GENERATE_QUIZ);

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

  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const { data: subjectsData } = useQuery(SUBJECTS);
  const allSubjects: { id: string; name: string; icon?: string }[] = subjectsData?.subjects ?? [];
  const currentSubjectId = route.params?.subjectId ?? "general";
  const currentSubject = allSubjects.find(s => s.id === currentSubjectId);
  const filteredSubjects = subjectSearch
    ? allSubjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase()))
    : allSubjects;

  const [reExplainMessageId, setReExplainMessageId] = useState<string | null>(null);
  const [reExplainingId, setReExplainingId] = useState<string | null>(null);

  const [researchSources, setResearchSources] = useState<any[]>([]);

  const [showFormulaPanel, setShowFormulaPanel] = useState(false);
  const [formulaSearch, setFormulaSearch] = useState("");
  const { data: formulaData } = useQuery(FORMULA_SHEETS);
  const formulaSheets: any[] = useMemo(() => formulaData?.formulaSheets ?? [], [formulaData]);
  const currentFormulaSheet = useMemo(() => {
    return formulaSheets.find((s: any) => s.subjectId === currentSubjectId) ?? null;
  }, [formulaSheets, currentSubjectId]);

  const [generatingFromFiles, setGeneratingFromFiles] = useState(false);

  const messages = [...(data?.chatMessages ?? [])].reverse();

  const pyExec = usePythonExecution();

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
    const prevUserIdx = lastAssistantIdx + 1;
    if (prevUserIdx >= messages.length || messages[prevUserIdx]?.role !== "user") return;

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

  return {
    // State
    realSessionId,
    isNew,
    loading,
    text,
    setText,
    hasStreaming,
    sending,
    selectedModel,
    setSelectedModel,
    researchMode,
    setResearchMode,
    showOptions,
    setShowOptions,
    inputContentHeight,
    setInputContentHeight,
    attachedFiles,
    analogyModeEnabled,
    setAnalogyModeEnabled,
    showSubjectPicker,
    setShowSubjectPicker,
    subjectSearch,
    setSubjectSearch,
    reExplainMessageId,
    setReExplainMessageId,
    reExplainingId,
    researchSources,
    showFormulaPanel,
    setShowFormulaPanel,
    formulaSearch,
    setFormulaSearch,
    generatingFromFiles,
    userData,
    allSubjects,
    currentSubjectId,
    currentSubject,
    filteredSubjects,
    currentFormulaSheet,
    messages,
    allItems,
    userHobbies,
    userHobbyIds,
    // Handlers
    handleRunCode,
    handleRegenerate,
    handleReExplain,
    handleGenerateFromFiles,
    handleUploadFile,
    removeAttachedFile,
    handleSend,
  };
}
