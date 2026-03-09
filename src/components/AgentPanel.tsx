"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, X, Send, Loader2, Sparkles, Trash2, ChevronDown,
  BookOpen, FileText, MessageSquare, CheckCircle2, AlertCircle, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import type { ChatMessage } from "@/types/chat";

// ── Action result types ────────────────────────────────────────────────────
interface ActionResult {
  type: string;
  success: boolean;
  detail?: string;
}

const ACTION_LABELS: Record<string, string> = {
  create_document:     "Document created",
  update_document:     "Document updated",
  replace_study_guide: "Study guide updated",
  add_flashcards:      "Flashcards added",
};

// ── Pages where the agent should NOT appear ────────────────────────────────
const HIDDEN_ON = ["/", "/onboarding", "/login", "/timer", "/chat", "/study-guide-loading"];

// ── Suggested quick prompts ────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: "Summarise my notes", icon: FileText },
  { label: "Quiz me on my docs", icon: BookOpen },
  { label: "What have I been studying?", icon: MessageSquare },
  { label: "Add flashcards for my last topic", icon: Sparkles },
];

// ── Typing animation ───────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1" style={{ height: 20 }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          style={{
            display: "inline-block", width: 7, height: 7,
            borderRadius: "50%", background: "hsl(var(--primary))",
          }}
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── Main AgentPanel component ──────────────────────────────────────────────
export default function AgentPanel() {
  const pathname = usePathname();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actionResults, setActionResults] = useState<Record<number, ActionResult[]>>({});
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Hide on certain pages — computed here but the early return is AFTER all hooks
  const isHidden = HIDDEN_ON.some(p =>
    pathname === p || pathname.startsWith(p + "/")
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput("");
    setError("");

    const userMsg: ChatMessage = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/groq/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.filter(m => m.role !== "system"),
          userContext: {},
        }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();

      const assistantMsgIndex = newMessages.length; // index of the message we're about to add
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.content || "Sorry, no response." },
      ]);

      // If the AI returned actions, execute them server-side
      if (data.actions && data.actions.length > 0) {
        console.log("[AgentPanel] Executing actions:", data.actions);
        const actionRes = await fetch("/api/groq/agent-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actions: data.actions }),
        });
        console.log("[AgentPanel] agent-action status:", actionRes.status);
        const actionData = await actionRes.json();
        console.log("[AgentPanel] agent-action results:", actionData);
        if (actionData.results) {
          setActionResults(prev => ({ ...prev, [assistantMsgIndex]: actionData.results }));
          window.dispatchEvent(new CustomEvent("subjectDataUpdated", {
            detail: { results: actionData.results },
          }));
        }
      }
    } catch {
      setError("Couldn't reach the AI. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => { setMessages([]); setActionResults({}); };

  const isEmpty = messages.length === 0;

  if (isHidden) return null;

  return (
    <>
      {/* ── Floating button ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            onClick={() => setOpen(true)}
            className={cn(
              "fixed bottom-6 right-6 z-[9998]",
              "w-14 h-14 rounded-2xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.45)]",
              "bg-primary text-primary-foreground",
              "flex items-center justify-center",
              "hover:scale-105 active:scale-95 transition-transform",
              "border border-primary/20"
            )}
            aria-label="Open Analogix AI AI agent"
          >
            <Brain className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={cn(
              "fixed bottom-6 right-6 z-[9999]",
              "w-[420px] max-w-[calc(100vw-1.5rem)]",
              "rounded-3xl border border-border/50",
              "bg-card shadow-[0_24px_72px_-8px_rgba(0,0,0,0.6)]",
              "flex flex-col overflow-hidden",
            )}
            style={{ height: "min(600px, calc(100vh - 6rem))" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30 bg-primary/5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground leading-tight">Analogix AI</p>
                <p className="text-[10px] text-muted-foreground/60 leading-tight flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-primary/60" />
                  Can read &amp; edit your workspace
                </p>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 transition-colors"
                    title="Clear chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">

              {/* Empty state — quick prompts */}
              {isEmpty && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-4"
                >
                  <div className="text-center space-y-1 pt-2">
                    <p className="text-sm font-semibold text-foreground/80">
                      Ask me anything about your workspace
                    </p>
                    <p className="text-xs text-muted-foreground/50">
                      I can read your workspace — and write to it too. Ask me to create notes, add flashcards, or update a document.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
                      <button
                        key={label}
                        onClick={() => sendMessage(label)}
                        className={cn(
                          "flex items-start gap-2 p-3 rounded-2xl text-left",
                          "border border-border/50 bg-muted/20 hover:bg-primary/8 hover:border-primary/30",
                          "transition-all text-xs font-medium text-foreground/70 hover:text-foreground",
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Message bubbles */}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-1.5"
                >
                  <div className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                        <Brain className="w-3 h-3 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted/50 text-foreground rounded-bl-sm"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      ) : (
                        <p className="leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                  </div>

                  {/* Action result pills — shown below assistant messages */}
                  {msg.role === "assistant" && actionResults[i] && actionResults[i].length > 0 && (
                    <div className="ml-8 flex flex-col gap-1">
                      {actionResults[i].map((result, j) => (
                        <motion.div
                          key={j}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: j * 0.06 }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-semibold",
                            result.success
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-destructive/10 text-destructive border border-destructive/20"
                          )}
                        >
                          {result.success
                            ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                            : <AlertCircle className="w-3 h-3 shrink-0" />}
                          <span>{result.success ? (ACTION_LABELS[result.type] || result.type) : result.detail}</span>
                          {result.success && result.detail && (
                            <span className="text-muted-foreground/50 font-normal truncate">— {result.detail.split(" in ")[0]}</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2"
                >
                  <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Brain className="w-3 h-3 text-primary" />
                  </div>
                  <div className="bg-muted/50 rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <TypingDots />
                  </div>
                </motion.div>
              )}

              {/* Error message */}
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-destructive text-center px-2"
                >
                  {error}
                </motion.p>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="px-4 pb-4 pt-2 shrink-0 border-t border-border/20">
              <div className={cn(
                "flex items-end gap-2 rounded-2xl border border-border/50 bg-muted/20 px-3 py-2",
                "focus-within:border-primary/40 focus-within:bg-muted/30 transition-colors"
              )}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your notes, docs, flashcards…"
                  rows={1}
                  disabled={loading}
                  className={cn(
                    "flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40",
                    "outline-none resize-none leading-relaxed",
                    "disabled:opacity-50"
                  )}
                  style={{ minHeight: 24, maxHeight: 120 }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mb-0.5",
                    "bg-primary text-primary-foreground",
                    "disabled:opacity-30 hover:bg-primary/90 active:scale-95 transition-all"
                  )}
                >
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/30 text-center mt-1.5">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}