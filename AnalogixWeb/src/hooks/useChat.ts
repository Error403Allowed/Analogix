import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getGroqCompletion, getGroqStream, getReExplanation, generateFlashcards, generateChatTitle } from "@/services/groq";
import { searchAcademicSources } from "@/services/research";
import { flashcardStore } from "@/utils/flashcardStore";
import { statsStore } from "@/utils/statsStore";
import { chatStore, ChatSession, checkChatStoreHealth } from "@/utils/chatStore";
import { SUBJECT_CATALOG, SubjectId } from "@/constants/subjects";
import { buildInterestList } from "@/utils/interests";
import type { ResearchSource } from "@/types/research";
import type { GroqModelId } from "@/types/groq-models";
import type { ToolProposal, ToolCall } from "@analogix/shared/types";
import type { Message } from "@/types/chat-message";
import { formatToolResult } from "@/utils/format-tool-result";
import { useChatScroll } from "./useChatScroll";
import { useFileAttachment } from "./useFileAttachment";
import { useChatSessions } from "./useChatSessions";
import {
  shouldAutoApprove, findAnchor, buildWelcomeMessage,
  cleanForDisplay, getLocalStorageData, detectSubjectFromMessage,
} from "@/lib/chat-utils";

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
      textarea.style.height = "56px";
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 56), 300) + "px";
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
  const isInputLocked = isTyping || !!streamingId;

  const fileAttach = useFileAttachment({ selectedSubject, userSubjects, userPrefs, router });

  const sessions = useChatSessions({
    setSelectedSubject, setMessages, setChatSessionId,
    setStreamingId, setStreamingContent, abortRef, allSubjects, userName,
    chatSessionId,
  });
  const { setAllSessions } = sessions;

  const scroll = useChatScroll(messages.length);

  const latestAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [pendingProposal, setPendingProposal] = useState<ToolProposal | null>(null);
  const [pendingProposalMessageId, setPendingProposalMessageId] = useState<string | null>(null);

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

  const sessionParam = searchParams.get("session");
  const subjectParam = searchParams.get("subject") as SubjectId | null;

  useEffect(() => {
    if (!sessionParam || !subjectParam) return;
    if (!allSubjects.find(s => s.id === subjectParam)) return;

    (async () => {
      const msgs = await chatStore.getMessages(sessionParam);
      setSelectedSubject(subjectParam);
      setChatSessionId(sessionParam);

      if (msgs.length === 0) {
        const subject = allSubjects.find(s => s.id === subjectParam);
        const welcomeContent = buildWelcomeMessage(subject?.label || subjectParam, userName);
        setMessages([{
          id: `welcome-${Date.now()}`,
          role: "assistant",
          content: welcomeContent,
          isNew: true,
          isWelcome: true,
        }]);
      } else {
        setMessages(msgs.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          isNew: false,
        })));
      }
    })();
  }, [userName, sessionParam, subjectParam]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const generateChatTitleIfNeeded = useCallback(async (
    newHistory: { role: string; content: string }[],
    allMessages: { id: string; role: string; content: string; isWelcome?: boolean }[],
    userInput: string,
    sessionId: string,
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
      const titleResponse = await generateChatTitle(realExchanges, currentUserMsg);
      let chatTitle = (titleResponse || "")
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
    selectedSubject, userHobbies,
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

    const subjectLabel = allSubjects.find(s => s.id === selectedSubject)?.label || selectedSubject || "this subject";

    if (target.isWelcome) {
      const nextContent = buildWelcomeMessage(subjectLabel, userName, target.content);
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
      const explicitAnchor = previousUser ? findAnchor(previousUser, userHobbies) : null;
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
    isInputLocked, messages, selectedSubject,
    latestAssistantId, buildContext, userName, analogyModeEnabled,
    userHobbies,
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

  const handleSubjectSelect = async (subjectId: SubjectId) => {
    setSelectedSubject(subjectId);
    setMessages([]);
    setStreamingId(null);

    if (!availableSubjectIds.has(subjectId)) return;
    const subject = allSubjects.find(s => s.id === subjectId);

    const welcomeContent = buildWelcomeMessage(subject?.label || subjectId, userName);
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
      sessions.setAllSessions(prev => [newSession, ...prev]);
    }

    window.dispatchEvent(new Event("chatSessionCreated"));
  };

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
  }, [pendingProposal, pendingProposalMessageId, router, messages, chatSessionId]);

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
    if ((!input.trim() && fileAttach.attachedFiles.length === 0) || isInputLocked) return;

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
      attachments: fileAttach.attachedFiles.length > 0 ? [...fileAttach.attachedFiles] : undefined
    };

    const anchorForRequest =
      analogyModeEnabled && userHobbies.length > 0
        ? findAnchor(input, userHobbies)
        : null;

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    fileAttach.setAttachedFiles([]);
    scroll.lockedToBottomRef.current = false;
    requestAnimationFrame(() => scroll.scrollToBottom("smooth"));
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
      let userContent = input;
      if (fileAttach.attachedFiles.length > 0) {
        const fileList = fileAttach.attachedFiles.map(f => `- ${f.name}`).join("\n");
        userContent = `${input}\n\n[Attached files]\n${fileList}\n\n[File contents]\n` +
          fileAttach.attachedFiles.map(f => `--- ${f.name} ---\n${f.extractedText}`).join("\n\n");
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

      const localStorageData = getLocalStorageData();

      // ── PRIMARY: Try streaming first ──
      const responseId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: responseId,
        role: "assistant",
        content: "",
        isStreaming: true,
        sources: researchSources,
        researchQuery: researchQuery || undefined,
      }]);
      setStreamingId(responseId);
      setStreamingContent("");
      scroll.lockedToBottomRef.current = false;

      let accumulated = "";
      let streamError: Error | null;

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const stream = getGroqStream(newHistory, context, localStorageData, abort.signal);
        for await (const token of stream) {
          if (abort.signal.aborted) break;
          accumulated += token;
          setStreamingContent(cleanForDisplay(accumulated));
        }

        if (abort.signal.aborted) {
          // Finalise (or remove) the streaming placeholder so an empty
          // "isStreaming" bubble never lingers after the user hits stop.
          setMessages(prev => accumulated.trim()
            ? prev.map(m => m.id === responseId ? { ...m, isStreaming: false, content: cleanForDisplay(accumulated) } : m)
            : prev.filter(m => m.id !== responseId));
          setStreamingId(null);
          setStreamingContent("");
          setIsTyping(false);
          abortRef.current = null;
          return;
        }
      } catch (err) {
        // A user-initiated abort surfaces here as an AbortError from reader.read().
        // Finalise (or remove) the streaming placeholder and stop without wasting a
        // non-streaming fallback call.
        if (abort.signal.aborted) {
          setMessages(prev => accumulated.trim()
            ? prev.map(m => m.id === responseId ? { ...m, isStreaming: false, content: cleanForDisplay(accumulated) } : m)
            : prev.filter(m => m.id !== responseId));
          setStreamingId(null);
          setStreamingContent("");
          setIsTyping(false);
          abortRef.current = null;
          return;
        }
        streamError = err instanceof Error ? err : new Error(String(err));
        console.warn("[Chat] Stream failed, falling back to non-streaming:", streamError.message);
      }

      // ── Streaming returned content ──
      if (accumulated.trim().length > 4) {
        const finalContent = cleanForDisplay(accumulated);
        setMessages(prev => prev.map(m =>
          m.id === responseId ? { ...m, isStreaming: false, content: finalContent } : m
        ));
        setStreamingId(null);
        setStreamingContent("");
        setIsTyping(false);
        abortRef.current = null;

        const trimmedAccumulated = accumulated.trim();
        const lastUserMsg = userContent.trim().toLowerCase();

        const isTrivialInput = lastUserMsg.length < 15 && /^(hi|hello|hey|sup|yo|ok|k|lol|thanks?|bye|good\s?(morning|evening|afternoon)|what'?s up|how are you|\?)$/i.test(lastUserMsg);

        const shouldExtract = trimmedAccumulated.length >= 20 && !isTrivialInput && lastUserMsg.length >= 10;

        if (shouldExtract) {
          const messagesForExtraction = [
            ...newHistory,
            { role: "assistant" as const, content: trimmedAccumulated },
          ];
          fetch("/api/ai/memory/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: messagesForExtraction, subjectId: selectedSubject }),
          })
            .then(r => { if (!r.ok) return null; return r.json(); })
            .then(d => { if (d) console.log("[memory] extract result:", d); })
            .catch(err => console.error("[memory] extract error:", err));
        }

        if (activeSessionId) {
          chatStore.addMessage(activeSessionId, "assistant", accumulated).catch(e => console.error("[Chat] addMessage assistant:", e));
          sessions.setAllSessions(prev =>
            [...prev.map(s => s.id === activeSessionId ? { ...s, updatedAt: new Date().toISOString() } : s)]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          );
          await generateChatTitleIfNeeded(newHistory, messages, input, activeSessionId);
        }
        return;
      }

      // ── FALLBACK: Non-streaming ──
      try {
        const result = await getGroqCompletion(newHistory, context);

        if (result.proposal) {
          const proposalId = (Date.now() + 2).toString();
          const proposalContent = result.content || "";
          // Drop the empty streaming placeholder (it never finalised) and show the
          // tool proposal message in its place.
          setMessages(prev => [
            ...prev.filter(m => m.id !== responseId),
            {
              id: proposalId,
              role: "assistant",
              content: proposalContent,
              isStreaming: true,
            },
          ]);

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
              generateChatTitleIfNeeded(newHistory, messages, input, activeSessionId);
            }
            setIsTyping(false);
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
            generateChatTitleIfNeeded(newHistory, messages, input, activeSessionId);
          }
          setIsTyping(false);
          return;
        }

        const fallbackContent = result.content || "I'm not sure how to answer that.";
        setMessages(prev => prev.map(m =>
          m.id === responseId ? { ...m, isStreaming: false, content: fallbackContent } : m
        ));
        setStreamingId(null);
        setStreamingContent("");

        if (activeSessionId) {
          chatStore.addMessage(activeSessionId, "assistant", result.content || "").catch(e => console.error("[Chat] addMessage assistant:", e));
          sessions.setAllSessions(prev =>
            [...prev.map(s => s.id === activeSessionId ? { ...s, updatedAt: new Date().toISOString() } : s)]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          );
          await generateChatTitleIfNeeded(newHistory, messages, input, activeSessionId);
        }
        setIsTyping(false);
        abortRef.current = null;
      } catch {
        setMessages(prev => [...prev, {
          id: (Date.now() + 3).toString(),
          role: "assistant",
          content: "I couldn't reach the AI service, you've either hit the rate limit of 1000 requests per day or you need to check your internet.",
        }]);
        setStreamingId(null);
        setStreamingContent("");
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
    ...sessions,
    ...fileAttach,
    ...scroll,
    copiedId, setCopiedId,
    pendingProposal, setPendingProposal,
    pendingProposalMessageId, setPendingProposalMessageId,
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
  };
}

export { allSubjects };
