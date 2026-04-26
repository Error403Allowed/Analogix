"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, X, Send, Loader2, Sparkles, Trash2, ChevronDown,
  BookOpen, FileText, MessageSquare, CheckCircle2, AlertCircle, Zap,
  Eye, PanelRight, Maximize2, ExternalLink, Calendar, Users, ClipboardList,
} from "lucide-react";
import ContentInput, { type ContextItem } from "@/components/ContentInput";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useAgentContext } from "@/context/AgentContext";
import type { ChatMessage } from "@/types/chat";
import { gatherAppContext, type ContextOptions } from "@/lib/contextGatherer";
import { subjectStore } from "@/utils/subjectStore";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { chatStore } from "@/utils/chatStore";
import {
  AGENT_QUIZ_SESSION_KEY,
  normaliseAgentQuizAction,
} from "@/lib/agentQuiz";
import { filterBottomRightAgentActions } from "@/lib/agentActions";
import { GROQ_MODELS, type GroqModelId } from "@/types/groq-models";

// ── Action result types ────────────────────────────────────────────────────
interface ActionResult {
  type: string;
  success: boolean;
  detail?: string;
}

const ACTION_LABELS: Record<string, string> = {
  add_flashcards:      "Flashcards added",
  start_quiz:          "Quiz starting",
};

// ── Pages where the agent should NOT appear ────────────────────────────────
const HIDDEN_ON = ["/", "/onboarding", "/login", "/timer", "/chat", "/study-guide-loading"];

// ── Agent selector — icons that switch between agents ───────────────────────────────────
const AGENT_BUTTONS = [
  { id: 'planner', icon: Calendar, label: 'Planner', color: '#10B981' },
  { id: 'notes', icon: FileText, label: 'Notes', color: '#3B82F6' },
  { id: 'tasks', icon: ClipboardList, label: 'Tasks', color: '#F59E0B' },
  { id: 'collab', icon: Users, label: 'Collaborate', color: '#8B5CF6' },
] as const;

type SelectedAgentId = typeof AGENT_BUTTONS[number]['id'];

// Quick prompts change based on selected agent
const QUICK_PROMPTS_BY_AGENT: Record<SelectedAgentId, { label: string; icon: React.ElementType }[]> = {
  planner: [
    { label: "Plan my week", icon: Calendar },
    { label: "What's coming up?", icon: Calendar },
    { label: "Create study schedule", icon: Calendar },
  ],
  notes: [
    { label: "Summarise my notes", icon: FileText },
    { label: "Extract key points", icon: FileText },
    { label: "Create a new note", icon: FileText },
  ],
  tasks: [
    { label: "Add a task", icon: ClipboardList },
    { label: "What tasks do I have?", icon: ClipboardList },
    { label: "Set a reminder", icon: ClipboardList },
  ],
  collab: [
    { label: "Create study room", icon: Users },
    { label: "Start collab session", icon: Users },
    { label: "Invite a partner", icon: Users },
  ],
};

const AGENT_SESSION_KEY = "agentChatSessionId";
const AGENT_MODEL_KEY = "analogix_agent_model";
const MAX_AGENT_HISTORY = 30;
const AGENT_MODE_KEY = "analogix_agent_mode";

export type AgentMode = "floating" | "sidebar";

const MODE_META: Record<AgentMode, { label: string; icon: React.ElementType; tip: string }> = {
  floating: { label: "Float",   icon: Maximize2,  tip: "Floating panel" },
  sidebar:  { label: "Sidebar", icon: PanelRight, tip: "Right sidebar"  },
};

const safeLocalStorageGet = (key: string) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const safeLocalStorageSet = (key: string, value: string) => {
  try { localStorage.setItem(key, value); } catch { /* ignore storage errors */ }
};
const safeLocalStorageRemove = (key: string) => {
  try { localStorage.removeItem(key); } catch { /* ignore storage errors */ }
};

