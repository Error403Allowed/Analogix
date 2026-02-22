"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { getGroqCompletion } from "@/services/groq";
import { statsStore } from "@/utils/statsStore";
import { chatStore } from "@/utils/chatStore";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import TypewriterText from "@/components/TypewriterText";
import { SUBJECT_CATALOG, getSubjectDescription } from "@/constants/subjects";
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
  
  // CURRENT TOPIC: Which subject are we talking about right now?
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
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

  // CHAT HISTORY: Supabase session ID for saving messages
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

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
    learningStyle: userPrefs.learningStyle,
    analogyIntensity: analogyModeEnabled ? 1 : 0,
    analogyAnchor: overrideAnchor ?? undefined,
    memoryManagement: false
  }), [
    selectedSubject,
    userSubjects,
    userHobbies,
    userPrefs.grade,
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

  useEffect(() => {
    // We stay on the selection screen so Quizzy can ask what you want to explore!
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
  const handleSubjectSelect = async (subjectId: string) => {
    setSelectedSubject(subjectId);
    setMessages([]);
    setIsAnimating(false);
    setStopTyping(false);

    // Create a Supabase session for this chat
    if (!availableSubjectIds.has(subjectId)) return;
    const subject = allSubjects.find(s => s.id === subjectId);
    const sessionId = await chatStore.createSession(subjectId, `${subject?.label || subjectId} — ${new Date().toLocaleDateString()}`);
    setChatSessionId(sessionId);
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

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden bg-background">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6 relative">
        {/* Simple header */}
        <motion.header
          className="flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4 -mx-3 sm:-mx-6 mb-3 sm:mb-4 border-b border-border"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
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
                variant={analogyModeEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setAnalogyModeEnabled((prev) => !prev)}
                className="gap-2 rounded-md h-8 px-4 text-xs font-medium"
                disabled={isInputLocked}
                aria-pressed={analogyModeEnabled}
              >
                <Brain className="w-3.5 h-3.5" />
                Analogy: {analogyModeEnabled ? "On" : "Off"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-md h-8 px-4 text-xs font-medium border-dashed border-primary/30 text-muted-foreground"
                disabled={true}
                title="Knowledge Memory requires Analogix Plus"
              >
                <Database className="w-3.5 h-3.5" />
                Memory
                <div className="px-1 py-0.5 rounded-sm bg-primary/20 text-[8px] font-black uppercase text-primary">Plus</div>
              </Button>
            </motion.div>

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
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <Lightbulb className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-xs font-semibold text-primary">Quizzy</span>
                            </div>
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
                              <div className="mt-3 flex items-center justify-end gap-0.5 opacity-70 hover:opacity-100 transition-opacity">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
