import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Sparkles,
  BookOpen,
  Lightbulb,
  RefreshCw,
  Square,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { getGroqCompletion } from "@/services/huggingface";
import { statsStore } from "@/utils/statsStore";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import TypewriterText from "@/components/TypewriterText";
import { SUBJECT_CATALOG, getSubjectDescription } from "@/constants/subjects";
import { getStoredMoodId } from "@/utils/mood";

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
  const hasStartedRef = useRef(false);
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
    // If not new or already started, don't restart
    if (!isNew || hasStartedRef.current) {
      if (!isNew) {
        setDisplayedContent(content);
      }
      return;
    }

    hasStartedRef.current = true;
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

const subjects = SUBJECT_CATALOG;


/**
 * ANALOGY TUTOR: This is where you actually talk to Quizzy (the AI).
 * It uses your preferences to explain things in a way that makes sense to YOU.
 */
const Chat = () => {
  const navigate = useNavigate();
  
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

  // ANALOGY INTENSITY: Controls how many analogies appear (0-4 = 5 levels)
  const [analogyIntensity, setAnalogySIntensity] = useState(3);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // RETRIEVING MEMORY: We pull your hobbies and subjects from the browser.
  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const userName = userPrefs.name || "Student";
  const userHobbies = userPrefs.hobbies || ["gaming", "sports"];
  const userSubjects = userPrefs.subjects || [];
  // Always show all subjects when picking what to learn with Quizzy (onboarding choices are for context only)
  const isInputLocked = isTyping || isAnimating;

  const latestAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

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

  const buildContext = useCallback(() => ({
    subjects: selectedSubject ? [selectedSubject] : userSubjects,
    hobbies: userHobbies,
    grade: userPrefs.grade,
    learningStyle: userPrefs.learningStyle,
    mood: getStoredMoodId(),
    analogyIntensity
  }), [selectedSubject, userSubjects, userHobbies, userPrefs.grade, userPrefs.learningStyle, analogyIntensity]);

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

    const subjectLabel = subjects.find(s => s.id === selectedSubject)?.label || selectedSubject || "this subject";

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

    const aiResponse = await getGroqCompletion(history, buildContext());

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
    setIsTyping(false);
    setIsAnimating(true);
    setStopTyping(false);
  }, [
    isInputLocked,
    messages,
    subjects,
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

  // No auto-scroll: user controls when to scroll.

  // PICKING A TOPIC: This runs when you select a subject icon.
  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    const subject = subjects.find(s => s.id === subjectId);
    const subjectLabel = subject?.label || subjectId;
    
    // WELCOME: Ask the user what they want to dive into!
    setMessages([{
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content: buildWelcomeMessage(subjectLabel),
      isNew: true,
      isWelcome: true
    }]);
    setIsAnimating(true);
    setStopTyping(false);
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

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true); // Show the "thinking" dots.

    // Record the conversation
    if (selectedSubject) {
      statsStore.recordChat(subjects.find(s => s.id === selectedSubject)?.label || selectedSubject);
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
      const context = buildContext();

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
      setIsTyping(false);
      setIsAnimating(true);
      setStopTyping(false);
    })();
  };

  const handleNewTopic = async () => {
    if (!selectedSubject || isInputLocked) return;

    // AI GENERATION: Always ask the AI for a new topic from the start.
    setIsTyping(true);
    const subjectLabel = subjects.find(s => s.id === selectedSubject)?.label || selectedSubject;
    const usedTopics = messages.filter(m => m.analogy).map(m => m.analogy).filter(Boolean);
    
    const context = buildContext();

    const avoidText = usedTopics.length > 0 ? `Avoid repeating these topics: ${usedTopics.join(", ")}.` : "";
    const aiPrompt = [{ 
      role: "user" as const, 
      content: `Introduce a NEW, interesting concept in ${subjectLabel} using an analogy that references a specific moment, scene, or character from my interests (${userHobbies.join(", ")})—not generic settings. ${avoidText}` 
    }];

    const aiResponse = await getGroqCompletion(aiPrompt, context);
    const newMsgId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: newMsgId,
      role: "assistant",
      content: aiResponse.content || "Hmm, I'm having trouble thinking of a new topic. Try asking me a specific question!",
      analogy: `ai-generated-${newMsgId}`,
      isNew: true
    }]);
    setIsTyping(false);
    setIsAnimating(true);
    setStopTyping(false);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden chat-neural-bg">
      <div className="chat-blob chat-blob-1" aria-hidden />
      <div className="chat-blob chat-blob-2" aria-hidden />
      <div className="chat-blob chat-blob-3" aria-hidden />
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 relative z-10">
        {/* Neural interface header */}
        <motion.header
          className="chat-neural-header flex items-center justify-between py-3 px-4 -mx-4 sm:-mx-6 mb-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="gap-2 -ml-2 text-muted-foreground hover:text-foreground rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="quizzy-avatar w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold gradient-text">Quizzy</h1>
          </div>
          <div className="w-16" />
        </motion.header>

        {!selectedSubject ? (
          /* Subject Selection - refined cards */
          <motion.div
            className="flex-1 flex flex-col items-center justify-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2 tracking-tight">
                <TypewriterText text="What shall we explore today?" delay={150} />
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Pick a subject — I'll explain with clear, personalized analogies.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 w-full max-w-2xl">
              {subjects.map((subject, index) => {
                const Icon = subject.icon;
                return (
                  <motion.button
                    key={subject.id}
                    onClick={() => handleSubjectSelect(subject.id)}
                    className="chat-hex-card p-5 text-left group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, type: "spring", stiffness: 180, damping: 18 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="font-bold text-foreground text-sm">{subject.label}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 font-mono">
                      {getSubjectDescription(subject.id, userPrefs.grade)}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* Chat Interface */
          <>
            {/* Subject Badge & Controls - compact pill bar */}
            <motion.div
              className="flex items-center justify-center gap-2 sm:gap-3 mb-6 flex-wrap"
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
                className="chat-neural-pill gap-2 rounded-md h-8 px-4 text-xs font-medium hover:text-primary"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {(() => {
                  const current = subjects.find((s) => s.id === selectedSubject);
                  const Icon = current?.icon;
                  return Icon ? <Icon className="w-3.5 h-3.5 text-primary" /> : null;
                })()}
                {subjects.find(s => s.id === selectedSubject)?.label}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewTopic}
                className="chat-neural-pill gap-2 rounded-md h-8 px-4 text-xs font-medium hover:text-primary"
                disabled={isInputLocked}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New Topic
              </Button>

              <div className="chat-neural-pill flex items-center gap-2 pl-3 pr-3 py-1.5 rounded-md">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Analogies</span>
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={analogyIntensity}
                  onChange={(e) => setAnalogySIntensity(Number(e.target.value))}
                  className="w-20 h-1.5 bg-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="text-xs font-semibold text-primary tabular-nums w-4">{analogyIntensity + 1}/5</span>
              </div>
            </motion.div>

            {/* Messages - sleek chat bubbles */}
            <div className="flex-1 overflow-y-auto space-y-6 mb-6 min-h-0">
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
                    <div
                      className={`max-w-[88%] sm:max-w-[85%] ${
                        message.role === "user"
                          ? "chat-bubble-user"
                          : "chat-bubble-assistant"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-2.5">
                          <div className="quizzy-avatar w-6 h-6 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                            <Lightbulb className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-semibold gradient-text">Quizzy</span>
                        </div>
                      )}
                      {message.role === "assistant" ? (
                        <>
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
                            content={message.content} 
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
                              onClick={() => handleCopy(message.content, message.id)}
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
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </p>
                          <div className="mt-2 flex items-center justify-end opacity-80 hover:opacity-100 transition-opacity">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopy(message.content, message.id)}
                              aria-label="Copy prompt"
                              title="Copy prompt"
                              className="h-7 w-7 rounded-lg text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/15"
                            >
                              {copiedId === message.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
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
                  <div className="chat-bubble-assistant">
                    <div className="flex items-center gap-3">
                      <div className="quizzy-avatar w-6 h-6 rounded-md flex items-center justify-center shrink-0">
                        <Lightbulb className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex gap-1 items-end h-5">
                        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="spectrum-bar" style={{ alignSelf: "flex-end" }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input - terminal style */}
            <motion.div
              className="sticky bottom-0 z-20 pt-2 pb-1 -mx-1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="chat-input-container rounded-lg">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2 sm:gap-3 items-center p-3"
                >
                  <span className="text-primary font-semibold text-sm shrink-0">›</span>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything about this subject..."
                    className="flex-1 h-11 sm:h-12 px-3 rounded-md border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70 font-mono text-sm"
                  />
                  {(isTyping || isAnimating) ? (
                    <Button
                      type="button"
                      onClick={() => setStopTyping(true)}
                      size="icon"
                      className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-destructive/90 hover:bg-destructive text-destructive-foreground border-0 shrink-0"
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={!input.trim()}
                      size="icon"
                      className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl gradient-primary text-white border-0 shrink-0 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
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
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