// ── Typing animation ───────────────────────────────────────────────────────
function TypingDots({ keyPrefix = "typing" }: { keyPrefix?: string }) {
  return (
    <div className="flex items-center gap-1 py-1" style={{ height: 18 }}>
      {[0, 1, 2].map((i, idx) => (
        <motion.span
          key={`${keyPrefix}-${idx}`}
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "hsl(var(--primary))",
          }}
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ── Main AgentPanel component ──────────────────────────────────────────────
export default function AgentPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const { agentMode, agentOpen: open, setAgentMode: setAgentModeCtx, setAgentOpen: setOpen } = useAgentContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actionResults, setActionResults] = useState<Record<number, ActionResult[]>>({});
  const [input, setInput] = useState("");
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [contextOptions, setContextOptions] = useState<ContextOptions>({
    includeRecentDocs: true,
    includeEvents: true,
    includeStats: true,
    includeFlashcards: true,
    includeAchievements: true,
  });
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingKey, setLoadingKey] = useState(0);
  const [recentContext, setRecentContext] = useState<ContextItem[]>([]);
  const [currentDoc, setCurrentDoc] = useState<{ title: string; subjectId: string; content: string } | null>(null);
  const [showContextOptions, setShowContextOptions] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [agentModelId, setAgentModelId] = useState<GroqModelId>("auto");
  const [selectedAgentId, setSelectedAgentId] = useState<SelectedAgentId>('planner');
  const [pendingConfirmations, setPendingConfirmations] = useState<Array<{ id: string; summary: string }>>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted model choice
  useEffect(() => {
    const saved = safeLocalStorageGet(AGENT_MODEL_KEY);
    if (saved && GROQ_MODELS.some(m => m.id === saved)) {
      setAgentModelId(saved as GroqModelId);
    }
  }, []);

  const setAgentMode = (mode: AgentMode) => {
    setAgentModeCtx(mode);
  };

  // FAB always opens the panel
  const handleFabClick = () => setOpen(true);

  // Hide on certain pages — computed here but the early return is AFTER all hooks
  const isHidden = HIDDEN_ON.some(p =>
    pathname === p || pathname.startsWith(p + "/")
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Build @-mention context list (current page + recent docs)
  useEffect(() => {
    let active = true;
    const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const subjectLabel = (id: string) =>
      SUBJECT_CATALOG.find(s => s.id === id)?.label || id;

    const build = async () => {
      try {
        const all = await subjectStore.getAll();
        const docEntries: Array<ContextItem & { lastUpdated?: string }> = [];
        Object.entries(all).forEach(([subjectId, data]) => {
          const label = subjectLabel(subjectId);
          (data.notes.documents || []).forEach(doc => {
            const preview = stripHtml(doc.content || "").slice(0, 120);
            docEntries.push({
              id: doc.id,
              title: doc.title || "Untitled",
              subject: label,
              preview,
              type: "doc",
              lastUpdated: doc.lastUpdated,
            });
          });
        });

        docEntries.sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime());
        const recentDocs = docEntries.slice(0, 8).map(({ lastUpdated, ...rest }) => rest);

        let currentPageItem: ContextItem | null = null;
        let currentDocInfo: { title: string; subjectId: string; content: string } | null = null;
        const match = pathname.match(/^\/subjects\/([^/]+)\/document\/([^/]+)/);
        if (match) {
          const subjectId = match[1];
          const docId = match[2];
          const data = all[subjectId];
          const doc = data?.notes.documents?.find(d => d.id === docId);
          if (doc) {
            const docTitle = doc.title || "Untitled";
            currentPageItem = {
              id: doc.id,
              title: docTitle,
              subject: subjectLabel(subjectId),
              preview: stripHtml(doc.content || "").slice(0, 120),
              type: "page",
            };
            currentDocInfo = { title: docTitle, subjectId, content: doc.content || "" };
          }
        } else {
          const pretty = pathname === "/" ? "Home" : pathname.split("/").filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" / ");
          currentPageItem = {
            id: "current-page",
            title: pretty || "Current page",
            subject: "Current page",
            preview: "",
            type: "page",
          };
        }

        const merged = currentPageItem
          ? [currentPageItem, ...recentDocs.filter(d => d.id !== currentPageItem!.id)]
          : recentDocs;

        if (active) {
          setRecentContext(merged);
          setCurrentDoc(currentDocInfo);
        }
      } catch {
        if (active) {
          setRecentContext([]);
          setCurrentDoc(null);
        }
      }
    };

    build();
    return () => { active = false; };
    }, [pathname]);

  // Re-build context when document data updates (keeps currentDoc.content fresh)
  useEffect(() => {
    const handler = () => {
      // Re-run the context build to pick up latest doc content
      let active = true;
      const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const subjectLabel = (id: string) =>
        SUBJECT_CATALOG.find(s => s.id === id)?.label || id;
      const match = pathname.match(/^\/subjects\/([^/]+)\/document\/([^/]+)/);
      if (!match) return;
      const subjectId = match[1];
      const docId = match[2];
      subjectStore.getSubject(subjectId).then(data => {
        if (!active) return;
        const doc = data?.notes.documents?.find((d: any) => d.id === docId);
        if (doc) {
          setCurrentDoc({
            title: doc.title || "Untitled",
            subjectId,
            content: doc.content || "",
          });
        }
      }).catch(() => {});
      return () => { active = false; };
    };
    window.addEventListener("subjectDataUpdated", handler);
    return () => window.removeEventListener("subjectDataUpdated", handler);
  }, [pathname]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const safeLocalStorageGet = (key: string) => {
    try { return localStorage.getItem(key); } catch { return null; }
  };
  const safeLocalStorageSet = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  };
  const safeLocalStorageRemove = (key: string) => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  };

  // Load persisted agent chat history when opened
  useEffect(() => {
    if (!open || historyLoaded) return;
    let active = true;

    const loadHistory = async () => {
      try {
        const storedId = safeLocalStorageGet(AGENT_SESSION_KEY);
        if (storedId) {
          const msgs = await chatStore.getMessages(storedId);
          if (!active) return;
          setChatSessionId(storedId);
          if (msgs.length > 0) {
            setMessages(msgs.slice(-MAX_AGENT_HISTORY).map(m => ({ role: m.role, content: m.content })));
          }
          setHistoryLoaded(true);
          return;
        }

        const sessions = await chatStore.getSessions();
        const agentSession = sessions.find(s => s.subjectId === "agent");
        if (agentSession?.id) {
          const msgs = await chatStore.getMessages(agentSession.id);
          if (!active) return;
          setChatSessionId(agentSession.id);
          safeLocalStorageSet(AGENT_SESSION_KEY, agentSession.id);
          if (msgs.length > 0) {
            setMessages(msgs.slice(-MAX_AGENT_HISTORY).map(m => ({ role: m.role, content: m.content })));
          }
          setHistoryLoaded(true);
          return;
        }

        const newId = await chatStore.createSession("agent", "Agent");
        if (!active) return;
        if (newId) {
          setChatSessionId(newId);
          safeLocalStorageSet(AGENT_SESSION_KEY, newId);
        }
        setHistoryLoaded(true);
      } catch {
        if (active) setHistoryLoaded(true);
      }
    };

    loadHistory();
    return () => { active = false; };
  }, [open, historyLoaded]);

  // Load pending confirmations
  useEffect(() => {
    if (!open) return;
    const loadConfirmations = async () => {
      try {
        const res = await fetch("/api/agents/confirm?action=list", { method: "POST" });
        const data = await res.json();
        if (data.confirmations) {
          setPendingConfirmations(data.confirmations.map((c: any) => ({ id: c.id, summary: c.summary })));
        }
      } catch { /* ignore confirmation load error */ }
    };
    loadConfirmations();
  }, [open]);

  const ensureChatSession = useCallback(async () => {
    if (chatSessionId) return chatSessionId;
    const newId = await chatStore.createSession("agent", "Agent");
    if (newId) {
      setChatSessionId(newId);
      safeLocalStorageSet(AGENT_SESSION_KEY, newId);
      return newId;
    }
    return null;
  }, [chatSessionId]);

  const handleClientActions = useCallback((actions: Record<string, unknown>[]) => {
    const results: ActionResult[] = [];

    for (const action of actions) {
      const quiz = normaliseAgentQuizAction(action, currentDoc?.subjectId);
      if (!quiz) continue;

      const subjectName =
        SUBJECT_CATALOG.find((subject) => subject.id === quiz.subjectId)?.label ||
        quiz.subjectId;

      try {
        sessionStorage.setItem(AGENT_QUIZ_SESSION_KEY, JSON.stringify(quiz));
        router.push("/quiz");
        results.push({
          type: "start_quiz",
          success: true,
          detail: `Launching a ${quiz.numberOfQuestions}-question ${subjectName} quiz`,
        });
      } catch {
        results.push({
          type: "start_quiz",
          success: false,
          detail: "Couldn't launch the quiz.",
        });
      }
    }

    return results;
  }, [currentDoc?.subjectId, router]);

  // Handle confirmation response
  const handleConfirmation = useCallback(async (confirmationId: string, approved: boolean) => {
    try {
      const res = await fetch("/api/agents/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "respond",
          confirmationId,
          approved,
        }),
      });
      if (res.ok) {
        setPendingConfirmations(prev => prev.filter(c => c.id !== confirmationId));
      }
    } catch { /* ignore confirmation dismiss error */ }
  }, []);

  const sendMessage = useCallback(async (text?: string, selectedContextIds?: string[]) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const baseContext = selectedContextIds ?? contextIds;
    const dedupedContext = Array.from(new Set(baseContext.filter(Boolean)));
    const mentionedDocs = currentDoc?.title
      ? [currentDoc.title, ...dedupedContext.filter(t => t !== currentDoc.title)]
      : dedupedContext;

    // If we're on a doc page but currentDoc.content is empty, fetch it fresh before sending
    let resolvedCurrentDoc = currentDoc;
    if (currentDoc && !currentDoc.content) {
      try {
        const match = pathname.match(/^\/subjects\/([^/]+)\/document\/([^/]+)/);
        if (match) {
          const data = await subjectStore.getSubject(match[1]);
          const doc = data?.notes.documents?.find((d: any) => d.id === match[2]);
          if (doc) resolvedCurrentDoc = { title: doc.title || "Untitled", subjectId: match[1], content: doc.content || "" };
        }
      } catch { /* use existing currentDoc */ }
    }

    setInput("");
    setError("");

    const userMsg: ChatMessage = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    setLoadingKey(prev => prev + 1); // Reset typing animation

    try {
      const sessionId = await ensureChatSession();
      if (sessionId) {
        chatStore.addMessage(sessionId, "user", content).catch(() => {});
      }

      const appContext = await gatherAppContext(pathname, contextOptions);
      const messagesForRequest = newMessages.slice(-MAX_AGENT_HISTORY);

      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForRequest,
          userContext: appContext,
          contextOptions,
          mentionedDocs,
          currentDoc: resolvedCurrentDoc ? { title: resolvedCurrentDoc.title, subjectId: resolvedCurrentDoc.subjectId, content: resolvedCurrentDoc.content } : null,
          currentPage: pathname,
          chatSessionId: sessionId,
          modelId: agentModelId === "auto" ? null : GROQ_MODELS.find(m => m.id === agentModelId)?.modelString ?? null,
          agentId: selectedAgentId,
        }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();

      const assistantMsgIndex = newMessages.length; // index of the message we're about to add
      const formatAgentReply = (text: string) => {
        const t = text
          .replace(/<actions>[\s\S]*?<\/actions>/gi, "")
          .replace(/```json[\s\S]*?```/gi, "")
          .replace(/^\s*#{1,6}\s+/gm, "")
          .replace(/^\s*[-*+]\s+/gm, "")
          .replace(/^\s*•\s+/gm, "")
          .replace(/^\s*\d+\.\s+/gm, "")
          .replace(/\r\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        const paragraphs = t
          .split(/\n{2,}/)
          .map(p => p.replace(/\n/g, " ").replace(/\s+/g, " ").trim())
          .filter(Boolean);
        return paragraphs.join("\n\n");
      };
      const cleanContent = formatAgentReply(data.content || "Sorry, no response.");
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: cleanContent },
      ]);
      if (sessionId) {
        chatStore.addMessage(sessionId, "assistant", cleanContent).catch(() => {});
      }

      // If the AI returned actions, execute them server-side
      if (data.actions && data.actions.length > 0) {
        const allResults: ActionResult[] = [];
        const allActions = Array.isArray(data.actions)
          ? filterBottomRightAgentActions(data.actions as Record<string, unknown>[])
          : [];
        const clientResults = handleClientActions(allActions);
        if (clientResults.length > 0) {
          allResults.push(...clientResults);
        }

        const serverActions = allActions.filter((action) => action.type !== "start_quiz");
        if (serverActions.length > 0) {
          console.log("[AgentPanel] Executing actions:", serverActions);
          const actionRes = await fetch("/api/groq/agent-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actions: serverActions,
              defaultSubjectId: currentDoc?.subjectId || null,
            }),
          });
          console.log("[AgentPanel] agent-action status:", actionRes.status);
          const actionData = await actionRes.json();
          console.log("[AgentPanel] agent-action results:", actionData);
          if (actionData.results) {
            allResults.push(...actionData.results);
            window.dispatchEvent(new CustomEvent("subjectDataUpdated", {
              detail: { results: actionData.results },
            }));
          }
        }

        if (allResults.length > 0) {
          setActionResults(prev => ({ ...prev, [assistantMsgIndex]: allResults }));
        }

        // Handle pending confirmations from agents
        if (data.requiresConfirmation && data.confirmationIds) {
          setPendingConfirmations(prev => [
            ...prev,
            ...data.confirmationIds.map((id: string) => ({
              id,
              summary: data.actions?.find((a: any) => a.summary)?.summary || "Action requires confirmation",
            })),
          ]);
        }
      }
    } catch {
      setError("Couldn't reach the AI. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading, contextIds, contextOptions, pathname, currentDoc, ensureChatSession, handleClientActions]);

  const clearChat = async () => {
    setMessages([]);
    setActionResults({});
    const newId = await chatStore.createSession("agent", "Agent");
    if (newId) {
      setChatSessionId(newId);
      safeLocalStorageSet(AGENT_SESSION_KEY, newId);
    } else {
      setChatSessionId(null);
      safeLocalStorageRemove(AGENT_SESSION_KEY);
    }
  };

  const isEmpty = messages.length === 0;
  const renderParagraphs = (text: string) => {
    const parts = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    return parts.map((p, idx) => (
      <p key={idx} className="text-[13px] leading-relaxed">
        {p}
      </p>
    ));
  };

  if (isHidden) return null;

  return (
    <>
      {/* ── FAB — hidden when sidebar is open ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            onClick={handleFabClick}
            className={cn(
              "fixed bottom-6 right-6 z-[9998]",
              "w-14 h-14 rounded-2xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.45)]",
              "bg-primary text-primary-foreground",
              "flex items-center justify-center",
              "hover:scale-105 active:scale-95 transition-transform",
              "border border-primary/20"
            )}
            aria-label="Open Analogix AI"
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
            initial={agentMode === "sidebar"
              ? { opacity: 0, x: 320 }
              : { opacity: 0, y: 24, scale: 0.96 }}
            animate={agentMode === "sidebar"
              ? { opacity: 1, x: 0 }
              : { opacity: 1, y: 0, scale: 1 }}
            exit={agentMode === "sidebar"
              ? { opacity: 0, x: 320 }
              : { opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={cn(
              "fixed z-[9999]",
              "bg-card border-border/50",
              "flex flex-col overflow-hidden",
              agentMode === "sidebar"
                ? "top-0 right-0 bottom-0 w-[380px] max-w-[calc(100vw-3rem)] border-l shadow-[-24px_0_72px_-8px_rgba(0,0,0,0.35)]"
                : "bottom-6 right-6 w-[420px] max-w-[calc(100vw-1.5rem)] rounded-3xl border shadow-[0_24px_72px_-8px_rgba(0,0,0,0.6)]",
            )}
            style={agentMode === "sidebar" ? {} : { height: "min(600px, calc(100vh - 6rem))" }}
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
                  Can read your workspace
                </p>
              </div>
              <div className="flex items-center gap-1">
                {/* Agent selector */}
                <div className="flex items-center bg-muted/30 rounded-lg p-0.5 mr-1">
                  {AGENT_BUTTONS.map(({ id, icon: Icon, label, color }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedAgentId(id as SelectedAgentId)}
                      title={label}
                      className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                        selectedAgentId === id
                          ? "bg-background shadow-sm"
                          : "text-muted-foreground/40 hover:text-muted-foreground"
                      )}
                      style={selectedAgentId === id ? { color } : {}}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
                <div className="flex items-center bg-muted/40 rounded-lg p-0.5 mr-1">
                  {(Object.entries(MODE_META) as [AgentMode, typeof MODE_META[AgentMode]][]).map(([mode, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={mode}
                        onClick={() => setAgentMode(mode)}
                        title={meta.tip}
                        className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                          agentMode === mode
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground/50 hover:text-muted-foreground"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
                {/* Open full AI tutor */}
                <button
                  onClick={() => router.push("/chat")}
                  title="Open full AI Tutor"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
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
                  title="Close"
                >
                  {agentMode === "sidebar" ? <X className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Pending confirmations banner */}
            {pendingConfirmations.length > 0 && (
              <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                    {pendingConfirmations.length} action(s) waiting for confirmation
                  </p>
                  <div className="flex gap-1">
                    {pendingConfirmations.slice(0, 2).map(conf => (
                      <button
                        key={conf.id}
                        onClick={() => handleConfirmation(conf.id, true)}
                        className="px-2 py-1 text-[10px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-md transition-colors"
                      >
                        Approve
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
                      Ask the {AGENT_BUTTONS.find(a => a.id === selectedAgentId)?.label} Agent
                    </p>
                    <p className="text-xs text-muted-foreground/50">
                      I can help with {selectedAgentId === 'planner' ? 'schedules, deadlines, and study plans' : selectedAgentId === 'notes' ? 'creating and organizing notes' : selectedAgentId === 'tasks' ? 'tasks and reminders' : 'collaboration and study rooms'}.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {(QUICK_PROMPTS_BY_AGENT[selectedAgentId] || []).map(({ label, icon: Icon }) => (
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
                        <div className="space-y-2">
                          {renderParagraphs(msg.content)}
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
                    <TypingDots keyPrefix={`typing-${loadingKey}`} />
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

            {/* Improved Context selector - Notion/Coda style */}
            {showContextOptions && (
            <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-r from-muted/30 to-muted/10">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-muted-foreground/80 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Context</span>
                </div>
                <button
                  onClick={() => setContextOptions({
                    includeRecentDocs: true, includeEvents: true, 
                    includeStats: true, includeFlashcards: true, includeAchievements: true
                  })}
                  className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold hover:bg-primary/20 transition-all"
                >
                  Reset
                </button>
              </div>
              <div className="space-y-1.5">
                {/* Quick presets - Notion-style segmented control */}
                <div className="flex bg-background border border-border/50 rounded-lg p-0.5">
                  {[
                    { label: "Minimal", options: { includeRecentDocs: false, includeEvents: false, includeStats: false, includeFlashcards: false, includeAchievements: false } },
                    { label: "Auto", options: { includeRecentDocs: true, includeEvents: true, includeStats: true, includeFlashcards: false, includeAchievements: false } },
                    { label: "Full", options: { includeRecentDocs: true, includeEvents: true, includeStats: true, includeFlashcards: true, includeAchievements: true } },
                  ].map(({ label, options }, i) => (
                    <button
                      key={label}
                      onClick={() => setContextOptions(options)}
                      className={cn(
                        "flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                        Object.entries(options).every(([k,v]) => contextOptions[k as keyof ContextOptions] === v)
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Expandable detailed controls - Coda-style */}
                <div className="space-y-1 pt-1">
                  <button className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted/30 transition-all">
                    <span>Advanced →</span>
                    <ChevronDown className="w-3 h-3 shrink-0" />
                  </button>
                  <div className="grid grid-cols-2 gap-1.5 pl-2 text-[10px]">
                    {[
                      { key: "includeRecentDocs", label: "Docs", icon: "📄" },
                      { key: "includeEvents", label: "Events", icon: "📅" },
                      { key: "includeStats", label: "Stats", icon: "📊" },
                      { key: "includeFlashcards", label: "Cards", icon: "💳" },
                      { key: "includeAchievements", label: "Wins", icon: "🏆" },
                    ].map(({ key, label, icon }) => (
                      <label key={key} className="flex items-center gap-1.5 p-1 rounded hover:bg-muted/40 cursor-pointer group text-[10px]">
                        <span className="text-muted-foreground/70 shrink-0">{icon}</span>
                        <input
                          type="checkbox"
                          checked={contextOptions[key as keyof ContextOptions] !== false}
                          onChange={(e) => setContextOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="w-3 h-3 rounded border-border/50 bg-background focus:ring-primary/50 data-[state=checked]:bg-primary shrink-0"
                        />
                        <span className="font-medium text-muted-foreground/80 group-hover:text-foreground/90">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
                {Object.values(contextOptions).filter(Boolean).length} / 5 sources active
              </div>
            </div>
            )}

            <ContentInput
              inputRef={inputRef}
              value={input}
              onChange={setInput}
              onSend={(text, contextIds, files) => {
                setContextIds(contextIds);
                setAttachedFiles(files);
                sendMessage(text, contextIds);
              }}
              onFilesChange={setAttachedFiles}
              onToggleContextOptions={() => setShowContextOptions(prev => !prev)}
              placeholder="Type @ to mention docs or drag files..."
              currentPage={pathname.replace('/', '') || 'Dashboard'}
              recentContext={recentContext}
              disabled={loading}
              agentModelId={agentModelId}
              setAgentModelId={setAgentModelId}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
