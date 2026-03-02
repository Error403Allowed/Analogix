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
  Database,
  Shuffle,
  ChevronDown,
  BookOpen,
  X,
  Plus,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { getGroqCompletion, getReExplanation, generateFlashcards } from "@/services/groq";
import { flashcardStore } from "@/utils/flashcardStore";
import { statsStore } from "@/utils/statsStore";
import { chatStore, ChatSession } from "@/utils/chatStore";
import { getFormulaSheet } from "@/data/formulaSheets";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import TypewriterText from "@/components/TypewriterText";
import { SUBJECT_CATALOG, SubjectId, getSubjectDescription } from "@/constants/subjects";
import { buildInterestList } from "@/utils/interests";

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

// Typewriter animation component for AI messages - uses refs to prevent restart on parent re-renders
const TypewriterMessage = ({ 
  content, 
  isNew, 
  onComplete,
  shouldStop
}: { 
  content: string; 
  isNew: boolean; 
  onComplete?: () => void;
  shouldStop?: boolean;
}) => {
  const [displayedContent, setDisplayedContent] = useState(isNew ? "" : content);
  const [isTyping, setIsTyping] = useState(isNew);
  const charIndexRef = useRef(0);
  const contentRef = useRef(content);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mathSpansRef = useRef<Array<{ start: number; end: number }>>([]);

  const computeMathSpans = (text: string) => {
    const spans: Array<{ start: number; end: number }> = [];
    let i = 0;
    while (i < text.length) {
      if (text[i] === "\\" && text[i + 1] === "$") {
        i += 2;
        continue;
      }
      if (text[i] === "$") {
        const isDisplay = text[i + 1] === "$";
        const delim = isDisplay ? "$$" : "$";
        const start = i;
        i += delim.length;
        while (i < text.length) {
          if (text[i] === "\\" && text[i + 1] === "$") {
            i += 2;
            continue;
          }
          if (delim === "$$" && text[i] === "$" && text[i + 1] === "$") {
            i += 2;
            spans.push({ start, end: i });
            break;
          }
          if (delim === "$" && text[i] === "$") {
            i += 1;
            spans.push({ start, end: i });
            break;
          }
          i += 1;
        }
        continue;
      }
      i += 1;
    }
    return spans;
  };

  // Update content ref when content changes
  useEffect(() => {
    contentRef.current = content;
    mathSpansRef.current = computeMathSpans(content);
  }, [content]);

  // Handle stop command
  useEffect(() => {
    if (shouldStop && isTyping) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Show full content immediately when stopped
      setDisplayedContent(contentRef.current);
      setIsTyping(false);
      onComplete?.();
    }
  }, [shouldStop, isTyping, onComplete]);

  useEffect(() => {
    // If not new, show content immediately
    if (!isNew) {
      setDisplayedContent(content);
      return;
    }

    charIndexRef.current = 0;

    const typeNextChar = () => {
      const currentContent = contentRef.current;
      if (charIndexRef.current < currentContent.length) {
        const nextIndex = charIndexRef.current;
        const mathSpan = mathSpansRef.current.find((span) => span.start === nextIndex);
        if (mathSpan) {
          charIndexRef.current = mathSpan.end;
        } else {
          charIndexRef.current++;
        }
        setDisplayedContent(currentContent.slice(0, charIndexRef.current));
        // Variable speed: faster for spaces/newlines, slower for punctuation
        const char = currentContent[charIndexRef.current - 1];
        let speed = 15; // Base speed (fast for chat)
        if (char === " " || char === "\n") speed = 8;
        else if (char === "." || char === "!" || char === "?" || char === ",") speed = 80;
        else if (char === "*") speed = 5; // Fast for markdown
        timeoutRef.current = setTimeout(typeNextChar, speed);
      } else {
        setIsTyping(false);
        onComplete?.();
      }
    };

    timeoutRef.current = setTimeout(typeNextChar, 100);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isNew]); // Only depend on isNew, not content or onComplete

  // Render Markdown/LaTeX during typing with a cursor
  return (
    <span className="whitespace-pre-wrap text-sm leading-relaxed">
      <MarkdownRenderer content={displayedContent} className="text-sm leading-relaxed" />
      {isTyping && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-[2px] h-[1em] ml-0.5 bg-primary align-middle rounded-sm"
          style={{ verticalAlign: "text-bottom" }}
        />
      )}
    </span>
  );
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  analogy?: string;
  imageUrl?: string;
  isNew?: boolean; // Track if this is a new message for typewriter effect
  isWelcome?: boolean;
}

