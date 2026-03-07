"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, TrendingUp, Search, Zap, MessageCircle,
  Medal, Send, X, ChevronRight, BookOpen, Sparkles,
  LayoutGrid, List,
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
  const [layout, setLayout] = useState<"list" | "grid">("list"); // default list; hydrated below
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
    // Hydrate layout preference client-side (avoids SSR mismatch)
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  // Build rich page context for the AI
  const buildContext = () => {
    const subjectList = activeSubjectObjects.map(s => s.label).join(", ") || "none selected";
    const topSubjects = subjectPerformance.filter(s => s.count > 0).slice(0, 3).map(s => `${s.label} (${s.count} sessions)`).join(", ") || "no activity yet";
    return `You are a smart study assistant embedded in the student's My Subjects page of Analogix, an analogy-based learning app.

PAGE CONTEXT — what's currently visible on screen:
- Page: My Subjects overview
- Student's enrolled subjects: ${subjectList}
- Total subjects enrolled: ${activeSubjectObjects.length}
- Day streak: ${normalizedStats.currentStreak}
- Total quizzes done: ${normalizedStats.quizzesDone}
- Total study sessions: ${normalizedStats.conversationsCount}
- Most active subjects: ${topSubjects}
- Grade: Year ${userPrefs.grade || "unknown"}
- State: ${userPrefs.state || "unknown"}

You can see everything the student sees. Answer questions about their subjects, recommend what to study next, explain what the stats mean, or help them decide which subject to focus on. Be concise and direct.`;
  };

  const openChat = () => {
    if (messages.length === 0) {
      const subjectList = activeSubjectObjects.map(s => s.label).join(", ") || "no subjects yet";
      const topSubject = subjectPerformance.find(s => s.count > 0);
      setMessages([{
        role: "assistant",
        content: `Hey! I can see your subjects page. You're enrolled in **${subjectList}**.\n\nYour streak is ${normalizedStats.currentStreak} day${normalizedStats.currentStreak !== 1 ? "s" : ""} and you've done ${normalizedStats.quizzesDone} quiz${normalizedStats.quizzesDone !== 1 ? "zes" : ""}${topSubject ? `. You've been most active in **${topSubject.label}**` : ""}.\n\nWhat do you want to work on?`,
      }]);
    }
    setChatOpen(true);
  };

  const handleSend = async () => {
    if (!input.trim() || typing) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    const history = [...messages.slice(-8), userMsg];
    try {
      const response = await getGroqCompletion(history, {
        subjects: userSubjects,
        hobbies: userPrefs.hobbies || [],
        grade: userPrefs.grade,
        learningStyle: userPrefs.learningStyle || "visual",
        responseLength: 2,
        analogyIntensity: 0.1,
        pageContext: buildContext(),
      });
      setMessages(prev => [...prev, response]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Couldn't reach AI. Try again." }]);
    } finally {
      setTyping(false);
    }
  };

  const toggleLayout = (l: "list" | "grid") => {
    setLayout(l);
    localStorage.setItem("subjectsLayout", l);
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">

      {/* ── Notion-style header ── */}
      <div className="pt-16 pb-8 px-1">
        <div className="text-5xl mb-4">📚</div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight mb-1">My Subjects</h1>
        <p className="text-muted-foreground text-base">{activeSubjectObjects.length} subject{activeSubjectObjects.length !== 1 ? "s" : ""} enrolled</p>
      </div>

      {userSubjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-16 text-center">
          <div className="text-4xl mb-4">📭</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No subjects yet</h2>
          <p className="text-sm text-muted-foreground mb-6">Add subjects in your profile to get started.</p>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="rounded-lg">Go to Dashboard</Button>
        </div>
      ) : (
        <>
          {/* ── Search bar + layout toggle ── */}
          <div className="flex items-center justify-between gap-3 mb-6 px-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
              <input
                placeholder="Filter subjects…"
                className="w-full sm:w-64 text-sm pl-9 pr-3 py-1.5 rounded-md bg-muted/40 border border-transparent focus:border-border focus:bg-background outline-none transition-all placeholder:text-muted-foreground/40"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Layout toggle */}
            <div className="flex items-center gap-0.5 bg-muted/40 rounded-md p-0.5">
              <button
                onClick={() => toggleLayout("list")}
                title="List view"
                className={cn(
                  "w-7 h-7 rounded flex items-center justify-center transition-all",
                  layout === "list"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleLayout("grid")}
                title="Grid view"
                className={cn(
                  "w-7 h-7 rounded flex items-center justify-center transition-all",
                  layout === "grid"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Stats row — Notion database-property style ── */}
          <div className="flex items-center gap-6 px-1 mb-8 text-sm text-muted-foreground">
            {[
              { label: "Day streak", value: normalizedStats.currentStreak, emoji: "🔥" },
              { label: "Sessions", value: normalizedStats.conversationsCount, emoji: "💬" },
              { label: "Quizzes", value: normalizedStats.quizzesDone, emoji: "✅" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span>{s.emoji}</span>
                <span className="font-semibold text-foreground">{s.value}</span>
                <span className="text-xs">{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── Subject list OR grid ── */}
          <AnimatePresence mode="wait">
            {layout === "list" ? (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="divide-y divide-border/40"
              >
                <div className="flex items-center gap-3 px-2 py-1.5 text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">
                  <span className="w-5" />
                  <span className="flex-1">Subject</span>
                  <span className="w-20 text-right hidden sm:block">Activity</span>
                  <span className="w-8" />
                </div>

                {filteredSubjects.map((subject, i) => {
                  const Icon = subject.icon;
                  const activity = normalizedStats.subjectCounts[subject.id] || 0;
                  return (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => router.push(`/subjects/${subject.id}`)}
                      className="group flex items-center gap-3 px-2 py-3 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <Icon className="w-5 h-5 text-muted-foreground/60 group-hover:text-foreground/80 transition-colors shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-foreground truncate">{subject.label}</p>
                        <p className="text-xs text-muted-foreground/60 truncate hidden sm:block">{subject.descriptions?.senior || ""}</p>
                      </div>
                      {activity > 0 && (
                        <span className="hidden sm:block w-20 text-right text-xs text-muted-foreground">
                          {activity} session{activity !== 1 ? "s" : ""}
                        </span>
                      )}
                      {activity === 0 && <span className="hidden sm:block w-20" />}
                      <svg className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  );
                })}

                {filteredSubjects.length === 0 && search && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No subjects match "<span className="font-medium">{search}</span>"
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {filteredSubjects.map((subject, i) => {
                  const Icon = subject.icon;
                  const activity = normalizedStats.subjectCounts[subject.id] || 0;
                  const maxActivity = Math.max(1, ...filteredSubjects.map(s => normalizedStats.subjectCounts[s.id] || 0));
                  const pct = Math.round((activity / maxActivity) * 100);
                  return (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => router.push(`/subjects/${subject.id}`)}
                      className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-card/90 hover:border-border hover:shadow-sm cursor-pointer transition-all"
                    >
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-lg bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <Icon className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>

                      {/* Label + description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight mb-0.5">{subject.label}</p>
                        <p className="text-[11px] text-muted-foreground/60 leading-snug line-clamp-2">
                          {subject.descriptions?.senior || ""}
                        </p>
                      </div>

                      {/* Activity bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground/40 font-medium uppercase tracking-wider">Activity</span>
                          <span className="text-[10px] text-muted-foreground/60 font-semibold">
                            {activity > 0 ? `${activity} session${activity !== 1 ? "s" : ""}` : "No activity"}
                          </span>
                        </div>
                        <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/50 group-hover:bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${activity > 0 ? Math.max(pct, 8) : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Arrow */}
                      <svg className="absolute top-3.5 right-3.5 w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  );
                })}

                {filteredSubjects.length === 0 && search && (
                  <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                    No subjects match "<span className="font-medium">{search}</span>"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── Floating AI ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="w-80 sm:w-96 h-[460px] rounded-xl border border-border bg-background shadow-xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Page Assistant</p>
                </div>
                <button onClick={() => setChatOpen(false)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("text-sm leading-relaxed rounded-lg px-3 py-2 max-w-[88%]",
                    msg.role === "assistant" ? "bg-muted/50 text-foreground" : "bg-primary/10 text-foreground ml-auto text-right")}>
                    {msg.content}
                  </div>
                ))}
                {typing && <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-muted-foreground w-12"><span className="animate-pulse">···</span></div>}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-border/40 flex gap-2">
                <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="Ask about your subjects…" className="h-9 text-sm border-border/50" />
                <Button onClick={handleSend} size="icon" className="h-9 w-9 shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={chatOpen ? () => setChatOpen(false) : openChat}
          className="w-11 h-11 rounded-full border border-border bg-background shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
        >
          <AnimatePresence mode="wait">
            {chatOpen
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="w-4 h-4" /></motion.div>
              : <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Sparkles className="w-4 h-4" /></motion.div>
            }
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
