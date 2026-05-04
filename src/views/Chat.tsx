/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { NextConfig } from 'next';
import {
  ArrowLeft,
  ArrowDown,
  Send,
  Brain,
  Sigma,
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
  Search,
  Library,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Sparkles,
  Atom,
  Settings2,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getGroqCompletion, getGroqStream, getReExplanation, generateFlashcards, generateQuizFromDocument, generateFlashcardsFromDocument } from "@/services/groq";
import { searchAcademicSources } from "@/services/research";
import { flashcardStore } from "@/utils/flashcardStore";
import { statsStore } from "@/utils/statsStore";
import { chatStore, ChatSession, checkChatStoreHealth } from "@/utils/chatStore";
import { subjectStore } from "@/utils/subjectStore";
import { getFormulaSheet } from "@/data/formulaSheets";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { SUBJECT_CATALOG, SubjectId } from "@/constants/subjects";
import { buildInterestList } from "@/utils/interests";
import { extractFileText, ACCEPTED_FILE_TYPES } from "@/utils/extractFileText";
import type { ResearchSource, SavedResearchSource } from "@/types/research";
import { researchStore } from "@/utils/researchStore";
import AISettingsSheet from "@/components/AISettingsSheet";
import { GROQ_MODELS, getModelBranding, type GroqModelId } from "@/types/groq-models";

// Caching
const nextConfig: NextConfig = {
  cacheComponents: true,
}

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
// Fades in new content as it arrives instead of a typewriter effect.
// Think of it like a Polaroid developing — the image gradually becomes visible
// rather than being typed letter-by-letter.
const StreamingMessage = ({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming: boolean;
}) => {
  const prevLenRef = useRef(0);

  useEffect(() => {
    if (isStreaming && content.length > prevLenRef.current) {
      prevLenRef.current = content.length;
    }
    if (!isStreaming) prevLenRef.current = 0;
  }, [content, isStreaming]);

  return (
    <motion.div
      initial={isStreaming ? { opacity: 0.55 } : { opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="text-sm leading-relaxed"
    >
      <MarkdownRenderer content={content} className="text-sm leading-relaxed" streaming={isStreaming} />
    </motion.div>
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
  sources?: ResearchSource[];
  researchQuery?: string;
}

const formatDisplayUrl = (url?: string) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "");
    const trimmedPath = path.length > 28 ? `${path.slice(0, 26)}…` : path;
    return `${parsed.hostname}${trimmedPath}`;
  } catch {
    return url.length > 40 ? `${url.slice(0, 38)}…` : url;
  }
};

const formatAuthors = (authors?: string[]) => {
  if (!authors || authors.length === 0) return "Unknown authors";
  if (authors.length <= 2) return authors.join(", ");
  return `${authors[0]}, ${authors[1]} et al.`;
};

const sourceKey = (source: ResearchSource): string => {
  if (source.doi) return `doi:${source.doi.toLowerCase()}`;
  if (source.url) return `url:${source.url.toLowerCase()}`;
  const title = source.title?.toLowerCase().trim() || "untitled";
  const year = source.year ? String(source.year) : "";
  return `title:${title}:${year}`;
};

