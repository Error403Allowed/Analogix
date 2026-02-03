import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getGroqCompletion } from "@/services/groq";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QuickChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hey! Ask me to explain any concept using an analogy." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userPrefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
  const userName = userPrefs.name || "friend";
  const userHobbies = userPrefs.hobbies || ["gaming"];
  const userSubjects = userPrefs.subjects || ["general"];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: input });

    const response = await getGroqCompletion(history, {
      subjects: userSubjects,
      hobbies: userHobbies,
      learningStyle: userPrefs.learningStyle || "visual"
    });

    setMessages(prev => [...prev, { 
      id: (Date.now() + 1).toString(), 
      role: "assistant", 
      content: response.content || "I'm a bit lost, could you say that again?" 
    }]);
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-[550px] overflow-hidden bg-background/50 backdrop-blur-sm rounded-2xl">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "glass border border-border rounded-bl-none text-foreground"
                }`}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <div className="flex justify-start">
            <div className="glass p-3 rounded-2xl rounded-bl-none">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-4">
          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 px-1">Try asking about:</p>
          <div className="flex flex-wrap gap-2">
            {["Photosynthesis", "Pythagoras", "The Silk Road", "Supply & Demand"].map((topic) => (
              <button
                key={topic}
                onClick={() => {
                  setInput(`Can you explain ${topic}?`);
                }}
                className="text-[11px] px-3 py-1.5 rounded-full glass border border-primary/20 hover:border-primary text-foreground transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2 bg-muted/30">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. explain gravity..."
          className="text-xs h-10 glass border-none focus-visible:ring-1 focus-visible:ring-primary/30"
        />
        <Button size="icon" className="h-10 w-10 gradient-primary shrink-0 shadow-lg shadow-primary/20" disabled={isTyping}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};

export default QuickChat;
