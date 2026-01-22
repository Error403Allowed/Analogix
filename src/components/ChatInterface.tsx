import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Send, Loader2, Sparkles, GraduationCap, ArrowLeft, Sun, Moon, Copy, Check, Square, RotateCcw } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { getRandomQuestions, updateLearningStats, type StudentProfile } from "@/lib/storage";
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .message-animate {
    animation: fadeIn 0.3s ease-out forwards;
  }
  
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .streaming-cursor::after {
    content: "";
    display: inline-block;
    width: 2px;
    height: 1.1em;
    background-color: #3b82f6;
    margin-left: 2px;
    vertical-align: middle;
    animation: blink 0.8s infinite;
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
  }
  
  @keyframes bounce-dot {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1.0); }
  }

  .dot-flashing {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .dot-flashing div {
    width: 4px;
    height: 4px;
    background-color: currentColor;
    border-radius: 50%;
    display: inline-block;
    animation: bounce-dot 1.4s infinite ease-in-out both;
  }

  .dot-flashing div:nth-child(1) { animation-delay: -0.32s; }
  .dot-flashing div:nth-child(2) { animation-delay: -0.16s; }

  @keyframes glow-around {
    0% { box-shadow: 0 0 20px -5px rgba(59, 130, 246, 0.5), 0 0 15px -5px rgba(16, 185, 129, 0.4); }
    50% { box-shadow: 0 0 30px -5px rgba(59, 130, 246, 0.3), 0 0 25px -2px rgba(16, 185, 129, 0.6); }
    100% { box-shadow: 0 0 20px -5px rgba(59, 130, 246, 0.5), 0 0 15px -5px rgba(16, 185, 129, 0.4); }
  }

  @keyframes gradient-flow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .glow-container {
    position: relative;
    padding: 2px;
    background: transparent;
    border-radius: 18px;
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .glow-container:focus-within {
    outline: none;
    background: linear-gradient(270deg, #3b82f6, #10b981, #9333ea, #3b82f6);
    background-size: 300% auto;
    animation: glow-around 4s infinite ease-in-out, gradient-flow 6s infinite linear;
    border-color: transparent;
  }
`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  profile: StudentProfile;
  onBackToDashboard: () => void;
}

export const ChatInterface = ({ profile, onBackToDashboard }: ChatInterfaceProps) => {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);

  const suggestedTopics = useMemo(() => 
    getRandomQuestions(profile.subjects), 
    [profile.subjects]
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Ref for the specific scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const assistantBufferRef = useRef("");
  const [isTyping, setIsTyping] = useState(false);
  const typingIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startTypewriter = () => {
    if (typingIntervalRef.current !== null) return;
    
    setIsTyping(true);
    typingIntervalRef.current = window.setInterval(() => {
      if (assistantBufferRef.current.length > 0) {
        // Take 2-4 characters at a time for smoothness but speed
        const charsToTake = Math.min(assistantBufferRef.current.length, 3);
        const chunk = assistantBufferRef.current.slice(0, charsToTake);
        assistantBufferRef.current = assistantBufferRef.current.slice(charsToTake);

        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (updated[lastIndex]?.role === "assistant") {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: updated[lastIndex].content + chunk,
            };
          }
          return updated;
        });
      } else if (!isLoading) {
        // Only stop if buffer is empty AND we aren't loading anymore
        stopTypewriter();
      }
    }, 15); // Fast but smooth interval
  };

  const stopTypewriter = () => {
    if (typingIntervalRef.current !== null) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setIsTyping(false);
  };

  useEffect(() => {
    return () => stopTypewriter();
  }, []);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const preprocessLatex = (content: string) => {
    return content
      .replace(/\\\[/g, "$$")
      .replace(/\\\]/g, "$$")
      .replace(/\\\(/g, "$")
      .replace(/\\\)/g, "$");
  };

  // Fixed Scroll Logic: Targets only the container's scroll position
  const scrollToBottom = (behavior: ScrollBehavior = "smooth", force = false) => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = scrollContainerRef.current;
      // If we are within 50px of the bottom, we consider it "at the bottom"
      // Using a smaller threshold to avoid "snapping" when user scrolls up
      const isNearBottom = scrollHeight - clientHeight - scrollTop < 50;

      if (force || isNearBottom) {
        scrollContainerRef.current.scrollTo({
          top: scrollHeight - clientHeight,
          behavior,
        });
      }
    }
  };

  // Scroll whenever messages update or loading state changes
  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    const isNewUserMessage = lastMessage.role === "user";
    const isNewAssistantMessage = lastMessage.role === "assistant" && lastMessage.content === "";

    // If it's a typing update, use "instant" (auto) behavior to not fight manual scroll
    // Only use "smooth" for new messages
    const behavior = (isNewUserMessage || isNewAssistantMessage) ? "smooth" : "auto";
    
    scrollToBottom(behavior, isNewUserMessage || isNewAssistantMessage);
  }, [messages, isLoading]);



  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    stopTypewriter();
    assistantBufferRef.current = "";
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isTyping) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    
    // We update messages with new set to avoid race conditions with setMessages above
    setMessages(prev => {
      const filtered = prev.filter((m, i) => {
        // If we are interrupting, the last message might be an assistant one we just tried to clear
        // But since setState is async, we ensure we don't have an empty/partial assistant message at the end
        if (i === prev.length - 1 && m.role === "assistant") return false;
        return true;
      });
      return [
        ...filtered,
        userMessage,
        { role: "assistant", content: "" }
      ];
    });

    setInput("");
    setIsLoading(true);

    // Track the question for dashboard stats
    updateLearningStats(profile.subjects[0]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tutor-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            // Filter out any partial or empty assistant messages from history
            messages: [...messages.filter(m => m.role !== "assistant" || m.content !== ""), userMessage],
            profile,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantBufferRef.current += content;
                startTypewriter();
              }
            } catch (e) {
              console.error("Error parsing", e);
            }
          }
        }
      }
    } catch (_error) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ The response has been cancelled or timed out." }]);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    // Added overflow-hidden to root to prevent whole-page scrolling
    <div className="flex flex-col w-full h-screen overflow-hidden bg-background bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-tertiary/5">
      <style>{animationStyles}</style>

      {/* Header - Fixed Height */}
      <header className="flex-none w-full border-b-2 border-border bg-card p-4">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBackToDashboard}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <div className="h-6 w-px bg-border mx-2" />
            <div className="p-2 bg-primary border-2 border-border">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-primary">Analogix</h1>
                <span className="text-muted-foreground">|</span>
                <span className="font-medium">{profile.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{profile.yearLevel} • {profile.state}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMessages([]);
                assistantBufferRef.current = "";
                stopTypewriter();
              }}
              className="border-2"
              title="Start a new conversation"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              New Chat
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="border-2"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Messages Area - min-h-0 is the key for nested flex scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 w-full"
      >
        <div className="w-full max-w-5xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12 message-animate">
              <h2 className="text-2xl font-bold mb-2">Ask me anything!</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto mt-8">
                {suggestedTopics.map((q) => (
                  <button type="button" key={q} onClick={() => setInput(q)} className="p-3 text-left border-2 border-border bg-card hover:bg-secondary transition-colors text-sm font-medium">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} ${message.role === "user" ? "message-animate" : ""}`}>
                {message.role === "assistant" && (
                  <div className="mr-2 mt-2 p-1.5 rounded-full bg-primary/10 border border-primary/20 h-fit">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}
                <Card className={`max-w-[85%] p-4 border shadow-sm transition-all duration-300 ${message.role === "user"
                    ? "bg-[#007AFF] text-white border-[#007AFF] rounded-2xl rounded-tr-sm dark:bg-[#007AFF]"
                    : "bg-card ai-bubble-glow rounded-2xl rounded-tl-sm"
                  }`}>
                  {message.role === "assistant" ? (
                    message.content === "" ? (
                      <div key={`skeleton-${index}`} className="flex items-center gap-1 py-1">
                        <span className="text-sm font-medium text-muted-foreground mr-1">Thinking</span>
                        <div className="dot-flashing">
                          <div></div>
                          <div></div>
                          <div></div>
                        </div>
                      </div>
                    ) : (
                      <div key={`content-${index}`} className={`prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-headings:text-foreground prose-strong:text-foreground ${(isLoading || isTyping) && index === messages.length - 1 ? "streaming-cursor" : ""}`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {preprocessLatex(message.content)}
                        </ReactMarkdown>
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap font-medium">{message.content}</p>
                  )}
                  {message.role === "assistant" && message.content !== "" && !(isLoading && index === messages.length - 1) && (
                    <div className="flex justify-end mt-2 pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => copyToClipboard(message.content, index)}
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </Card>
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start message-animate">
              <Card className="p-4 border-2 border-border bg-card">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </Card>
            </div>
          )}
        </div>
      </div>

      <footer className="flex-none w-full border-t-2 border-border bg-card p-4">
        <div className="w-full max-w-5xl mx-auto flex gap-3">
          {/* Glowing Wrapper */}
          <div className="flex-1 rounded-[18px] glow-container border-2 border-border focus-within:border-transparent">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading && !isTyping) sendMessage();
              }
            }}
            placeholder={isLoading || isTyping ? "AI is thinking..." : "Type your question..."}
            disabled={isLoading || isTyping}
            className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none text-base resize-none py-3 px-3 h-[48px] min-h-[48px] placeholder:text-muted-foreground transition-all duration-300 disabled:opacity-50"
          />
          </div>
          {(isLoading || isTyping) ? (
            <Button onClick={handleStop} variant="destructive" className="h-[52px] w-[52px] p-0 flex items-center justify-center border-2 border-destructive/20 rounded-[12px] hover:bg-destructive hover:text-destructive-foreground transition-all duration-300">
              <Square className="h-5 w-5 fill-current" />
            </Button>
          ) : (
            <Button onClick={sendMessage} disabled={!input.trim()} className="h-[52px] w-[52px] p-0 flex items-center justify-center border-2 border-border rounded-[12px]">
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};