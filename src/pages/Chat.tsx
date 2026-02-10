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
import { fetchImageForQuery } from "@/services/unsplash";
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
  imageUrl?: string; // Optional image shown inline (e.g. from Unsplash)
  isNew?: boolean; // Track if this is a new message for typewriter effect
  isWelcome?: boolean;
}

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
  const availableSubjects = userSubjects.length > 0
    ? subjects.filter((s) => userSubjects.includes(s.id))
    : subjects;
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
      setIsTyping(false); // Hide the dots.
      setIsAnimating(true); // Start typewriter animation
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
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "assistant",
      content: aiResponse.content || "Hmm, I'm having trouble thinking of a new topic. Try asking me a specific question!",
      analogy: `ai-generated-${Date.now()}`,
      isNew: true
    }]);
    setIsTyping(false);
    setIsAnimating(true);
    setStopTyping(false);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background */}
      <div className="liquid-blob w-96 h-96 bg-primary/20 -top-48 -right-48 fixed" />
      <div className="liquid-blob w-64 h-64 bg-accent/20 bottom-20 -left-32 fixed" style={{ animationDelay: '-2s' }} />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-6 relative z-10">
        {/* Header */}
        <motion.header
          className="glass-card px-6 py-4 mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
            <div className="justify-self-start">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
            <div className="flex items-center gap-2 justify-self-center">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold gradient-text">Quizzy</h1>
            </div>
            <div className="justify-self-end" />
          </div>
        </motion.header>

        {!selectedSubject ? (
          /* Subject Selection */
          <motion.div
            className="flex-1 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mt-4 mb-2">
                <TypewriterText text="What shall we explore today?" delay={150} />
              </h2>
              <p className="text-muted-foreground">
                Pick a subject and I'll teach through clear analogies.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-lg">
              {availableSubjects.map((subject, index) => {
                const Icon = subject.icon;
                return (
                  <motion.button
                    key={subject.id}
                    onClick={() => handleSubjectSelect(subject.id)}
                    className="relative p-5 rounded-2xl border-2 transition-all text-left group border-border glass hover:border-primary/50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="mb-3 block text-primary group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6" />
                    </span>
                    <div className="font-bold text-foreground">{subject.label}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 opacity-70 group-hover:opacity-100">
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
            {/* Subject Badge & Controls */}
            <motion.div
              className="flex items-center justify-center gap-4 mb-4 flex-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSubject(null);
                  setMessages([]);
                }}
                className="gap-2"
              >
                <BookOpen className="w-4 h-4" />
                {(() => {
                  const current = subjects.find((s) => s.id === selectedSubject);
                  const Icon = current?.icon;
                  return Icon ? <Icon className="w-4 h-4 text-primary" /> : null;
                })()}
                {subjects.find(s => s.id === selectedSubject)?.label}
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewTopic} className="gap-2" disabled={isInputLocked}>
                <RefreshCw className="w-4 h-4" />
                New Topic
              </Button>

              {/* Analogy Intensity Slider */}
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-background/50">
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Analogies:</span>
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={analogyIntensity}
                  onChange={(e) => setAnalogySIntensity(Number(e.target.value))}
                  className="w-24 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-xs font-bold text-primary w-5 text-center">{analogyIntensity + 1}/5</span>
              </div>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              <AnimatePresence>
                {messages.map((message, index) => {
                  const canRegenerate =
                    message.role === "assistant" &&
                    (message.isWelcome ||
                      (message.id === latestAssistantId && messages[index - 1]?.role === "user"));

                  return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "glass-card rounded-bl-md"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                            <Lightbulb className="w-3 h-3 text-primary-foreground" />
                          </div>
                          <span className="text-xs font-medium text-primary">Quizzy</span>
                        </div>
                      )}
                      {message.role === "assistant" ? (
                        <>
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
                          <div className="mt-3 flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopy(message.content, message.id)}
                              aria-label="Copy response"
                              title="Copy response"
                              className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary"
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
                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary"
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
                          <div className="mt-2 flex items-center justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopy(message.content, message.id)}
                              aria-label="Copy prompt"
                              title="Copy prompt"
                              className="h-7 w-7 rounded-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="glass-card p-4 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                        <Lightbulb className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <div className="flex gap-1">
                        <motion.span
                          className="w-2 h-2 bg-primary rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                        />
                        <motion.span
                          className="w-2 h-2 bg-primary rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }}
                        />
                        <motion.span
                          className="w-2 h-2 bg-primary rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <motion.div
              className="glass-card p-4 sticky bottom-0 z-20 bg-background/80 backdrop-blur-xl border border-white/20 shadow-[0_-10px_30px_-20px_rgba(0,0,0,0.35)] relative group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="pointer-events-none absolute -inset-1 rounded-[28px] opacity-0 transition-opacity duration-300 group-focus-within:opacity-100">
                <div
                  className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-[var(--g-1)] via-[var(--g-2)] to-[var(--g-3)] animate-gradient-x opacity-80"
                  style={{
                    padding: "2px",
                    WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude"
                  }}
                />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-3 relative z-10"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything about this subject..."
                  className="flex-1 glass border-border"
                />
                {(isTyping || isAnimating) ? (
                  <Button
                    type="button"
                    onClick={() => setStopTyping(true)}
                    className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!input.trim()}
                    className="gap-2 gradient-primary text-primary-foreground border-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </form>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Quizzy can make mistakes. Check important info.
              </p>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
