"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, ClipboardList, Link as LinkIcon,
  CheckCircle2, Circle, ExternalLink, Send,
  Plus, Trash2, Sparkles, X, ChevronRight,
  Upload, BookOpen, Loader2,
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
import { extractFileText, ACCEPTED_FILE_TYPES, ACCEPTED_FILE_LABEL } from "@/utils/extractFileText";

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

  const [homeworkDraft, setHomeworkDraft] = useState({ title: "", dueDate: "", link: "", notes: "" });
  const [linkDraft, setLinkDraft] = useState({ title: "", url: "" });
  const [docDraft, setDocDraft] = useState("");
  const [userPrefs, setUserPrefs] = useState<any>({});

  const [assessmentUploading, setAssessmentUploading] = useState(false);
  const [assessmentError, setAssessmentError]         = useState<string | null>(null);
  const assessmentInputRef = useRef<HTMLInputElement>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // Shared redirect helper — sends job to sessionStorage then navigates to loading page
  const redirectToLoadingPage = (assessmentText: string, fileName: string) => {
    sessionStorage.setItem("studyGuideJob", JSON.stringify({
      assessmentText,
      fileName,
      subjectId,
      grade: userPrefs.grade,
    }));
    router.push("/study-guide-loading");
  };

  const handleAssessmentUpload = async (file: File) => {
    setAssessmentUploading(true);
    setAssessmentError(null);
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
    setPasteMode(false);
    setPasteText("");
  };



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
    const hwDone = homework.filter(h => h.completed).length;
    const docList = documents.map(d => `"${d.title || "Untitled"}"`).join(", ") || "none";
    const linkList = links.map(l => `"${l.title}" (${l.url})`).join(", ") || "none";
    const markList = data.marks.map(m => `${m.title}: ${m.score}/${m.total} (${Math.round((m.score / m.total) * 100)}%)`).join(", ") || "none";
    const avg = data.marks.length > 0 ? Math.round(data.marks.reduce((a, m) => a + (m.score / m.total) * 100, 0) / data.marks.length) : null;
    return `You are a study assistant in the ${subject!.label} workspace of Analogix.\nDocuments: ${docList}\nPending homework: ${hwPending}\nCompleted: ${hwDone}\nLinks: ${linkList}\nMarks: ${markList}${avg !== null ? `\nAverage: ${avg}%` : ""}\nHelp the student with their subject work. Be concise.`;
  };

  const openChat = () => {
    if (messages.length === 0) {
      const hwPending = homework.filter(h => !h.completed);
      const avg = data.marks.length > 0 ? Math.round(data.marks.reduce((a, m) => a + (m.score / m.total) * 100, 0) / data.marks.length) : null;
      let g = `Hey! I can see your **${subject!.label}** workspace. `;
      if (hwPending.length > 0) g += `You've got **${hwPending.length} pending task${hwPending.length !== 1 ? "s" : ""}**. `;
      if (avg !== null) g += `Your average mark is **${avg}%**. `;
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
      const response = await getGroqCompletion([...messages.slice(-8), userMsg], {
        subjects: [subjectId], hobbies: userPrefs.hobbies || [], grade: userPrefs.grade,
        learningStyle: userPrefs.learningStyle || "visual", responseLength: 2, analogyIntensity: 0.1,
        pageContext: buildContext(),
      });
      setMessages(prev => [...prev, response]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Couldn't reach AI. Try again." }]); }
    finally { setTyping(false); }
  };



  const handleAddHomework = async () => {
    if (!homeworkDraft.title.trim()) { toast.error("Title required."); return; }
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



  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto pb-24">

      {/* Page header */}
      <div className="pt-12 pb-8 px-1">
        <button
          onClick={() => router.push("/subjects")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Subjects
        </button>
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <subject.icon className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight mb-1">{subject.label}</h1>
        <p className="text-muted-foreground text-sm">Study workspace</p>
      </div>

      {/* Property bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-1 mb-8 text-sm border-b border-border/30 pb-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">{documents.length}</span>
          <span>documents</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <ClipboardList className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">{homework.filter(h => !h.completed).length}</span>
          <span>pending tasks</span>
        </div>

        <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          onClick={() => router.push(`/subjects/${subjectId}/document`)}>
          <FileText className="w-3.5 h-3.5" />All documents
        </Button>
      </div>

      {/* 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-1">

        {/* Left col */}
        <div className="lg:col-span-7 space-y-8">

          {/* Documents */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Documents
              <span className="font-normal normal-case tracking-normal text-muted-foreground/50">— {documents.length} file{documents.length !== 1 ? "s" : ""}</span>
            </h2>
            <div className="flex gap-2 mb-3">
              <input placeholder="New document title…" value={docDraft} onChange={e => setDocDraft(e.target.value)}
                onKeyDown={e => e.key === "Enter" && docDraft.trim() && handleCreateDocument()}
                className="flex-1 text-sm px-3 py-1.5 rounded-md border border-border/50 bg-transparent focus:border-border focus:outline-none transition-colors placeholder:text-muted-foreground/40" />
              <Button onClick={handleCreateDocument} size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />New
              </Button>
            </div>
            {documents.length > 0 && (
              <div className="divide-y divide-border/30">
                {documents.slice(0, 5).map(doc => (
                  <div key={doc.id} className="group flex items-center gap-3 py-2 hover:bg-muted/30 rounded-md px-2 -mx-2 transition-colors cursor-pointer"
                    onClick={() => router.push(`/subjects/${subjectId}/document/${doc.id}`)}>
                    <FileText className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{doc.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground/40">Updated {new Date(doc.lastUpdated).toLocaleDateString()}</p>
                    </div>
                    <button onClick={async e => { e.stopPropagation(); await subjectStore.removeDocument(subjectId, doc.id); setData(await subjectStore.getSubject(subjectId)); toast.success("Deleted."); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center text-muted-foreground/40 hover:text-destructive rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {documents.length > 5 && (
                  <button onClick={() => router.push(`/subjects/${subjectId}/document`)}
                    className="w-full text-left py-2 px-2 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                    +{documents.length - 5} more documents
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Homework */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5" /> Homework
              {homework.filter(h => !h.completed).length > 0 && (
                <span className="text-amber-500 font-normal normal-case tracking-normal">— {homework.filter(h => !h.completed).length} pending</span>
              )}
            </h2>
            <div className="space-y-2 mb-3">
              <input placeholder="Task title…" value={homeworkDraft.title} onChange={e => setHomeworkDraft({ ...homeworkDraft, title: e.target.value })}
                className="w-full text-sm px-3 py-1.5 rounded-md border border-border/50 bg-transparent focus:border-border focus:outline-none transition-colors placeholder:text-muted-foreground/40" />
              <div className="flex gap-2">
                <input type="date" value={homeworkDraft.dueDate} onChange={e => setHomeworkDraft({ ...homeworkDraft, dueDate: e.target.value })}
                  className="flex-1 text-sm px-3 py-1.5 rounded-md border border-border/50 bg-transparent focus:border-border focus:outline-none transition-colors text-muted-foreground" />
                <input placeholder="Link (optional)" value={homeworkDraft.link} onChange={e => setHomeworkDraft({ ...homeworkDraft, link: e.target.value })}
                  className="flex-1 text-sm px-3 py-1.5 rounded-md border border-border/50 bg-transparent focus:border-border focus:outline-none transition-colors placeholder:text-muted-foreground/40" />
              </div>
              <Button onClick={handleAddHomework} variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />Add task
              </Button>
            </div>
            {homework.length > 0 && (
              <div className="divide-y divide-border/30">
                {homework.map(hw => (
                  <div key={hw.id} className={cn("group flex items-start gap-3 py-2.5 hover:bg-muted/30 rounded-md px-2 -mx-2 transition-colors", hw.completed && "opacity-50")}>
                    <button onClick={() => handleToggleHomework(hw.id)} className="mt-0.5 shrink-0">
                      {hw.completed ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4 text-muted-foreground/40" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", hw.completed && "line-through text-muted-foreground")}>{hw.title}</p>
                      <div className="flex gap-3 mt-0.5">
                        {hw.dueDate && <span className="text-xs text-muted-foreground/50">Due {hw.dueDate}</span>}
                        {hw.link && <a href={hw.link} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-0.5 hover:underline"><ExternalLink className="w-3 h-3" />Link</a>}
                      </div>
                    </div>
                    <button onClick={() => handleRemoveHomework(hw.id)} className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center text-muted-foreground/40 hover:text-destructive rounded shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Resources */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <LinkIcon className="w-3.5 h-3.5" /> Resources
              <span className="font-normal normal-case tracking-normal text-muted-foreground/50">— {links.length} saved</span>
            </h2>
            <div className="flex gap-2 mb-3">
              <input placeholder="Title" value={linkDraft.title} onChange={e => setLinkDraft({ ...linkDraft, title: e.target.value })}
                className="flex-1 text-sm px-3 py-1.5 rounded-md border border-border/50 bg-transparent focus:border-border focus:outline-none transition-colors placeholder:text-muted-foreground/40" />
              <input placeholder="https://" value={linkDraft.url} onChange={e => setLinkDraft({ ...linkDraft, url: e.target.value })}
                onKeyDown={e => e.key === "Enter" && handleAddLink()}
                className="flex-1 text-sm px-3 py-1.5 rounded-md border border-border/50 bg-transparent focus:border-border focus:outline-none transition-colors placeholder:text-muted-foreground/40" />
              <Button onClick={handleAddLink} size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {links.length > 0 && (
              <div className="divide-y divide-border/30">
                {links.map(l => (
                  <div key={l.id} className="group flex items-center gap-3 py-2 hover:bg-muted/30 rounded-md px-2 -mx-2 transition-colors">
                    <LinkIcon className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{l.title}</p>
                      <a href={l.url} target="_blank" rel="noreferrer" className="text-xs text-primary/60 hover:text-primary truncate block hover:underline">{l.url}</a>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <a href={l.url} target="_blank" rel="noreferrer" className="w-6 h-6 flex items-center justify-center text-muted-foreground/40 hover:text-foreground rounded">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => handleRemoveLink(l.id)} className="w-6 h-6 flex items-center justify-center text-muted-foreground/40 hover:text-destructive rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right col: Study Guide Generator */}
        <div className="lg:col-span-5">
          <section className="sticky top-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> Study Guides
            </h2>

            {/* Upload area */}
            <div
              className="rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all p-5 text-center cursor-pointer"
              onClick={() => assessmentInputRef.current?.click()}
            >
              <input
                ref={assessmentInputRef}
                type="file"
                className="hidden"
                accept={ACCEPTED_FILE_TYPES}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleAssessmentUpload(file);
                }}
              />
              {assessmentUploading ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs font-medium">Generating study guide…</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-6 h-6 text-muted-foreground/40" />
                  <p className="text-xs font-semibold text-foreground">Upload notes or assignment sheet</p>
                  <p className="text-[11px] text-muted-foreground/50">PDF, TXT, or DOC — we’ll build a guide</p>
                </div>
              )}
            </div>

            {/* Paste fallback */}
            {!pasteMode ? (
              <button
                onClick={() => setPasteMode(true)}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors w-full text-center"
              >
                Or paste text instead →
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder="Paste your assessment details or notes here…"
                  rows={5}
                  className="w-full text-sm px-3 py-2 rounded-md border border-border/50 bg-transparent focus:border-primary focus:outline-none transition-colors placeholder:text-muted-foreground/40 resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => { if (pasteText.trim()) submitAssessmentText(pasteText); }}
                    disabled={!pasteText.trim() || assessmentUploading}
                    size="sm"
                    className="flex-1 h-8 text-xs gradient-primary"
                  >
                    {assessmentUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Generate
                  </Button>
                  <Button onClick={() => { setPasteMode(false); setPasteText(""); }} variant="ghost" size="sm" className="h-8 text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {assessmentError && (
              <p className="text-xs text-destructive">{assessmentError}</p>
            )}

            {/* Saved guides list */}
            {documents.filter(d => d.content.includes("📅 Study Schedule") || d.content.includes("🧠 Key Concepts")).length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">Saved guides</p>
                {documents
                  .filter(d => d.content.includes("📅 Study Schedule") || d.content.includes("🧠 Key Concepts"))
                  .map(doc => (
                    <div
                      key={doc.id}
                      className="group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => router.push(`/subjects/${subjectId}/document/${doc.id}`)}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                      <p className="text-sm text-foreground flex-1 truncate">{doc.title || "Untitled Guide"}</p>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  ))
                }
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Floating AI */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {chatOpen && (
            <motion.div initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="w-80 sm:w-96 h-[460px] rounded-xl border border-border bg-background shadow-xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">{subject.label} Assistant</p>
                </div>
                <button onClick={() => setChatOpen(false)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={cn("text-sm leading-relaxed rounded-lg px-3 py-2 max-w-[88%]",
                    msg.role === "assistant" ? "bg-muted/50" : "bg-primary/10 ml-auto text-right")}>
                    {msg.content}
                  </div>
                ))}
                {typing && <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-muted-foreground w-12"><span className="animate-pulse">···</span></div>}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-border/40 flex gap-2">
                <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChatSend()}
                  placeholder={`Ask about ${subject.label}…`} className="h-9 text-sm border-border/50" />
                <Button onClick={handleChatSend} size="icon" className="h-9 w-9 shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={chatOpen ? () => setChatOpen(false) : openChat}
          className="w-11 h-11 rounded-full border border-border bg-background shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
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
