"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowDown,
  Send,
  Brain,
  Lightbulb,
  RefreshCw,
  Square,
  Copy,
  Check,
  Shuffle,
  ChevronDown,
  BookOpen,
  X,
  Plus,
  Trash2,
  Paperclip,
  Target,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getGroqCompletion, getGroqStream, getReExplanation, generateFlashcards, generateStudyGuide, type GeneratedStudyGuide, generateQuizFromDocument, generateFlashcardsFromDocument } from "@/services/groq";
import { flashcardStore } from "@/utils/flashcardStore";
import { statsStore } from "@/utils/statsStore";
import { chatStore, ChatSession } from "@/utils/chatStore";
import { subjectStore } from "@/utils/subjectStore";
import { getFormulaSheet } from "@/data/formulaSheets";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { SUBJECT_CATALOG, SubjectId } from "@/constants/subjects";
import { buildInterestList } from "@/utils/interests";
import { extractFileText, ACCEPTED_FILE_TYPES } from "@/utils/extractFileText";
import { encodeStudyGuide } from "@/components/StudyGuideView";

// Splits AI response into { thinking, response } based on <think>...</think> tags.
// Handles: leading whitespace before <think>, missing </think> (model cut off mid-think),
// and <think> appearing anywhere in the response.
const parseThinkingContent = (content: string): { thinking: string | null; response: string } => {
  const trimmed = content.trimStart();

  // Case 1: <think>...</think> is present and complete — strip it out
  const completeMatch = trimmed.match(/^<think>([\s\S]*?)<\/think>\s*/);
  if (completeMatch) {
    const response = trimmed.slice(completeMatch[0].length).trim();
    // If the model ONLY returned a think block with no actual response, return a fallback
    if (!response) {
      return { thinking: completeMatch[1].trim(), response: "*(The model did not return a response after thinking. Please try again.)*" };
    }
    return { thinking: completeMatch[1].trim(), response };
  }

  // Case 2: <think> opened but </think> never closed (model cut off mid-think)
  // Treat everything inside as thinking, return fallback response
  const openOnly = trimmed.match(/^<think>([\s\S]*)$/);
  if (openOnly) {
    return {
      thinking: openOnly[1].trim(),
      response: "*(The model's reasoning was cut off. Please try again.)*",
    };
  }

  // Case 3: No think tags at all — return as-is
  return { thinking: null, response: content };
};

