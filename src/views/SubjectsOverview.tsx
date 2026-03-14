"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Send, X, Sparkles,
  LayoutGrid, List, Flame, MessageSquare, CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { statsStore } from "@/utils/statsStore";
import { getGroqCompletion } from "@/services/groq";
import type { ChatMessage } from "@/types/chat";

export default function SubjectsOverview() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [userSubjects, setUserSubjects] = useState<string[]>([]);
  const [userPrefs, setUserPrefs] = useState<any>({});
  const [statsData, setStatsData] = useState<import("@/utils/statsStore").UserStats>({
    quizzesDone: 0, currentStreak: 0, accuracy: 0,
    conversationsCount: 0, topSubject: "None", subjectCounts: {},
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("subjectsLayout") as "list" | "grid" | null;
    if (saved === "grid") setLayout("grid");
  }, []);

  useEffect(() => {
    const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    setUserPrefs(prefs);
    setUserSubjects(prefs.subjects || []);
    statsStore.get().then(setStatsData);
    window.addEventListener("statsUpdated", () => statsStore.get().then(setStatsData));
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const normalizedStats = useMemo(() => ({
    quizzesDone: Math.max(0, Number(statsData.quizzesDone || 0)),
    currentStreak: Math.max(0, Number(statsData.currentStreak || 0)),
    conversationsCount: Math.max(0, Number(statsData.conversationsCount || 0)),
    subjectCounts: statsData.subjectCounts || {}
  }), [statsData]);

  const subjectPerformance = useMemo(() => {
    const rows = SUBJECT_CATALOG.map((s) => ({
      ...s,
      count: normalizedStats.subjectCounts[s.id] || normalizedStats.subjectCounts[s.label.toLowerCase()] || 0
    }));
    const max = Math.max(1, ...rows.map(r => r.count));
    return rows.map(r => ({ ...r, percent: Math.round((r.count / max) * 100) })).sort((a, b) => b.count - a.count);
  }, [normalizedStats]);

  const filteredSubjects = SUBJECT_CATALOG.filter(s =>
    userSubjects.includes(s.id) && s.label.toLowerCase().includes(search.toLowerCase())
  );
  const activeSubjectObjects = SUBJECT_CATALOG.filter(s => userSubjects.includes(s.id));

  const buildContext = () => {
    const subjectList = activeSubjectObjects.map(s => s.label).join(", ") || "none selected";
    const topSubjects = subjectPerformance.filter(s => s.count > 0).slice(0, 3).map(s => `${s.label} (${s.count} sessions)`).join(", ") || "no activity yet";
    return `You are a smart study assistant embedded in the student's My Subjects page of Analogix.\nEnrolled subjects: ${subjectList}\nStreak: ${normalizedStats.currentStreak}\nQuizzes: ${normalizedStats.quizzesDone}\nSessions: ${normalizedStats.conversationsCount}\nMost active: ${topSubjects}\nGrade: Year ${userPrefs.grade || "unknown"}\nState: ${userPrefs.state || "unknown"}`;
  };

  const openChat = () => {
    if (messages.length === 0) {
      const subjectList = activeSubjectObjects.map(s => s.label).join(", ") || "no subjects yet";
      const topSubject = subjectPerformance.find(s => s.count > 0);
      setMessages([{ role: "assistant", content: `Hey! You're enrolled in **${subjectList}**.\n\nStreak: ${normalizedStats.currentStreak} day${normalizedStats.currentStreak !== 1 ? "s" : ""} · ${normalizedStats.quizzesDone} quiz${normalizedStats.quizzesDone !== 1 ? "zes" : ""}${topSubject ? ` · Most active in **${topSubject.label}**` : ""}.\n\nWhat do you want to work on?` }]);
    }
    setChatOpen(true);
  };

  const handleSend = async () => {
    if (!input.trim() || typing) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]); setInput(""); setTyping(true);
    const history = [...messages.slice(-8), userMsg];
    try {
      const response = await getGroqCompletion(history, { subjects: userSubjects, hobbies: userPrefs.hobbies || [], grade: userPrefs.grade, learningStyle: userPrefs.learningStyle || "visual", responseLength: 2, analogyIntensity: 0.1, pageContext: buildContext() });
      setMessages(prev => [...prev, response]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Couldn't reach AI. Try again." }]); }
    finally { setTyping(false); }
  };

  const toggleLayout = (l: "list" | "grid") => { setLayout(l); localStorage.setItem("subjectsLayout", l); };

  return (
    <div className="max-w-6xl mx-auto pb-24">

      {/* ── Header ── */}
      <div className="pt-0 pb-6 px-1">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">Workspace</p>
            <h1 className="text-3xl font-black text-foreground tracking-tight">My Subjects</h1>
          </div>
          {/* Stat pills */}
          <div className="hidden sm:flex items-center gap-2 pb-1">
            {[
              { icon: Flame, value: normalizedStats.currentStreak, label: "streak", color: "text-orange-500", bg: "bg-orange-500/10" },
              { icon: MessageSquare, value: normalizedStats.conversationsCount, label: "sessions", color: "text-blue-500", bg: "bg-blue-500/10" },
              { icon: CheckSquare, value: normalizedStats.quizzesDone, label: "quizzes", color: "text-emerald-500", bg: "bg-emerald-500/10" },
            ].map((s, i) => (
              <div key={i} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold", s.bg)}>
                <s.icon className={cn("w-3.5 h-3.5", s.color)} />
                <span className={s.color}>{s.value}</span>
                <span className="text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Search + layout toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
            <input
              placeholder="Filter subjects…"
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg bg-muted/40 border border-transparent focus:border-border/60 focus:bg-background outline-none transition-all placeholder:text-muted-foreground/40"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-1 border border-border/30">
            {([["list", List], ["grid", LayoutGrid]] as const).map(([l, Icon]) => (
              <button key={l} onClick={() => toggleLayout(l)} title={`${l} view`}
                className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-all",
                  layout === l ? "bg-background shadow-sm text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground")}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {userSubjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-xl font-bold text-foreground mb-2">No subjects yet</h2>
          <p className="text-sm text-muted-foreground mb-6">Add subjects in your profile to get started.</p>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="rounded-lg">Go to Dashboard</Button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {layout === "list" ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              {/* List header */}
              <div className="flex items-center gap-3 px-3 py-1.5 mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/40">
                <span className="w-8" />
                <span className="flex-1">Subject</span>
                <span className="w-24 text-right hidden sm:block">Activity</span>
                <span className="w-5" />
              </div>
              <div className="space-y-1">
                {filteredSubjects.map((subject, i) => {
                  const Icon = subject.icon;
                  const activity = normalizedStats.subjectCounts[subject.id] || 0;
                  const maxActivity = Math.max(1, ...filteredSubjects.map(s => normalizedStats.subjectCounts[s.id] || 0));
                  const pct = Math.round((activity / maxActivity) * 100);
                  return (
                    <motion.div key={subject.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.035 }}
                      onClick={() => router.push(`/subjects/${subject.id}`)}
                      className="group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer hover:bg-muted/50 border border-transparent hover:border-border/40 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{subject.label}</p>
                        <p className="text-xs text-muted-foreground/50 truncate hidden sm:block">{(subject as any).descriptions?.senior || ""}</p>
                      </div>
                      {/* Activity bar */}
                      <div className="hidden sm:flex items-center gap-2 w-24 justify-end shrink-0">
                        {activity > 0 ? (
                          <>
                            <div className="flex-1 h-1 bg-muted/60 rounded-full overflow-hidden">
                              <div className="h-full bg-primary/40 group-hover:bg-primary rounded-full transition-all" style={{ width: `${Math.max(pct, 8)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground/50 shrink-0">{activity}</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground/30">—</span>
                        )}
                      </div>
                      <svg className="w-3.5 h-3.5 text-muted-foreground/25 group-hover:text-primary/50 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  );
                })}
              </div>
              {filteredSubjects.length === 0 && search && (
                <div className="py-16 text-center text-sm text-muted-foreground">No subjects match "<span className="font-medium">{search}</span>"</div>
              )}
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredSubjects.map((subject, i) => {
                const Icon = subject.icon;
                const activity = normalizedStats.subjectCounts[subject.id] || 0;
                const maxActivity = Math.max(1, ...filteredSubjects.map(s => normalizedStats.subjectCounts[s.id] || 0));
                const pct = Math.round((activity / maxActivity) * 100);
                return (
                  <motion.div key={subject.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                    onClick={() => router.push(`/subjects/${subject.id}`)}
                    className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-card hover:border-primary/30 hover:shadow-md cursor-pointer transition-all">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <Icon className="w-5 h-5 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                      </div>
                      {activity > 0 && (
                        <span className="text-[10px] font-bold text-primary/60 bg-primary/10 px-2 py-0.5 rounded-full">{activity}×</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground leading-tight mb-1">{subject.label}</p>
                      <p className="text-[11px] text-muted-foreground/50 leading-snug line-clamp-2">{(subject as any).descriptions?.senior || ""}</p>
                    </div>
                    <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/40 group-hover:bg-primary rounded-full transition-all duration-500" style={{ width: `${activity > 0 ? Math.max(pct, 6) : 0}%` }} />
                    </div>
                    <svg className="absolute top-4 right-4 w-3 h-3 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.div>
                );
              })}
              {filteredSubjects.length === 0 && search && (
                <div className="col-span-full py-16 text-center text-sm text-muted-foreground">No subjects match "<span className="font-medium">{search}</span>"</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Floating AI ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {chatOpen && (
            <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="w-80 sm:w-96 h-[460px] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Page Assistant</p>
                </div>
                <button onClick={() => setChatOpen(false)} className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("text-sm leading-relaxed rounded-xl px-3 py-2 max-w-[88%]",
                    msg.role === "assistant" ? "bg-muted/50 text-foreground" : "bg-primary/10 text-foreground ml-auto text-right")}>
                    {msg.content}
                  </div>
                ))}
                {typing && <div className="bg-muted/40 rounded-xl px-3 py-2 text-sm text-muted-foreground w-12"><span className="animate-pulse">···</span></div>}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-border/40 flex gap-2">
                <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} placeholder="Ask about your subjects…" className="h-9 text-sm border-border/50 rounded-lg" />
                <Button onClick={handleSend} size="icon" className="h-9 w-9 shrink-0 rounded-lg">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={chatOpen ? () => setChatOpen(false) : openChat}
          className="w-11 h-11 rounded-full border border-border bg-background shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
          <AnimatePresence mode="wait">
            {chatOpen
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="w-4 h-4" /></motion.div>
              : <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Sparkles className="w-4 h-4" /></motion.div>}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
