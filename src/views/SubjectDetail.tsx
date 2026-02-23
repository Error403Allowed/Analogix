"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  ClipboardList,
  Link as LinkIcon,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Send,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import {
  subjectStore,
  type SubjectData,
  type SubjectHomework,
  type SubjectLink,
} from "@/utils/subjectStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getGroqCompletion } from "@/services/groq";
import type { ChatMessage } from "@/types/chat";

const normalizeUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export default function SubjectDetail() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const subject = SUBJECT_CATALOG.find((s) => s.id === subjectId);

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

  const [userPrefs, setUserPrefs] = useState<{ grade?: string; hobbies?: string[]; learningStyle?: string }>({});
  const [helperMessages, setHelperMessages] = useState<ChatMessage[]>([]);
  const [helperInput, setHelperInput] = useState("");
  const [helperTyping, setHelperTyping] = useState(false);

  const homework = data.notes.homework || [];
  const links = data.notes.links || [];
  const documents = data.notes.documents || [];

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      setUserPrefs(prefs || {});
    } catch {
      setUserPrefs({});
    }
  }, []);

  useEffect(() => {
    if (!subject) return;
    setHelperMessages([
      {
        role: "assistant",
        content: `Hey! Ask me anything about ${subject.label}. I can explain concepts, check your work, or plan your study.`,
      },
    ]);
  }, [subject?.label]);

  useEffect(() => {
    subjectStore.getSubject(subjectId).then((d) => {
      setData(d);
    });
    const handler = () => subjectStore.getSubject(subjectId).then(setData);
    window.addEventListener("subjectDataUpdated", handler);
    return () => window.removeEventListener("subjectDataUpdated", handler);
  }, [subjectId]);

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-black text-foreground mb-2">Subject not found</h2>
        <Button onClick={() => router.push("/subjects")}>Go back to subjects</Button>
      </div>
    );
  }

  const handleAddMark = async () => {
    if (!newMark.title || !newMark.score || !newMark.total) {
      toast.error("Please fill in all fields");
      return;
    }
    const score = parseFloat(newMark.score);
    const total = parseFloat(newMark.total);
    if (!Number.isFinite(score) || !Number.isFinite(total)) {
      toast.error("Marks must be numbers");
      return;
    }

    await subjectStore.addMark(subjectId, {
      title: newMark.title,
      score,
      total,
      date: new Date().toISOString(),
    });
    const updated = await subjectStore.getSubject(subjectId);
    setData(updated);
    setNewMark({ title: "", score: "", total: "" });
    toast.success("Assessment saved.");
  };

  const handleAddHomework = async () => {
    if (!homeworkDraft.title.trim()) {
      toast.error("Homework title is required.");
      return;
    }
    const item: SubjectHomework = {
      id: crypto.randomUUID(),
      title: homeworkDraft.title.trim(),
      dueDate: homeworkDraft.dueDate || undefined,
      notes: homeworkDraft.notes.trim() || undefined,
      link: homeworkDraft.link.trim() ? normalizeUrl(homeworkDraft.link) : undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...homework];
    await subjectStore.updateHomework(subjectId, next);
    setData((prev) => ({ ...prev, notes: { ...prev.notes, homework: next } }));
    setHomeworkDraft({ title: "", dueDate: "", link: "", notes: "" });
    toast.success("Homework added.");
  };

  const handleToggleHomework = async (id: string) => {
    const next = homework.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item,
    );
    await subjectStore.updateHomework(subjectId, next);
    setData((prev) => ({ ...prev, notes: { ...prev.notes, homework: next } }));
  };

  const handleRemoveHomework = async (id: string) => {
    const next = homework.filter((item) => item.id !== id);
    await subjectStore.updateHomework(subjectId, next);
    setData((prev) => ({ ...prev, notes: { ...prev.notes, homework: next } }));
  };

  const handleAddLink = async () => {
    if (!linkDraft.title.trim() || !linkDraft.url.trim()) {
      toast.error("Add a title and a link.");
      return;
    }
    const nextLink: SubjectLink = {
      id: crypto.randomUUID(),
      title: linkDraft.title.trim(),
      url: normalizeUrl(linkDraft.url),
      createdAt: new Date().toISOString(),
    };
    const next = [nextLink, ...links];
    await subjectStore.updateLinks(subjectId, next);
    setData((prev) => ({ ...prev, notes: { ...prev.notes, links: next } }));
    setLinkDraft({ title: "", url: "" });
    toast.success("Link saved.");
  };

  const handleCreateDocument = async () => {
    const created = await subjectStore.createDocument(subjectId, docDraft.trim());
    setData((prev) => ({
      ...prev,
      notes: { ...prev.notes, documents: [created, ...(prev.notes.documents || [])] },
    }));
    setDocDraft("");
    router.push(`/subjects/${subjectId}/document/${created.id}`);
  };

  const handleOpenDocuments = () => {
    router.push(`/subjects/${subjectId}/document`);
  };

  const handleRemoveLink = async (id: string) => {
    const next = links.filter((item) => item.id !== id);
    await subjectStore.updateLinks(subjectId, next);
    setData((prev) => ({ ...prev, notes: { ...prev.notes, links: next } }));
  };

  const handleHelperSend = async () => {
    if (!helperInput.trim() || helperTyping) return;
    const userMessage: ChatMessage = { role: "user", content: helperInput.trim() };
    const history = [...helperMessages, userMessage].slice(-8);
    setHelperMessages((prev) => [...prev, userMessage]);
    setHelperInput("");
    setHelperTyping(true);

    try {
      const response = await getGroqCompletion(history, {
        subjects: [subjectId],
        hobbies: userPrefs.hobbies || [],
        grade: userPrefs.grade,
        learningStyle: userPrefs.learningStyle || "visual",
        responseLength: 2,
        analogyIntensity: 0.2,
      });
      setHelperMessages((prev) => [...prev, response]);
    } catch {
      const fallback: ChatMessage = {
        role: "assistant",
        content: "I couldn't reach the AI service. Try again in a moment.",
      };
      setHelperMessages((prev) => [...prev, fallback]);
    } finally {
      setHelperTyping(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 16 } },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => router.push("/subjects")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">{subject.label}</h1>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.3em]">Study Workspace</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="rounded-xl font-bold"
          onClick={handleOpenDocuments}
        >
          Open Documents
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
          <motion.section variants={item} className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">Documents</h3>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Notes, formulae, and more</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-xl text-xs font-black uppercase tracking-widest"
                onClick={handleOpenDocuments}
              >
                Open Documents
              </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <Input
                placeholder="Document title"
                value={docDraft}
                onChange={(e) => setDocDraft(e.target.value)}
                className="bg-muted/30 border-none h-11 rounded-xl text-sm flex-1"
              />
              <Button onClick={handleCreateDocument} className="gradient-primary h-11 rounded-xl text-xs font-black uppercase tracking-widest">
                <Plus className="w-4 h-4 mr-2" />
                New Document
              </Button>
            </div>

            <div className="space-y-3">
              {documents.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">No documents yet.</p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl border border-border/50 bg-muted/20 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{doc.title || "Untitled"}</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mt-1">
                        Updated {new Date(doc.lastUpdated).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs font-black uppercase tracking-widest"
                      onClick={() => router.push(`/subjects/${subjectId}/document/${doc.id}`)}
                    >
                      Open
                    </Button>
                  </div>
                ))
              )}
            </div>
          </motion.section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.section variants={item} className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">Homework</h3>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Tasks & due dates</p>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Homework title"
                  value={homeworkDraft.title}
                  onChange={(e) => setHomeworkDraft({ ...homeworkDraft, title: e.target.value })}
                  className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="date"
                    value={homeworkDraft.dueDate}
                    onChange={(e) => setHomeworkDraft({ ...homeworkDraft, dueDate: e.target.value })}
                    className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                  />
                  <Input
                    placeholder="Optional link"
                    value={homeworkDraft.link}
                    onChange={(e) => setHomeworkDraft({ ...homeworkDraft, link: e.target.value })}
                    className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                  />
                </div>
                <Input
                  placeholder="Notes (optional)"
                  value={homeworkDraft.notes}
                  onChange={(e) => setHomeworkDraft({ ...homeworkDraft, notes: e.target.value })}
                  className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                />
                <Button onClick={handleAddHomework} className="w-full gradient-primary h-11 rounded-xl text-xs font-black uppercase tracking-widest">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Homework
                </Button>
              </div>

              <div className="space-y-3">
                {homework.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">No homework yet. Chill, or don't!</p>
                ) : (
                  homework.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-4 rounded-2xl border border-border/50 bg-muted/20 flex items-start gap-3",
                        item.completed && "opacity-60"
                      )}
                    >
                      <button
                        onClick={() => handleToggleHomework(item.id)}
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center border",
                          item.completed
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <div className="flex-1">
                        <p className={cn("text-sm font-bold", item.completed && "line-through text-muted-foreground")}>{item.title}</p>
                        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/70 mt-1">
                          {item.dueDate && <span>Due {item.dueDate}</span>}
                          {item.link && <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" />Link</span>}
                        </div>
                        {item.notes && <p className="text-xs text-muted-foreground mt-2">{item.notes}</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveHomework(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.section>

            <motion.section variants={item} className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">Links</h3>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Resources & references</p>
                </div>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="Link title"
                  value={linkDraft.title}
                  onChange={(e) => setLinkDraft({ ...linkDraft, title: e.target.value })}
                  className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                />
                <Input
                  placeholder="https://"
                  value={linkDraft.url}
                  onChange={(e) => setLinkDraft({ ...linkDraft, url: e.target.value })}
                  className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                />
                <Button onClick={handleAddLink} variant="outline" className="w-full h-11 rounded-xl text-xs font-black uppercase tracking-widest">
                  <Plus className="w-4 h-4 mr-2" />
                  Save Link
                </Button>
              </div>

              <div className="space-y-3">
                {links.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">No links saved yet.</p>
                ) : (
                  links.map((item) => (
                    <div key={item.id} className="p-4 rounded-2xl border border-border/50 bg-muted/20 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary truncate block"
                        >
                          {item.url}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={item.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button onClick={() => handleRemoveLink(item.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.section>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-4 space-y-6">
          <motion.section variants={item} className="glass-card p-6 space-y-4 min-h-[420px] flex flex-col">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Subject Helper</h3>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Quick AI chat</p>
              </div>
            </div>

            <div className="flex-1 min-h-[220px] overflow-y-auto space-y-3 pr-2">
              {helperMessages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "p-3 rounded-2xl text-xs leading-relaxed",
                    msg.role === "assistant"
                      ? "bg-muted/40 text-foreground"
                      : "bg-primary/10 text-primary ml-6"
                  )}
                >
                  {msg.content}
                </div>
              ))}
              {helperTyping && (
                <div className="p-3 rounded-2xl text-xs bg-muted/30 text-muted-foreground">Thinking...</div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Ask about homework, concepts, or practice..."
                value={helperInput}
                onChange={(e) => setHelperInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleHelperSend(); }}
                className="bg-muted/30 border-none h-11 rounded-xl text-sm"
              />
              <Button
                onClick={handleHelperSend}
                size="icon"
                className="h-11 w-11 rounded-xl gradient-primary"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.section>

          <motion.section variants={item} className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Assessment Tracker</h3>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Scores & progress</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {data.marks.map((mark) => (
                  <motion.div
                    key={mark.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-[1.2rem] bg-muted/30 border border-border/50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-black text-foreground">{mark.title}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        {new Date(mark.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-primary">{mark.score}/{mark.total}</p>
                      <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter">
                        {Math.round((mark.score / mark.total) * 100)}% Mastery
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <div className="p-5 rounded-[1.2rem] border-2 border-dashed border-border bg-background/50 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] text-center">Log Assessment</p>
                <div className="space-y-3">
                  <Input
                    placeholder="Assessment name"
                    value={newMark.title}
                    onChange={(e) => setNewMark({ ...newMark, title: e.target.value })}
                    className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Score"
                      type="number"
                      value={newMark.score}
                      onChange={(e) => setNewMark({ ...newMark, score: e.target.value })}
                      className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                    />
                    <Input
                      placeholder="Total"
                      type="number"
                      value={newMark.total}
                      onChange={(e) => setNewMark({ ...newMark, total: e.target.value })}
                      className="bg-muted/30 border-none h-11 rounded-xl text-sm"
                    />
                  </div>
                  <Button
                    onClick={handleAddMark}
                    className="w-full gradient-primary h-11 rounded-xl text-xs font-black uppercase tracking-widest"
                  >
                    Save Assessment
                  </Button>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}