// Collapsible thinking block — like DeepSeek / Claude's reasoning UI
const ThinkingBlock = ({ content }: { content: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors mb-1.5"
      >
        <motion.svg
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.18 }}
          width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
        >
          <path d="M3 1.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </motion.svg>
        <span className="text-[11px] font-medium select-none tracking-wide">
          {open ? "Hide thinking" : "Show thinking"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="thinking-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-3 border-l-2 border-border/40">
              <div className="text-xs text-muted-foreground/55 italic leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0">
                <MarkdownRenderer content={content} className="text-xs" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── StreamingMessage ──────────────────────────────────────────────────────
// Simple streaming display - just render the content as it arrives
const StreamingMessage = ({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) => {
  return (
    <div className="text-sm leading-relaxed">
      <MarkdownRenderer content={content} className="text-sm leading-relaxed" streaming={isStreaming} />
    </div>
  );
};


interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  analogy?: string;
  imageUrl?: string;
  attachments?: Array<{ name: string; size: number; type: string; content: string; previewUrl?: string; isImage?: boolean }>;
  isStreaming?: boolean; // true while this message is still receiving tokens
  isNew?: boolean;       // kept for welcome message compat
  isWelcome?: boolean;
}

// Stub: image fetching was removed (unsplash.ts deleted)
const fetchImageForQuery = async (..._args: unknown[]): Promise<string | null> => null;

const allSubjects = SUBJECT_CATALOG;


/**
 * AI Tutor: This is where you actually talk to Analogix AI (the AI).
 * It uses your preferences to explain things in a way that makes sense to YOU.
 */
const Chat = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // CURRENT TOPIC: Detected or manually selected subject.
  // Starts null — detected automatically from first message, or set by user via badge.
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  const [subjectDetecting, setSubjectDetecting] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const subjectPickerRef = useRef<HTMLDivElement>(null);
  
  // CONVERSATION: All the messages you and the AI have exchanged.
  const [messages, setMessages] = useState<Message[]>([]);
  
  // INPUT: What you're currently typing in the box.
  const [input, setInput] = useState("");
  
  // THINKING: true while waiting for the first token
  const [isTyping, setIsTyping] = useState(false);
  
  // STREAMING: id of the message currently receiving tokens (null = idle)
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  // ANALOGY MODE: Toggle analogies on/off (session-only)
  const [analogyModeEnabled, setAnalogyModeEnabled] = useState(true);

  // RE-EXPLAIN: Track which message has the anchor picker open
  const [reExplainOpenId, setReExplainOpenId] = useState<string | null>(null);
  const [reExplainingId, setReExplainingId] = useState<string | null>(null);

  // FLASHCARDS: Saving session as flashcards
  const [savingFlashcards, setSavingFlashcards] = useState(false);
  const [flashcardsSaved, setFlashcardsSaved] = useState(false);

  // FORMULA SHEET: Side panel visibility
  const [formulaPanelOpen, setFormulaPanelOpen] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [formulaSearch, setFormulaSearch] = useState("");

  // CHAT HISTORY: Supabase session ID for saving messages
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

  // THREADS SIDEBAR: All previous chat sessions
  const [allSessions, setAllSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renamingThreadName, setRenamingThreadName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // FILE UPLOADS
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: number; type: string; content: string; extractedText: string; previewUrl?: string; isImage?: boolean }>>([]);
  const [fileExtracting, setFileExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // STUDY GUIDE GENERATION
  const [generatingStudyGuide, setGeneratingStudyGuide] = useState(false);
  const [studyGuideGenerated, setStudyGuideGenerated] = useState(false);

  // QUIZ GENERATION
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizGenerated, setQuizGenerated] = useState(false);

  // FLASHCARD GENERATION
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcardsGenerated, setFlashcardsGenerated] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const lockedToBottomRef = useRef(true);
  const lastContentLengthRef = useRef<number>(0);

  // RETRIEVING MEMORY: We pull your hobbies and subjects from the browser.
  const userPrefs =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("userPreferences") || "{}")
      : {};
  const userName = userPrefs.name || "Student";
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

  const latestAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  const findAnchor = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const matched = userHobbies.find((interest) => lower.includes(interest.toLowerCase()));
    return matched || null;
  }, [userHobbies]);

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
    `Nice, ${userName}. ${subjectLabel} unlocked.\n\nWhat should we explore first? I’ll make it click with things you actually like.`,
    `Alright ${userName}, ${subjectLabel} it is.\n\nName a concept and I’ll break it down so you're like "Ah, I get it now!"`,
    `Welcome, ${userName}. Let’s dive into ${subjectLabel}.\n\nWhat topic do you want to tackle today?`
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
    analogyIntensity: analogyModeEnabled ? 1 : 0,
    analogyAnchor: overrideAnchor ?? undefined,
    memoryManagement: false
  }), [
    selectedSubject,
    userSubjects,
    userHobbies,
    userPrefs.grade,
    userPrefs.state,
    userPrefs.learningStyle,
    analogyModeEnabled
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
      } catch {
        // Ignore copy failures.
      }
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
      const aiResponse = await getGroqCompletion(history, buildContext(explicitAnchor));
      setMessages((prev) => prev.map((m) => (
        m.id === messageId
          ? { ...m, id: `${messageId}-regen-${Date.now()}`, content: aiResponse.content || "I'm not sure how to answer that." }
          : m
      )));
    } catch {
      setMessages((prev) => prev.map((m) => (
        m.id === messageId
          ? { ...m, id: `${messageId}-regen-${Date.now()}`, content: "I couldn't reach the AI service. Try again in a moment." }
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
    buildWelcomeMessage
  ]);

  const handleSaveAsFlashcards = useCallback(async () => {
    if (!selectedSubject || messages.length < 2 || savingFlashcards) return;
    setSavingFlashcards(true);
    setFlashcardsSaved(false);

    const conversationText = messages
      .filter(m => !m.isWelcome)
      .map(m => `${m.role === "user" ? "Student" : "Analogix AI"}: ${m.content}`)
      .join("\n\n");

    const raw = await generateFlashcards(conversationText, selectedSubject, userPrefs.grade, 5);
    if (raw.length > 0) {
      await flashcardStore.add(raw.map(c => ({ subjectId: selectedSubject, front: c.front, back: c.back })));
      setFlashcardsSaved(true);
      setTimeout(() => setFlashcardsSaved(false), 3000);
    }
    setSavingFlashcards(false);
  }, [selectedSubject, messages, savingFlashcards, userPrefs.grade]);

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

  // Close subject picker on outside click
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

  // AUTO-DETECT SUBJECT: lightweight call after first user message.
  // Like Shazam for school subjects — listen to what the student typed,
  // figure out what subject it belongs to.
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

  // RESUME SESSION: Load a past session from Supabase if ?session=<id> is in the URL
  useEffect(() => {
    const sessionId = searchParams.get("session");
    const subjectParam = searchParams.get("subject") as SubjectId | null;
    if (!sessionId || !subjectParam) return;

    // Validate subject
    if (!allSubjects.find(s => s.id === subjectParam)) return;

    (async () => {
      const msgs = await chatStore.getMessages(sessionId);
      setSelectedSubject(subjectParam);
      setChatSessionId(sessionId);

      if (msgs.length === 0) {
        // Session exists but no messages — show a fresh welcome
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildWelcomeMessage]);

  // LOAD ALL SESSIONS: Fetch the user's chat history on mount
  useEffect(() => {
    const loadSessions = async () => {
      setSessionsLoading(true);
      const sessions = await chatStore.getSessions();
      setAllSessions(sessions);
      setSessionsLoading(false);
    };
    loadSessions();
  }, []);

  // Lock to bottom when streaming starts
  useEffect(() => {
    if (streamingId || isTyping) {
      lockedToBottomRef.current = true;
    }
  }, [streamingId, isTyping]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    updateScrollButton();
  }, [messages.length, updateScrollButton]);

  // PICKING A TOPIC: This runs when you select a subject icon.
  const handleSubjectSelect = async (subjectId: SubjectId) => {
    setSelectedSubject(subjectId);
    setMessages([]);
    setStreamingId(null);

    if (!availableSubjectIds.has(subjectId)) return;
    const subject = allSubjects.find(s => s.id === subjectId);

    // Show welcome message immediately
    const welcomeContent = buildWelcomeMessage(subject?.label || subjectId);
    const welcomeMsg: Message = {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content: welcomeContent,
      isNew: true,
      isWelcome: true,
    };
    setMessages([welcomeMsg]);

    // Create a Supabase session for this chat
    const sessionId = await chatStore.createSession(subjectId, "New chat");
    setChatSessionId(sessionId);
    
    // Add the new session to the sidebar immediately
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

  // TALKING TO THE AI: This is where the magic happens!
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
          content: "", // not used anymore
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

  // Convert study guide to HTML for RichEditor
  const convertStudyGuideToHtml = (guide: GeneratedStudyGuide): string => {
    const escapeHtml = (text: string) => text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    let html = `
      <h1 style="font-size: 2em; margin-bottom: 0.5em; color: var(--primary);">${escapeHtml(guide.title)}</h1>
      <div style="display: flex; gap: 1em; margin-bottom: 1.5em; padding: 1em; background: var(--muted); border-radius: 8px;">
        <div><strong>Assessment Type:</strong> ${escapeHtml(guide.assessmentType)}</div>
        <div><strong>Due Date:</strong> ${escapeHtml(guide.assessmentDate)}</div>
      </div>

      <h2 style="font-size: 1.5em; margin: 1.5em 0 0.75em; color: var(--foreground);">📚 Topics Covered</h2>
      <ul style="list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.5em;">
        ${guide.topics.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
      </ul>

      <h2 style="font-size: 1.5em; margin: 1.5em 0 0.75em; color: var(--foreground);">📅 Study Schedule</h2>
      <div style="display: flex; flex-direction: column; gap: 1em; margin-bottom: 1.5em;">
        ${guide.studySchedule.map(week => `
          <div style="padding: 1em; border: 1px solid var(--border); border-radius: 8px; background: var(--card);">
            <h3 style="font-size: 1.1em; margin-bottom: 0.5em; color: var(--primary);">Week ${week.week}: ${escapeHtml(week.label)}</h3>
            <ul style="list-style-type: disc; padding-left: 1.5em;">
              ${week.tasks.map(t => `<li style="margin-bottom: 0.25em;">${escapeHtml(t)}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>

      <h2 style="font-size: 1.5em; margin: 1.5em 0 0.75em; color: var(--foreground);">🧠 Key Concepts</h2>
      <div style="display: flex; flex-direction: column; gap: 1em; margin-bottom: 1.5em;">
        ${guide.keyConcepts.map(concept => `
          <div style="padding: 1em; border-left: 3px solid var(--primary); background: var(--muted); border-radius: 0 8px 8px 0;">
            <h3 style="font-size: 1.1em; margin-bottom: 0.5em; color: var(--foreground);">${escapeHtml(concept.title)}</h3>
            <p style="line-height: 1.7; white-space: pre-wrap;">${escapeHtml(concept.content)}</p>
          </div>
        `).join('')}
      </div>

      <h2 style="font-size: 1.5em; margin: 1.5em 0 0.75em; color: var(--foreground);">✏️ Practice Questions</h2>
      <div style="display: flex; flex-direction: column; gap: 1.5em; margin-bottom: 1.5em;">
        ${guide.practiceQuestions.map((pq, i) => `
          <div style="padding: 1em; border: 1px solid var(--border); border-radius: 8px;">
            <p style="font-weight: 600; margin-bottom: 0.75em;">Q${i + 1}: ${escapeHtml(pq.question)}</p>
            <div style="padding: 0.75em; background: var(--success)/10; border-radius: 6px; color: var(--success); white-space: pre-wrap;">
              <strong>Answer:</strong> ${escapeHtml(pq.answer)}
            </div>
          </div>
        `).join('')}
      </div>

      <h2 style="font-size: 1.5em; margin: 1.5em 0 0.75em; color: var(--foreground);">📖 Recommended Resources</h2>
      <ul style="list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.5em;">
        ${guide.resources.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
      </ul>

      <h2 style="font-size: 1.5em; margin: 1.5em 0 0.75em; color: var(--foreground);">💡 Study Tips</h2>
      <ul style="list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.5em;">
        ${guide.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
      </ul>

      ${guide.commonMistakes && guide.commonMistakes.length > 0 ? `
        <h2 style="font-size: 1.5em; margin: 1.5em 0 0.75em; color: var(--foreground);">⚠️ Common Mistakes to Avoid</h2>
        <ul style="list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.5em;">
          ${guide.commonMistakes.map(m => `<li>${escapeHtml(m)}</li>`).join('')}
        </ul>
      ` : ''}

      ${guide.glossary && guide.glossary.length > 0 ? `
        <h2 style="font-size: 1.5em; margin: 1.5em 0 0.75em; color: var(--foreground);">📖 Glossary</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.75em; margin-bottom: 1.5em;">
          ${guide.glossary.map(g => `
            <div style="padding: 0.75em; background: var(--muted); border-radius: 6px;">
              <strong style="color: var(--primary);">${escapeHtml(g.term)}</strong>
              <p style="margin-top: 0.25em; font-size: 0.9em; line-height: 1.5;">${escapeHtml(g.definition)}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    return html;
  };

  // Generate study guide from attached files — redirect to full loading page
  const handleGenerateStudyGuide = useCallback(async () => {
    if (!selectedSubject || attachedFiles.length === 0 || generatingStudyGuide) return;

    const combinedText = attachedFiles
      .map(f => `File: ${f.name}\n\n${f.extractedText}`)
      .join("\n\n---\n\n");

    const subject = SUBJECT_CATALOG.find(s => s.id === selectedSubject);
    const fileName = attachedFiles.map(f => f.name).join(", ");

    sessionStorage.setItem("studyGuideJob", JSON.stringify({
      assessmentText: combinedText,
      fileName,
      subjectId: selectedSubject,
      grade: userPrefs.grade,
    }));

    router.push("/study-guide-loading");
  }, [selectedSubject, attachedFiles, generatingStudyGuide, userPrefs.grade, router]);

  // Generate quiz from attached files
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

  // Generate flashcards from attached files
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
      await flashcardStore.add(result.map(f => ({ subjectId: selectedSubject, front: f.front, back: f.back })));
      setFlashcardsGenerated(true);
      setTimeout(() => setFlashcardsGenerated(false), 3000);
      router.push(`/flashcards?subject=${selectedSubject}`);
    } catch (error) {
      console.error("Failed to generate flashcards:", error);
    } finally {
      setGeneratingFlashcards(false);
    }
  }, [selectedSubject, attachedFiles, generatingFlashcards, userPrefs.grade, router]);

  const handleSend = () => {
    if ((!input.trim() && attachedFiles.length === 0) || isInputLocked) return;

    // 1. We show your message on the screen immediately.
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
    setAttachedFiles([]); // Clear attachments after sending
    lockedToBottomRef.current = true;
    setIsTyping(true); // Show the "thinking" dots.

    // AUTO-DETECT SUBJECT: only fire if the message looks academic (>3 words, not just a greeting)
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

    // Record the conversation
    if (selectedSubject) {
      statsStore.recordChat(allSubjects.find(s => s.id === selectedSubject)?.label || selectedSubject);
    }

    // Save user message to Supabase
    if (chatSessionId) {
      const messageWithFiles = input + (attachedFiles.length > 0 ? `\n\n[Attached files: ${attachedFiles.map(f => f.name).join(', ')}]` : '');
      chatStore.addMessage(chatSessionId, "user", messageWithFiles);
      
      // Update the session's updatedAt timestamp in sidebar
      setAllSessions(prev => {
        const updated = prev.map(s => 
          s.id === chatSessionId 
            ? { ...s, updatedAt: new Date().toISOString() }
            : s
        );
        // Move to top by sorting by updatedAt descending
        return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    }
    
    // 2. We talk to the AI brain behind the scenes.
    (async () => {
      // Build content with file attachments included
      let userContent = input;
      if (attachedFiles.length > 0) {
        const fileList = attachedFiles.map(f => `- ${f.name}`).join("\n");
        userContent = `${input}\n\n[Attached files]\n${fileList}\n\n[File contents]\n` +
          attachedFiles.map(f => `--- ${f.name} ---\n${f.extractedText}`).join("\n\n");
      }

      // We package up the chat history so the AI remembers what we've already said.
      const messagesHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const newHistory = [...messagesHistory, { role: "user" as const, content: userContent }];
      
      // We also give the AI "Context" (your hobbies and style).
    const context = buildContext(anchorForRequest);

      try {
        // Create a placeholder message that we'll fill with streaming tokens
        const responseId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
          id: responseId,
          role: "assistant",
          content: "",
          isStreaming: true,
        }]);
        setIsTyping(false);
        setStreamingId(responseId);
        lockedToBottomRef.current = true;
        
        // Scroll to bottom immediately when streaming starts
        requestAnimationFrame(() => {
          const el = scrollContainerRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });

        const abort = new AbortController();
        abortRef.current = abort;
        let accumulated = "";

        // Throttle renders for readability - update every ~100ms (about 10 updates/second)
        // This lets users follow along comfortably without feeling rushed
        let lastRenderTime = 0;
        const RENDER_INTERVAL = 100;

        const stream = getGroqStream(newHistory, context);
        for await (const token of stream) {
          if (abort.signal.aborted) break;
          accumulated += token;

          const now = Date.now();
          // Only render if enough time has passed
          if (now - lastRenderTime > RENDER_INTERVAL) {
            // Hide the <ACTIONS> block while streaming so user never sees raw JSON
            const displayAccumulated = accumulated.replace(/<ACTIONS>[\s\S]*?(<\/ACTIONS>|$)/i, "").trim();
            setMessages(prev => prev.map(m =>
              m.id === responseId ? { ...m, content: displayAccumulated } : m
            ));
            lastRenderTime = now;

            // Keep scrolled to bottom while streaming
            if (lockedToBottomRef.current) {
              const el = scrollContainerRef.current;
              if (el) el.scrollTop = el.scrollHeight;
            }
          }
        }

        // ── Parse and execute any <ACTIONS> block from the response ──────────
        let displayContent = accumulated || "I'm not sure how to answer that.";
        const actionsMatch = accumulated.match(/<ACTIONS>([\s\S]*?)<\/ACTIONS>/i);
        if (actionsMatch) {
          // Strip the actions block from what the user sees
          displayContent = accumulated.replace(/<ACTIONS>[\s\S]*?<\/ACTIONS>/i, "").trim();
          try {
            const cleaned = actionsMatch[1].trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
            const parsed = JSON.parse(cleaned);
            const actions = Array.isArray(parsed) ? parsed : [parsed];
            console.log("[Chat] dispatching", actions.length, "action(s)");
            // Fire-and-forget — don't block the UI
            fetch("/api/groq/agent-action", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ actions }),
            })
              .then(r => r.json())
              .then(data => {
                console.log("[Chat] agent-action results:", data.results);
                if (data.results?.length) {
                  window.dispatchEvent(new CustomEvent("subjectDataUpdated", { detail: { results: data.results } }));
                }
              })
              .catch(err => console.error("[Chat] agent-action error:", err));
          } catch (e) {
            console.warn("[Chat] Failed to parse ACTIONS block:", e);
          }
        }

        // Final update with any remaining content
        setMessages(prev => prev.map(m =>
          m.id === responseId ? { ...m, isStreaming: false, content: displayContent } : m
        ));
        const el = scrollContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
        setStreamingId(null);

        // Save to Supabase
        if (chatSessionId) {
          chatStore.addMessage(chatSessionId, "assistant", accumulated);
          setAllSessions(prev =>
            [...prev.map(s => s.id === chatSessionId ? { ...s, updatedAt: new Date().toISOString() } : s)]
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          );
          const isFirstExchange = messages.length === 1 && messages[0].isWelcome;
          if (isFirstExchange) {
            try {
              const titlePrompt = [{ role: "user" as const, content: `Based on this question: "${input}", generate a very short (2-4 words) title for this chat. Only respond with the title, nothing else.` }];
              const titleResponse = await getGroqCompletion(titlePrompt, buildContext(null));
              const chatTitle = (titleResponse.content || "New chat").trim().slice(0, 50);
              await chatStore.updateSessionTitle(chatSessionId, chatTitle);
              setAllSessions(prev => prev.map(s => s.id === chatSessionId ? { ...s, title: chatTitle } : s));
            } catch {}
          }
        }
      } catch {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I couldn't reach the AI service. Try again in a moment.",
        }]);
        setStreamingId(null);
      } finally {
        setIsTyping(false);
        abortRef.current = null;
      }
    })();
  };

  const handleNewTopic = async () => {
    if (!selectedSubject || isInputLocked) return;

    // AI GENERATION: Always ask the AI for a new topic from the start.
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
        content: "I couldn't reach the AI service. Try again in a moment.",
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
    abortRef.current?.abort();
  };

  const handleDeleteThread = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    // Update the session in the store
    await chatStore.updateSessionTitle(sessionId, renamingThreadName);
    setAllSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, title: renamingThreadName } : s
    ));
    setRenamingThreadId(null);
    setRenamingThreadName("");
  };

  return (
    <div className="h-full flex flex-row relative overflow-hidden bg-background">
      {/* Threads Sidebar */}
      <div className="flex-shrink-0 overflow-hidden" style={{ width: sidebarOpen ? 272 : 0, transition: 'width 0.25s ease' }}>
      <motion.div
        animate={{ opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col my-2 ml-2 mr-0 rounded-2xl border border-border/20 overflow-hidden bg-card/60 backdrop-blur-sm shadow-sm"
        style={{ width: 256, height: 'calc(100% - 16px)' }}
      >
        {/* New Chat */}
        <div className="flex-shrink-0 p-3 pt-4">
          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <Plus className="w-4 h-4" />
            New chat
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search…"
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-md bg-muted/40 border-0 placeholder-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-border transition-all"
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="overflow-y-auto flex-1 min-h-0 px-2 py-1 space-y-0.5">
          {sessionsLoading ? (
            <div className="flex items-center justify-center h-16 text-muted-foreground/50 text-xs">Loading…</div>
          ) : (() => {
            // Show all sessions, not filtered by subject
            let filteredSessions = allSessions;
            if (threadSearch.trim()) {
              const q = threadSearch.toLowerCase();
              filteredSessions = filteredSessions.filter(s => {
                const sub = allSubjects.find(x => x.id === s.subjectId);
                return (sub?.label || s.subjectId).toLowerCase().includes(q) || s.title.toLowerCase().includes(q);
              });
            }
            return filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 text-muted-foreground/40 text-xs text-center px-3">
                <p>{threadSearch ? "No results" : "No chats yet"}</p>
              </div>
            ) : (
              <>
                {filteredSessions.map((session) => {
                  const isActive = chatSessionId === session.id;
                  const isRenaming = renamingThreadId === session.id;
                  const subjectInfo = allSubjects.find(s => s.id === session.subjectId);
                  return (
                    <div
                      key={session.id}
                      className={`group relative rounded-md transition-all ${isActive ? "bg-muted/70" : "hover:bg-muted/40"}`}
                    >
                      <button
                        onClick={() => handleSwitchThread(session)}
                        className="w-full text-left px-3 py-2 flex flex-col gap-0.5 min-h-[40px]"
                      >
                        {isRenaming ? (
                          <input
                            autoFocus
                            type="text"
                            value={renamingThreadName}
                            onChange={(e) => setRenamingThreadName(e.target.value)}
                            onBlur={() => handleRenameThread(session.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameThread(session.id);
                              else if (e.key === "Escape") setRenamingThreadId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-1 text-sm bg-transparent border-b border-border focus:outline-none"
                          />
                        ) : (
                          <>
                            <p className={`text-sm truncate leading-snug ${isActive ? "text-foreground font-medium" : "text-foreground/70"}`}>
                              {session.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground/50 truncate">{subjectInfo?.label || session.subjectId}</p>
                          </>
                        )}
                      </button>
                      {!isRenaming && (
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setRenamingThreadId(session.id); setRenamingThreadName(session.title); }}
                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/60">
                            <RefreshCw className="w-3 h-3" />
                          </button>
                          <button onClick={(e) => handleDeleteThread(session.id, e)}
                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      </motion.div>
      </div>{/* end sidebar wrapper */}

      <div className="flex-1 flex flex-col w-full relative overflow-hidden">
        {/* Header */}
        <motion.header
          className="flex items-center justify-between py-2.5 px-4 border-b border-border/20"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              title="Toggle chat history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Right: actions only */}
          <div className="flex items-center gap-1">
            {selectedSubject && (
              <button
                onClick={handleNewTopic}
                disabled={isInputLocked}
                className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all disabled:opacity-40"
                title="New topic"
              >
                <RefreshCw className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            )}
            <button
              onClick={handleStartNewChat}
              className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              title="New chat"
            >
              <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </motion.header>

          {/* Chat always visible — subject auto-detected from first message */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Slim toolbar */}
            <div className="flex items-center px-2 sm:px-4 py-2 sm:py-1.5 border-b border-border/10 gap-2 sm:gap-3">
              {/* Subject badge — auto-detected, tappable to override */}
              <div className="relative" ref={subjectPickerRef}>
                <button
                  onClick={() => setShowSubjectPicker(o => !o)}
                  className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-foreground transition-all group"
                >
                  {subjectDetecting ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                  ) : selectedSubject ? (
                    (() => { const s = allSubjects.find(x => x.id === selectedSubject); const Icon = s?.icon; return Icon ? <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground/70 transition-colors" /> : null; })()
                  ) : (
                    <BookOpen className="w-3.5 h-3.5 text-muted-foreground/50" />
                  )}
                  <span className={selectedSubject ? "" : "text-muted-foreground/50"}>
                    {subjectDetecting ? "Detecting…" : selectedSubject ? allSubjects.find(s => s.id === selectedSubject)?.label : "Subject"}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-40" />
                </button>
                <AnimatePresence>
                  {showSubjectPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-8 z-50 w-52 rounded-xl border border-border bg-card shadow-xl p-1.5 max-h-72 overflow-y-auto"
                    >
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Set subject</p>
                      {availableSubjects.map(subject => {
                        const Icon = subject.icon;
                        return (
                          <button
                            key={subject.id}
                            type="button"
                            onClick={() => { setSelectedSubject(subject.id); setShowSubjectPicker(false); }}
                            className={`w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${
                              selectedSubject === subject.id
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-muted/60 text-foreground"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            {subject.label}
                          </button>
                        );
                      })}
                      {availableSubjects.length === 0 && (
                        <p className="text-xs text-muted-foreground/60 px-2 py-2">No subjects set. Add them in your profile.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-3.5 w-px bg-border/40" />

              {/* Analogy toggle */}
              <button
                onClick={() => setAnalogyModeEnabled(p => !p)}
                disabled={isInputLocked}
                className={`text-xs px-0 py-0 transition-all ${analogyModeEnabled ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                title={analogyModeEnabled ? "Switch to school-focused answers" : "Switch to real-world learning with analogies"}
              >
                {analogyModeEnabled ? "Learning Mode" : "Schoolwork!"}
              </button>

              <div className="h-3.5 w-px bg-border/40" />

              {/* Flashcards */}
              <button
                onClick={handleSaveAsFlashcards}
                disabled={isInputLocked || messages.filter(m => !m.isWelcome).length < 2}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all disabled:opacity-30"
              >
                {savingFlashcards ? <RefreshCw className="w-3 h-3 animate-spin" /> : flashcardsSaved ? <Check className="w-3 h-3 text-primary" /> : <BookOpen className="w-3 h-3" />}
                {flashcardsSaved ? "Saved to flashcards" : "Save as flashcards"}
              </button>

              {getFormulaSheet(selectedSubject || "") && (
                <>
                  <div className="h-3.5 w-px bg-border/40" />
                  <button
                    onClick={() => setFormulaPanelOpen(o => !o)}
                    className={`text-xs transition-all ${formulaPanelOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Formula sheet
                  </button>
                </>
              )}

              <div className="ml-auto text-[10px] text-muted-foreground/40">
                Analogix AI may make mistakes — always verify
              </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
              {/* Main chat column */}
              <div
                className="flex-1 min-h-0 relative"
                onDragEnter={handleDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleFileDrop}
              >
              {isDraggingFiles && (
                <div className="absolute inset-3 z-40 rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 pointer-events-none flex items-center justify-center">
                  <div className="text-xs font-semibold text-primary">
                    Drop files to attach
                  </div>
                </div>
              )}
              {/* Messages - sleek chat bubbles */}
              <div
                ref={scrollContainerRef}
                onScroll={updateScrollButton}
                className="absolute inset-0 overflow-y-auto min-h-0 chat-scroll"
              >
                <div className="mx-auto w-full max-w-6xl px-4 flex flex-col space-y-6 pb-40 sm:pb-28 pt-4 sm:pt-4">
                  {/* Empty state — shown before any messages */}
                  {messages.length === 0 && !isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center justify-center h-full min-h-[40vh] gap-3 text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Lightbulb className="w-6 h-6 text-primary/70" />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground/80">
                          {userName ? `Hey ${userName}, what are you studying?` : "What are you studying?"}
                        </p>
                        <p className="text-sm text-muted-foreground/60 mt-1">
                          Ask about any concept — I’ll explain it with your interests
                        </p>
                      </div>
                    </motion.div>
                  )}
                  <AnimatePresence>
                    {messages.map((message, index) => {
                      const canRegenerate =
                        message.role === "assistant" &&
                        (message.isWelcome ||
                          (message.id === latestAssistantId && messages[index - 1]?.role === "user"));

                      return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: message.role === "user" ? 16 : -8, x: message.role === "user" ? 20 : -20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {message.role === "assistant" ? (
                          <div className="max-w-[90%] sm:max-w-[85%] message-bubble-assistant">
                            <div className="mb-2" />
                            <>
                              {(() => {
                                const { thinking } = parseThinkingContent(message.content);
                                return thinking ? <ThinkingBlock content={thinking} /> : null;
                              })()}
                              {message.imageUrl && (
                                <a
                                  href={message.imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block mb-3 rounded-xl overflow-hidden border border-border/60 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/40 ring-offset-2 ring-offset-transparent"
                                >
                                  <img
                                    src={message.imageUrl}
                                    alt="Related to this topic"
                                    className="w-full max-h-56 object-cover"
                                    loading="lazy"
                                  />
                                </a>
                              )}
                              <StreamingMessage
                                content={parseThinkingContent(message.content).response}
                                isStreaming={!!message.isStreaming}
                              />
                              <div className="mt-3 flex items-center justify-between gap-0.5">
                                {/* Explain it differently */}
                                <div className="relative">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setReExplainOpenId(prev => prev === message.id ? null : message.id)}
                                    disabled={isInputLocked}
                                    className="h-7 gap-1.5 px-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  >
                                    {reExplainingId === message.id ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Shuffle className="w-3 h-3" />
                                    )}
                                    Explain differently
                                    <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                                  </Button>
                                  <AnimatePresence>
                                    {reExplainOpenId === message.id && (
                                      <motion.div
                                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute left-0 top-9 z-50 w-56 rounded-xl border border-border bg-card shadow-xl p-2"
                                      >
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                                          Anchor to interest
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => handleReExplain(message.id)}
                                          className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-muted/60 text-foreground font-medium"
                                        >
                                          🎲 Surprise me
                                        </button>
                                        {userHobbies.map(interest => (
                                          <button
                                            key={interest}
                                            type="button"
                                            onClick={() => handleReExplain(message.id, interest)}
                                            className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-muted/60 text-foreground truncate"
                                          >
                                            {interest}
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                <div className="flex items-center opacity-70 hover:opacity-100 transition-opacity">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCopy(parseThinkingContent(message.content).response, message.id)}
                                    aria-label="Copy response"
                                    title="Copy response"
                                    className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                  >
                                    {copiedId === message.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </Button>
                                  {canRegenerate && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRegenerate(message.id)}
                                      disabled={isInputLocked}
                                      aria-label="Regenerate response"
                                      title="Regenerate response"
                                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-2">
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2 mr-4">
                                {message.attachments.map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                                    {file.isImage && file.previewUrl ? (
                                      <img
                                        src={file.previewUrl}
                                        alt={file.name}
                                        className="w-6 h-6 rounded-md object-cover border border-primary/30"
                                      />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-primary" />
                                    )}
                                    <span className="text-xs text-foreground max-w-[120px] truncate">{file.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="max-w-[85%] sm:max-w-[75%] message-bubble-user">
                              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                <MarkdownRenderer content={message.content} />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopy(message.content, message.id)}
                              aria-label="Copy prompt"
                              title="Copy prompt"
                              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors sm:h-7 sm:w-7"
                            >
                              {copiedId === message.id ? <Check className="w-4 h-4 sm:w-3 sm:h-3" /> : <Copy className="w-4 h-4 sm:w-3 sm:h-3" />}
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    );
                    })}
                  </AnimatePresence>

                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="flex justify-start"
                    >
                      <div className="message-bubble-assistant">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <Lightbulb className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex gap-1 items-end h-5">
                            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                              <div key={i} className="typing-dot" style={{ alignSelf: "flex-end" }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {showScrollToBottom && (
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  onClick={() => {
                    lockedToBottomRef.current = true;
                    scrollToBottom("smooth");
                  }}
                  aria-label="Scroll to latest"
                  title="Scroll to latest"
                  className="absolute bottom-32 sm:bottom-24 left-1/2 -translate-x-1/2 z-40 h-9 w-9 rounded-full bg-primary/40 text-white/90 shadow-md backdrop-blur hover:bg-primary/60"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
              )}

              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 sm:h-16 bg-gradient-to-t from-background via-background/90 to-transparent z-20" />

              {/* Input */}
              <motion.div
              className="absolute bottom-0 left-0 right-0 z-30 px-3 sm:px-4 pb-[max(env(safe-area-inset-bottom,0px)+8px)] sm:pb-4 pt-2 pointer-events-auto"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mx-auto w-full max-w-3xl">
                {/* Attached files preview */}
                {attachedFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {attachedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/60 border border-border/40">
                        {file.isImage && file.previewUrl ? (
                          <img
                            src={file.previewUrl}
                            alt={file.name}
                            className="w-6 h-6 rounded-md object-cover border border-border/40"
                          />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="text-xs text-foreground max-w-[120px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {selectedSubject && (
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGenerateFlashcards}
                          disabled={generatingFlashcards}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                          title="Generate flashcards from uploaded documents"
                        >
                          {generatingFlashcards ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : flashcardsGenerated ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Brain className="w-3.5 h-3.5" />
                          )}
                          {generatingFlashcards ? 'Generating...' : flashcardsGenerated ? 'Created!' : 'Flashcards'}
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateQuiz}
                          disabled={generatingQuiz}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/20 transition-all disabled:opacity-50"
                          title="Generate quiz from uploaded documents"
                        >
                          {generatingQuiz ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : quizGenerated ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Target className="w-3.5 h-3.5" />
                          )}
                          {generatingQuiz ? 'Generating...' : quizGenerated ? 'Created!' : 'Quiz'}
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateStudyGuide}
                          disabled={generatingStudyGuide}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                          title="Generate comprehensive study guide"
                        >
                          {generatingStudyGuide ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : studyGuideGenerated ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <BookOpen className="w-3.5 h-3.5" />
                          )}
                          {generatingStudyGuide ? 'Generating...' : studyGuideGenerated ? 'Guide Created!' : 'Study Guide'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={selectedSubject ? `Ask anything about ${allSubjects.find(s => s.id === selectedSubject)?.label}…` : `Ask me anything — maths, science, history…`}
                    rows={Math.max(1, Math.min(8, Math.ceil(input.length / 80) || 1))}
                    className="w-full px-3 sm:px-4 pt-3.5 pb-12 text-sm sm:text-base bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 resize-none overflow-y-auto max-h-48 leading-relaxed"
                  />
                  {/* Bottom row of input */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 sm:px-3 pb-2 sm:pb-3">
                    <div className="relative w-9 h-9 sm:w-8 sm:h-8 group">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        accept={ACCEPTED_FILE_TYPES}
                        disabled={fileExtracting}
                        aria-label="Attach files"
                      />
                      <button
                        type="button"
                        disabled={fileExtracting}
                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground transition-all disabled:opacity-50 group-hover:bg-primary/10 group-hover:text-primary"
                        title={fileExtracting ? "Extracting file…" : "Attach files"}
                        aria-hidden="true"
                        tabIndex={-1}
                      >
                        {fileExtracting
                          ? <RefreshCw className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin" />
                          : <Paperclip className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
                      </button>
                    </div>
                    {(isTyping || streamingId) ? (
                      <button
                        type="button"
                        onClick={() => { abortRef.current?.abort(); setStreamingId(null); setIsTyping(false); }}
                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-foreground/10 hover:bg-foreground/20 flex items-center justify-center text-foreground/70 transition-all"
                      >
                        <Square className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!input.trim() && attachedFiles.length === 0}
                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center text-white transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Send className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                </div> {/* end max-w-3xl wrapper */}
              </motion.div>
            </div>

              {/* Formula sheet side panel */}
              <AnimatePresence>
                {formulaPanelOpen && selectedSubject && (() => {
                  const sheet = getFormulaSheet(selectedSubject);
                  if (!sheet) return null;
                  const topics = [...new Set(sheet.formulas.map(f => f.topic))];
                  return (
                    <motion.div
                      key="formula-panel"
                      initial={{ opacity: 0, x: 20, width: 0 }}
                      animate={{ opacity: 1, x: 0, width: "280px" }}
                      exit={{ opacity: 0, x: 20, width: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      className="hidden sm:flex flex-col border border-border rounded-xl bg-card overflow-hidden shrink-0 max-h-[calc(100vh-180px)]"
                      style={{ width: 280 }}
                    >
                      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                        <span className="text-xs font-bold text-foreground">{sheet.label} Formulas</span>
                        <button type="button" onClick={() => setFormulaPanelOpen(false)}
                          className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="px-2 py-1.5 border-b border-border/60">
                        <input
                          type="text"
                          placeholder="Search formulas..."
                          value={formulaSearch}
                          onChange={(e) => setFormulaSearch(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded-md bg-muted/50 border border-border/40 placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-1 formula-scroll">
                        {(() => {
                          const query = formulaSearch.trim().toLowerCase();
                          if (query) {
                            // Flat search results mode
                            const results = sheet.formulas.filter(f =>
                              f.name.toLowerCase().includes(query) ||
                              f.description.toLowerCase().includes(query) ||
                              f.topic.toLowerCase().includes(query)
                            );
                            if (results.length === 0) {
                              return <p className="text-xs text-muted-foreground/60 text-center py-4">No formulas found</p>;
                            }
                            return results.map(formula => (
                              <div key={formula.name}
                                className="px-2.5 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-default">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-0.5">{formula.topic}</p>
                                <p className="text-[11px] font-semibold text-foreground mb-1">{formula.name}</p>
                                <MarkdownRenderer content={`$${formula.latex}$`} className="text-[11px] text-primary" />
                                <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{formula.description}</p>
                              </div>
                            ));
                          }
                          // Default grouped topic view
                          return topics.map(topic => {
                            const isExpanded = expandedTopics.has(topic);
                            const topicFormulas = sheet.formulas.filter(f => f.topic === topic);
                            return (
                              <div key={topic} className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedTopics);
                                    if (newExpanded.has(topic)) { newExpanded.delete(topic); } else { newExpanded.add(topic); }
                                    setExpandedTopics(newExpanded);
                                  }}
                                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
                                >
                                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 group-hover:text-foreground/80 flex-1 text-left">
                                    {topic} <span className="font-normal opacity-50">({topicFormulas.length})</span>
                                  </span>
                                  <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 ml-1">
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />
                                  </motion.div>
                                </button>
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden space-y-1.5 pl-1"
                                    >
                                      {topicFormulas.map(formula => (
                                        <div key={formula.name}
                                          className="px-2.5 py-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-default">
                                          <p className="text-[11px] font-semibold text-foreground mb-1">{formula.name}</p>
                                          <MarkdownRenderer content={`$${formula.latex}$`} className="text-[11px] text-primary" />
                                          <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{formula.description}</p>
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Chat;
