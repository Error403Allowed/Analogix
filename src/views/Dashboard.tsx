"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Zap, Target, Brain,
  MoreHorizontal, X, Check,
  MessageSquare, FileText, Calendar, Layers,
  Timer, Link2, Trophy, Settings2,
  Send, ArrowRight, Play, Pause, RotateCcw, SkipForward,
  BookOpen, Plus, ChevronRight,
} from "lucide-react";
import { DashboardPanel } from "@/components/ui/panels";
import UpcomingEvents from "@/components/UpcomingEvents";
import QuickLinks from "@/components/QuickLinks";
import { statsStore } from "@/utils/statsStore";
import type { UserStats } from "@/types/stats";
import { useAchievementChecker } from "@/hooks/useAchievementChecker";
import { applyThemeByName } from "@/components/ThemeSelector";
import { activityLog, type DayActivity } from "@/utils/activityLog";
import TutorialOverlay from "@/components/TutorialOverlay";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { subjectStore } from "@/utils/subjectStore";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { loadTimerState, saveTimerState, getDefaultTimerState } from "@/lib/timerStore";
import type { TimerPhase } from "@/lib/timerStore";

// ── helpers ───────────────────────────────────────────────────────────────────
const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const p = JSON.parse(raw);
    return p !== null && typeof p === "object" ? (p as T) : fallback;
  } catch { return fallback; }
};
const toInt = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0; };
const toPct = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0; };
const DAY_SH = ["S", "M", "T", "W", "T", "F", "S"];
const dayLabel = (iso: string) => DAY_SH[new Date(`${iso}T12:00:00`).getDay()] || "";
const fmt = (n: number) => String(n).padStart(2, "0");

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Widget registry ───────────────────────────────────────────────────────────
type WidgetId = "stats" | "chat" | "docs" | "events" | "timer" | "quicklinks" | "flashcards";

interface WidgetMeta {
  id: WidgetId;
  label: string;
  desc: string;
  icon: React.ElementType;
  defaultOn: boolean;
}

const WIDGET_REGISTRY: WidgetMeta[] = [
  { id: "stats",      label: "Stats",           desc: "Study streak, quizzes & accuracy",   icon: Trophy,        defaultOn: true  },
  { id: "chat",       label: "AI Tutor",        desc: "Quick chat with your AI tutor",      icon: MessageSquare, defaultOn: true  },
  { id: "docs",       label: "Recent Docs",     desc: "Your latest notes & study guides",   icon: FileText,      defaultOn: true  },
  { id: "events",     label: "Upcoming Events", desc: "Deadlines and calendar events",      icon: Calendar,      defaultOn: true  },
  { id: "timer",      label: "Pomodoro Timer",  desc: "Focus timer for study sessions",     icon: Timer,         defaultOn: true  },
  { id: "quicklinks", label: "Quick Links",     desc: "Jump to key pages instantly",        icon: Link2,         defaultOn: true  },
  { id: "flashcards", label: "Flashcards",      desc: "Quick quiz & revision widget",       icon: Layers,        defaultOn: false },
];

const DEFAULT_ENABLED: WidgetId[] = WIDGET_REGISTRY.filter(w => w.defaultOn).map(w => w.id);
const STORAGE_KEY = "dashboard-widgets-v2";

function loadEnabledWidgets(): WidgetId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ENABLED;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as WidgetId[];
  } catch {}
  return DEFAULT_ENABLED;
}

