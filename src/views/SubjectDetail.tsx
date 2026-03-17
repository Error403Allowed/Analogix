"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, ClipboardList, Link as LinkIcon,
  CheckCircle2, Circle, ExternalLink, Send,
  Plus, Trash2, Sparkles, X, ChevronRight,
  Upload, BookOpen, Loader2, MoreHorizontal,
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
import { extractFileText, ACCEPTED_FILE_TYPES } from "@/utils/extractFileText";
import { useTabs } from "@/context/TabsContext";

const normalizeUrl = (url: string) => {
  const t = url.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

// ── Reusable section card ─────────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, badge, children, action }: {
  icon: React.ElementType; title: string; badge?: string;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-muted-foreground/70" />
          </div>
          <span className="text-sm font-bold text-foreground">{title}</span>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">{badge}</span>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function SubjectDetail() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const subject = SUBJECT_CATALOG.find(s => s.id === subjectId);
  const { updateTabLabelByPath } = useTabs();

  useEffect(() => {
    if (subject?.label) updateTabLabelByPath(`/subjects/${subjectId}`, subject.label, "📖");
  }, [subject?.label, subjectId, updateTabLabelByPath]);

  const emptyData: SubjectData = {
    id: subjectId,
    marks: [],
    notes: { content: "", lastUpdated: new Date().toISOString(), homework: [], links: [], documents: [] },
  };

  const [data, setData] = useState<SubjectData>(emptyData);
  const [homeworkDraft, setHomeworkDraft] = useState({ title: "", dueDate: "", link: "", notes: "" });
  const [showHomeworkForm, setShowHomeworkForm] = useState(false);
  const [linkDraft, setLinkDraft] = useState({ title: "", url: "" });
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [docDraft, setDocDraft] = useState("");
  const [userPrefs, setUserPrefs] = useState<any>({});

  const [assessmentUploading, setAssessmentUploading] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);
  const assessmentInputRef = useRef<HTMLInputElement>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [typing, setTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const homework = data.notes.homework || [];
  const links = data.notes.links || [];
  const documents = data.notes.documents || [];

  const redirectToLoadingPage = (assessmentText: string, fileName: string) => {
    sessionStorage.setItem("studyGuideJob", JSON.stringify({ assessmentText, fileName, subjectId, grade: userPrefs.grade }));
    router.push("/study-guide-loading");
  };

  const handleAssessmentUpload = async (file: File) => {
    setAssessmentUploading(true); setAssessmentError(null);
    try {
      const text = await extractFileText(file);
      redirectToLoadingPage(text, file.name);
    } catch (err) {
      setAssessmentError(err instanceof Error ? err.message : "Couldn't read file. Try pasting instead.");
    } finally {
      setAssessmentUploading(false);
      if (assessmentInputRef.current) assessmentInputRef.current.value = "";
    }
  };

  const submitAssessmentText = (text: string, fileName = "Pasted text") => {
    if (!text.trim()) return;
    redirectToLoadingPage(text, fileName);
    setPasteMode(false); setPasteText("");
  };

  useEffect(() => {
    try { setUserPrefs(JSON.parse(localStorage.getItem("userPreferences") || "{}")); } catch { /**/ }
  }, []);

  useEffect(() => {
    subjectStore.getSubject(subjectId).then(setData);
    const handler = () => subjectStore.getSubject(subjectId).then(setData);
    window.addEventListener("subjectDataUpdated", handler);
    return () => window.removeEventListener("subjectDataUpdated", handler);
  }, [subjectId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!subject) return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <FileText className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-bold text-foreground mb-2">Subject not found</h2>
      <Button onClick={() => router.push("/subjects")}>Go back</Button>
    </div>
  );

  const buildContext = () => {
    const hwPending = homework.filter(h => !h.completed).map(h => `"${h.title}"${h.dueDate ? ` (due ${h.dueDate})` : ""}`).join(", ") || "none";
    const docList = documents.map(d => `"${d.title || "Untitled"}"`).join(", ") || "none";
    const avg = data.marks.length > 0 ? Math.round(data.marks.reduce((a, m) => a + (m.score / m.total) * 100, 0) / data.marks.length) : null;
    return `You are a study assistant in the ${subject!.label} workspace of Analogix.\nDocuments: ${docList}\nPending homework: ${hwPending}\nCompleted tasks: ${homework.filter(h => h.completed).length}\nMarks average: ${avg !== null ? `${avg}%` : "none yet"}\nBe concise.`;
  };

  const openChat = () => {
    if (messages.length === 0) {
      const hwPending = homework.filter(h => !h.completed);
      const avg = data.marks.length > 0 ? Math.round(data.marks.reduce((a, m) => a + (m.score / m.total) * 100, 0) / data.marks.length) : null;
      let g = `Hey! I can see your **${subject!.label}** workspace. `;
      if (hwPending.length > 0) g += `You've got **${hwPending.length} pending task${hwPending.length !== 1 ? "s" : ""}**. `;
      if (avg !== null) g += `Average mark: **${avg}%**. `;
      g += "\n\nWhat do you need a hand with?";
      setMessages([{ role: "assistant", content: g }]);
    }
    setChatOpen(true);
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || typing) return;
    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    setMessages(prev => [...prev, userMsg]); setChatInput(""); setTyping(true);
    try {
      const response = await getGroqCompletion([...messages.slice(-8), userMsg], { subjects: [subjectId], hobbies: userPrefs.hobbies || [], grade: userPrefs.grade, learningStyle: userPrefs.learningStyle || "visual", responseLength: 2, analogyIntensity: 0.1, pageContext: buildContext() });
      setMessages(prev => [...prev, response]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Couldn't reach AI. Try again." }]); }
    finally { setTyping(false); }
  };

  const handleAddHomework = async () => {
    if (!homeworkDraft.title.trim()) { toast.error("Title required."); return; }
    const item: SubjectHomework = { id: crypto.randomUUID(), title: homeworkDraft.title.trim(), dueDate: homeworkDraft.dueDate || undefined, notes: homeworkDraft.notes.trim() || undefined, link: homeworkDraft.link.trim() ? normalizeUrl(homeworkDraft.link) : undefined, completed: false, createdAt: new Date().toISOString() };
    const next = [item, ...homework];
    await subjectStore.updateHomework(subjectId, next);
    setData(prev => ({ ...prev, notes: { ...prev.notes, homework: next } }));
    setHomeworkDraft({ title: "", dueDate: "", link: "", notes: "" });
    setShowHomeworkForm(false);
    toast.success("Task added.");
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
    setLinkDraft({ title: "", url: "" }); setShowLinkForm(false);
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

  const pendingCount = homework.filter(h => !h.completed).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto pb-24">

      {/* ── Hero Header ── */}
      <div className="pt-0 pb-8 px-1">
        <button onClick={() => router.push("/subjects")}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/60 hover:text-foreground mb-6 transition-colors uppercase tracking-widest">
          <ArrowLeft className="w-3.5 h-3.5" /> Subjects
        </button>

        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <subject.icon className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-foreground tracking-tight truncate">{subject.label}</h1>
            {/* Quick stats row */}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span className="font-semibold text-foreground">{documents.length}</span> docs
              </span>
              <span className="flex items-center gap-1">
                <ClipboardList className="w-3 h-3" />
                <span className={cn("font-semibold", pendingCount > 0 ? "text-amber-500" : "text-foreground")}>{pendingCount}</span> pending
              </span>
              <span className="flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                <span className="font-semibold text-foreground">{links.length}</span> links
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/subjects/${subjectId}/document`)}
            className="hidden sm:flex h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 shrink-0">
            All docs <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── 2-col layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 px-1">

        {/* LEFT: Documents + Tasks + Resources */}
        <div className="lg:col-span-7 space-y-5">

          {/* Documents */}
          <SectionCard icon={FileText} title="Documents" badge={`${documents.length}`}
            action={
              <button onClick={handleCreateDocument} className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary transition-colors">
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            }>
            <div className="flex gap-2 mb-4">
              <input placeholder="New document title…" value={docDraft} onChange={e => setDocDraft(e.target.value)}
                onKeyDown={e => e.key === "Enter" && docDraft.trim() && handleCreateDocument()}
                className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border/50 bg-transparent focus:border-primary/50 focus:outline-none transition-colors placeholder:text-muted-foreground/35" />
              <Button onClick={handleCreateDocument} size="sm" disabled={!docDraft.trim()}
                className="h-8 gap-1.5 text-xs rounded-lg">
                <Plus className="w-3.5 h-3.5" /> Create
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="py-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground/50">No documents yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {documents.slice(0, 6).map(doc => (
                  <div key={doc.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => router.push(`/subjects/${subjectId}/document/${doc.id}`)}>
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.title || "Untitled"}</p>
                      <p className="text-[11px] text-muted-foreground/40">Updated {new Date(doc.lastUpdated).toLocaleDateString()}</p>
                    </div>
                    <button onClick={async e => { e.stopPropagation(); await subjectStore.removeDocument(subjectId, doc.id); setData(await subjectStore.getSubject(subjectId)); toast.success("Deleted."); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center text-muted-foreground/30 hover:text-destructive rounded-lg hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {documents.length > 6 && (
                  <button onClick={() => router.push(`/subjects/${subjectId}/document`)}
                    className="w-full text-left px-3 py-2 text-xs text-muted-foreground/40 hover:text-primary transition-colors flex items-center gap-1.5">
                    <MoreHorizontal className="w-3.5 h-3.5" /> +{documents.length - 6} more
                  </button>
                )}
              </div>
            )}
          </SectionCard>

          {/* Homework / Tasks */}
          <SectionCard icon={ClipboardList} title="Tasks"
            badge={pendingCount > 0 ? `${pendingCount} pending` : `${homework.length}`}
            action={
              <button onClick={() => setShowHomeworkForm(f => !f)}
                className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            }>

            <AnimatePresence>
              {showHomeworkForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4">
                  <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/40">
                    <input placeholder="Task title…" value={homeworkDraft.title} onChange={e => setHomeworkDraft({ ...homeworkDraft, title: e.target.value })}
                      className="w-full text-sm px-3 py-1.5 rounded-lg border border-border/50 bg-background focus:border-primary/50 focus:outline-none transition-colors placeholder:text-muted-foreground/40" />
                    <div className="flex gap-2">
                      <input type="date" value={homeworkDraft.dueDate} onChange={e => setHomeworkDraft({ ...homeworkDraft, dueDate: e.target.value })}
                        className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border/50 bg-background focus:border-primary/50 focus:outline-none transition-colors text-muted-foreground" />
                      <input placeholder="Link (optional)" value={homeworkDraft.link} onChange={e => setHomeworkDraft({ ...homeworkDraft, link: e.target.value })}
                        className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border/50 bg-background focus:border-primary/50 focus:outline-none transition-colors placeholder:text-muted-foreground/40" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddHomework} size="sm" className="h-8 text-xs rounded-lg flex-1">Add task</Button>
                      <Button onClick={() => { setShowHomeworkForm(false); setHomeworkDraft({ title: "", dueDate: "", link: "", notes: "" }); }} variant="ghost" size="sm" className="h-8 text-xs rounded-lg">Cancel</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {homework.length === 0 ? (
              <div className="py-8 text-center">
                <ClipboardList className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground/50">No tasks yet</p>
                <button onClick={() => setShowHomeworkForm(true)} className="text-xs text-primary/60 hover:text-primary mt-1 transition-colors">Add one →</button>
              </div>
            ) : (
              <div className="space-y-1">
                {homework.map(hw => (
                  <div key={hw.id} className={cn("group flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-colors", hw.completed && "opacity-50")}>
                    <button onClick={() => handleToggleHomework(hw.id)} className="mt-0.5 shrink-0 transition-transform hover:scale-110">
                      {hw.completed
                        ? <CheckCircle2 className="w-4 h-4 text-primary" />
                        : <Circle className="w-4 h-4 text-muted-foreground/30 hover:text-primary/60 transition-colors" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", hw.completed && "line-through text-muted-foreground")}>{hw.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {hw.dueDate && (
                          <span className={cn("text-[11px]", new Date(hw.dueDate) < new Date() && !hw.completed ? "text-red-500 font-semibold" : "text-muted-foreground/40")}>
                            Due {hw.dueDate}
                          </span>
                        )}
                        {hw.link && (
                          <a href={hw.link} target="_blank" rel="noreferrer" className="text-[11px] text-primary/60 flex items-center gap-0.5 hover:text-primary transition-colors hover:underline">
                            <ExternalLink className="w-2.5 h-2.5" /> Link
                          </a>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleRemoveHomework(hw.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center text-muted-foreground/30 hover:text-destructive rounded-lg hover:bg-destructive/10 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Resources */}
          <SectionCard icon={LinkIcon} title="Resources" badge={`${links.length}`}
            action={
              <button onClick={() => setShowLinkForm(f => !f)}
                className="flex items-center gap-1 text-xs text-muted-foreground/50 hover:text-primary transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            }>

            <AnimatePresence>
              {showLinkForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4">
                  <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/40">
                    <div className="flex gap-2">
                      <input placeholder="Title" value={linkDraft.title} onChange={e => setLinkDraft({ ...linkDraft, title: e.target.value })}
                        className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border/50 bg-background focus:border-primary/50 focus:outline-none transition-colors placeholder:text-muted-foreground/40" />
                      <input placeholder="https://" value={linkDraft.url} onChange={e => setLinkDraft({ ...linkDraft, url: e.target.value })}
                        onKeyDown={e => e.key === "Enter" && handleAddLink()}
                        className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border/50 bg-background focus:border-primary/50 focus:outline-none transition-colors placeholder:text-muted-foreground/40" />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddLink} size="sm" className="h-8 text-xs rounded-lg flex-1">Save link</Button>
                      <Button onClick={() => { setShowLinkForm(false); setLinkDraft({ title: "", url: "" }); }} variant="ghost" size="sm" className="h-8 text-xs rounded-lg">Cancel</Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {links.length === 0 ? (
              <div className="py-8 text-center">
                <LinkIcon className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground/50">No links saved</p>
                <button onClick={() => setShowLinkForm(true)} className="text-xs text-primary/60 hover:text-primary mt-1 transition-colors">Add one →</button>
              </div>
            ) : (
              <div className="space-y-1">
                {links.map(l => (
                  <div key={l.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <LinkIcon className="w-3.5 h-3.5 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{l.title}</p>
                      <a href={l.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        className="text-[11px] text-primary/50 hover:text-primary truncate block hover:underline transition-colors">{l.url}</a>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <a href={l.url} target="_blank" rel="noreferrer"
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground/30 hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => handleRemoveLink(l.id)}
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground/30 hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* RIGHT: Study Guide generator */}
        <div className="lg:col-span-5 space-y-5">
          <div className="sticky top-6 space-y-4">

            {/* Study Guide card */}
            <div className="rounded-2xl border border-border/50 bg-card/60 overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/30">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-bold text-foreground">Study Guide Generator</span>
                <Sparkles className="w-3.5 h-3.5 text-primary/60 ml-auto" />
              </div>

              <div className="p-5 space-y-4">
                {/* Drop zone */}
                <div
                  className={cn(
                    "relative rounded-xl border-2 border-dashed transition-all p-6 text-center cursor-pointer group",
                    assessmentUploading
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                  )}
                  onClick={() => !assessmentUploading && assessmentInputRef.current?.click()}
                >
                  <input ref={assessmentInputRef} type="file" className="hidden" accept={ACCEPTED_FILE_TYPES}
                    onChange={e => { const file = e.target.files?.[0]; if (file) handleAssessmentUpload(file); }} />

                  {assessmentUploading ? (
                    <div className="flex flex-col items-center gap-2.5 text-muted-foreground">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                      <p className="text-xs font-semibold text-primary">Generating your guide…</p>
                      <p className="text-[11px] text-muted-foreground/50">This takes about 30 seconds</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <Upload className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Upload assessment</p>
                        <p className="text-[11px] text-muted-foreground/50 mt-0.5">PDF, TXT, or DOC — AI builds your guide</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Paste fallback */}
                <AnimatePresence>
                  {!pasteMode ? (
                    <button onClick={() => setPasteMode(true)}
                      className="w-full text-xs text-muted-foreground/40 hover:text-primary transition-colors text-center py-1">
                      Or paste your notes instead →
                    </button>
                  ) : (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-2">
                      <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                        placeholder="Paste your assessment details or notes here…"
                        rows={5}
                        className="w-full text-sm px-3 py-2 rounded-xl border border-border/50 bg-muted/20 focus:border-primary/50 focus:outline-none transition-colors placeholder:text-muted-foreground/35 resize-none" />
                      <div className="flex gap-2">
                        <Button onClick={() => pasteText.trim() && submitAssessmentText(pasteText)} disabled={!pasteText.trim() || assessmentUploading}
                          size="sm" className="flex-1 h-8 text-xs rounded-lg gradient-primary gap-1.5">
                          {assessmentUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          Generate
                        </Button>
                        <Button onClick={() => { setPasteMode(false); setPasteText(""); }} variant="ghost" size="sm" className="h-8 text-xs rounded-lg">
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {assessmentError && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{assessmentError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Floating AI ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {chatOpen && (
            <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="w-80 sm:w-96 h-[460px] rounded-2xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold">{subject.label} Assistant</p>
                </div>
                <button onClick={() => setChatOpen(false)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("text-sm leading-relaxed rounded-xl px-3 py-2.5 max-w-[88%]",
                    msg.role === "assistant" ? "bg-muted/50 text-foreground" : "bg-primary/10 text-foreground ml-auto text-right")}>
                    {msg.content}
                  </div>
                ))}
                {typing && (
                  <div className="bg-muted/40 rounded-xl px-3 py-2 text-sm text-muted-foreground w-12">
                    <span className="animate-pulse">···</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-border/40 flex gap-2">
                <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChatSend()}
                  placeholder={`Ask about ${subject.label}…`} className="h-9 text-sm border-border/50 rounded-lg" />
                <Button onClick={handleChatSend} size="icon" className="h-9 w-9 shrink-0 rounded-lg">
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
              : <motion.div key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Sparkles className="w-4 h-4" /></motion.div>}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
}
