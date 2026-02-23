"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, TrendingUp, Search, Zap, MessageCircle,
  Medal, Send, X, ChevronRight, BookOpen, Sparkles,
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

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-24">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary font-black mb-1">Overview</p>
          <h1 className="text-4xl font-black text-foreground tracking-tight">My Subjects</h1>
          <p className="text-muted-foreground mt-1 text-sm">{activeSubjectObjects.length} subject{activeSubjectObjects.length !== 1 ? "s" : ""} enrolled</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input
            placeholder="Search subjects…"
            className="pl-10 h-11 bg-muted/30 border-border/40 rounded-xl text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {userSubjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-black text-foreground mb-2">No subjects yet</h2>
          <p className="text-sm text-muted-foreground mb-6">Add subjects in your profile to get started.</p>
          <Button onClick={() => router.push("/dashboard")} className="rounded-xl gradient-primary">Go to Dashboard</Button>
        </div>
      ) : (
        <>
          {/* ── Stats bar ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3">
            {[
              { label: "Day streak", value: normalizedStats.currentStreak, icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10" },
              { label: "Study sessions", value: normalizedStats.conversationsCount, icon: MessageCircle, color: "text-primary", bg: "bg-primary/10" },
              { label: "Quizzes done", value: normalizedStats.quizzesDone, icon: Medal, color: "text-emerald-400", bg: "bg-emerald-400/10" },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-border/40 bg-background/60 px-5 py-4 flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                  <s.icon className={cn("w-5 h-5", s.color)} />
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground leading-none">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Activity bar ── */}
          {subjectPerformance.filter(s => s.count > 0).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-2xl border border-border/40 bg-background/60 p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Activity by Subject</p>
              </div>
              <div className="space-y-3">
                {subjectPerformance.filter(s => s.count > 0).slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-foreground w-28 shrink-0 truncate">{s.label}</span>
                    <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.percent}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="h-full rounded-full gradient-primary"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-16 text-right shrink-0">{s.count} session{s.count !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Subject grid ── */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-black text-foreground">Your Subjects</h2>
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-xs text-muted-foreground">{filteredSubjects.length} shown</span>
            </div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {filteredSubjects.map(subject => {
                const Icon = subject.icon;
                const activity = normalizedStats.subjectCounts[subject.id] || 0;
                return (
                  <motion.div
                    key={subject.id}
                    variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                    whileHover={{ y: -4 }}
                    onClick={() => router.push(`/subjects/${subject.id}`)}
                    className="group rounded-2xl border border-border/40 bg-background/60 p-5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Icon className="w-6 h-6 text-primary-foreground" />
                        </div>
                        {activity > 0 && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                            {activity} sessions
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-foreground text-base mb-1 group-hover:text-primary transition-colors">{subject.label}</h3>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest line-clamp-1">
                        {subject.descriptions.senior}
                      </p>
                      <div className="flex items-center justify-end mt-4 pt-3 border-t border-border/30">
                        <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                          Open <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {filteredSubjects.length === 0 && search && (
              <div className="text-center py-16 text-muted-foreground">
                <p className="font-bold">No subjects match "{search}"</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Floating AI circle ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              className="w-80 sm:w-96 h-[460px] rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">Page Assistant</p>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Knows this page</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("text-xs leading-relaxed rounded-xl px-3 py-2.5 max-w-[88%]",
                    msg.role === "assistant"
                      ? "bg-muted/50 text-foreground"
                      : "bg-primary/15 text-primary ml-auto text-right")}>
                    {msg.content}
                  </div>
                ))}
                {typing && (
                  <div className="bg-muted/40 rounded-xl px-3 py-2.5 text-xs text-muted-foreground w-16">
                    <span className="animate-pulse">···</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border/40 flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="Ask about your subjects…"
                  className="bg-muted/30 border-none h-9 rounded-xl text-xs"
                />
                <Button onClick={handleSend} size="icon" className="h-9 w-9 rounded-xl gradient-primary shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={chatOpen ? () => setChatOpen(false) : openChat}
          className="w-14 h-14 rounded-full gradient-primary shadow-2xl shadow-primary/30 flex items-center justify-center text-white"
        >
          <AnimatePresence mode="wait">
            {chatOpen
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="w-5 h-5" /></motion.div>
              : <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Sparkles className="w-5 h-5" /></motion.div>
            }
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
