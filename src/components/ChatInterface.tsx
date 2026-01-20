import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, BookOpen, Sparkles, GraduationCap, ArrowLeft } from "lucide-react";
import { type StudentProfile, SUBJECTS, INTERESTS, updateLearningStats } from "@/lib/storage";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .message-animate {
    animation: fadeIn 0.3s ease-out forwards;
  }
`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AssistantSkeleton = () => (
  <div className="space-y-2">
    <div className="h-3 w-[90%] rounded bg-muted animate-pulse" />
    <div className="h-3 w-[75%] rounded bg-muted animate-pulse" />
    <div className="h-3 w-[60%] rounded bg-muted animate-pulse" />
  </div>
);

export const ChatInterface = ({ profile, onEditProfile, onBackToDashboard }: any) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref for the specific scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const assistantBufferRef = useRef("");
  const flushTimeoutRef = useRef<number | null>(null);

  const flushAssistantMessage = () => {
    const finalContent = assistantBufferRef.current;

    setMessages(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;

      if (updated[lastIndex]?.role === "assistant") {
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: finalContent,
        };
      }

      return updated;
    });
  };

  const scheduleFlush = () => {
    if (flushTimeoutRef.current !== null) return;

    flushTimeoutRef.current = window.setTimeout(() => {
      flushAssistantMessage();
      flushTimeoutRef.current = null;
    }, 50);
  };

  const preprocessLatex = (content: string) => {
    return content
      .replace(/\\\[/g, "$$")
      .replace(/\\\]/g, "$$")
      .replace(/\\\(/g, "$")
      .replace(/\\\)/g, "$");
  };

  // Fixed Scroll Logic: Targets only the container's scroll position
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior,
      });
    }
  };

  // Scroll whenever messages update or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const getSubjectLabel = (value: string) => SUBJECTS.find(s => s.value === value)?.label || value;
  const getInterestLabel = (value: string) => INTERESTS.find(i => i.value === value)?.label || value;

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages(prev => [
      ...prev,
      userMessage,
      { role: "assistant", content: "" }
    ]);
    setInput("");
    setIsLoading(true);

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
            messages: [...messages, userMessage],
            profile,
          }),
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
                scheduleFlush();
              }
            } catch (e) {
              console.error("Error parsing", e);
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Something went wrong." }]);
    } finally {
      if (flushTimeoutRef.current !== null) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }

      flushAssistantMessage();
      assistantBufferRef.current = "";
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    // Added overflow-hidden to root to prevent whole-page scrolling
    <div className="flex flex-col w-full h-screen overflow-hidden bg-background">
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
              <h1 className="text-lg font-bold">AI Tutor</h1>
              <p className="text-xs text-muted-foreground">{profile.yearLevel} • {profile.state}</p>
            </div>
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
              <div className="inline-flex p-4 bg-secondary border-2 border-border mb-6">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Ask me anything!</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto mt-8">
                {["Explain Newton's laws", "Help with quadratic equations", "What caused World War I?", "How does photosynthesis work?"].map((q) => (
                  <button key={q} onClick={() => setInput(q)} className="p-3 text-left border-2 border-border bg-card hover:bg-secondary transition-colors text-sm font-medium">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} ${message.role === "user" ? "message-animate" : ""}`}>
                <Card className={`max-w-[90%] p-4 border-2 border-border shadow-none ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                  {message.role === "assistant" ? (
                    message.content === "" ? (
                      <div key={`skeleton-${index}`}>
                        <AssistantSkeleton />
                      </div>
                    ) : (
                      <div key={`content-${index}`} className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed message-animate">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {preprocessLatex(message.content)}
                        </ReactMarkdown>
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
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

      {/* Input Area - Fixed Height */}
      <footer className="flex-none w-full border-t-2 border-border bg-card p-4">
        <div className="w-full max-w-5xl mx-auto flex gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="min-h-[52px] max-h-32 resize-none border-2 focus-visible:ring-primary"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={!input.trim() || isLoading} className="h-auto px-6 border-2 border-border">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </footer>
    </div>
  );
};