// ── Customise side panel ──────────────────────────────────────────────────────
function CustomisePanel({ open, enabled, onSave, onClose }: {
  open: boolean; enabled: WidgetId[];
  onSave: (ids: WidgetId[]) => void; onClose: () => void;
}) {
  const [local, setLocal] = useState<WidgetId[]>(enabled);
  useEffect(() => { if (open) setLocal(enabled); }, [open, enabled]);
  const toggle = (id: WidgetId) =>
    setLocal(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }} className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div key="panel" initial={{ x: "100%", opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-card border-l border-border/50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 shrink-0">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                <div>
                  <h2 className="text-sm font-black text-foreground">Customise</h2>
                  <p className="text-[11px] text-muted-foreground/60">Toggle widgets on or off</p>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {WIDGET_REGISTRY.map(w => {
                const Icon = w.icon;
                const isOn = local.includes(w.id);
                return (
                  <button key={w.id} onClick={() => toggle(w.id)}
                    className={cn("w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left",
                      isOn ? "border-primary/30 bg-primary/5" : "border-border/30 hover:border-border/60 hover:bg-muted/20")}>
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors", isOn ? "bg-primary/15" : "bg-muted/40")}>
                      <Icon className={cn("w-4 h-4 transition-colors", isOn ? "text-primary" : "text-muted-foreground/50")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{w.label}</p>
                      <p className="text-[11px] text-muted-foreground/55 leading-tight mt-0.5">{w.desc}</p>
                    </div>
                    <div className={cn("w-9 h-5 rounded-full transition-colors shrink-0 relative", isOn ? "bg-primary" : "bg-muted/60")}>
                      <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all", isOn ? "left-[18px]" : "left-0.5")} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-4 border-t border-border/40 flex gap-2 shrink-0">
              <button onClick={() => setLocal(DEFAULT_ENABLED)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold border border-border/40 hover:bg-muted/40 transition-colors text-muted-foreground">
                Reset
              </button>
              <button onClick={() => { onSave(local); onClose(); }}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                Save
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── AiChatWidget ──────────────────────────────────────────────────────────────

function AiChatWidget() {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [lastQ, setLastQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<Array<{ role: "user"|"assistant"; content: string }>>([]);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput(""); setLastQ(q); setBusy(true); setReply("");
    const next = [...history, { role: "user" as const, content: q }];
    setHistory(next);
    try {
      const { getGroqCompletion } = await import("@/services/groq");
      const res = await getGroqCompletion(next.map(m => ({ role: m.role, content: m.content })), {});
      const ans = res.content || "…";
      setReply(ans);
      setHistory([...next, { role: "assistant" as const, content: ans }]);
    } catch {
      setReply("Couldn't reach the AI — try the full chat.");
    }
    setBusy(false);
  };

  const hasResponse = busy || reply;

  return (
    <div className="flex flex-col gap-3">

      {/* Response bubble — animates in after first message */}
      <AnimatePresence>
        {hasResponse && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl bg-muted/30 border border-border/25 px-4 py-3"
          >
            {busy ? (
              <div className="flex gap-1.5 items-center h-5">
                {[0, 0.15, 0.3].map((d, i) => (
                  <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/60"
                    animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d }} />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {lastQ && <p className="text-[11px] text-muted-foreground/40 font-medium truncate">You: {lastQ}</p>}
                <p className="text-sm text-foreground/85 leading-relaxed line-clamp-4">{reply}</p>
                <button onClick={() => router.push("/chat")}
                  className="flex items-center gap-1 text-[11px] text-primary/60 hover:text-primary transition-colors pt-0.5 font-medium">
                  Continue in full chat <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input — focus glow effect */}
      <div className={cn(
        "relative rounded-2xl border bg-muted/15 transition-all duration-200",
        focused
          ? "border-primary/50 shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
          : "border-border/40 hover:border-border/60"
      )}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask me anything…"
          rows={2}
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm outline-none placeholder:text-muted-foreground/30 text-foreground leading-relaxed"
        />
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex gap-1.5 flex-wrap">
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <button onClick={() => router.push("/chat")}
              className="text-[11px] font-medium text-muted-foreground/45 hover:text-primary transition-colors">
              Full chat →
            </button>
            <button onClick={() => send()} disabled={busy || !input.trim()}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                input.trim() && !busy
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:opacity-90"
                  : "bg-muted/50 text-muted-foreground/30 cursor-not-allowed"
              )}>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DocCard — square card for horizontal scroll ───────────────────────────────
const STUDY_GUIDE_PREFIX = "__STUDY_GUIDE_V2__";

interface DocEntry {
  docId: string; subjectId: string; subjectLabel: string;
  title: string; lastUpdated: string; isGuide: boolean;
}

function DocScrollRow() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const all = await subjectStore.getAll();
        const entries: DocEntry[] = [];
        Object.entries(all).forEach(([subjectId, data]) => {
          const subjectLabel = SUBJECT_CATALOG.find(s => s.id === subjectId)?.label || subjectId;
          (data.notes.documents || []).forEach((doc: any) => {
            if (!doc.title && !doc.content) return;
            entries.push({ docId: doc.id, subjectId, subjectLabel, title: doc.title || "Untitled", lastUpdated: doc.lastUpdated, isGuide: doc.content.startsWith(STUDY_GUIDE_PREFIX) });
          });
        });
        entries.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        setDocs(entries.slice(0, 12));
      } catch { setDocs([]); }
      finally { setLoading(false); }
    };
    load();
    window.addEventListener("subjectDataUpdated", load);
    return () => window.removeEventListener("subjectDataUpdated", load);
  }, []);

  const ago = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (loading) return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-36 h-36 shrink-0 rounded-xl bg-muted/30 animate-pulse" />
      ))}
    </div>
  );

  if (docs.length === 0) return (
    <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
      <p className="text-xs text-muted-foreground/40">No documents yet</p>
      <button onClick={() => router.push("/subjects")}
        className="flex items-center gap-1 text-[11px] text-primary/60 hover:text-primary transition-colors">
        <Plus className="w-3 h-3" /> Create one
      </button>
    </div>
  );

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {docs.map(doc => (
        <button key={doc.docId}
          onClick={() => router.push(`/subjects/${doc.subjectId}/document/${doc.docId}`)}
          className="w-36 h-36 shrink-0 rounded-xl bg-muted/25 hover:bg-muted/45 border border-border/30 hover:border-border/60 transition-all p-3 flex flex-col items-start text-left group">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-auto",
            doc.isGuide ? "bg-primary/15" : "bg-muted/60")}>
            {doc.isGuide
              ? <BookOpen className="w-4 h-4 text-primary" />
              : <FileText className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div className="w-full mt-2">
            <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{doc.title}</p>
            <p className="text-[10px] text-muted-foreground/45 mt-1 truncate">{doc.subjectLabel}</p>
            <p className="text-[9px] text-muted-foreground/35 truncate">{ago(doc.lastUpdated)}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── MiniTimer — compact horizontal pomodoro ───────────────────────────────────
function MiniTimer() {
  const router = useRouter();
  const initialState = getDefaultTimerState();
  const [phase, setPhase] = useState<TimerPhase>(initialState.phase);
  const [timeLeft, setTimeLeft] = useState(initialState.timeLeft);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [sessionsTarget, setSessionsTarget] = useState(initialState.sessionsTarget);
  const [settings, setSettings] = useState(initialState.settings);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const total = phase === "study" ? settings.study : settings.break;
  const progress = (total - timeLeft) / total;
  const color = phase === "study" ? "hsl(var(--primary))" : "#10b981";

  // Load from store
  useEffect(() => {
    try {
      const saved = loadTimerState();
      if (saved) {
        setPhase(saved.phase);
        setTimeLeft(saved.timeLeft);
        setSessionsCompleted(saved.sessionsCompleted);
        setSessionsTarget(saved.sessionsTarget);
        setSettings(saved.settings);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setIsActive(false);
            const next: TimerPhase = phase === "study" ? "break" : "study";
            setPhase(next);
            const nextTime = next === "study" ? settings.study : settings.break;
            const newCompleted = phase === "study" ? sessionsCompleted + 1 : sessionsCompleted;
            setSessionsCompleted(newCompleted);
            saveTimerState({ ...initialState, phase: next, timeLeft: nextTime, sessionsCompleted: newCompleted, settings });
            return nextTime;
          }
          saveTimerState({ ...initialState, phase, timeLeft: t - 1, sessionsCompleted, settings });
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive, phase, sessionsCompleted, settings]);

  const reset = () => {
    setIsActive(false);
    const t = phase === "study" ? settings.study : settings.break;
    setTimeLeft(t);
  };

  // Circumference for mini ring
  const R = 18;
  const C = 2 * Math.PI * R;
  const dash = C * (1 - progress);

  // Calculate filled dots
  const cycleCount = sessionsTarget > 0 ? sessionsCompleted % sessionsTarget : 0;
  const filledDots = cycleCount === 0 && sessionsCompleted > 0 ? sessionsTarget : cycleCount;

  return (
    <div className="flex items-center gap-4">
      {/* Mini ring */}
      <div className="relative w-12 h-12 shrink-0">
        <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
          <circle cx="24" cy="24" r={R} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
          <circle cx="24" cy="24" r={R} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={dash} style={{ transition: "stroke-dashoffset 0.9s linear" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-black text-foreground tabular-nums">{fmt(mins)}:{fmt(secs)}</span>
        </div>
      </div>

      {/* Phase + time + dots */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/50">
            {phase === "study" ? "Focus" : "Break"}
          </p>
          <p className="text-xl font-black text-foreground tabular-nums tracking-tighter leading-none">
            {fmt(mins)}:{fmt(secs)}
          </p>
        </div>
        {/* Session dots - next to numbers */}
        <div className="flex items-center gap-1.5 shrink-0">
          {Array.from({ length: sessionsTarget }, (_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i < filledDots ? "bg-blue-500 scale-110" : "bg-muted-foreground/20"
              )}
              title={i < filledDots ? "Session completed" : "Session pending"}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={reset} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setIsActive(a => !a)}
          className={cn("h-8 px-4 rounded-full text-[11px] font-black uppercase tracking-wider transition-all",
            isActive ? "bg-destructive/80 text-white" : "bg-primary text-primary-foreground")}>
          {isActive ? "Pause" : "Start"}
        </button>
        <button onClick={() => router.push("/timer")}
          className="text-[10px] text-muted-foreground/50 hover:text-primary transition-colors px-1">
          Full →
        </button>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
type Prefs = { name?: string; subjects?: string[] };

export default function Dashboard() {
  useAchievementChecker();

  // Start empty so SSR and client initial render match, then hydrate in useEffect.
  const [prefs, setPrefs]                   = useState<Prefs>({});
  const [stats, setStats]                   = useState<UserStats>({ quizzesDone: 0, currentStreak: 0, accuracy: 0, conversationsCount: 0, topSubject: "None", subjectCounts: {} });
  const [weekActivity, setWeekActivity]     = useState<DayActivity[]>([]);
  const [showTutorial, setShowTutorial]     = useState(false);
  const [showCustomise, setShowCustomise]   = useState(false);
  const [menuOpen, setMenuOpen]             = useState(false);
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetId[]>(DEFAULT_ENABLED);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setEnabledWidgets(loadEnabledWidgets()); }, []);

  useEffect(() => {
    // Initial load + keep in sync with external updates
    setPrefs(readJson("userPreferences", {}));
    const update = () => setPrefs(readJson("userPreferences", {}));
    window.addEventListener("userPreferencesUpdated", update);
    window.addEventListener("storage", update);
    return () => { window.removeEventListener("userPreferencesUpdated", update); window.removeEventListener("storage", update); };
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("tutorialComplete")) {
      const t = setTimeout(() => setShowTutorial(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const refresh = async () => {
      setStats(await statsStore.get());
      setWeekActivity(await activityLog.getLast7());
    };
    refresh();
    window.addEventListener("statsUpdated", refresh);
    return () => window.removeEventListener("statsUpdated", refresh);
  }, []);

  useEffect(() => {
    applyThemeByName(localStorage.getItem("app-theme") || "Cosmic Aurora");
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const saveWidgets = useCallback((ids: WidgetId[]) => {
    setEnabledWidgets(ids);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const handleTutorialComplete = useCallback(() => {
    localStorage.setItem("tutorialComplete", "1");
    setShowTutorial(false);
  }, []);

  const qs  = toInt(stats.quizzesDone);
  const str = toInt(stats.currentStreak);
  const acc = toPct(stats.accuracy);
  const con = toInt(stats.conversationsCount);
  const userName = prefs.name || "Student";
  const on = (id: WidgetId) => enabledWidgets.includes(id);

  const colourMap = {
    amber:   { bg: "bg-amber-500/5 border-amber-500/15",     icon: "bg-amber-500/15",   text: "text-amber-500"   },
    primary: { bg: "bg-primary/5 border-primary/10",         icon: "bg-primary/15",     text: "text-primary"     },
    emerald: { bg: "bg-emerald-500/5 border-emerald-500/15", icon: "bg-emerald-500/15", text: "text-emerald-500" },
    violet:  { bg: "bg-violet-500/5 border-violet-500/15",   icon: "bg-violet-500/15",  text: "text-violet-500"  },
  } as const;

  return (
    <>
      {/* ── Sticky header bar with ··· menu ── */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="px-6 py-3 flex items-center justify-between max-w-4xl mx-auto w-full">
          <div>
            <h1 className="text-xl font-display font-black text-foreground tracking-tight leading-none">
              {greeting()}, {userName} 👋
            </h1>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(v => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.1 }}
                  className="absolute right-0 top-10 z-30 w-52 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden">
                  <button onClick={() => { setMenuOpen(false); setShowCustomise(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors text-left">
                    <Settings2 className="w-3.5 h-3.5 text-muted-foreground" /> Customise widgets
                  </button>
                  <div className="border-t border-border/30 mx-2" />
                  <button onClick={() => { saveWidgets(DEFAULT_ENABLED); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors text-left">
                    <Check className="w-3.5 h-3.5" /> Reset to defaults
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="overflow-y-auto h-[calc(100%-56px)]">
        <div className="dashboard-container px-6 pt-5 pb-8 space-y-4 max-w-4xl mx-auto w-full" data-tour="dashboard-main">

          {/* Stats strip */}
          {on("stats") && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-tour="stats-strip">
              {([
                { label: "Day streak", value: str, suffix: null, colour: "amber" as const, icon: Zap,
                  extra: (
                    <div className="flex gap-0.5 items-end mt-2">
                      {(weekActivity.length > 0 ? weekActivity : Array.from({ length: 7 }, () => ({ date: "", count: 0 }))).map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className={`w-full rounded-sm ${d.count > 0 ? "bg-amber-500" : "bg-amber-500/15"}`}
                            style={{ height: `${d.count > 0 ? Math.max(3, Math.min(14, 3 + d.count * 2)) : 3}px` }} />
                          <span className="text-[7px] text-muted-foreground/40 font-bold">
                            {weekActivity[i] ? dayLabel(weekActivity[i].date) : DAY_SH[i]}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                },
                { label: "Quizzes done",  value: qs,  suffix: null, colour: "primary" as const, icon: Target,     extra: null },
                { label: "Accuracy",      value: acc, suffix: "%",  colour: "emerald" as const, icon: TrendingUp,
                  extra: acc > 0 ? (
                    <div className="mt-2 h-1  bg-blue-950/15 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${acc}%` }} />
                    </div>
                  ) : null },
                { label: "Conversations", value: con, suffix: null, colour: "violet" as const, icon: Brain, extra: null },
              ]).map(card => {
                const c = colourMap[card.colour]; const Icon = card.icon;
                return (
<div key={card.label} className="dashboard-panel p-4">
                    <div className={`w-7 h-7 rounded-xl bg-muted/20 flex items-center justify-center mb-2`}>
                      <Icon className={`w-3.5 h-3.5 text-muted-foreground`} />
                    </div>
                    <p className="text-2xl font-display font-black text-foreground tracking-tighter leading-none">
                      {card.value}{card.suffix && <span className="text-base text-muted-foreground">{card.suffix}</span>}
                    </p>
                    <p className={`text-[9px] font-black uppercase tracking-[0.18em] mt-0.5 ${c.text}`}>{card.label}</p>
                    {card.extra}
                  </div>
                );
              })}
            </div>
          )}


          {/* AI Tutor — full width */}
{on("chat") && (
            <div className="dashboard-panel p-5" data-tour="ai-chat-widget">
              <AiChatWidget />
            </div>
          )}

          {/* Docs — full width horizontal scroll */}
          {on("docs") && (
            <div className="dashboard-panel p-5" data-tour="recent-docs">
              <DocScrollRow />
            </div>
          )}


          {/* Events — full width, timer embedded as a footer strip inside */}
{(on("events") || on("timer")) && (
            <div className="dashboard-panel p-5 flex flex-col" data-tour="calendar-widget">
              {on("events") && <UpcomingEvents />}
              {on("timer") && (
                <div className={cn(
                  "border-t border-border/30 pt-3 mt-3",
                  !on("events") && "border-t-0 pt-0 mt-0"
                )}>
                  <MiniTimer />
                </div>
              )}
            </div>
          )}


          {/* Quick links + Flashcards */}
          {(on("quicklinks") || on("flashcards")) && (
            <div className="grid grid-cols-12 gap-4" data-tour="quick-actions">
{on("quicklinks") && (
                <div className={cn("dashboard-panel p-5 overflow-visible", on("flashcards") ? "col-span-12 lg:col-span-8" : "col-span-12")}>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/50 mb-3">🔗 Quick Links</p>
                  <QuickLinks />
                </div>
              )}
              {on("flashcards") && (
                <div className={cn("dashboard-panel p-5 flex flex-col gap-3 border border-primary/10 bg-accent/10",
                  on("quicklinks") ? "col-span-12 lg:col-span-4" : "col-span-12")}>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/50">🃏 Flashcards</p>
                  <p className="text-xs text-muted-foreground/65 leading-relaxed flex-1">
                    Reinforce what you've been studying with a quick quiz session.
                  </p>
                  <a href="/flashcards"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                    <Layers className="w-3.5 h-3.5" /> Open Flashcards
                  </a>
                </div>
              )}
            </div>
          )}


          {/* Empty state */}
          {!on("stats") && !on("chat") && !on("docs") && !on("events") && !on("timer") && !on("quicklinks") && !on("flashcards") && (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                <Settings2 className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground/60">No widgets enabled</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Open the ··· menu to add some</p>
              </div>
              <button onClick={() => setShowCustomise(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
                Customise dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      <CustomisePanel open={showCustomise} enabled={enabledWidgets} onSave={saveWidgets} onClose={() => setShowCustomise(false)} />
      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}
    </>
  );
}
