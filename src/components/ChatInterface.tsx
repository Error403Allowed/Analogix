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
import { Analytics } from "@vercel/analytics/next"

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  profile: StudentProfile;
  onEditProfile: () => void;
  onBackToDashboard: () => void;
}

export const ChatInterface = ({ profile, onEditProfile, onBackToDashboard }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getSubjectLabel = (value: string) => {
    return SUBJECTS.find(s => s.value === value)?.label || value;
  };

  const getInterestLabel = (value: string) => {
    return INTERESTS.find(i => i.value === value)?.label || value;
  };

  const detectSubject = (text: string): string | undefined => {
    const lowerText = text.toLowerCase();
    for (const subject of SUBJECTS) {
      if (lowerText.includes(subject.label.toLowerCase()) || lowerText.includes(subject.value)) {
        return subject.value;
      }
    }
    // Check for common topic keywords
    if (lowerText.includes('newton') || lowerText.includes('physics') || lowerText.includes('force')) {
      return 'physics';
    }
    if (lowerText.includes('equation') || lowerText.includes('algebra') || lowerText.includes('math')) {
      return 'mathematics';
    }
    if (lowerText.includes('cell') || lowerText.includes('photosynthesis') || lowerText.includes('dna')) {
      return 'biology';
    }
    if (lowerText.includes('war') || lowerText.includes('history') || lowerText.includes('ancient')) {
      return 'history';
    }
    return undefined;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const detectedSubject = detectSubject(input);
    
    setMessages(prev => [...prev, userMessage]);
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

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a moment.");
        }
        if (response.status === 402) {
          throw new Error("Usage limit reached. Please try again later.");
        }
        throw new Error("Failed to get response");
      }

      // Track the question
      updateLearningStats(detectedSubject);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      // Add empty assistant message to stream content into
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              setMessages(prev => {
                const lastIndex = prev.length - 1;
                const lastMessage = prev[lastIndex];
                if (lastMessage.role === "assistant") {
                  const updatedMessage = {
                    ...lastMessage,
                    content: lastMessage.content + content,
                  };
                  return [...prev.slice(0, lastIndex), updatedMessage];
                }
                return prev;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: `⚠️ ${errorMessage}. Please try again.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    "Explain Newton's laws of motion",
    "Help me understand quadratic equations",
    "What caused World War I?",
    "How does photosynthesis work?",
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-border bg-card p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToDashboard}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="p-2 bg-primary border-2 border-border shadow-xs">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">AI Tutor</h1>
              <p className="text-xs text-muted-foreground">
                {profile.yearLevel} • {profile.state}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse p-4">
        <div className="max-w-4xl mx-auto space-y-4 flex flex-col-reverse">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-secondary border-2 border-border mb-6">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Ask me anything!</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                I'll explain concepts using analogies from your interests like{" "}
                <span className="font-medium">
                  {profile.interests.slice(0, 2).map(getInterestLabel).join(" and ")}
                </span>
                !
              </p>

              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {profile.subjects.slice(0, 4).map((subject) => (
                  <Badge
                    key={subject}
                    variant="secondary"
                    className="border-2 border-border"
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    {getSubjectLabel(subject)}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => setInput(question)}
                    className="p-3 text-left border-2 border-border bg-card hover:bg-secondary transition-colors text-sm font-medium"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`max-w-[85%] p-4 border-2 border-border ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        children={message.content}
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            return (
                              <pre
                                className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto text-sm"
                                {...props}
                              >
                                <code>{children}</code>
                              </pre>
                            );
                          },
                          a({ node, ...props }) {
                            return <a className="text-blue-500 underline" {...props} />;
                          },
                        }}
                      />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </Card>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t-2 border-border bg-card p-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your subjects..."
            className="min-h-[52px] max-h-32 resize-none border-2"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="h-auto px-6 border-2 border-border shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};