const ResearchSourceCard = ({
  source,
  index,
  saved,
  onToggleSave,
  compact = false,
}: {
  source: ResearchSource;
  index: number;
  saved: boolean;
  onToggleSave: (source: ResearchSource) => void;
  compact?: boolean;
}) => {
  const displayUrl = source.url || source.pdfUrl;
  return (
    <div className={`rounded-xl border border-border/40 bg-muted/20 p-3 ${compact ? "text-[10px]" : "text-xs"}`}>
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-black text-primary shrink-0">[{index}]</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground leading-snug">{source.title}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            {formatAuthors(source.authors)}{source.year ? ` · ${source.year}` : ""}{source.venue ? ` · ${source.venue}` : ""}
          </p>
        </div>
      </div>
      {source.abstract && !compact && (
        <p className="text-[10px] text-muted-foreground/70 mt-2 leading-snug">
          {source.abstract}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between">
        {displayUrl ? (
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-primary hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            {formatDisplayUrl(displayUrl)}
          </a>
        ) : (
          <span className="text-[10px] text-muted-foreground/60">Local file</span>
        )}
        <button
          type="button"
          onClick={() => onToggleSave(source)}
          className={`text-[10px] font-semibold inline-flex items-center gap-1 ${saved ? "text-emerald-500" : "text-muted-foreground/70 hover:text-foreground"}`}
        >
          {saved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
};

// Stub: image fetching was removed (unsplash.ts deleted)
const fetchImageForQuery = async (..._args: unknown[]): Promise<string | null> => null;

const allSubjects = SUBJECT_CATALOG;


/**
 * Portal component for model selector - modal overlay
 */
const ModelDropdownPortal = ({ onSelect, selectedModel, selectedSubject }: {
  onSelect: (modelId: string) => void;
  selectedModel: string;
  selectedSubject: SubjectId | null;
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Close on click outside or escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.model-modal-backdrop')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center model-modal-backdrop bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md mx-4 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Select Model</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model List */}
        <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
          {GROQ_MODELS.map((model) => {
            const branding = getModelBranding(model.id, selectedSubject);
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onSelect(model.id)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                  selectedModel === model.id
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedModel === model.id ? "bg-primary/20" : "bg-muted"
                }`}>
                  <Brain className={`w-4 h-4 ${selectedModel === model.id ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{branding.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{branding.description}</p>
                </div>
                {selectedModel === model.id && (
                  <Check className="w-5 h-5 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground text-center">
            Auto picks the best model for your query
          </p>
        </div>
      </motion.div>
    </div>
  );
};


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

  // MODEL SELECTION: User-selected Groq model
  const [selectedModel, setSelectedModel] = useState<GroqModelId>(() => {
    if (typeof window === "undefined") return "auto";
    return (localStorage.getItem("selectedGroqModel") as GroqModelId) || "auto";
  });

  // MODEL SELECTOR: Dropdown visibility
  const [showModelSelector, setShowModelSelector] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  // RESEARCH MODE: Bohrium-style academic sourcing
  const [researchMode, setResearchMode] = useState(false);
  const [researchLoading, setResearchLoading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [savedSources, setSavedSources] = useState<SavedResearchSource[]>([]);

  // AI SETTINGS: Show personality & memory settings
  const [showAISettings, setShowAISettings] = useState(false);


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
  const [contextMenu, setContextMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // FILE UPLOADS
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; size: number; type: string; content: string; extractedText: string; previewUrl?: string; isImage?: boolean }>>([]);
  const [fileExtracting, setFileExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Set initial textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 192) + 'px';
    }
  }, []);

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

  // Load user name from localStorage after hydration to avoid mismatch
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      if (prefs.name) setHydratedUserName(prefs.name);
    } catch { /* ignore localStorage errors */ }
  }, []);

  useEffect(() => {
    const load = () => setSavedSources(researchStore.getAll());
    load();
    window.addEventListener("researchLibraryUpdated", load);
    // Run health check once to surface any Supabase table issues in console
    checkChatStoreHealth();
    return () => window.removeEventListener("researchLibraryUpdated", load);
  }, []);

  // Persist model selection to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedGroqModel", selectedModel);
    }
  }, [selectedModel]);

  // Close model selector on outside click
  useEffect(() => {
    if (!showModelSelector) return;
    const handleClick = (e: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(e.target as Node)) {
        setShowModelSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModelSelector]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  useEffect(() => {
    if (!researchMode) setLibraryOpen(false);
  }, [researchMode]);

  const latestAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  const savedKeys = useMemo(() => new Set(savedSources.map(sourceKey)), [savedSources]);
  const isSourceSaved = useCallback((source: ResearchSource) => savedKeys.has(sourceKey(source)), [savedKeys]);
  const toggleSaveSource = useCallback((source: ResearchSource) => {
    if (savedKeys.has(sourceKey(source))) {
      researchStore.remove(source);
    } else {
      researchStore.add(source);
    }
  }, [savedKeys]);

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

    const raw = await generateFlashcards(conversationText, selectedSubject, userPrefs.grade, 5);
    if (raw.length > 0) {
      const chatSet = await flashcardStore.createSet(selectedSubject, `Chat – ${new Date().toLocaleDateString()}`);
      if (chatSet) {
        await flashcardStore.add(raw.map(c => ({ setId: chatSet.id, subjectId: selectedSubject, front: c.front, back: c.back })));
      }
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
   
  }, [buildWelcomeMessage]);

  // LOAD ALL SESSIONS: Fetch the user's chat history on mount, and refresh on focus
  useEffect(() => {
    const loadSessions = async () => {
      setSessionsLoading(true);
      const sessions = await chatStore.getSessions();
      setAllSessions(sessions);
      setSessionsLoading(false);
    };
    loadSessions();

    // Re-fetch when tab regains focus so history is always fresh
    const onFocus = () => loadSessions();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Lock to bottom when streaming starts
  useEffect(() => {
    if (streamingId || isTyping) {
      // Do NOT lock to bottom during generation — let the user read freely
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

  // Generate study guide from attached files — redirect to full loading page
  const handleGenerateStudyGuide = useCallback(async () => {
    if (attachedFiles.length === 0 || generatingStudyGuide) return;

    // Use selectedSubject or fallback to first user subject
    const subjectToUse = selectedSubject || userSubjects[0] || "general";
    const subject = SUBJECT_CATALOG.find(s => s.id === subjectToUse);

    const combinedText = attachedFiles
      .map(f => `File: ${f.name}\n\n${f.extractedText}`)
      .join("\n\n---\n\n");

    const fileName = attachedFiles.map(f => f.name).join(", ");

    // Store in both sessionStorage and localStorage as backup
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
    // Scroll to bottom when the user sends — then leave the user in control
    lockedToBottomRef.current = false;
    requestAnimationFrame(() => scrollToBottom("smooth"));
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

    // Record the conversation stat
    if (selectedSubject) {
      statsStore.recordChat(selectedSubject); // always record by subject ID
    }

    // Note: Supabase saving now happens inside the async IIFE below,
    // after we've guaranteed a session ID exists.
    
    // 2. We talk to the AI brain behind the scenes.
    (async () => {
      // Lazily create a session if one doesn't exist yet (e.g. subject was auto-detected, not manually selected)
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

      // Save user message to Supabase now that we have a session
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
      // Build content with file attachments and extra context included
      let userContent = input;
      if (attachedFiles.length > 0) {
        const fileList = attachedFiles.map(f => `- ${f.name}`).join("\n");
        userContent = `${input}\n\n[Attached files]\n${fileList}\n\n[File contents]\n` +
          attachedFiles.map(f => `--- ${f.name} ---\n${f.extractedText}`).join("\n\n");
      }


      // ── Research mode: fetch academic sources ──────────────────────────
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
          // Auto-open the library panel whenever sources come back
          if (researchSources.length > 0) setLibraryOpen(true);
        } finally {
          setResearchLoading(false);
        }
      }

      // We package up the chat history so the AI remembers what we've already said.
      const messagesHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const newHistory = [...messagesHistory, { role: "user" as const, content: userContent }];
      
      // We also give the AI "Context" (your hobbies and style).
      const context = {
        ...buildContext(anchorForRequest),
        analogyIntensity: researchMode ? 0 : (analogyModeEnabled ? 3 : 0),
        researchMode,
        researchQuery: researchQuery || undefined,
        researchSources,
        selectedModel, // Pass the user's selected model
      };

      // Get localStorage data for personality/memory (localhost development)
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

      try {
        // Create a placeholder message that we'll fill with streaming tokens
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
        lockedToBottomRef.current = false;

        const abort = new AbortController();
        abortRef.current = abort;
        let accumulated = "";

        // Throttle renders for readability - update every ~100ms (about 10 updates/second)
        let lastRenderTime = 0;
        const RENDER_INTERVAL = 100;

        const stream = getGroqStream(newHistory, context, localStorageData);
        for await (const token of stream) {
          if (abort.signal.aborted) break;
          accumulated += token;

          const now = Date.now();
          if (now - lastRenderTime > RENDER_INTERVAL) {
            const displayAccumulated = accumulated.replace(/<ACTIONS>[\s\S]*?(<\/ACTIONS>|$)/i, "").trim();
            setMessages(prev => prev.map(m =>
              m.id === responseId ? { ...m, content: displayAccumulated } : m
            ));
            lastRenderTime = now;
            // No auto-scroll here — user is in control during generation
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

            // Handle start_quiz client-side (navigate to quiz hub with params)
            const quizAction = actions.find((a: Record<string, unknown>) => a.type === "start_quiz");
            if (quizAction) {
              try {
                sessionStorage.setItem("analogix.pending-agent-quiz", JSON.stringify({
                  subjectId: quizAction.subjectId || selectedSubject,
                  topic: quizAction.topic || "",
                  difficulty: quizAction.difficulty || "intermediate",
                  numberOfQuestions: Number(quizAction.numberOfQuestions) || 5,
                  timeLimitMinutes: Number(quizAction.timeLimitMinutes) || 0,
                }));
                router.push("/quiz");
              } catch { /* ignore */ }
            }

            // Send all non-quiz actions to agent-action (with source=chat for full permissions)
            const serverActions = actions.filter((a: Record<string, unknown>) => a.type !== "start_quiz");
            if (serverActions.length > 0) {
              fetch("/api/groq/agent-action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ actions: serverActions, defaultSubjectId: selectedSubject, source: "chat" }),
              })
                .then(r => r.json())
                .then(data => {
                  console.log("[Chat] agent-action results:", data.results);
                  if (data.results?.length) {
                    window.dispatchEvent(new CustomEvent("subjectDataUpdated", { detail: { results: data.results } }));
                  }
                })
                .catch(err => console.error("[Chat] agent-action error:", err));
            }
          } catch (e) {
            console.warn("[Chat] Failed to parse ACTIONS block:", e);
          }
        }

        // Final update with any remaining content
        setMessages(prev => prev.map(m =>
          m.id === responseId ? { ...m, isStreaming: false, content: displayContent } : m
        ));
        setStreamingId(null);

      // Fire-and-forget memory extraction — runs after every assistant response
      // Uses a cheap 8B model so it doesn't block or cost much
      const messagesForExtraction = [
        ...messages.filter(m => !m.isWelcome).map(m => ({ role: m.role, content: m.content })),
        { role: "assistant" as const, content: accumulated },
      ];
      fetch("/api/ai/memory/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesForExtraction, subjectId: selectedSubject }),
      }).then(r => r.json()).then(d => console.log("[memory] extract result:", d)).catch(() => {});

      // Save to Supabase
      if (activeSessionId) {
        chatStore.addMessage(activeSessionId, "assistant", accumulated).catch(e => console.error("[Chat] addMessage assistant:", e));
        setAllSessions(prev =>
          [...prev.map(s => s.id === activeSessionId ? { ...s, updatedAt: new Date().toISOString() } : s)]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        );
        // Generate chat title after the 2nd real exchange so we have enough context.
        // On exchange 1 (greeting), we skip. On exchange 2-3, we retitle with richer context.
        const realUserMessages = messages.filter(m => m.role === "user" && !m.isWelcome);
        const previousUserMessages = realUserMessages.length;
        const shouldTitle = previousUserMessages === 1 || previousUserMessages === 2;
        if (shouldTitle) {
          try {
            // Grab up to the first 3 real user messages + their AI replies for context
            const realExchanges = messages
              .filter(m => !m.isWelcome)
              .slice(0, 6) // first 3 pairs at most
              .map(m => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content.slice(0, 250)}`)
              .join("\n");
            const currentUserMsg = input.slice(0, 400);
            const titlePrompt = [{ role: "user" as const, content: `You are naming a study chat session. Read the conversation so far and the latest student message, then write a short 3–6 word title capturing the SPECIFIC topic being studied. Be concrete — not "Math Help" or "Question Asked", but things like "Quadratic Formula Confusion", "WW2 Causes Breakdown", "Python List Indexing Bug", "Mitosis vs Meiosis". No quotes, no punctuation at the end, just the title.

Conversation so far:
${realExchanges}
Student (latest): ${currentUserMsg}

Title:` }];
            const titleResponse = await getGroqCompletion(titlePrompt, buildContext(null));
            // Clean up the title
            let chatTitle = (titleResponse.content || "").trim();
            chatTitle = chatTitle.replace(/^["'`]|["'`]$/g, "").trim();
            chatTitle = chatTitle.replace(/^(Title:|Here'?s?( a title)?:|The title is:?)/i, "").trim();
            chatTitle = chatTitle.replace(/[.!?]$/, "").trim();
            // If AI returned garbage or nothing, use a fallback based on the input
            if (!chatTitle || chatTitle.length < 2) {
              const words = input.trim().split(/\s+/).slice(0, 4).join(" ");
              chatTitle = words || "New chat";
            }
            // Ensure title is not too long
            chatTitle = chatTitle.slice(0, 50);
            await chatStore.updateSessionTitle(activeSessionId, chatTitle);
            setAllSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: chatTitle } : s));
          } catch (err) {
            console.warn("[Chat] Failed to generate title:", err);
            // Fallback: use first few words of user's question
            const words = input.trim().split(/\s+/).slice(0, 4).join(" ");
            if (words) {
              const fallbackTitle = words.slice(0, 50);
              await chatStore.updateSessionTitle(activeSessionId, fallbackTitle);
              setAllSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: fallbackTitle } : s));
            }
          }
        }
      }
      } catch {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I couldn't reach the AI service, you've either hit the rate limit of 1000 requests per day or you need to check your internet.",
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
                  return (
                    <div
                      key={session.id}
                      className={`relative rounded-md transition-all ${isActive ? "bg-muted/70" : "hover:bg-muted/40"}`}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ sessionId: session.id, x: e.clientX, y: e.clientY });
                      }}
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
                          <p className={`text-sm truncate leading-snug ${isActive ? "text-foreground font-medium" : "text-foreground/70"}`}>
                            {session.title}
                          </p>
                        )}
                      </button>
                    </div>
                  );
                })}
              </>
            )
          })()}
        </div>
      </motion.div>
      </div>{/* end sidebar wrapper */}

      {/* Context Menu for Thread Actions */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[9999] min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="rounded-lg border border-border/40 bg-card shadow-lg overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const session = allSessions.find(s => s.id === contextMenu.sessionId);
                  if (session) {
                    setRenamingThreadId(session.id);
                    setRenamingThreadName(session.title);
                    setContextMenu(null);
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rename</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const session = allSessions.find(s => s.id === contextMenu.sessionId);
                  if (session) {
                    handleDeleteThread(session.id);
                    setContextMenu(null);
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            {/* ── TAB CONTENT ─────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Main chat column */}
              <div
                className="flex-1 min-h-0 relative overflow-hidden"
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
                className="flex-1 overflow-y-auto chat-scroll"
              >
                <div className="mx-auto max-w-4xl w-full px-4 flex flex-col space-y-6 pt-4 sm:pt-4 pb-4">
                  {/* Empty state — shown before any messages */}
                  {messages.length === 0 && !isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center justify-center h-full min-h-[40vh] gap-3 text-center"
                    >
                      <div>
                        <p className="text-base font-semibold text-foreground/80">
                          {userName ? `Hey ${userName}, what are you studying?` : "Hey there, what are you studying?"}
                        </p>
                        <p className="text-sm text-muted-foreground/60 mt-1">
                          Ask about any concept — I'll explain it with your interests
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
                          <div className="max-w-[85%] sm:max-w-[80%] message-bubble-assistant">
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
                              {message.isStreaming && !parseThinkingContent(message.content).response.trim() && (
                                <div className="flex items-center gap-1.5 py-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '120ms' }} />
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '240ms' }} />
                                </div>
                              )}
                              <StreamingMessage
                                content={parseThinkingContent(message.content).response}
                                isStreaming={!!message.isStreaming}
                              />
                              {message.sources && message.sources.length > 0 && (
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {message.sources.map((source, i) => (
                                    <ResearchSourceCard
                                      key={`${source.id}-${i}`}
                                      source={source}
                                      index={i + 1}
                                      saved={isSourceSaved(source)}
                                      onToggleSave={toggleSaveSource}
                                    />
                                  ))}
                                </div>
                              )}
                              <AnimatePresence>
                              {!message.isStreaming && (
                              <motion.div
                                key="actions"
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="mt-3 flex items-center justify-between gap-0.5"
                              >
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
                              </motion.div>
                              )}
                              </AnimatePresence>
                            </>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1 max-w-[85%] sm:max-w-[75%]">
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-1">
                                {message.attachments.map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                                    {file.isImage && file.previewUrl ? (
                                      <img
                                        src={file.previewUrl}
                                        alt={file.name}
                                        className="w-8 h-8 rounded-md object-cover border border-primary/30"
                                      />
                                    ) : (
                                      <FileText className="w-3.5 h-3.5 text-primary" />
                                    )}
                                    <span className="text-xs text-foreground max-w-[120px] truncate">{file.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {message.content && message.content.trim() && (
                              <>
                                <div className="inline-block px-4 py-2.5 rounded-2xl rounded-br-sm bg-primary text-primary-foreground">
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCopy(message.content, message.id)}
                                  aria-label="Copy prompt"
                                  title="Copy prompt"
                                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                >
                                  {copiedId === message.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </Button>
                              </>
                            )}
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

              <div className="pointer-events-none absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-background to-transparent z-20" />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 sm:h-24 bg-gradient-to-t from-background via-background/95 to-transparent z-20" />

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
                
                <div className="relative rounded-2xl border border-border/60 bg-card shadow-sm" style={{ overflow: 'visible' }} data-tour="chat-input">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      // Auto-resize
                      if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 192) + 'px';
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask me anything"
                    className="w-full px-3 sm:px-4 pt-3 pb-12 text-sm sm:text-base bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 resize-none leading-relaxed rounded-2xl min-h-[52px] max-h-48"
                    style={{ height: '52px', overflow: 'hidden' }}
                  />
                  {/* Bottom row of input */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 sm:px-3 pb-2 sm:pb-3">
                    {/* Left side: attach + toolbar icons */}
                    <div className="flex items-center gap-1">
                      {/* Attach file */}
                      <div className="relative w-8 h-8 group">
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
                          className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground transition-all disabled:opacity-50 group-hover:bg-primary/10 group-hover:text-primary"
                          title={fileExtracting ? "Extracting file…" : "Attach files"}
                          aria-hidden="true"
                          tabIndex={-1}
                        >
                          {fileExtracting
                            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            : <Paperclip className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Model selector */}
                      <div className="relative" ref={modelSelectorRef} data-tour="model-selector">
                        <button
                          type="button"
                          ref={(el) => { (window as any).__modelBtnRef = el; }}
                          onClick={() => setShowModelSelector(p => !p)}
                          disabled={isInputLocked}
                          className="h-8 px-3 rounded-full bg-muted/40 flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted/60 disabled:opacity-40"
                          title="Select AI model"
                        >
                          <Brain className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">
                            {getModelBranding(selectedModel, selectedSubject).name}
                          </span>
                          <ChevronUp className={`w-3 h-3 transition-transform ${showModelSelector ? "rotate-180" : ""}`} />
                        </button>

                        {/* Model selector dropdown */}
                        <AnimatePresence>
                          {showModelSelector && (
                            <ModelDropdownPortal
                              onSelect={(modelId: string) => {
                                setSelectedModel(modelId as typeof selectedModel);
                                setShowModelSelector(false);
                              }}
                              selectedModel={selectedModel}
                              selectedSubject={selectedSubject}
                            />
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Research mode */}
                      <div className="flex flex-col items-center gap-0.5" data-tour="research-toggle">
                        <button
                          type="button"
                          onClick={() => setResearchMode(p => !p)}
                          disabled={isInputLocked}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40 ${researchMode ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                          title={researchMode ? "Research mode on — click to turn off" : "Research mode off — click to turn on"}
                        >
                          {researchLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Atom className="w-3.5 h-3.5" />}
                        </button>
                      </div>



                      {/* AI Settings button */}
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setShowAISettings(true)}
                          disabled={isInputLocked}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-all text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="AI Settings — Customize personality & memory"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Formula sheet — only if subject has formulas */}
                      {getFormulaSheet(selectedSubject || "") && (
                        <div className="flex flex-col items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setFormulaPanelOpen(o => !o)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${formulaPanelOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                            title="Formula sheet"
                          >
                            <Sigma className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
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

              {/* Research library side panel — auto-populated from conversation sources */}
              <AnimatePresence>
                {libraryOpen && researchMode && (
                  <motion.div
                    key="research-library"
                    initial={{ opacity: 0, x: 20, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: "280px" }}
                    exit={{ opacity: 0, x: 20, width: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    className="hidden sm:flex flex-col border border-border rounded-xl bg-card overflow-hidden shrink-0 max-h-[calc(100vh-180px)]"
                    style={{ width: 280 }}
                  >
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                      <button type="button" onClick={() => setLibraryOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {/* Session sources — all sources from this conversation */}
                      {(() => {
                        const sessionSources = messages
                          .filter(m => m.sources && m.sources.length > 0)
                          .flatMap(m => m.sources!);
                        // Deduplicate by key
                        const seen = new Set<string>();
                        const unique = sessionSources.filter(s => {
                          const k = sourceKey(s); if (seen.has(k)) return false; seen.add(k); return true;
                        });
                        if (unique.length === 0 && savedSources.length === 0) return (
                          <div className="text-center text-[11px] text-muted-foreground/60 py-6">
                            Sources will appear here when you send a message in research mode.
                          </div>
                        );
                        return (
                          <>
                            {unique.length > 0 && (
                              <>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">This session</p>
                                {unique.map((source, i) => (
                                  <ResearchSourceCard key={`session-${i}`} source={source} index={i + 1} saved={isSourceSaved(source)} onToggleSave={toggleSaveSource} compact />
                                ))}
                              </>
                            )}
                            {savedSources.length > 0 && (
                              <>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1 mt-2">Saved</p>
                                {savedSources.map((source, i) => (
                                  <ResearchSourceCard key={`saved-${i}`} source={source} index={i + 1} saved={isSourceSaved(source)} onToggleSave={toggleSaveSource} compact />
                                ))}
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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

      {/* AI Settings Sheet */}
      <AISettingsSheet open={showAISettings} onOpenChange={setShowAISettings} />
    </div>
  );
};

export default Chat;
