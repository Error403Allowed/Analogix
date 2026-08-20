"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useChat as useAIChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import {
  getAiCompletion,
  getReExplanation,
  generateFlashcards,
  generateChatTitle,
} from "@/services/ai";
import { searchAcademicSources } from "@/services/research";
import { flashcardStore } from "@/utils/flashcardStore";
import { statsStore } from "@/utils/statsStore";
import { chatStore, ChatSession, checkChatStoreHealth } from "@/utils/chatStore";
import { SUBJECT_CATALOG, SubjectId } from "@/constants/subjects";
import { buildInterestList, buildInterestsObject } from "@/utils/interests";
import type { ResearchSource } from "@/types/research";
import { normalizeGroqModelId, type GroqModelId } from "@/types/groq-models";
import type { Message } from "@/types/chat-message";
import { useChatScroll } from "./useChatScroll";
import { useFileAttachment } from "./useFileAttachment";
import { useChatSessions } from "./useChatSessions";
import type { PendingApproval } from "@/components/chat/ToolApprovalCard";
import { getToolAutoApproval } from "@/lib/chat-utils";
import { normalizeQuizQuestions } from "@/lib/quiz-normalize";
import {
  findAnchor, buildWelcomeMessage, cleanForDisplay, getLocalStorageData,
  detectSubjectFromMessage,
} from "@/lib/chat-utils";

const allSubjects = SUBJECT_CATALOG;

// Maximum consecutive approval-driven re-submissions per turn. See the
// autoSendRoundsRef comment in useChat() for why this bound exists.
const MAX_AUTO_SEND_ROUNDS = 8;

type ToolUIPartLike = {
  type: string;
  state?: string;
  text?: string;
  toolCallId?: string;
  input?: unknown;
  approval?: { id?: string };
};

const partsToText = (parts: unknown[]): string =>
  (parts ?? [])
    .filter((p) => p && typeof p === "object" && (p as ToolUIPartLike).type === "text")
    .map((p) => (p as ToolUIPartLike).text ?? "")
    .join("");

