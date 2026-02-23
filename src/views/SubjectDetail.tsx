"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, ClipboardList, Link as LinkIcon,
  CheckCircle2, Circle, ExternalLink, Send,
  Plus, Trash2, TrendingUp, Sparkles, X, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import {
  subjectStore, type SubjectData, type SubjectHomework, type SubjectLink,
} from "@/utils/subjectStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getGroqCompletion } from "@/services/groq";
import type { ChatMessage } from "@/types/chat";

const normalizeUrl = (url: string) => {
  const t = url.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

export default function SubjectDetail() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const subject = SUBJECT_CATALOG.find(s => s.id === subjectId);

  const emptyData: SubjectData = {
    id: subjectId,
    marks: [],
    notes: { content: "", lastUpdated: new Date().toISOString(), homework: [], links: [], documents: [] },
  };

  const [data, setData] = useState<SubjectData>(emptyData);
  const [newMark, setNewMark] = useState({ title: "", score: "", total: "" });
  const [homeworkDraft, setHomeworkDraft] = useState({ title: "", dueDate: "", link: "", notes: "" });
  const [linkDraft, setLinkDraft] = useState({ title: "", url: "" });
  const [docDraft, setDocDraft] = useState("");
  const [userPrefs, setUserPrefs] = useState<any>({});

  // Floating AI state
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const homework = data.notes.homework || [];
  const links = data.notes.links || [];
  const documents = data.notes.documents || [];

  useEffect(() => {
    try { setUserPrefs(JSON.parse(localStorage.getItem("userPreferences") || "{}")); } catch { /**/ }
  }, []);

  useEffect(() => {
    subjectStore.getSubject(subjectId).then(setData);
    const handler = () => subjectStore.getSubject(subjectId).then(setData);
    window.addEventListener("subjectDataUpdated", handler);
    return () => window.removeEventListener("subjectDataUpdated", handler);
  }, [subjectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!subject) return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <FileText className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-black text-foreground mb-2">Subject not found</h2>
      <Button onClick={() => router.push("/subjects")}>Go back</Button>
    </div>
  );


  // Build rich context for AI
  const buildContext = () => {
    const hwPending = homework.filter(h => !h.completed).map(h => `"${h.title}"${h.dueDate ? ` (due ${h.dueDate})` : ""}`).join(", ") || "none";
    const hwDone = homework.filter(h => h.completed).length;
    const docList = documents.map(d => `"${d.title || "Untitled"}"`).join(", ") || "none";
    const linkList = links.map(l => `"${l.title}" (${l.url})`).join(", ") || "none";
    const markList = data.marks.map(m => `${m.title}: ${m.score}/${m.total} (${Math.round((m.score/m.total)*100)}%)`).join(", ") || "no marks recorded";
    const avgMark = data.marks.length > 0
      ? Math.round(data.marks.reduce((acc, m) => acc + (m.score / m.total) * 100, 0) / data.marks.length)
      : null;

    return `You are a smart study assistant embedded in the ${subject!.label} subject page of Analogix.

PAGE CONTEXT — everything currently on screen:
- Subject: ${subject!.label}
- Student grade: Year ${userPrefs.grade || "unknown"}, State: ${userPrefs.state || "unknown"}
- Documents: ${docList}
- Pending homework: ${hwPending}
- Completed homework: ${hwDone} item${hwDone !== 1 ? "s" : ""}
- Saved links: ${linkList}
- Assessment marks: ${markList}${avgMark !== null ? `\n- Average score: ${avgMark}%` : ""}

You can see everything the student sees on this page. Help them understand their subjects, review their homework, explain concepts, check their marks, or plan what to study. Be concise and helpful.`;
  };

  const openChat = () => {
    if (messages.length === 0) {
      const hwPending = homework.filter(h => !h.completed);
      const avgMark = data.marks.length > 0
        ? Math.round(data.marks.reduce((acc, m) => acc + (m.score / m.total) * 100, 0) / data.marks.length)
        : null;
      let greeting = `Hey! I can see your ${subject!.label} workspace.\n\n`;
      if (hwPending.length > 0) greeting += `You have **${hwPending.length} pending homework** item${hwPending.length !== 1 ? "s" : ""}`;
      if (documents.length > 0) greeting += `${hwPending.length > 0 ? " and " : "You have "}**${documents.length} document${documents.length !== 1 ? "s" : ""}** saved`;
      if (avgMark !== null) greeting += `. Your average mark is **${avgMark}%**`;
      greeting += ".\n\nWhat do you need help with?";
      setMessages([{ role: "assistant", content: greeting }]);
    }
    setChatOpen(true);
  };

  const handleSend = async () => {
    if (!chatInput.trim() || typing) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setTyping(true);
    try {
      const history = [...messages.slice(-8), userMsg];
      const response = await getGroqCompletion(history, {
        subjects: [subjectId],
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


  const handleAddMark = async () => {
    if (!newMark.title || !newMark.score || !newMark.total) { toast.error("Fill in all fields"); return; }
    const score = parseFloat(newMark.score), total = parseFloat(newMark.total);
    if (!isFinite(score) || !isFinite(total)) { toast.error("Marks must be numbers"); return; }
    await subjectStore.addMark(subjectId, { title: newMark.title, score, total, date: new Date().toISOString() });
    setData(await subjectStore.getSubject(subjectId));
    setNewMark({ title: "", score: "", total: "" });
    toast.success("Assessment saved.");
  };

  const handleAddHomework = async () => {
    if (!homeworkDraft.title.trim()) { toast.error("Homework title required."); return; }
    const item: SubjectHomework = {
      id: crypto.randomUUID(), title: homeworkDraft.title.trim(),
      dueDate: homeworkDraft.dueDate || undefined, notes: homeworkDraft.notes.trim() || undefined,
      link: homeworkDraft.link.trim() ? normalizeUrl(homeworkDraft.link) : undefined,
      completed: false, createdAt: new Date().toISOString(),
    };
    const next = [item, ...homework];
    await subjectStore.updateHomework(subjectId, next);
    setData(prev => ({ ...prev, notes: { ...prev.notes, homework: next } }));
    setHomeworkDraft({ title: "", dueDate: "", link: "", notes: "" });
    toast.success("Homework added.");
  };

  const handleToggleHomework = async (id: string) => {
    const next = homework.map(h => h.id === id ? { ...h, completed: !h.completed } : h);
    await subjectStore.updateHomework(subjectId, next);
    setData(prev => ({ ...prev, notes: { ...prev.notes, homework: next } }));
  };

  const handleRemoveHomework = async (id: string) => {
    const next = homework.filter(h => h.id !== id);
    await subjectStore.updateHomework(subjectId, next);
    setData(prev => ({ ...prev, notes: { ...prev.notes, homework: next } }));
  };

  const handleAddLink = async () => {
    if (!linkDraft.title.trim() || !linkDraft.url.trim()) { toast.error("Title and URL required."); return; }
    const nextLink: SubjectLink = { id: crypto.randomUUID(), title: linkDraft.title.trim(), url: normalizeUrl(linkDraft.url), createdAt: new Date().toISOString() };
    const next = [nextLink, ...links];
    await subjectStore.updateLinks(subjectId, next);
    setData(prev => ({ ...prev, notes: { ...prev.notes, links: next } }));
    setLinkDraft({ title: "", url: "" });
    toast.success("Link saved.");
  };

  const handleRemoveLink = async (id: string) => {
    const next = links.filter(l => l.id !== id);
    await subjectStore.updateLinks(subjectId, next);
    setData(prev => ({ ...prev, notes: { ...prev.notes, links: next } }));
  };

  const handleCreateDocument = async () => {
    const created = await subjectStore.createDocument(subjectId, docDraft.trim());
    setData(prev => ({ ...prev, notes: { ...prev.notes, documents: [created, ...(prev.notes.documents || [])] } }));
    setDocDraft("");
    router.push(`/subjects/${subjectId}/document/${created.id}`);
  };

  const Icon = subject.icon;
  const avgMark = data.marks.length > 0
    ? Math.round(data.marks.reduce((a, m) => a + (m.score / m.total) * 100, 0) / data.marks.length) : null;


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6 pb-24">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary" onClick={() => router.push("/subjects")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">{subject.label}</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Study Workspace</p>
          </div>
        </div>
        <Button variant="outline" className="rounded-xl text-xs font-black uppercase tracking-widest hidden sm:flex"
          onClick={() => router.push(`/subjects/${subjectId}/document`)}>
          <FileText className="w-3.5 h-3.5 mr-2" />All Documents
        </Button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Documents", value: documents.length, icon: FileText, color: "text-primary", bg: "bg-primary/10" },
          { label: "Pending tasks", value: homework.filter(h => !h.completed).length, icon: ClipboardList, color: "text-amber-400", bg: "bg-amber-400/10" },
          { label: "Avg mark", value: avgMark !== null ? `${avgMark}%` : "—", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-border/40 bg-background/60 px-4 py-3 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
              <s.icon className={cn("w-4 h-4", s.color)} />
            </div>
            <div>
              <p className="text-xl font-black text-foreground leading-none">{s.value}</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Left: Documents + Homework + Links ── */}
        <div className="lg:col-span-7 space-y-5">

          {/* Documents */}
          <section className="rounded-2xl border border-border/40 bg-background/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="font-black text-foreground">Documents</h3>
                <span className="text-[10px] text-muted-foreground ml-1">{documents.length} file{documents.length !== 1 ? "s" : ""}</span>
              </div>
              <button onClick={() => router.push(`/subjects/${subjectId}/document`)}
                className="text-[10px] uppercase tracking-widest font-black text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-2">
              <Input placeholder="New document title…" value={docDraft} onChange={e => setDocDraft(e.target.value)}
                onKeyDown={e => e.key === "Enter" && docDraft.trim() && handleCreateDocument()}
                className="bg-muted/30 border-none h-10 rounded-xl text-sm flex-1" />
              <Button onClick={handleCreateDocument} className="gradient-primary h-10 rounded-xl text-xs font-black px-4 shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1.5" />New
              </Button>
            </div>
            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.slice(0, 4).map(doc => (
                  <div key={doc.id}
                    className="flex items-center gap-2 p-3 rounded-xl border border-border/30 bg-muted/10 hover:bg-primary/5 hover:border-primary/30 transition-all group">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/subjects/${subjectId}/document/${doc.id}`)}>
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{doc.title || "Untitled"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Updated {new Date(doc.lastUpdated).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={async e => { e.stopPropagation(); await subjectStore.removeDocument(subjectId, doc.id); setData(await subjectStore.getSubject(subjectId)); toast.success("Deleted."); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 cursor-pointer" onClick={() => router.push(`/subjects/${subjectId}/document/${doc.id}`)} />
                  </div>
                ))}
                {documents.length > 4 && (
                  <button onClick={() => router.push(`/subjects/${subjectId}/document`)}
                    className="w-full text-xs text-muted-foreground hover:text-primary text-center py-1 transition-colors">
                    +{documents.length - 4} more
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Homework */}
          <section className="rounded-2xl border border-border/40 bg-background/60 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <h3 className="font-black text-foreground">Homework</h3>
              {homework.filter(h => !h.completed).length > 0 && (
                <span className="text-[9px] font-black bg-amber-400/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-400/20">
                  {homework.filter(h => !h.completed).length} pending
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Input placeholder="Homework title…" value={homeworkDraft.title} onChange={e => setHomeworkDraft({ ...homeworkDraft, title: e.target.value })}
                className="bg-muted/30 border-none h-10 rounded-xl text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={homeworkDraft.dueDate} onChange={e => setHomeworkDraft({ ...homeworkDraft, dueDate: e.target.value })}
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm" />
                <Input placeholder="Link (optional)" value={homeworkDraft.link} onChange={e => setHomeworkDraft({ ...homeworkDraft, link: e.target.value })}
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm" />
              </div>
              <Button onClick={handleAddHomework} variant="outline" className="w-full h-10 rounded-xl text-xs font-black uppercase tracking-widest">
                <Plus className="w-3.5 h-3.5 mr-1.5" />Add Task
              </Button>
            </div>
            {homework.length > 0 && (
              <div className="space-y-2">
                {homework.map(hw => (
                  <div key={hw.id} className={cn("flex items-start gap-3 p-3 rounded-xl border border-border/30 transition-all", hw.completed ? "opacity-50 bg-muted/5" : "bg-muted/10")}>
                    <button onClick={() => handleToggleHomework(hw.id)} className="mt-0.5 shrink-0">
                      {hw.completed
                        ? <CheckCircle2 className="w-4 h-4 text-primary" />
                        : <Circle className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-bold", hw.completed && "line-through text-muted-foreground")}>{hw.title}</p>
                      <div className="flex gap-3 mt-0.5">
                        {hw.dueDate && <span className="text-[10px] text-muted-foreground">Due {hw.dueDate}</span>}
                        {hw.link && <a href={hw.link} target="_blank" rel="noreferrer" className="text-[10px] text-primary flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" />Link</a>}
                      </div>
                    </div>
                    <button onClick={() => handleRemoveHomework(hw.id)} className="text-muted-foreground hover:text-destructive shrink-0 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Links */}
          <section className="rounded-2xl border border-border/40 bg-background/60 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-primary" />
              <h3 className="font-black text-foreground">Resources</h3>
              <span className="text-[10px] text-muted-foreground">{links.length} saved</span>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Title" value={linkDraft.title} onChange={e => setLinkDraft({ ...linkDraft, title: e.target.value })}
                className="bg-muted/30 border-none h-10 rounded-xl text-sm flex-1" />
              <Input placeholder="https://" value={linkDraft.url} onChange={e => setLinkDraft({ ...linkDraft, url: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleAddLink()}
                className="bg-muted/30 border-none h-10 rounded-xl text-sm flex-1" />
              <Button onClick={handleAddLink} variant="outline" className="h-10 rounded-xl text-xs font-black px-3 shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {links.length > 0 && (
              <div className="space-y-2">
                {links.map(l => (
                  <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-muted/10">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{l.title}</p>
                      <a href={l.url} target="_blank" rel="noreferrer" className="text-[10px] text-primary truncate block hover:underline">{l.url}</a>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a href={l.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => handleRemoveLink(l.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Right: Assessment Tracker ── */}
        <div className="lg:col-span-5">
          <section className="rounded-2xl border border-border/40 bg-background/60 p-5 space-y-4 sticky top-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-black text-foreground">Assessment Tracker</h3>
              {avgMark !== null && (
                <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full border ml-auto",
                  avgMark >= 75 ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" :
                  avgMark >= 50 ? "bg-amber-400/10 text-amber-400 border-amber-400/20" :
                  "bg-red-400/10 text-red-400 border-red-400/20")}>
                  Avg {avgMark}%
                </span>
              )}
            </div>

            {/* Existing marks */}
            {data.marks.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                <AnimatePresence mode="popLayout">
                  {data.marks.map(mark => {
                    const pct = Math.round((mark.score / mark.total) * 100);
                    return (
                      <motion.div key={mark.id} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-muted/10">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{mark.title}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(mark.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-primary">{mark.score}/{mark.total}</p>
                          <p className={cn("text-[10px] font-black",
                            pct >= 75 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400")}>
                            {pct}%
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Add mark form */}
            <div className="space-y-2 pt-2 border-t border-border/30">
              <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground">Log Assessment</p>
              <Input placeholder="Assessment name" value={newMark.title} onChange={e => setNewMark({ ...newMark, title: e.target.value })}
                className="bg-muted/30 border-none h-10 rounded-xl text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Score" type="number" value={newMark.score} onChange={e => setNewMark({ ...newMark, score: e.target.value })}
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm" />
                <Input placeholder="Total" type="number" value={newMark.total} onChange={e => setNewMark({ ...newMark, total: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && handleAddMark()}
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm" />
              </div>
              <Button onClick={handleAddMark} className="w-full gradient-primary h-10 rounded-xl text-xs font-black uppercase tracking-widest">
                Save Assessment
              </Button>
            </div>
          </section>
        </div>
      </div>

      {/* ── Floating AI circle ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {chatOpen && (
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.95 }}
              className="w-80 sm:w-96 h-[460px] rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground">{subject.label} Assistant</p>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Knows this page</p>
                  </div>
                </div>
                <button onClick={() => setChatOpen(false)} className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("text-xs leading-relaxed rounded-xl px-3 py-2.5 max-w-[88%]",
                    msg.role === "assistant" ? "bg-muted/50 text-foreground" : "bg-primary/15 text-primary ml-auto text-right")}>
                    {msg.content}
                  </div>
                ))}
                {typing && <div className="bg-muted/40 rounded-xl px-3 py-2.5 text-xs text-muted-foreground w-16"><span className="animate-pulse">···</span></div>}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-border/40 flex gap-2">
                <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder={`Ask about ${subject.label}…`}
                  className="bg-muted/30 border-none h-9 rounded-xl text-xs" />
                <Button onClick={handleSend} size="icon" className="h-9 w-9 rounded-xl gradient-primary shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
          onClick={chatOpen ? () => setChatOpen(false) : openChat}
          className="w-14 h-14 rounded-full gradient-primary shadow-2xl shadow-primary/30 flex items-center justify-center text-white">
          <AnimatePresence mode="wait">
            {chatOpen
              ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="w-5 h-5" /></motion.div>
              : <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Sparkles className="w-5 h-5" /></motion.div>}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
}