// Stub: image fetching was removed (unsplash.ts deleted)
const fetchImageForQuery = async (..._args: unknown[]): Promise<string | null> => null;

const allSubjects = SUBJECT_CATALOG;


/**
 * ANALOGY TUTOR: This is where you actually talk to Quizzy (the AI).
 * It uses your preferences to explain things in a way that makes sense to YOU.
 */
const Chat = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // CURRENT TOPIC: Which subject are we talking about right now?
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | null>(null);
  
  // CONVERSATION: All the messages you and the AI have exchanged.
  const [messages, setMessages] = useState<Message[]>([]);
  
  // INPUT: What you're currently typing in the box.
  const [input, setInput] = useState("");
  
  // THINKING: This is true while we're waiting for the AI to reply.
  const [isTyping, setIsTyping] = useState(false);
  
  // STOP RESPONSE: Used to stop the typewriter animation
  const [stopTyping, setStopTyping] = useState(false);
  
  // ANIMATING: Track if typewriter is currently running
  const [isAnimating, setIsAnimating] = useState(false);
  
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

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const shouldAutoScrollRef = useRef(false);
  const lockedToBottomRef = useRef(true);

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
  const isInputLocked = isTyping || isAnimating;

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
    const isNearBottom = distanceFromBottom <= 24;
    lockedToBottomRef.current = isNearBottom;
    setShowScrollToBottom(!isNearBottom);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const welcomeTemplates = useCallback((subjectLabel: string) => ([
    `Hi ${userName}. Great choice picking ${subjectLabel}.\n\nWhat specific topic or concept would you like to explore today? Just tell me what's on your mind, and I'll find a clear analogy for you.`,
    `Hey ${userName}! ${subjectLabel} is a strong pick.\n\nTell me a topic or concept you're curious about, and I'll explain it with a clear analogy.`,
    `Nice, ${userName}. ${subjectLabel} unlocked.\n\nWhat should we explore first? I’ll make it click with a simple analogy.`,
    `Alright ${userName}, ${subjectLabel} it is.\n\nName a concept and I’ll break it down with a clear analogy.`,
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
    subjects: selectedSubject ? [selectedSubject] : userSubjects,
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
          ? { ...m, id: `welcome-${Date.now()}`, content: nextContent, isNew: true, isWelcome: true }
          : m
      )));
      setIsAnimating(true);
      setStopTyping(false);
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
    setStopTyping(false);

    try {
      const previousUser = messages[targetIndex - 1]?.role === "user"
        ? messages[targetIndex - 1]?.content
        : "";
      const explicitAnchor = previousUser ? findAnchor(previousUser) : null;
      const aiResponse = await getGroqCompletion(history, buildContext(explicitAnchor));

      setMessages((prev) => prev.map((m) => (
        m.id === messageId
          ? {
              ...m,
              id: `${messageId}-regen-${Date.now()}`,
              content: aiResponse.content || "I'm not sure how to answer that.",
              isNew: true
            }
          : m
      )));
    } catch {
      setMessages((prev) => prev.map((m) => (
        m.id === messageId
          ? {
              ...m,
              id: `${messageId}-regen-${Date.now()}`,
              content: "I couldn't reach the AI service. Try again in a moment.",
              isNew: true
            }
          : m
      )));
    } finally {
      setIsTyping(false);
      setIsAnimating(true);
      setStopTyping(false);
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
      .map(m => `${m.role === "user" ? "Student" : "Quizzy"}: ${m.content}`)
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
    setStopTyping(false);

    try {
      const history = messages
        .slice(0, messages.findIndex(m => m.id === messageId))
        .map(m => ({ role: m.role, content: m.content }));

      const ctx = {
        ...buildContext(null),
        chosenAnchor: chosenAnchor || undefined,
        previousExplanation: target.content,
      };

      const aiResponse = await getReExplanation(history, ctx);

      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, id: `${messageId}-re-${Date.now()}`, content: aiResponse.content || "Let me try a different approach...", isNew: true }
          : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, id: `${messageId}-re-${Date.now()}`, content: "Couldn't reach the AI. Try again in a moment.", isNew: true }
          : m
      ));
    } finally {
      setIsTyping(false);
      setIsAnimating(true);
      setStopTyping(false);
      setReExplainingId(null);
    }
  }, [isInputLocked, messages, buildContext]);



  useEffect(() => {
    if (!reExplainOpenId) return;
    const handleClick = () => setReExplainOpenId(null);
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [reExplainOpenId]);

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
        setIsAnimating(true);
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

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    updateScrollButton();
    if (shouldAutoScrollRef.current || lockedToBottomRef.current) {
      const behavior: ScrollBehavior = shouldAutoScrollRef.current ? "smooth" : "auto";
      shouldAutoScrollRef.current = false;
      requestAnimationFrame(() => scrollToBottom(behavior));
    }
  }, [messages.length, isTyping, updateScrollButton, scrollToBottom]);

  // PICKING A TOPIC: This runs when you select a subject icon.
  const handleSubjectSelect = async (subjectId: SubjectId) => {
    setSelectedSubject(subjectId);
    setMessages([]);
    setIsAnimating(false);
    setStopTyping(false);

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
    setIsAnimating(true);

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
  const handleSend = () => {
    if (!input.trim() || !selectedSubject || isInputLocked) return;

    // 1. We show your message on the screen immediately.
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input
    };

    const anchorForRequest =
      analogyModeEnabled && userHobbies.length > 0
        ? findAnchor(input)
        : null;

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    shouldAutoScrollRef.current = true;
    lockedToBottomRef.current = true;
    setIsTyping(true); // Show the "thinking" dots.

    // Record the conversation
    if (selectedSubject) {
      statsStore.recordChat(allSubjects.find(s => s.id === selectedSubject)?.label || selectedSubject);
    }
    
    // Save user message to Supabase
    if (chatSessionId) {
      chatStore.addMessage(chatSessionId, "user", input);
      
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
      // We package up the chat history so the AI remembers what we've already said.
      const messagesHistory = messages.map(m => ({ 
        role: m.role, 
        content: m.content 
      }));
      
      const newHistory = [...messagesHistory, { role: "user" as const, content: input }];
      
      // We also give the AI "Context" (your hobbies and style).
    const context = buildContext(anchorForRequest);

      try {
        // FETCH: We send the request over the internet and wait.
        const aiResponse = await getGroqCompletion(newHistory, context);

        // 3. We show the AI's reply on the screen.
        const response: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: aiResponse.content || "I'm not sure how to answer that.",
          isNew: true
        };

        setMessages(prev => [...prev, response]);

        // Save assistant reply to Supabase
        if (chatSessionId) {
          chatStore.addMessage(chatSessionId, "assistant", response.content);
          
          // Update the session's updatedAt timestamp in sidebar
          setAllSessions(prev => {
            const updated = prev.map(s => 
              s.id === chatSessionId 
                ? { ...s, updatedAt: new Date().toISOString() }
                : s
            );
            return updated.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          });
          
          // If this is the first exchange (welcome + user message + assistant response), generate a chat title from AI
          // At this point: messages still has old state, so we check if it's just the welcome message before we added the user message
          const isFirstExchange = messages.length === 1 && messages[0].isWelcome;
          if (isFirstExchange) {
            try {
              // Ask AI to generate a short, descriptive title for this conversation
              const titlePrompt = [
                { role: "user" as const, content: `Based on this question: "${input}", generate a very short (2-4 words) title for this chat. Only respond with the title, nothing else.` }
              ];
              const titleResponse = await getGroqCompletion(titlePrompt, buildContext(null));
              const chatTitle = (titleResponse.content || "New chat").trim().slice(0, 50);
              
              await chatStore.updateSessionTitle(chatSessionId, chatTitle);
              setAllSessions(prev => prev.map(s =>
                s.id === chatSessionId ? { ...s, title: chatTitle } : s
              ));
            } catch (err) {
              console.error("Failed to generate or update session title:", err);
            }
          }
        }
      } catch {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I couldn't reach the AI service. Try again in a moment.",
          isNew: true
        }]);
      } finally {
        setIsTyping(false);
        setIsAnimating(true);
        setStopTyping(false);
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
        isNew: true
      }]);
    } catch {
      const newMsgId = Date.now().toString();
      setMessages(prev => [...prev, {
        id: newMsgId,
        role: "assistant",
        content: "I couldn't reach the AI service. Try again in a moment.",
        analogy: `ai-generated-${newMsgId}`,
        isNew: true
      }]);
    } finally {
      setIsTyping(false);
      setIsAnimating(true);
      setStopTyping(false);
    }
  };

  const handleSwitchThread = async (session: ChatSession) => {
    setSelectedSubject(session.subjectId as SubjectId);
    setChatSessionId(session.id);
    setMessages([]);
    setIsAnimating(false);
    setStopTyping(false);

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
      setIsAnimating(true);
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
    setMessages([]);
    setChatSessionId(null);
    setInput("");
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
    <div className="min-h-[100dvh] flex flex-row relative overflow-hidden bg-background">
      {/* Threads Sidebar - Claude/ChatGPT Style */}
      <motion.div
        animate={{ width: sidebarOpen ? 320 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden sm:flex flex-col border-r border-border/30 bg-background h-screen overflow-hidden flex-shrink-0"
        style={{ minWidth: sidebarOpen ? 320 : 0 }}
      >
        {/* New Chat Button */}
        <div className="flex-shrink-0 p-3 border-b border-border/30">
          <Button
            onClick={handleStartNewChat}
            className="w-full gap-2 rounded-lg h-9 bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm justify-center"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        {/* Search bar */}
        <div className="flex-shrink-0 px-3 py-2 border-b border-border/30">
          <div className="relative">
            <input
              type="text"
              placeholder="Search chats..."
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-muted/40 border border-border/30 placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Threads list */}
        <div className="overflow-y-auto flex-1 min-h-0 px-2 py-3 space-y-1">
          {sessionsLoading ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground text-xs">
              Loading...
            </div>
          ) : (() => {
            // Filter sessions: if a subject is selected, only show threads for that subject
            let filteredSessions = selectedSubject 
              ? allSessions.filter(s => s.subjectId === selectedSubject)
              : allSessions;
            
            // Apply search filter
            if (threadSearch.trim()) {
              const searchLower = threadSearch.toLowerCase();
              filteredSessions = filteredSessions.filter(s => {
                const subjectInfo = allSubjects.find(sub => sub.id === s.subjectId);
                const subjectName = (subjectInfo?.label || s.subjectId).toLowerCase();
                return subjectName.includes(searchLower) || s.title.toLowerCase().includes(searchLower);
              });
            }
            
            return filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-20 text-muted-foreground text-xs text-center px-2">
                <MessageSquare className="w-4 h-4 mb-1.5 opacity-40" />
                <p>{selectedSubject ? "No chats for this subject" : threadSearch ? "No matching threads" : "No chats yet"}</p>
              </div>
            ) : (
              <div>
                {filteredSessions.map((session) => {
                  const subjectInfo = allSubjects.find(s => s.id === session.subjectId);
                  const isActive = chatSessionId === session.id;
                  const isRenaming = renamingThreadId === session.id;
                  const subjectLabel = subjectInfo?.label || session.subjectId;
                  
                  return (
                    <motion.div
                      key={session.id}
                      className={`group relative rounded-lg transition-all ${
                        isActive 
                          ? "bg-primary/15" 
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <button
                        onClick={() => handleSwitchThread(session)}
                        className="w-full text-left px-3 py-2.5 flex items-center gap-2 min-h-[44px]"
                      >
                        {/* Thread content */}
                        {isRenaming ? (
                          <input
                            autoFocus
                            type="text"
                            value={renamingThreadName}
                            onChange={(e) => setRenamingThreadName(e.target.value)}
                            onBlur={() => handleRenameThread(session.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleRenameThread(session.id);
                              } else if (e.key === "Escape") {
                                setRenamingThreadId(null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 px-2 py-1 rounded text-sm bg-muted border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <div className="flex-1 min-w-0">
                            <div className="relative overflow-hidden">
                              <p className={`text-sm whitespace-nowrap ${isActive ? "font-semibold text-foreground" : "text-foreground/80 font-normal"}`}>
                                {session.title}
                              </p>
                              {session.title.length > 30 && (
                                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card group-hover:from-muted/40 pointer-events-none transition-colors" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground/60">
                              {subjectLabel}
                            </p>
                          </div>
                        )}
                      </button>

                      {/* Action buttons (appear on hover) */}
                      {!isRenaming && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingThreadId(session.id);
                              setRenamingThreadName(session.title);
                            }}
                            className="h-8 w-8 rounded hover:bg-muted/60"
                            title="Rename thread"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteThread(session.id, e)}
                            className="h-8 w-8 rounded hover:bg-destructive/20 hover:text-destructive"
                            title="Delete thread"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col w-full px-3 sm:px-6 py-4 sm:py-6 relative">
        {/* Simple header */}
        <motion.header
          className="flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4 -mx-3 sm:-mx-6 mb-3 sm:mb-4 border-b border-border"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden sm:inline-flex gap-2 -ml-2 text-muted-foreground hover:text-foreground rounded-xl"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="gap-2 -ml-2 text-muted-foreground hover:text-foreground rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-semibold text-foreground">Quizzy</h1>
          </div>
          <div className="w-16" />
        </motion.header>

        {!selectedSubject ? (
          /* Subject Selection - refined cards */
          <motion.div
            className="flex-1 flex flex-col items-center justify-center py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2 tracking-tight">
                <TypewriterText text="What shall we explore today?" delay={150} />
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Pick a subject — I'll explain with clear, personalised analogies.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 w-full max-w-2xl">
              {availableSubjects.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  You haven’t selected any subjects yet. Add subjects in your profile to start a session.
                </div>
              ) : availableSubjects.map((subject, index) => {
                const Icon = subject.icon;
                return (
                  <motion.button
                    key={subject.id}
                    onClick={() => handleSubjectSelect(subject.id)}
                    className="p-5 text-left group border border-border rounded-xl bg-card hover:bg-muted/50 transition-colors"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, type: "spring", stiffness: 180, damping: 18 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="font-bold text-foreground text-sm">{subject.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getSubjectDescription(subject.id, userPrefs.grade)}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* Chat Interface */
          <div className="flex-1 flex flex-col">
            {/* Controls bar */}
            <motion.div
              className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSubject(null);
                  setMessages([]);
                }}
                className="gap-2 rounded-md h-8 px-4 text-xs font-medium"
              >
                {(() => {
                  const current = allSubjects.find((s) => s.id === selectedSubject);
                  const Icon = current?.icon;
                  return Icon ? <Icon className="w-3.5 h-3.5" /> : null;
                })()}
                {allSubjects.find(s => s.id === selectedSubject)?.label}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewTopic}
                className="gap-2 rounded-md h-8 px-4 text-xs font-medium"
                disabled={isInputLocked}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New Topic
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAsFlashcards}
                disabled={isInputLocked || messages.filter(m => !m.isWelcome).length < 2}
                className="gap-2 rounded-md h-8 px-4 text-xs font-medium"
                title="Save this session as flashcards"
              >
                {savingFlashcards ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : flashcardsSaved ? (
                  <Check className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <BookOpen className="w-3.5 h-3.5" />
                )}
                {flashcardsSaved ? "Saved!" : "Save flashcards"}
              </Button>

              <Button
                size="sm"
                onClick={() => setAnalogyModeEnabled((prev) => !prev)}
                className="gap-2 rounded-md h-8 px-4 text-xs font-medium"
                disabled={isInputLocked}
                aria-pressed={analogyModeEnabled}
              >
                <Brain className="w-3.5 h-3.5" />
                Analogy: {analogyModeEnabled ? "On" : "Off"}
              </Button>

              {getFormulaSheet(selectedSubject || "") && (
                <Button
                  variant={formulaPanelOpen ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFormulaPanelOpen(o => !o)}
                  className="gap-2 rounded-md h-8 px-4 text-xs font-medium"
                  title="Formula sheet"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Formulas
                </Button>
              )}
            </motion.div>

            <div className="flex-1 flex gap-4 min-h-0">
              {/* Main chat column */}
              <div className="flex-1 min-h-0 relative">
              {/* Messages - sleek chat bubbles */}
              <div
                ref={scrollContainerRef}
                onScroll={updateScrollButton}
                className="absolute inset-0 overflow-y-auto min-h-0 chat-scroll"
              >
                <div className="flex-grow flex flex-col justify-end space-y-6 pb-28 sm:pb-24 pt-1">
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
                          <div className="max-w-[88%] sm:max-w-[85%] message-bubble-assistant">
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
                              <TypewriterMessage 
                                content={parseThinkingContent(message.content).response} 
                                isNew={message.isNew || false}
                                shouldStop={stopTyping}
                                onComplete={() => {
                                  // Mark message as no longer new after typing completes
                                  setMessages(prev => prev.map(m => 
                                    m.id === message.id ? { ...m, isNew: false } : m
                                  ));
                                  setIsAnimating(false);
                                  setStopTyping(false);
                                }}
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
                            <div className="max-w-full w-fit message-bubble-user">
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
                              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            >
                              {copiedId === message.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
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
                    scrollToBottom();
                  }}
                  aria-label="Scroll to latest"
                  title="Scroll to latest"
                  className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 h-9 w-9 rounded-full bg-primary/40 text-white/90 shadow-md backdrop-blur hover:bg-primary/60"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
              )}

              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background via-background/90 to-transparent z-20" />

              {/* Input - terminal style */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 z-30 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] -mx-1 pointer-events-auto"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="message-input-container rounded-lg border border-border bg-background">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2 sm:gap-3 items-end p-2.5 sm:p-3"
                  >
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={`Ask anything about ${allSubjects.find(s => s.id === selectedSubject)?.label || "this subject"}...`}
                      rows={Math.max(1, Math.min(12, Math.ceil(input.length / 70) || 1))}
                      className="flex-1 !min-h-10 sm:!min-h-12 px-3 py-2.5 rounded-md border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70 font-mono text-sm resize-none overflow-y-auto max-h-64"
                    />
                    {(isTyping || isAnimating) ? (
                      <Button
                        type="button"
                        onClick={() => setStopTyping(true)}
                        size="icon"
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-destructive/90 hover:bg-destructive text-destructive-foreground border-0 shrink-0"
                      >
                        <Square className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={!input.trim()}
                        size="icon"
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary text-white border-0 shrink-0 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:hover:bg-primary"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                  </form>
                  <p className="text-[10px] sm:text-xs text-muted-foreground/70 text-center pb-2 font-mono">
                    Quizzy can make mistakes. Verify important information.
                  </p>
                </div>
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
        )}
      </div>
    </div>
  );
};

export default Chat;