export function useChat() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(
    (searchParams?.get("subject") as SubjectId) || null
  );
  const [subjectDetecting, setSubjectDetecting] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const subjectPickerRef = useRef<HTMLDivElement>(null);

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "56px";
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 56), 300) + "px";
      textarea.style.height = newHeight;
    }
  }, [input]);

  const [analogyModeEnabled, setAnalogyModeEnabled] = useState(true);

  const [selectedModel, setSelectedModel] = useState<GroqModelId>(() => {
    if (typeof window === "undefined") return "auto";
    return normalizeGroqModelId(localStorage.getItem("selectedGroqModel"));
  });

  const [showModelSelector, setShowModelSelector] = useState(false);

  const [researchMode, setResearchMode] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);

  const [showAISettings, setShowAISettings] = useState(false);

  const [reExplainOpenId, setReExplainOpenId] = useState<string | null>(null);
  const [reExplainingId, setReExplainingId] = useState<string | null>(null);

  const [savingFlashcards, setSavingFlashcards] = useState(false);
  const [flashcardsSaved, setFlashcardsSaved] = useState(false);

  const [formulaPanelOpen, setFormulaPanelOpen] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [formulaSearch, setFormulaSearch] = useState("");

  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

  const [welcomeMessage, setWelcomeMessage] = useState<Message | null>(null);

  const userPrefs = useMemo(
    () =>
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
        : {},
    [],
  );
  const [hydratedUserName, setHydratedUserName] = useState<string>("");
  const userName = hydratedUserName || userPrefs.name || "";
  const userHobbies = useMemo(
    () => buildInterestList(userPrefs, ["gaming", "sports"]),
    [userPrefs],
  );
  const interestObject = useMemo(
    () => buildInterestsObject(userPrefs),
    [userPrefs],
  );
  const userSubjects = useMemo(
    () => (Array.isArray(userPrefs.subjects) ? userPrefs.subjects : []),
    [userPrefs],
  );
  const availableSubjects = useMemo(
    () => allSubjects.filter((subject) => userSubjects.includes(subject.id)),
    [userSubjects],
  );
  const availableSubjectIds = useMemo(
    () => new Set(availableSubjects.map((subject) => subject.id)),
    [availableSubjects],
  );

  const fileAttach = useFileAttachment({ selectedSubject, userSubjects, userPrefs, router });

  // ── AI SDK chat ──────────────────────────────────────────────────────────
  // The SDK owns the conversation stream + native tool approvals. App-level
  // messages are derived from its UIMessage[] state for rendering.
  const userContextRef = useRef<Record<string, unknown>>({});
  const attachmentsRef = useRef<Record<string, Message["attachments"]>>({});
  const turnRef = useRef<{
    sessionId: string | null;
    userInput: string;
    userContent: string;
    historyBefore: { role: string; content: string }[];
  } | null>(null);
  const isRegeneratingRef = useRef(false);

  // Cap the AI SDK's approval auto-send loop. After the client responds to a
  // write-tool approval, the SDK re-submits the conversation to execute the tool
  // and continue the turn; without a cap, a server response that keeps the last
  // step "complete with approvals" (e.g. a new write-tool call in each pushed
  // continuation) makes the client re-submit forever - a request storm that also
  // churns React state so fast it trips "Maximum update depth exceeded".
  const autoSendRoundsRef = useRef(0);

  // Guard: respond to each tool approval at most ONCE. Re-responding to an
  // approval whose part is no longer in the last message is a no-op that still
  // replaces the messages array, which re-runs this effect -> render loop.
  const autoApprovedIdsRef = useRef<Set<string>>(new Set());

  const latestSessionIdRef = useRef<string | null>(null);
  latestSessionIdRef.current = chatSessionId;

  const chat = useAIChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: () => ({ userContext: userContextRef.current }),
      headers: (): Record<string, string> => {
        const data = getLocalStorageData();
        if (!data) return {};
        return { "x-client-data": JSON.stringify(data) };
      },
    }),
    sendAutomaticallyWhen: (args: { messages: UIMessage[] }) => {
      if (!lastAssistantMessageIsCompleteWithApprovalResponses(args)) return false;
      autoSendRoundsRef.current += 1;
      return autoSendRoundsRef.current <= MAX_AUTO_SEND_ROUNDS;
    },
    onError: (err) => {
      console.warn("[Chat] AI SDK error:", err);
      const detail = err instanceof Error ? err.message : "";
      if (detail && detail !== "An error occurred.") {
        toast.error(`AI request failed: ${detail}`);
      } else {
        toast.error("Couldn't reach the AI service. You may have hit the daily limit, or your internet is down.");
      }
    },
    onFinish: async ({ message, messages: allUi, isAbort, isError }) => {
      const turn = turnRef.current;
      const sessionId = turn?.sessionId ?? latestSessionIdRef.current;
      const rawText = partsToText((message as UIMessage).parts as unknown[]);
      const text = cleanForDisplay(rawText);

      // Hand off a completed quiz tool result BEFORE the session-persistence
      // guard: a chatStore/session failure must never drop the quiz handoff.
      const quizPayload = extractQuizFromAssistantMessage(message as UIMessage);
      if (quizPayload && !isAbort && !isError) {
        sessionStorage.setItem("pendingQuiz", JSON.stringify(quizPayload));
        router.push("/quiz");
      }

      if (!sessionId || isAbort || isError || !text.trim()) {
        turnRef.current = null;
        return;
      }

      if (!isRegeneratingRef.current) {
        chatStore.addMessage(sessionId, "assistant", text).catch((e) =>
          console.error("[Chat] addMessage assistant:", e),
        );
        sessions.setAllSessions((prev) =>
          [...prev.map((s) => s.id === sessionId ? { ...s, updatedAt: new Date().toISOString() } : s)]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
        );
      }

      if (turn) {
        const historyForTitle = [...turn.historyBefore, { role: "user", content: turn.userContent }];
        const titleSourceMessages = allUi.map((m) => ({
          id: m.id,
          role: m.role,
          content: partsToText(m.parts as unknown[]),
        }));
        generateChatTitleIfNeeded(historyForTitle, titleSourceMessages, turn.userInput, sessionId);

        const lastUserMsg = turn.userContent.trim().toLowerCase();
        const isTrivialInput =
          lastUserMsg.length < 15 &&
          /^(hi|hello|hey|sup|yo|ok|k|lol|thanks?|bye|good\s?(morning|evening|afternoon)|what'?s up|how are you|\?)$/i.test(lastUserMsg);
        const shouldExtract = text.length >= 20 && !isTrivialInput && lastUserMsg.length >= 10;
        if (shouldExtract) {
          const messagesForExtraction = [
            ...historyForTitle,
            { role: "assistant", content: text },
          ];
          fetch("/api/ai/memory/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: messagesForExtraction, subjectId: selectedSubject }),
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d) console.log("[memory] extract result:", d);
            })
            .catch((err) => console.error("[memory] extract error:", err));
        }
      }

      turnRef.current = null;
    },
  });

  const {
    messages: uiMessages,
    sendMessage,
    regenerate,
    stop,
    status: chatStatus,
    error: chatError,
    setMessages: setUIMessages,
    addToolApprovalResponse,
  } = chat;

  void chatError;

  const isChatBusy = chatStatus === "submitted" || chatStatus === "streaming";

  // ── Derive app messages from SDK state ───────────────────────────────────
  const conversationMessages = useMemo<Message[]>(() => {
    let pendingSources: { sources?: ResearchSource[]; researchQuery?: string } | null = null;
    const out: Message[] = [];
    const lastAssistantId = [...uiMessages].reverse().find((m) => m.role === "assistant")?.id;
    for (const m of uiMessages) {
      const meta = (m as UIMessage & { metadata?: Record<string, unknown> }).metadata;
      if (m.role === "user" && meta && Array.isArray(meta.sources)) {
        pendingSources = {
          sources: meta.sources as ResearchSource[],
          researchQuery: typeof meta.researchQuery === "string" ? meta.researchQuery : undefined,
        };
      }
      let sources: ResearchSource[] | undefined;
      let researchQuery: string | undefined;
      if (m.role === "assistant" && pendingSources) {
        sources = pendingSources.sources;
        researchQuery = pendingSources.researchQuery;
        pendingSources = null;
      }
      out.push({
        id: m.id,
        role: m.role === "user" ? "user" : "assistant",
        content: cleanForDisplay(partsToText(m.parts as unknown[])),
        attachments: m.role === "user" ? attachmentsRef.current[m.id] : undefined,
        isStreaming:
          m.role === "assistant" &&
          isChatBusy &&
          m.id === lastAssistantId &&
          Array.isArray(m.parts) &&
          m.parts.length > 0,
        sources,
        researchQuery,
        analogy: typeof meta?.analogy === "string" ? meta.analogy : undefined,
      });
    }
    return out;
  }, [uiMessages, isChatBusy]);

  const messages: Message[] = useMemo(
    () => (welcomeMessage ? [welcomeMessage, ...conversationMessages] : conversationMessages),
    [welcomeMessage, conversationMessages],
  );

  const isTyping = isChatBusy;
  const streamingAssistant = useMemo(() => {
    const last = conversationMessages[conversationMessages.length - 1];
    return last && last.role === "assistant" && last.isStreaming ? last : null;
  }, [conversationMessages]);
  const streamingId = streamingAssistant?.id ?? null;
  const streamingContent = streamingAssistant?.content ?? "";

  const pendingApprovals = useMemo<PendingApproval[]>(() => {
    // Only approvals in the LAST assistant message are actionable: the SDK's
    // addToolApprovalResponse resolves against messages[messages.length - 1].
    // Approvals left dangling in earlier messages (e.g. an interrupted turn)
    // must not lock the input or be auto-responded forever.
    const lastAssistant = [...uiMessages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return [];
    const out: PendingApproval[] = [];
    for (const p of lastAssistant.parts as unknown[]) {
      const part = p as ToolUIPartLike;
      if (
        part && part.type?.startsWith("tool-") &&
        part.state === "approval-requested" && part.approval?.id
      ) {
        out.push({
          messageId: lastAssistant.id,
          approvalId: part.approval.id,
          toolCallId: part.toolCallId ?? lastAssistant.id,
          toolName: part.type.slice("tool-".length),
          input: part.input,
        });
      }
    }
    return out;
  }, [uiMessages]);

  const isInputLocked = isTyping || !!streamingId || pendingApprovals.length > 0;

  const latestAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastMessageRef = useRef<{ content: string; timestamp: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  abortRef.current = {
    abort: () => {
      void stop();
    },
  } as unknown as AbortController;

  const stopChat = useCallback(() => {
    void stop();
  }, [stop]);

  // ── Set app-level messages (used by session switching) ───────────────────
  const handleSetViewMessages = useCallback(
    (msgsOrFn: any[] | ((prev: any[]) => any[])) => {
      const msgs = typeof msgsOrFn === "function" ? msgsOrFn([]) : msgsOrFn;
      const welcome = (msgs ?? []).find((m: any) => m.isWelcome) ?? null;
      setWelcomeMessage(welcome ?? null);
      const history = (msgs ?? [])
        .filter((m: any) => !m.isWelcome)
        .map((m: any) => ({
          id: m.id || `msg-${Math.random().toString(36).slice(2)}`,
          role: m.role,
          parts: [{ type: "text", text: m.content ?? "" }],
        }));
      setUIMessages(history as UIMessage[]);
    },
    [setUIMessages],
  );

  // ── Sub-hooks ────────────────────────────────────────────────────────────
  const sessions = useChatSessions({
    setSelectedSubject,
    setMessages: handleSetViewMessages,
    setChatSessionId,
    setStreamingId: () => {},
    setStreamingContent: () => {},
    abortRef,
    allSubjects,
    userName,
    chatSessionId,
  });
  const { setAllSessions } = sessions;

  const scroll = useChatScroll(messages.length, streamingContent.length);

  const noopSetter = useCallback(() => {}, []);

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      if (prefs.name) setHydratedUserName(prefs.name);
    } catch { /* ignore localStorage errors */ }
  }, []);

  useEffect(() => {
    checkChatStoreHealth();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedGroqModel", selectedModel);
    }
  }, [selectedModel]);

  useEffect(() => {
    if (!reExplainOpenId) return;
    const handleClick = () => setReExplainOpenId(null);
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [reExplainOpenId]);

  useEffect(() => {
    if (!showSubjectPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (subjectPickerRef.current && !subjectPickerRef.current.contains(e.target as Node)) {
        setShowSubjectPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSubjectPicker]);

  // Auto-approve writes matching the student's stored approval preferences.
  useEffect(() => {
    if (pendingApprovals.length === 0) {
      autoApprovedIdsRef.current.clear();
      return;
    }
    const { autoApproveAll, autoApproveSubjects } = getToolAutoApproval();
    if (!autoApproveAll && autoApproveSubjects.length === 0) return;
    // pendingApprovals is already scoped to the last assistant message, which is
    // the only one the SDK's addToolApprovalResponse can resolve. The once-per-id
    // guard below additionally prevents any repeated (no-op) response from
    // re-running this effect in a render loop.
    for (const ap of pendingApprovals) {
      if (autoApprovedIdsRef.current.has(ap.approvalId)) continue;
      const args = (ap.input ?? {}) as Record<string, unknown>;
      const subject = String(args.subjectId ?? args.subject ?? "");
      const matchesSubject =
        autoApproveSubjects.length > 0 && subject &&
        autoApproveSubjects.some((s: unknown) => subject.toLowerCase().includes(String(s).toLowerCase()));
      if (autoApproveAll || matchesSubject) {
        autoApprovedIdsRef.current.add(ap.approvalId);
        void addToolApprovalResponse({ id: ap.approvalId, approved: true });
      }
    }
  }, [pendingApprovals, addToolApprovalResponse]);

  const sessionParam = searchParams.get("session");
  const subjectParam = searchParams.get("subject") as SubjectId | null;

  useEffect(() => {
    if (!sessionParam || !subjectParam) return;
    if (!allSubjects.find((s) => s.id === subjectParam)) return;

    (async () => {
      const msgs = await chatStore.getMessages(sessionParam);
      setSelectedSubject(subjectParam);
      setChatSessionId(sessionParam);

      if (msgs.length === 0) {
        const subject = allSubjects.find((s) => s.id === subjectParam);
        const welcomeContent = buildWelcomeMessage(subject?.label || subjectParam, userName);
        setWelcomeMessage({
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content: welcomeContent,
          isNew: true,
          isWelcome: true,
        });
        setUIMessages([]);
      } else {
        setWelcomeMessage(null);
        setUIMessages(
          msgs.map((m: any) => ({
            id: m.id,
            role: m.role,
            parts: [{ type: "text", text: m.content }],
          })) as UIMessage[],
        );
      }
    })();
  }, [userName, sessionParam, subjectParam, setUIMessages]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const generateChatTitleIfNeeded = useCallback(async (
    newHistory: { role: string; content: string }[],
    allMessages: { id: string; role: string; content: string }[],
    userInput: string,
    sessionId: string,
  ) => {
    const realUserMessages = newHistory.filter((m) => m.role === "user");
    const previousUserMessages = realUserMessages.length;
    const shouldTitle = previousUserMessages === 1 || previousUserMessages === 2;
    if (!shouldTitle) return;

    try {
      const stripToolCalls = (text: string) => text.replace(/TOOL_CALLS:\s*\[[\s\S]*?\]/g, "").trim();
      const realExchanges = allMessages
        .slice(0, 6)
        .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${stripToolCalls(m.content).slice(0, 250)}`)
        .join("\n");
      const currentUserMsg = userInput.slice(0, 400);
      const titleResponse = await generateChatTitle(realExchanges, currentUserMsg);
      let chatTitle = (titleResponse || "")
        .replace(/^ thinking[\s\S]*?<\/think>\s*/i, "")
        .replace(/^ thinking[\s\S]*$/i, "")
        .trim();
      chatTitle = chatTitle.replace(/^["'`]|["'`]$/g, "").trim();
      chatTitle = chatTitle.replace(/^(Title:|Here'?s?( a title)?:|The title is:?)/i, "").trim();
      chatTitle = chatTitle.replace(/[.!?]$/, "").trim();
      if (!chatTitle || chatTitle.length < 2) {
        const words = userInput.trim().split(/\s+/).slice(0, 4).join(" ");
        chatTitle = words || "New chat";
      }
      chatTitle = chatTitle.slice(0, 50);
      await chatStore.updateSessionTitle(sessionId, chatTitle);
      setAllSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: chatTitle } : s));
    } catch (err) {
      console.warn("[Chat] Failed to generate title:", err);
      const words = userInput.trim().split(/\s+/).slice(0, 4).join(" ");
      if (words) {
        const fallbackTitle = words.slice(0, 50);
        await chatStore.updateSessionTitle(sessionId, fallbackTitle);
        setAllSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: fallbackTitle } : s));
      }
    }
  }, [setAllSessions]);

  const buildContext = useCallback((overrideAnchor?: string | null) => ({
    subjects: selectedSubject ? [selectedSubject] : [],
    hobbies: userHobbies,
    interests: interestObject,
    grade: userPrefs.grade,
    state: userPrefs.state,
    learningStyle: userPrefs.learningStyle,
    analogyIntensity: analogyModeEnabled ? 3 : 0,
    analogyAnchor: overrideAnchor ?? undefined,
    memoryManagement: false,
    selectedModel,
  }), [
    selectedSubject, userHobbies, interestObject,
    userPrefs.grade, userPrefs.state, userPrefs.learningStyle,
    analogyModeEnabled, selectedModel,
  ]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
      } catch { /* clipboard copy not supported */ }
      document.body.removeChild(textarea);
    }

    setCopiedId(id);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const handleRegenerate = useCallback(async (messageId: string) => {
    if (isInputLocked) return;
    const targetIndex = messages.findIndex((m) => m.id === messageId);
    if (targetIndex === -1) return;
    const target = messages[targetIndex];
    if (target.role !== "assistant") return;

    const subjectLabel = allSubjects.find((s) => s.id === selectedSubject)?.label || selectedSubject || "this subject";

    if (target.isWelcome) {
      const nextContent = buildWelcomeMessage(subjectLabel, userName, target.content);
      setWelcomeMessage((prev) => prev && prev.id === messageId
        ? { ...prev, id: `welcome-${Date.now()}`, content: nextContent }
        : prev);
      return;
    }

    if (latestAssistantId && target.id !== latestAssistantId) return;
    if (messages[targetIndex - 1]?.role !== "user") return;

    userContextRef.current = buildContext(null);
    isRegeneratingRef.current = true;
    autoSendRoundsRef.current = 0;
    try {
      await regenerate({ messageId });
    } finally {
      setTimeout(() => { isRegeneratingRef.current = false; }, 0);
    }
  }, [
    isInputLocked, messages, selectedSubject, latestAssistantId,
    buildContext, userName, regenerate,
  ]);

  const handleSaveAsFlashcards = useCallback(async () => {
    if (!selectedSubject || conversationMessages.length < 2 || savingFlashcards) return;
    setSavingFlashcards(true);
    setFlashcardsSaved(false);

    const conversationText = conversationMessages
      .map(m => `${m.role === "user" ? "Student" : "Analogix AI"}: ${m.content}`)
      .join("\n\n");

    const raw = await generateFlashcards(conversationText, selectedSubject, userPrefs.grade, 10);
    if (raw.length >= 5) {
      const allSets = await flashcardStore.getSets();
      const subjectSets = allSets.filter((s: any) => s.subjectId === selectedSubject);
      const existingChatSet = subjectSets.find((s: any) => s.name.toLowerCase().includes("chat"));

      let targetSetId: string | null = existingChatSet?.id ?? null;
      if (!targetSetId) {
        const newSet = await flashcardStore.createSet(selectedSubject, `Chat – ${new Date().toLocaleDateString()}`);
        if (newSet) targetSetId = newSet.id;
      }

      if (targetSetId) {
        await flashcardStore.add(raw.map(c => ({ setId: targetSetId!, subjectId: selectedSubject, front: c.front, back: c.back })));
      }
      setFlashcardsSaved(true);
      setTimeout(() => setFlashcardsSaved(false), 3000);
      router.push(`/flashcards?subjectId=${selectedSubject}`);
    } else if (raw.length > 0) {
      toast.error(`Only ${raw.length} flashcards generated - need at least 5. Try a longer conversation.`);
    }
    setSavingFlashcards(false);
  }, [selectedSubject, conversationMessages, savingFlashcards, userPrefs.grade, router]);

  const handleReExplain = useCallback(async (messageId: string, chosenAnchor?: string) => {
    if (isInputLocked) return;
    const target = conversationMessages.find(m => m.id === messageId);
    if (!target || target.role !== "assistant") return;

    setReExplainOpenId(null);
    setReExplainingId(messageId);

    try {
      const history = conversationMessages
        .slice(0, conversationMessages.findIndex(m => m.id === messageId))
        .map(m => ({ role: m.role, content: m.content }));

      const ctx = { ...buildContext(null), chosenAnchor: chosenAnchor || undefined, previousExplanation: target.content };
      const aiResponse = await getReExplanation(history, ctx);

      setUIMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, parts: [{ type: "text", text: aiResponse.content || "Let me try a different approach..." }] }
          : m
      ));
    } catch {
      setUIMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, parts: [{ type: "text", text: "Couldn't reach the AI. Try again in a moment." }] }
          : m
      ));
    } finally {
      setReExplainingId(null);
    }
  }, [isInputLocked, conversationMessages, buildContext, setUIMessages]);

  const handleSubjectSelect = async (subjectId: SubjectId) => {
    setSelectedSubject(subjectId);
    setWelcomeMessage(null);
    setUIMessages([]);

    if (!availableSubjectIds.has(subjectId)) return;
    const subject = allSubjects.find(s => s.id === subjectId);

    const welcomeContent = buildWelcomeMessage(subject?.label || subjectId, userName);
    setWelcomeMessage({
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content: welcomeContent,
      isNew: true,
      isWelcome: true,
    });

    const sessionId = await chatStore.createSession(subjectId, "New chat");
    setChatSessionId(sessionId);

    if (sessionId) {
      const newSession: ChatSession = {
        id: sessionId,
        subjectId,
        title: "New chat",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessions.setAllSessions(prev => [newSession, ...prev]);
    }

    window.dispatchEvent(new Event("chatSessionCreated"));
  };

  const handleAllowTools = useCallback((approvalId: string) => {
    void addToolApprovalResponse({ id: approvalId, approved: true });
  }, [addToolApprovalResponse]);

  const handleDenyTools = useCallback((approvalId: string) => {
    void addToolApprovalResponse({ id: approvalId, approved: false, reason: "Denied by student" });
  }, [addToolApprovalResponse]);

  const handleSend = async () => {
    if ((!input.trim() && fileAttach.attachedFiles.length === 0) || isInputLocked) return;

    await stopChat();

    const now = Date.now();
    if (lastMessageRef.current &&
        lastMessageRef.current.content === input.trim() &&
        now - lastMessageRef.current.timestamp < 1000) {
      return;
    }
    lastMessageRef.current = { content: input.trim(), timestamp: now };

    autoSendRoundsRef.current = 0;
    const userMessageId = `msg-${Date.now()}`;

    const anchorForRequest =
      analogyModeEnabled && userHobbies.length > 0
        ? findAnchor(input, userHobbies)
        : null;

    const isFirstMessage = uiMessages.filter(m => m.role === "user").length === 0;
    const looksAcademic = input.trim().split(/\s+/).length > 3 &&
      !/^(hi|hello|hey|sup|yo|howdy|hiya|g'day|heya)[\s!?.]*$/i.test(input.trim());
    if (isFirstMessage && !selectedSubject && looksAcademic) {
      setSubjectDetecting(true);
      detectSubjectFromMessage(input).then(detected => {
        if (detected) setSelectedSubject(detected);
        setSubjectDetecting(false);
      });
    }

    if (selectedSubject) {
      statsStore.recordChat(selectedSubject);
    }

    let activeSessionId = chatSessionId;
    if (!activeSessionId) {
      const subjectForSession = selectedSubject || "general";
      const newId = await chatStore.createSession(subjectForSession, "New chat");
      if (newId) {
        activeSessionId = newId;
        setChatSessionId(newId);
        const newSession: ChatSession = {
          id: newId,
          subjectId: subjectForSession,
          title: "New chat",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        sessions.setAllSessions(prev => [newSession, ...prev]);
        window.dispatchEvent(new Event("chatSessionCreated"));
      }
    }

    if (activeSessionId) {
      const messageWithFiles = input.trim() + (fileAttach.attachedFiles.length > 0 ? `\n\n[Attached files: ${fileAttach.attachedFiles.map(f => f.name).join(', ')}]` : '');
      chatStore.addMessage(activeSessionId, "user", messageWithFiles).catch(e => console.error("[Chat] addMessage user:", e));
      sessions.setAllSessions(prev => {
        const updated = prev.map(s =>
          s.id === activeSessionId
            ? { ...s, updatedAt: new Date().toISOString() }
            : s
        );
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    }

    let researchSources: ResearchSource[] = [];
    const researchQuery = input.trim();
    if (researchMode) {
      try {
        setResearchLoading(true);
        const localSources: ResearchSource[] = fileAttach.attachedFiles.map((file, idx) => ({
          id: `local-${Date.now()}-${idx}`,
          title: file.name,
          abstract: file.extractedText ? file.extractedText.slice(0, 360) : undefined,
          source: "local",
        }));
        const externalSources = researchQuery
          ? await searchAcademicSources(researchQuery, 12)
          : [];
        researchSources = [...localSources, ...externalSources].slice(0, 12);
      } finally {
        setResearchLoading(false);
      }
    }

    let userContent = input;
    if (fileAttach.attachedFiles.length > 0) {
      const fileList = fileAttach.attachedFiles.map(f => `- ${f.name}`).join("\n");
      userContent = `${input}\n\n[Attached files]\n${fileList}\n\n[File contents]\n` +
        fileAttach.attachedFiles.map(f => `--- ${f.name} ---\n${f.extractedText}`).join("\n\n");
    }

    if (fileAttach.attachedFiles.length > 0) {
      attachmentsRef.current[userMessageId] = fileAttach.attachedFiles.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        content: f.content,
        extractedText: f.extractedText,
        previewUrl: f.previewUrl,
        isImage: f.isImage,
      }));
    }

    const historyBefore = uiMessages.map(m => ({
      role: m.role,
      content: partsToText(m.parts as unknown[]),
    }));

    userContextRef.current = {
      ...buildContext(anchorForRequest),
      analogyIntensity: researchMode ? 0 : (analogyModeEnabled ? 3 : 0),
      researchMode,
      researchQuery: researchQuery || undefined,
      researchSources,
      selectedModel,
    };

    turnRef.current = {
      sessionId: activeSessionId,
      userInput: input,
      userContent,
      historyBefore,
    };

    setInput("");
    fileAttach.setAttachedFiles([]);
    requestAnimationFrame(() => scroll.scrollToBottom("smooth"));

    setUIMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        role: "user",
        parts: [{ type: "text", text: userContent }],
        metadata: {
          sources: researchSources,
          researchQuery: researchQuery || undefined,
        },
      } as unknown as UIMessage,
    ]);

    await sendMessage({
      text: userContent,
      messageId: userMessageId,
      metadata: {
        sources: researchSources,
        researchQuery: researchQuery || undefined,
      },
    });
  };

  const handleNewTopic = async () => {
    if (!selectedSubject || isInputLocked) return;

    const subjectLabel = allSubjects.find(s => s.id === selectedSubject)?.label || selectedSubject;
    const usedTopics = conversationMessages.filter(m => m.analogy).map(m => m.analogy).filter(Boolean);

    const context = buildContext(null);

    const avoidText = usedTopics.length > 0 ? `Avoid repeating these topics: ${usedTopics.join(", ")}.` : "";
    const anchorText = "";
    const aiPrompt = [{
      role: "user" as const,
      content: `Introduce a NEW, interesting concept in ${subjectLabel} using an analogy that references a specific moment, scene, or character from my interests (${userHobbies.join(", ")})-not generic settings. ${anchorText} ${avoidText}`
    }];

    try {
      const aiResponse = await getAiCompletion(aiPrompt, context);
      const newMsgId = `ai-${Date.now()}`;
      setUIMessages(prev => [...prev, {
        id: newMsgId,
        role: "assistant",
        parts: [{ type: "text", text: aiResponse.content || "Hmm, I'm having trouble thinking of a new topic. Try asking me a specific question!" }],
        metadata: { analogy: `ai-generated-${newMsgId}` },
      } as unknown as UIMessage]);
    } catch {
      const newMsgId = `ai-${Date.now()}`;
      setUIMessages(prev => [...prev, {
        id: newMsgId,
        role: "assistant",
        parts: [{ type: "text", text: "I couldn't reach the AI service, you've either hit the rate limit of 1000 requests per day or you need to check your internet." }],
        metadata: { analogy: `ai-generated-${newMsgId}` },
      } as unknown as UIMessage]);
    }
  };

  return {
    selectedSubject, setSelectedSubject,
    subjectDetecting, setSubjectDetecting,
    showSubjectPicker, setShowSubjectPicker,
    subjectPickerRef,
    messages, setMessages: handleSetViewMessages,
    input, setInput,
    textareaRef,
    isTyping, setIsTyping: noopSetter,
    streamingId, setStreamingId: noopSetter,
    streamingContent, setStreamingContent: noopSetter,
    abortRef,
    analogyModeEnabled, setAnalogyModeEnabled,
    selectedModel, setSelectedModel,
    showModelSelector, setShowModelSelector,
    researchMode, setResearchMode,
    researchLoading, setResearchLoading,
    showAISettings, setShowAISettings,
    reExplainOpenId, setReExplainOpenId,
    reExplainingId, setReExplainingId,
    savingFlashcards, setSavingFlashcards,
    flashcardsSaved, setFlashcardsSaved,
    formulaPanelOpen, setFormulaPanelOpen,
    expandedTopics, setExpandedTopics,
    formulaSearch, setFormulaSearch,
    chatSessionId, setChatSessionId,
    ...sessions,
    ...fileAttach,
    ...scroll,
    copiedId, setCopiedId,
    pendingApprovals,
    userPrefs,
    userName,
    userHobbies,
    userSubjects,
    availableSubjects,
    availableSubjectIds,
    isInputLocked,
    latestAssistantId,
    router,
    allSubjects,
    handleSaveAsFlashcards,
    handleCopy,
    handleRegenerate,
    handleReExplain,
    handleAllowTools,
    handleDenyTools,
    handleSubjectSelect,
    handleSend,
    handleNewTopic,
    stopChat,
    chatStatus,
  };
}

const extractQuizFromAssistantMessage = (message: UIMessage): {
  questions: unknown[];
  subjectId: string;
  title: string;
} | null => {
  let quizData: { subjectId?: string; subject_id?: string; title?: string; questions?: unknown } | null = null;
  for (const p of message.parts as unknown[]) {
    const part = p as ToolUIPartLike;
    if (
      part?.type?.startsWith("tool-") &&
      part.state === "output-available" &&
      part.type === "tool-createQuiz" &&
      part.input
    ) {
      quizData = (part as { input?: { subjectId?: string; subject_id?: string; title?: string; questions?: unknown } }).input ?? null;
      break;
    }
  }
  if (!quizData) return null;

  const raw = typeof quizData.questions === "string"
    ? (() => { try { return JSON.parse(quizData.questions); } catch { return []; } })()
    : (quizData.questions ?? []);
  const questions = normalizeQuizQuestions(raw);

  if (questions.length === 0) return null;

  return {
    questions,
    subjectId: quizData.subjectId || quizData.subject_id || "",
    title: quizData.title || "AI Quiz",
  };
};

export { allSubjects };