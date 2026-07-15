/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getGroqCompletion, getGroqStream, getReExplanation, generateFlashcards, generateQuizFromDocument, generateFlashcardsFromDocument } from "@/services/groq";
import { searchAcademicSources } from "@/services/research";
import { flashcardStore } from "@/utils/flashcardStore";
import { statsStore } from "@/utils/statsStore";
import { chatStore, ChatSession, checkChatStoreHealth } from "@/utils/chatStore";
import { SUBJECT_CATALOG, SubjectId } from "@/constants/subjects";
import { buildInterestList } from "@/utils/interests";
import { extractFileText } from "@/utils/extractFileText";
import type { ResearchSource } from "@/types/research";
import type { GroqModelId } from "@/types/groq-models";
import type { ToolProposal, ToolCall } from "@analogix/shared/types";
import type { Message } from "@/types/chat-message";
import { formatToolResult } from "@/utils/format-tool-result";

const allSubjects = SUBJECT_CATALOG;

export function useChat() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(
    (searchParams?.get("subject") as SubjectId) || null
  );
  const [subjectDetecting, setSubjectDetecting] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const subjectPickerRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '56px';
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 56), 300) + 'px';
      textarea.style.height = newHeight;
    }
  }, [input]);

  const [isTyping, setIsTyping] = useState(false);

  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const lastMessageRef = useRef<{ content: string; timestamp: number } | null>(null);

  const [analogyModeEnabled, setAnalogyModeEnabled] = useState(true);

  const [selectedModel, setSelectedModel] = useState<GroqModelId>(() => {
    if (typeof window === "undefined") return "auto";
    return (localStorage.getItem("selectedGroqModel") as GroqModelId) || "auto";
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

  const [allSessions, setAllSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renamingThreadName, setRenamingThreadName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: number; type: string; content: string; extractedText: string; previewUrl?: string; isImage?: boolean }>>([]);
  const [fileExtracting, setFileExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [generatingStudyGuide, setGeneratingStudyGuide] = useState(false);
  const [studyGuideGenerated, setStudyGuideGenerated] = useState(false);

  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizGenerated, setQuizGenerated] = useState(false);

  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcardsGenerated, setFlashcardsGenerated] = useState(false);

  const [pendingProposal, setPendingProposal] = useState<ToolProposal | null>(null);
  const [pendingProposalMessageId, setPendingProposalMessageId] = useState<string | null>(null);

  const getToolAutoApproval = useCallback(() => {
    if (typeof window === "undefined") return { autoApproveAll: false, autoApproveRead: false, autoApproveSubjects: [] as string[] };
    try {
      const stored = localStorage.getItem("ai_personality");
      if (!stored) return { autoApproveAll: false, autoApproveRead: false, autoApproveSubjects: [] as string[] };
      const p = JSON.parse(stored);
      return {
        autoApproveAll: p.auto_approve_tools === true,
        autoApproveRead: p.auto_approve_read_tools === true,
        autoApproveSubjects: Array.isArray(p.auto_approve_write_subjects) ? p.auto_approve_write_subjects : [],
      };
    } catch {
      return { autoApproveAll: false, autoApproveRead: false, autoApproveSubjects: [] as string[] };
    }
  }, []);

  const shouldAutoApprove = useCallback((tools: ToolCall[]): boolean => {
    const { autoApproveAll, autoApproveRead, autoApproveSubjects } = getToolAutoApproval();
    if (autoApproveAll) return true;

    const readTools = new Set(["list_subjects", "get_subject", "list_documents", "get_document", "list_flashcard_sets", "list_flashcards", "list_quizzes", "get_quiz", "get_quiz_attempts", "list_events", "list_deadlines"]);
    const writeTools = new Set(["create_flashcard_set", "create_flashcards", "update_flashcard", "create_event", "update_event", "delete_event", "create_deadline", "create_document", "update_document", "create_quiz", "update_subject_notes"]);

    if (autoApproveRead && tools.every(t => readTools.has(t.name))) return true;

    if (autoApproveSubjects.length > 0) {
      return tools.every(t => {
        if (readTools.has(t.name)) return true;
        if (!writeTools.has(t.name)) return false;
        const subject = (t.args.subjectId || t.args.subject || "") as string;
        if (!subject) return false;
        return autoApproveSubjects.some(s => subject.toLowerCase().includes(s.toLowerCase()));
      });
    }

    return false;
  }, [getToolAutoApproval]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const lockedToBottomRef = useRef(true);
  const lastContentLengthRef = useRef<number>(0);

  const userPrefs =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {};
  const [hydratedUserName, setHydratedUserName] = useState<string>("");
  const userName = hydratedUserName || userPrefs.name || "";
  const userHobbies = buildInterestList(userPrefs, ["gaming", "sports"]);
  const userSubjects = Array.isArray(userPrefs.subjects) ? userPrefs.subjects : [];
  const availableSubjects = useMemo(
    () => allSubjects.filter((subject) => userSubjects.includes(subject.id)),
    [userSubjects],
  );
  const availableSubjectIds = useMemo(
    () => new Set(availableSubjects.map((subject) => subject.id)),
    [availableSubjects],
  );
  const isInputLocked = isTyping || !!streamingId;

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
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  const latestAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  const findAnchor = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const matched = userHobbies.find((interest) => lower.includes(interest.toLowerCase()));
    return matched || null;
  }, [userHobbies]);

  const generateChatTitleIfNeeded = useCallback(async (
    newHistory: { role: string; content: string }[],
    allMessages: { id: string; role: string; content: string; isWelcome?: boolean }[],
    userInput: string,
    sessionId: string,
    contextBuilder: (anchor?: string | null) => any,
  ) => {
    const realUserMessages = newHistory.filter(m => m.role === "user");
    const previousUserMessages = realUserMessages.length;
    const shouldTitle = previousUserMessages === 1 || previousUserMessages === 2;
    if (!shouldTitle) return;

    try {
      const stripToolCalls = (text: string) => text.replace(/TOOL_CALLS:\s*\[[\s\S]*?\]/g, "").trim();
      const realExchanges = allMessages
        .filter(m => !m.isWelcome)
        .slice(0, 6)
        .map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${stripToolCalls(m.content).slice(0, 250)}`)
        .join("\n");
      const currentUserMsg = userInput.slice(0, 400);
      const titlePrompt = [{ role: "user" as const, content: `You are naming a study chat session. Read the conversation so far and the latest student message, then write a short 3–6 word title capturing the SPECIFIC topic being studied. Be concrete — not "Math Help" or "Question Asked", but things like "Quadratic Formula Confusion", "WW2 Causes Breakdown", "Python List Indexing Bug", "Mitosis vs Meiosis". No quotes, no punctuation at the end, just the title.

Conversation so far:
${realExchanges}
Student (latest): ${currentUserMsg}

Title:` }];
      const titleResponse = await getGroqCompletion(titlePrompt, contextBuilder(null));
      let chatTitle = (titleResponse.content || "")
        .replace(/^<think>[\s\S]*?<\/think>\s*/i, "")
        .replace(/^<think>[\s\S]*$/i, "")
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

  const updateScrollButton = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom <= 80;
    lockedToBottomRef.current = isNearBottom;
    setShowScrollToBottom(!isNearBottom);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const welcomeTemplates = useCallback((subjectLabel: string) => ([
    `Hi ${userName}. Great choice picking ${subjectLabel}.\n\nWhat specific topic or concept would you like to explore today? Just tell me what's on your mind, and I'll find something that doesn't bore you to death.`,
    `Hey ${userName}! ${subjectLabel} is a strong pick.\n\nTell me a topic or concept you're curious about, and I'll explain it with your interests.`,
    `Nice, ${userName}. ${subjectLabel} unlocked.\n\nWhat should we explore first? I'll make it click with things you actually like.`,
    `Alright ${userName}, ${subjectLabel} it is.\n\nName a concept and I'll break it down so you're like "Ah, I get it now!"`,
    `Welcome, ${userName}. Let's dive into ${subjectLabel}.\n\nWhat topic do you want to tackle today?`
  ]), [userName]);

  const buildWelcomeMessage = useCallback((subjectLabel: string, previous?: string) => {
    const options = welcomeTemplates(subjectLabel);
    if (options.length === 0) return "";
    let next = options[Math.floor(Math.random() * options.length)];
    if (previous && options.length > 1) {
      let attempts = 0;
      while (next === previous && attempts < 6) {
        next = options[Math.floor(Math.random() * options.length)];
        attempts += 1;
      }
    }
    return next;
  }, [welcomeTemplates]);

  const buildContext = useCallback((overrideAnchor?: string | null) => ({
    subjects: selectedSubject ? [selectedSubject] : [],
    hobbies: userHobbies,
    grade: userPrefs.grade,
    state: userPrefs.state,
    learningStyle: userPrefs.learningStyle,
    analogyIntensity: analogyModeEnabled ? 3 : 0,
    analogyAnchor: overrideAnchor ?? undefined,
    memoryManagement: false,
    selectedModel,
  }), [
    selectedSubject,
    userSubjects,
    userHobbies,
    userPrefs.grade,
    userPrefs.state,
    userPrefs.learningStyle,
    analogyModeEnabled,
    selectedModel,
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

    const subjectLabel = allSubjects.find(s => s.id === selectedSubject)?.label || selectedSubject || "this subject";

    if (target.isWelcome) {
      const nextContent = buildWelcomeMessage(subjectLabel, target.content);
      setMessages((prev) => prev.map((m) => (
        m.id === messageId
          ? { ...m, id: `welcome-${Date.now()}`, content: nextContent, isWelcome: true }
          : m
      )));
      return;
    }

    if (latestAssistantId && target.id !== latestAssistantId) return;
    if (messages[targetIndex - 1]?.role !== "user") return;

    const history = messages.slice(0, targetIndex).map((m) => ({
      role: m.role,
      content: m.content
    }));

    if (!selectedSubject) return;

    setIsTyping(true);

    try {
      const previousUser = messages[targetIndex - 1]?.role === "user"
        ? messages[targetIndex - 1]?.content
        : "";
      const explicitAnchor = previousUser ? findAnchor(previousUser) : null;
      const regenContext = {
        ...buildContext(explicitAnchor),
        analogyIntensity: target.sources && target.sources.length > 0 ? 0 : (analogyModeEnabled ? 3 : 0),
        researchMode: Boolean(target.sources && target.sources.length > 0),
        researchQuery: target.researchQuery,
        researchSources: target.sources,
      };
      const aiResponse = await getGroqCompletion(history, regenContext);
      setMessages((prev) => prev.map((m) => (
        m.id === messageId
          ? { ...m, id: `${messageId}-regen-${Date.now()}`, content: aiResponse.content || "I'm not sure how to answer that." }
          : m
      )));
    } catch {
      setMessages((prev) => prev.map((m) => (
        m.id === messageId
          ? { ...m, id: `${messageId}-regen-${Date.now()}`, content: "I couldn't reach the AI service, you've either hit the rate limit of 1000 requests per day or you need to check your internet." }
          : m
      )));
    } finally {
      setIsTyping(false);
    }
  }, [
    isInputLocked,
    messages,
    allSubjects,
    selectedSubject,
    latestAssistantId,
    buildContext,
    buildWelcomeMessage,
    analogyModeEnabled
  ]);

  const handleSaveAsFlashcards = useCallback(async () => {
    if (!selectedSubject || messages.length < 2 || savingFlashcards) return;
    setSavingFlashcards(true);
    setFlashcardsSaved(false);

    const conversationText = messages
      .filter(m => !m.isWelcome)
      .map(m => `${m.role === "user" ? "Student" : "Analogix AI"}: ${m.content}`)
      .join("\n\n");

    const raw = await generateFlashcards(conversationText, selectedSubject, userPrefs.grade, 10);
    if (raw.length >= 5) {
      const allSets = await flashcardStore.getSets();
      const subjectSets = allSets.filter(s => s.subjectId === selectedSubject);
      const existingChatSet = subjectSets.find(s => s.name.toLowerCase().includes("chat"));

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
      toast.error(`Only ${raw.length} flashcards generated — need at least 5. Try a longer conversation.`);
    }
    setSavingFlashcards(false);
  }, [selectedSubject, messages, savingFlashcards, userPrefs.grade, router]);

  const handleReExplain = useCallback(async (messageId: string, chosenAnchor?: string) => {
    if (isInputLocked) return;
    const target = messages.find(m => m.id === messageId);
    if (!target || target.role !== "assistant") return;

    setReExplainOpenId(null);
    setReExplainingId(messageId);
    setIsTyping(true);

    try {
      const history = messages
        .slice(0, messages.findIndex(m => m.id === messageId))
        .map(m => ({ role: m.role, content: m.content }));

      const ctx = { ...buildContext(null), chosenAnchor: chosenAnchor || undefined, previousExplanation: target.content };
      const aiResponse = await getReExplanation(history, ctx);

      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, id: `${messageId}-re-${Date.now()}`, content: aiResponse.content || "Let me try a different approach..." }
          : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, id: `${messageId}-re-${Date.now()}`, content: "Couldn't reach the AI. Try again in a moment." }
          : m
      ));
    } finally {
      setIsTyping(false);
      setReExplainingId(null);
    }
  }, [isInputLocked, messages, buildContext]);

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

  const detectSubjectFromMessage = useCallback(async (userMessage: string): Promise<SubjectId | null> => {
    try {
      const prompt = [
        { role: "user" as const, content:
          `You are a subject classifier for an Australian secondary school app. ` +
          `Given this student message, return ONLY the most appropriate subject ID from this list: ` +
          `math, biology, history, physics, chemistry, english, computing, economics, business, commerce, pdhpe, geography, engineering, medicine, languages. ` +
          `Student message: "${userMessage.slice(0, 300)}" ` +
          `Respond with ONLY the subject ID, nothing else. If unsure, return the closest match.`
        }
      ];
      const res = await getGroqCompletion(prompt, { analogyIntensity: 0 });
      const raw = (res.content || "").trim().toLowerCase().replace(/[^a-z]/g, "");
      const valid: SubjectId[] = ["math","biology","history","physics","chemistry","english","computing","economics","business","commerce","pdhpe","geography","engineering","medicine","languages"];
      return valid.find(s => s === raw) ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const sessionId = searchParams.get("session");
    const subjectParam = searchParams.get("subject") as SubjectId | null;
    if (!sessionId || !subjectParam) return;

    if (!allSubjects.find(s => s.id === subjectParam)) return;

    (async () => {
      const msgs = await chatStore.getMessages(sessionId);
      setSelectedSubject(subjectParam);
      setChatSessionId(sessionId);

      if (msgs.length === 0) {
        const subject = allSubjects.find(s => s.id === subjectParam);
        const welcomeContent = buildWelcomeMessage(subject?.label || subjectParam);
        setMessages([{
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content: welcomeContent,
          isNew: true,
          isWelcome: true,
        }]);
      } else {
        setMessages(msgs.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          isNew: false,
        })));
      }
    })();
   
  }, [buildWelcomeMessage]);

  useEffect(() => {
    const loadSessions = async () => {
      setSessionsLoading(true);
      const sessions = await chatStore.getSessions();
      setAllSessions(sessions);
      setSessionsLoading(false);
    };
    loadSessions();

    const onFocus = () => loadSessions();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (streamingId || isTyping) { /* streaming in progress */ }
  }, [streamingId, isTyping]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    updateScrollButton();
  }, [messages.length, updateScrollButton]);

  const handleSubjectSelect = async (subjectId: SubjectId) => {
    setSelectedSubject(subjectId);
    setMessages([]);
    setStreamingId(null);

    if (!availableSubjectIds.has(subjectId)) return;
    const subject = allSubjects.find(s => s.id === subjectId);

    const welcomeContent = buildWelcomeMessage(subject?.label || subjectId);
    const welcomeMsg: Message = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content: welcomeContent,
      isNew: true,
      isWelcome: true,
    };
    setMessages([welcomeMsg]);

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
      setAllSessions(prev => [newSession, ...prev]);
    }
    
    window.dispatchEvent(new Event("chatSessionCreated"));
  };

  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const processFiles = useCallback(async (fileList: File[]) => {
    if (fileList.length === 0) {
      console.warn("[Chat] No files selected");
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";

    console.log("[Chat] Setting fileExtracting to true");
    setFileExtracting(true);
    const newAttachments: Array<{ name: string; size: number; type: string; content: string; extractedText: string; previewUrl?: string; isImage?: boolean }> = [];

    for (const file of fileList) {
      console.log("[Chat] Processing file:", file.name, file.type, file.size, "bytes");
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      try {
        const extractedText = await extractFileText(file);
        console.log("[Chat] Successfully extracted text from:", file.name, "length:", extractedText.length);
        newAttachments.push({
          name: file.name,
          size: file.size,
          type: file.type,
          content: "",
          extractedText,
          previewUrl,
          isImage,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("[Chat] Could not extract", file.name, err);
        if (isImage) {
          newAttachments.push({
            name: file.name,
            size: file.size,
            type: file.type,
            content: "",
            extractedText: `[Image attached: ${file.name}. No text could be extracted.]`,
            previewUrl,
            isImage,
          });
          toast.message(`Added "${file.name}" without text extraction.`);
        } else {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          toast.error(`Failed to upload "${file.name}": ${errorMessage}`);
        }
      }
    }

    console.log("[Chat] Final attachments:", newAttachments);
    console.log("[Chat] Current attachedFiles before update:", attachedFiles.length);
    setAttachedFiles(prev => {
      const updated = [...prev, ...newAttachments];
      console.log("[Chat] attachedFiles updated from", prev.length, "to", updated.length);
      return updated;
    });
    console.log("[Chat] Setting fileExtracting to false");
    setFileExtracting(false);
  }, [attachedFiles.length]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    console.log("[Chat] File input changed. Files:", fileList);
    console.log("[Chat] Files length:", fileList.length);
    processFiles(fileList);
  }, [processFiles]);

  const isFileDrag = useCallback((e: React.DragEvent) =>
    Array.from(e.dataTransfer.types || []).includes("Files"), []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isFileDrag(e)) return;
    setIsDraggingFiles(false);
    const fileList = Array.from(e.dataTransfer.files || []);
    console.log("[Chat] Files dropped:", fileList);
    processFiles(fileList);
  }, [processFiles, isFileDrag]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDraggingFiles(true);
  }, [isFileDrag]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingFiles(false);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachedFiles(prev => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleGenerateStudyGuide = useCallback(async () => {
    if (attachedFiles.length === 0 || generatingStudyGuide) return;

    const subjectToUse = selectedSubject || userSubjects[0] || "general";
    const subject = SUBJECT_CATALOG.find(s => s.id === subjectToUse);

    const combinedText = attachedFiles
      .map(f => `File: ${f.name}\n\n${f.extractedText}`)
      .join("\n\n---\n\n");

    const fileName = attachedFiles.map(f => f.name).join(", ");

    const studyGuideData = {
      text: combinedText,
      file: fileName,
      subject: subjectToUse,
      grade: userPrefs.grade || "",
    };
    sessionStorage.setItem("pendingStudyGuide", JSON.stringify(studyGuideData));
    localStorage.setItem("pendingStudyGuide", JSON.stringify(studyGuideData));
    router.push("/study-guide-loading");
  }, [selectedSubject, attachedFiles, generatingStudyGuide, userPrefs.grade, userSubjects, router]);

  const handleGenerateQuiz = useCallback(async () => {
    if (!selectedSubject || attachedFiles.length === 0 || generatingQuiz) return;
    setGeneratingQuiz(true);
    try {
      const combinedText = attachedFiles.map(f => `File: ${f.name}\n\n${f.extractedText}`).join("\n\n---\n\n");
      const subject = SUBJECT_CATALOG.find(s => s.id === selectedSubject);
      const result = await generateQuizFromDocument({
        documentContent: combinedText,
        fileName: attachedFiles.map(f => f.name).join(", "),
        subject: subject?.label,
        grade: userPrefs.grade,
        numberOfQuestions: 10,
      });
      if (!result) throw new Error("Failed to generate quiz");
      sessionStorage.setItem("pendingQuiz", JSON.stringify(result));
      setQuizGenerated(true);
      setTimeout(() => setQuizGenerated(false), 3000);
      router.push(`/quiz?subject=${selectedSubject}`);
    } catch (error) {
      console.error("Failed to generate quiz:", error);
    } finally {
      setGeneratingQuiz(false);
    }
  }, [selectedSubject, attachedFiles, generatingQuiz, userPrefs.grade, router]);

  const handleGenerateFlashcards = useCallback(async () => {
    if (!selectedSubject || attachedFiles.length === 0 || generatingFlashcards) return;
    setGeneratingFlashcards(true);
    try {
      const combinedText = attachedFiles.map(f => `File: ${f.name}\n\n${f.extractedText}`).join("\n\n---\n\n");
      const subject = SUBJECT_CATALOG.find(s => s.id === selectedSubject);
      const result = await generateFlashcardsFromDocument({
        documentContent: combinedText,
        fileName: attachedFiles.map(f => f.name).join(", "),
        subject: subject?.label,
        grade: userPrefs.grade,
        count: 20,
      });
      if (result.length === 0) throw new Error("Failed to generate flashcards");
      const docSet = await flashcardStore.createSet(selectedSubject, attachedFiles.map(f => f.name.replace(/\.[^/.]+$/, "")).join(", ") || "From document");
      if (docSet) {
        await flashcardStore.add(result.map(f => ({ setId: docSet.id, subjectId: selectedSubject, front: f.front, back: f.back })));
      }
      setFlashcardsGenerated(true);
      setTimeout(() => setFlashcardsGenerated(false), 3000);
      router.push(`/flashcards?subjectId=${selectedSubject}`);
    } catch (error) {
      console.error("Failed to generate flashcards:", error);
    } finally {
      setGeneratingFlashcards(false);
    }
  }, [selectedSubject, attachedFiles, generatingFlashcards, userPrefs.grade, router]);

  const handleAllowTools = useCallback(async (tools: ToolCall[]) => {
    if (!pendingProposal || !pendingProposalMessageId) return;
    let error: Error | null = null;
    const originalText = messages.find(m => m.id === pendingProposalMessageId)?.content || pendingProposal.summary;
    try {
      const res = await fetch("/api/groq/tools/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tools }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Execution failed");

      const successCount = result.results?.filter((r: any) => r.success).length ?? 0;
      const failCount = result.results?.filter((r: any) => !r.success).length ?? 0;

      const resultText = result.results?.map(formatToolResult).filter(Boolean).join("\n\n") || "";
      const combinedContent = failCount > 0
        ? `${originalText}\n\n⚠️ ${failCount} operation(s) failed — ${pendingProposal.summary}${resultText ? `\n\n${resultText}` : ""}`
        : `${originalText}\n\n✅ ${pendingProposal.summary}${resultText ? `\n\n${resultText}` : ""}`;

      setMessages(prev => prev.map(m =>
        m.id === pendingProposalMessageId
          ? { ...m, content: combinedContent }
          : m
      ));

      if (chatSessionId && pendingProposalMessageId) {
        chatStore.updateMessageContent(chatSessionId, pendingProposalMessageId, combinedContent).catch(e => console.error("[Chat] updateMessageContent:", e));
      }

      if (successCount > 0 && failCount === 0) {
        const toolResult = result.results?.[0];
        const toolName = toolResult?.toolName;
        if (toolName === "create_quiz" && toolResult?.data) {
          const quizData = toolResult.data;
          const raw = typeof quizData.questions === "string"
            ? JSON.parse(quizData.questions)
            : (quizData.questions ?? []);
          const questions = (Array.isArray(raw) ? raw : []).map((q: any) => ({
            ...q,
            type: q.type === "multiple-choice" || q.type === "multiple_choice" ? "multiple_choice"
              : q.type === "true-false" ? "multiple_choice"
              : q.type === "short-answer" || q.type === "short_answer" ? "short_answer"
              : "multiple_choice",
            options: Array.isArray(q.options) ? q.options.map((opt: any, i: number) =>
              typeof opt === "string" ? { id: `opt-${i}`, text: opt, isCorrect: q.correctAnswer === opt }
                : opt
            ) : [],
            correctAnswer: q.correctAnswer || "",
          }));
          sessionStorage.setItem("pendingQuiz", JSON.stringify({
            questions,
            subjectId: quizData.subject_id,
            title: quizData.title,
          }));
          router.push("/quiz");
        }
      }
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
    } finally {
      setPendingProposal(null);
      setPendingProposalMessageId(null);
    }
    if (error) throw error instanceof Error ? error : new Error(String(error));
  }, [pendingProposal, pendingProposalMessageId, router, messages]);

  const handleDenyTools = useCallback(() => {
    if (!pendingProposal || !pendingProposalMessageId) return;
    setMessages(prev => prev.map(m =>
      m.id === pendingProposalMessageId
        ? { ...m, content: `✕ Cancelled — let me know if you need something else.` }
        : m
    ));
    setPendingProposal(null);
    setPendingProposalMessageId(null);
  }, [pendingProposal, pendingProposalMessageId]);

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || isInputLocked) return;

    abortRef.current?.abort();

    const now = Date.now();
    if (lastMessageRef.current && 
        lastMessageRef.current.content === input.trim() &&
        now - lastMessageRef.current.timestamp < 1000) {
      return;
    }
    lastMessageRef.current = { content: input.trim(), timestamp: now };

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined
    };

    const anchorForRequest =
      analogyModeEnabled && userHobbies.length > 0
        ? findAnchor(input)
        : null;

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setAttachedFiles([]);
    lockedToBottomRef.current = false;
    requestAnimationFrame(() => scrollToBottom("smooth"));
    setIsTyping(true);

    const isFirstMessage = messages.filter(m => m.role === "user").length === 0;
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
    
    (async () => {
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
          setAllSessions(prev => [newSession, ...prev]);
          window.dispatchEvent(new Event("chatSessionCreated"));
        }
      }

      if (activeSessionId) {
        const messageWithFiles = input.trim() + (attachedFiles.length > 0 ? `\n\n[Attached files: ${attachedFiles.map(f => f.name).join(', ')}]` : '');
        chatStore.addMessage(activeSessionId, "user", messageWithFiles).catch(e => console.error("[Chat] addMessage user:", e));
        setAllSessions(prev => {
          const updated = prev.map(s =>
            s.id === activeSessionId
              ? { ...s, updatedAt: new Date().toISOString() }
              : s
          );
          return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        });
      }
      let userContent = input;
      if (attachedFiles.length > 0) {
        const fileList = attachedFiles.map(f => `- ${f.name}`).join("\n");
        userContent = `${input}\n\n[Attached files]\n${fileList}\n\n[File contents]\n` +
          attachedFiles.map(f => `--- ${f.name} ---\n${f.extractedText}`).join("\n\n");
      }

      let researchSources: ResearchSource[] = [];
      const researchQuery = input.trim();
      if (researchMode) {
        try {
          setResearchLoading(true);
          const localSources: ResearchSource[] = attachedFiles.map((file, idx) => ({
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

      const messagesHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const newHistory = [...messagesHistory, { role: "user" as const, content: userContent }];
      
      const context = {
        ...buildContext(anchorForRequest),
        analogyIntensity: researchMode ? 0 : (analogyModeEnabled ? 3 : 0),
        researchMode,
        researchQuery: researchQuery || undefined,
        researchSources,
        selectedModel,
      };

      const getLocalStorageData = () => {
        if (typeof window === "undefined") return null;
        const personality = localStorage.getItem("ai_personality");
        const memories = localStorage.getItem("ai_memories");
        return {
          personality: personality ? JSON.parse(personality) : null,
          memories: memories ? JSON.parse(memories) : [],
        };
      };

      const localStorageData = getLocalStorageData();

      const result = await getGroqCompletion(newHistory, context);
      setIsTyping(false);

      if (result.proposal) {
        const proposalId = (Date.now() + 1).toString();
        const proposalContent = result.content || "";
        setMessages(prev => [...prev, {
          id: proposalId,
          role: "assistant",
          content: proposalContent,
          isStreaming: true,
        }]);

        if (activeSessionId) {
          chatStore.addMessage(activeSessionId, "assistant", proposalContent).catch(e => console.error("[Chat] addMessage assistant:", e));
        }

        const proposalTools = result.proposal.tools;
        if (shouldAutoApprove(proposalTools)) {
          setPendingProposal(result.proposal);
          setPendingProposalMessageId(proposalId);
          setTimeout(async () => {
            try {
              const res = await fetch("/api/groq/tools/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tools: proposalTools }),
              });
              const execResult = await res.json();
              const successCount = execResult.results?.filter((r: any) => r.success).length ?? 0;
              const failCount = execResult.results?.filter((r: any) => !r.success).length ?? 0;

              const resultText = execResult.results?.map(formatToolResult).filter(Boolean).join("\n\n") || "";
              const combinedContent = proposalContent + (resultText ? `\n\n${resultText}` : "");
              setMessages(prev => prev.map(m =>
                m.id === proposalId
                  ? { ...m, content: combinedContent, isStreaming: false }
                  : m
              ));

              if (activeSessionId) {
                chatStore.updateMessageContent(activeSessionId, proposalId, combinedContent).catch(e => console.error("[Chat] updateMessageContent:", e));
              }

              if (successCount > 0 && failCount === 0) {
                const toolResult = execResult.results?.[0];
                const toolName = toolResult?.toolName;
                if (toolName === "create_quiz" && toolResult?.data) {
                  const quizData = toolResult.data;
                  const raw = typeof quizData.questions === "string" ? JSON.parse(quizData.questions) : (quizData.questions ?? []);
                  const questions = (Array.isArray(raw) ? raw : []).map((q: any) => ({
                    ...q,
                    type: q.type === "multiple-choice" || q.type === "multiple_choice" ? "multiple_choice"
                      : q.type === "true-false" ? "multiple_choice"
                      : q.type === "short-answer" || q.type === "short_answer" ? "short_answer"
                      : "multiple_choice",
                    options: Array.isArray(q.options) ? q.options.map((opt: any, i: number) =>
                      typeof opt === "string" ? { id: `opt-${i}`, text: opt, isCorrect: q.correctAnswer === opt } : opt
                    ) : [],
                    correctAnswer: q.correctAnswer || "",
                  }));
                  sessionStorage.setItem("pendingQuiz", JSON.stringify({ questions, subjectId: quizData.subject_id, title: quizData.title }));
                  router.push("/quiz");
                }
              }
            } catch (err) {
              console.warn("[Chat] Auto-execute failed:", err);
              setMessages(prev => prev.map(m =>
                m.id === proposalId ? { ...m, content: proposalContent + "\n\n⚠️ Auto-execution failed. Please try again.", isStreaming: false } : m
              ));
            } finally {
              setPendingProposal(null);
              setPendingProposalMessageId(null);
            }
          }, 100);
          if (activeSessionId) {
            generateChatTitleIfNeeded(newHistory, messages, input, activeSessionId, buildContext);
          }
          return;
        }

        setPendingProposal(result.proposal);
        setPendingProposalMessageId(proposalId);

        if (proposalContent) {
          setStreamingId(proposalId);
          setStreamingContent("");
          const totalLen = proposalContent.length;
          const DURATION_MS = Math.min(2500, Math.max(600, totalLen * 15));
          const startTime = performance.now();
          const reveal = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / DURATION_MS, 1);
            const chars = Math.min(Math.floor(progress * totalLen), totalLen);
            if (chars > 0) setStreamingContent(proposalContent.slice(0, chars));
            if (chars < totalLen) {
              requestAnimationFrame(reveal);
            } else {
              setMessages(prev => prev.map(m =>
                m.id === proposalId ? { ...m, isStreaming: false } : m
              ));
              setStreamingId(null);
              setStreamingContent("");
            }
          };
          requestAnimationFrame(reveal);
        }
        if (activeSessionId) {
          generateChatTitleIfNeeded(newHistory, messages, input, activeSessionId, buildContext);
        }
        return;
      }

      const typewriterText = result.content || "";
      if (typewriterText) {
        const responseId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
          id: responseId,
          role: "assistant",
          content: typewriterText,
          isStreaming: true,
          sources: researchSources,
          researchQuery: researchQuery || undefined,
        }]);
        if (activeSessionId) {
          chatStore.addMessage(activeSessionId, "assistant", typewriterText).catch(e => console.error("[Chat] addMessage assistant:", e));
        }
        setIsTyping(false);
        setStreamingId(responseId);
        setStreamingContent("");
        lockedToBottomRef.current = false;

        const totalLen = typewriterText.length;
        const DURATION_MS = Math.min(2500, Math.max(600, totalLen * 15));
        const CHUNK = totalLen < 20 ? Math.max(1, Math.floor(totalLen / 4)) : 1;
        const startTime = performance.now();
        let animCancelled = false;
        abortRef.current = { abort: () => { animCancelled = true; } } as unknown as AbortController;
        const reveal = () => {
          if (animCancelled) return;
          const elapsed = performance.now() - startTime;
          const progress = Math.min(elapsed / DURATION_MS, 1);
          const chars = Math.min(Math.floor(progress * totalLen), totalLen);
          if (chars > 0) setStreamingContent(typewriterText.slice(0, chars));
          if (chars < totalLen) {
            requestAnimationFrame(reveal);
          } else {
            setMessages(prev => prev.map(m =>
              m.id === responseId ? { ...m, isStreaming: false } : m
            ));
            setStreamingId(null);
            setStreamingContent("");
            abortRef.current = null;
          }
        };
        requestAnimationFrame(reveal);
        if (activeSessionId) {
          generateChatTitleIfNeeded(newHistory, messages, input, activeSessionId, buildContext);
        }
        return;
      }

      try {
        const responseId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
          id: responseId,
          role: "assistant",
          content: "",
          isStreaming: true,
          sources: researchSources,
          researchQuery: researchQuery || undefined,
        }]);
        setIsTyping(false);
        setStreamingId(responseId);
        setStreamingContent("");
        lockedToBottomRef.current = false;

        const abort = new AbortController();
        abortRef.current = abort;
        let accumulated = "";

        const cleanForDisplay = (text: string) => {
          return text
            .replace(/<system-reminder[\s\S]*?<\/system-reminder>/gi, "")
            .replace(/<system-reminder[\s\S]*$/gi, "")
            .replace(/<\|[\w_]+\|>/g, "")
            .replace(/<internal\s*>[\s\S]*?<\/internal\s*>/gi, "")
            .replace(/<internal\s*>[\s\S]*/gi, "")
            .replace(/\n\s*Actions\s*$/gi, "")
            .replace(/\n\s*\n\s*$/g, "\n")
            .trim();
        };

        const stream = getGroqStream(newHistory, context, localStorageData);
        for await (const token of stream) {
          if (abort.signal.aborted) break;
          accumulated += token;
          setStreamingContent(cleanForDisplay(accumulated));
        }

        const finalContent = cleanForDisplay(accumulated) || "I'm not sure how to answer that.";
        setMessages(prev => prev.map(m =>
          m.id === responseId ? { ...m, isStreaming: false, content: finalContent } : m
        ));
        setStreamingId(null);
        setStreamingContent("");

      const trimmedAccumulated = accumulated.trim();
      const lastUserMsg = userContent.trim().toLowerCase();

      const isTrivialInput = lastUserMsg.length < 15 && /^(hi|hello|hey|sup|yo|ok|k|lol|thanks?|bye|good\s?(morning|evening|afternoon)|what'?s up|how are you|\?)$/i.test(lastUserMsg);

      const shouldExtract = trimmedAccumulated.length >= 20 && !isTrivialInput && lastUserMsg.length >= 10;

      console.log("[memory] shouldExtract:", shouldExtract, "| isTrivial:", isTrivialInput, "| userMsgLen:", lastUserMsg.length, "| aiRespLen:", trimmedAccumulated.length);

      if (shouldExtract) {
        const messagesForExtraction = [
          ...newHistory,
          { role: "assistant" as const, content: trimmedAccumulated },
        ];
        console.log("[memory] Sending extraction request with", messagesForExtraction.length, "messages");
        fetch("/api/ai/memory/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesForExtraction, subjectId: selectedSubject }),
        })
          .then(r => {
            if (!r.ok) return null;
            return r.json();
          })
          .then(d => { if (d) console.log("[memory] extract result:", d); })
          .catch(err => console.error("[memory] extract error:", err));
      }

      if (activeSessionId) {
        chatStore.addMessage(activeSessionId, "assistant", accumulated).catch(e => console.error("[Chat] addMessage assistant:", e));
        setAllSessions(prev =>
          [...prev.map(s => s.id === activeSessionId ? { ...s, updatedAt: new Date().toISOString() } : s)]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
        await generateChatTitleIfNeeded(newHistory, messages, input, activeSessionId, buildContext);
      }
      } catch {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I couldn't reach the AI service, you've either hit the rate limit of 1000 requests per day or you need to check your internet.",
        }]);
        setStreamingId(null);
        setStreamingContent("");
      } finally {
        setIsTyping(false);
        abortRef.current = null;
      }
    })();
  };

  const handleNewTopic = async () => {
    if (!selectedSubject || isInputLocked) return;

    setIsTyping(true);
    const subjectLabel = allSubjects.find(s => s.id === selectedSubject)?.label || selectedSubject;
    const usedTopics = messages.filter(m => m.analogy).map(m => m.analogy).filter(Boolean);
    
    const context = buildContext(null);

    const avoidText = usedTopics.length > 0 ? `Avoid repeating these topics: ${usedTopics.join(", ")}.` : "";
    const anchorText = "";
    const aiPrompt = [{ 
      role: "user" as const, 
      content: `Introduce a NEW, interesting concept in ${subjectLabel} using an analogy that references a specific moment, scene, or character from my interests (${userHobbies.join(", ")})—not generic settings. ${anchorText} ${avoidText}` 
    }];

    try {
      const aiResponse = await getGroqCompletion(aiPrompt, context);
      const newMsgId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: newMsgId,
        role: "assistant",
        content: aiResponse.content || "Hmm, I'm having trouble thinking of a new topic. Try asking me a specific question!",
        analogy: `ai-generated-${newMsgId}`,
      }]);
    } catch {
      const newMsgId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: newMsgId,
        role: "assistant",
        content: "I couldn't reach the AI service, you've either hit the rate limit of 1000 requests per day or you need to check your internet.",
        analogy: `ai-generated-${newMsgId}`,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSwitchThread = async (session: ChatSession) => {
    setSelectedSubject(session.subjectId as SubjectId);
    setChatSessionId(session.id);
    setMessages([]);
    setStreamingId(null);
    setStreamingContent("");

    const msgs = await chatStore.getMessages(session.id);
    if (msgs.length === 0) {
      const subject = allSubjects.find(s => s.id === session.subjectId);
      const welcomeContent = buildWelcomeMessage(subject?.label || session.subjectId);
      setMessages([{
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: welcomeContent,
        isNew: true,
        isWelcome: true,
      }]);
    } else {
      setMessages(msgs.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        isNew: false,
      })));
    }
  };

  const handleStartNewChat = () => {
    setSelectedSubject(null);
    setSubjectDetecting(false);
    setShowSubjectPicker(false);
    setMessages([]);
    setChatSessionId(null);
    setInput("");
    setStreamingId(null);
    setStreamingContent("");
    abortRef.current?.abort();
  };

  const handleDeleteThread = async (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await chatStore.deleteSession(sessionId);
    setAllSessions(prev => prev.filter(s => s.id !== sessionId));
    if (chatSessionId === sessionId) {
      handleStartNewChat();
    }
  };

  const handleRenameThread = async (sessionId: string) => {
    if (!renamingThreadName.trim()) {
      setRenamingThreadId(null);
      return;
    }
    await chatStore.updateSessionTitle(sessionId, renamingThreadName);
    setAllSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, title: renamingThreadName } : s
    ));
    setRenamingThreadId(null);
    setRenamingThreadName("");
  };

  return {
    selectedSubject, setSelectedSubject,
    subjectDetecting, setSubjectDetecting,
    showSubjectPicker, setShowSubjectPicker,
    subjectPickerRef,
    messages, setMessages,
    input, setInput,
    textareaRef,
    isTyping, setIsTyping,
    streamingId, setStreamingId,
    streamingContent, setStreamingContent,
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
    allSessions, setAllSessions,
    sessionsLoading, setSessionsLoading,
    threadSearch, setThreadSearch,
    renamingThreadId, setRenamingThreadId,
    renamingThreadName, setRenamingThreadName,
    contextMenu, setContextMenu,
    sidebarOpen, setSidebarOpen,
    attachedFiles, setAttachedFiles,
    fileExtracting, setFileExtracting,
    fileInputRef,
    generatingStudyGuide, setGeneratingStudyGuide,
    studyGuideGenerated, setStudyGuideGenerated,
    generatingQuiz, setGeneratingQuiz,
    quizGenerated, setQuizGenerated,
    generatingFlashcards, setGeneratingFlashcards,
    flashcardsGenerated, setFlashcardsGenerated,
    pendingProposal, setPendingProposal,
    pendingProposalMessageId, setPendingProposalMessageId,
    copiedId, setCopiedId,
    isDraggingFiles, setIsDraggingFiles,
    messagesEndRef,
    scrollContainerRef,
    showScrollToBottom,
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
    handleFileSelect,
    handleFileDrop,
    handleDragOver,
    handleDragLeave,
    removeAttachment,
    handleGenerateStudyGuide,
    handleGenerateQuiz,
    handleGenerateFlashcards,
    updateScrollButton,
    handleSubjectSelect,
    handleSend,
    handleNewTopic,
    handleSwitchThread,
    handleStartNewChat,
    handleDeleteThread,
    handleRenameThread,
  };
}

export { allSubjects };
