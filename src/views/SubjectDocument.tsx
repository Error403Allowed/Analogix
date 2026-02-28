"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Sparkles, Bold, Italic, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote,
  Link as LinkIcon, Image as ImageIcon, Table, Minus, Sigma,
  MessageCircle, Send, X, Braces,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { subjectStore, type SubjectDocumentItem } from "@/utils/subjectStore";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getGroqCompletion } from "@/services/groq";
import type { ChatMessage } from "@/types/chat";
import MathInput from "@/components/MathInput";
import CodeBlockInput from "@/components/CodeBlockInput";
import RichEditor, { type RichEditorHandle } from "@/components/RichEditor";

const formatSavedLabel = (iso?: string | null) => {
  if (!iso) return "Not saved yet";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "Saved just now";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 10) return "Saved just now";
  if (seconds < 60) return `Saved ${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `Saved ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Saved ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Saved ${days}d ago`;
};

// Detect if a string is HTML (TipTap output) or plain markdown
const isHtmlContent = (s: string) => s.trimStart().startsWith("<");

export default function SubjectDocument() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const docId = (params?.docId as string) || "";
  const subject = SUBJECT_CATALOG.find((s) => s.id === subjectId);

  const [documents, setDocuments] = useState<SubjectDocumentItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");          // HTML string (TipTap output)
  const [initialContent, setInitialContent] = useState<string | null>(null); // null = not loaded yet
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [docMissing, setDocMissing] = useState(false);

  const [mathOpen, setMathOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  const [userPrefs, setUserPrefs] = useState<{ grade?: string; hobbies?: string[]; learningStyle?: string }>({});
  const [helperMessages, setHelperMessages] = useState<ChatMessage[]>([]);
  const [helperInput, setHelperInput] = useState("");
  const [helperTyping, setHelperTyping] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const editorRef = useRef<RichEditorHandle>(null);
  const lastSavedRef = useRef<{ title: string; content: string }>({ title: "", content: "" });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      setUserPrefs(prefs || {});
    } catch { setUserPrefs({}); }
  }, []);

  useEffect(() => {
    if (!subject) return;
    setHelperMessages([{ role: "assistant", content: `Hey! Ask me anything about ${subject.label}. I can help with explanations, feedback, or checking your notes.` }]);
  }, [subject?.label]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!subjectId) return;
      const data = await subjectStore.getSubject(subjectId);
      if (!active) return;
      const docs = data.notes.documents || [];
      setDocuments(docs);
      const doc = docs.find((item) => item.id === docId);
      if (!doc) {
        setDocMissing(true);
        setTitle(subject ? `${subject.label} Notes` : "Untitled");
        setInitialContent("");
        setContent("");
        lastSavedRef.current = { title: "", content: "" };
        setLastSavedAt(data.notes.lastUpdated || null);
        return;
      }
      setDocMissing(false);
      const rawTitle = typeof doc.title === "string" ? doc.title : "";
      const rawContent = doc.content || "";
      setTitle(rawTitle);
      // If legacy markdown, wrap in a paragraph so TipTap can accept it gracefully
      // TipTap will just render it as plain text — better than crashing
      const html = isHtmlContent(rawContent) ? rawContent : (rawContent ? `<p>${rawContent.replace(/\n/g, "</p><p>")}</p>` : "");
      setContent(html);
      setInitialContent(html);
      lastSavedRef.current = { title: rawTitle, content: html };
      setLastSavedAt(doc.lastUpdated || data.notes.lastUpdated || null);
    };
    load();
    const handler = () => load();
    window.addEventListener("subjectDataUpdated", handler);
    return () => { active = false; window.removeEventListener("subjectDataUpdated", handler); };
  }, [subjectId, docId, subject?.label]);

  const canSave = title.trim().length > 0;

  useEffect(() => {
    if (!docId || docMissing || !canSave) { setIsSaving(false); return; }
    if (title === lastSavedRef.current.title && content === lastSavedRef.current.content) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setIsSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      await subjectStore.updateDocument(subjectId, docId, { title, content });
      lastSavedRef.current = { title, content };
      setIsSaving(false);
      setLastSavedAt(new Date().toISOString());
    }, 800);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [title, content, subjectId, docId, docMissing, canSave]);

  const stats = useMemo(() => {
    // Strip HTML tags to count words
    const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").length : 0;
    return { words, characters: text.length };
  }, [content]);

  // Toolbar actions — all go through TipTap editor chain
  const cmd = () => editorRef.current?.editor;

  const toolbarGroups = [
    [
      { label: "H1", icon: Heading1, action: () => cmd()?.chain().focus().toggleHeading({ level: 1 }).run() },
      { label: "H2", icon: Heading2, action: () => cmd()?.chain().focus().toggleHeading({ level: 2 }).run() },
      { label: "H3", icon: Heading3, action: () => cmd()?.chain().focus().toggleHeading({ level: 3 }).run() },
    ],
    [
      { label: "Bold", icon: Bold, action: () => cmd()?.chain().focus().toggleBold().run() },
      { label: "Italic", icon: Italic, action: () => cmd()?.chain().focus().toggleItalic().run() },
      { label: "Strike", icon: Strikethrough, action: () => cmd()?.chain().focus().toggleStrike().run() },
      { label: "Code", icon: Code, action: () => cmd()?.chain().focus().toggleCode().run() },
    ],
    [
      { label: "Bullet list", icon: List, action: () => cmd()?.chain().focus().toggleBulletList().run() },
      { label: "Ordered list", icon: ListOrdered, action: () => cmd()?.chain().focus().toggleOrderedList().run() },
      { label: "Task list", icon: CheckSquare, action: () => cmd()?.chain().focus().toggleTaskList().run() },
      { label: "Blockquote", icon: Quote, action: () => cmd()?.chain().focus().toggleBlockquote().run() },
    ],
    [
      { label: "Link", icon: LinkIcon, action: () => { const url = prompt("URL:"); if (url) cmd()?.chain().focus().setLink({ href: url }).run(); } },
      { label: "Image", icon: ImageIcon, action: () => { const url = prompt("Image URL:"); if (url) cmd()?.chain().focus().insertContent(`<img src="${url}" />`).run(); } },
      { label: "Table", icon: Table, action: () => cmd()?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      { label: "Divider", icon: Minus, action: () => cmd()?.chain().focus().setHorizontalRule().run() },
    ],
  ];

  const handleInsertMath = (latex: string, mode: "inline" | "block") => {
    setMathOpen(false);
    setTimeout(() => {
      editorRef.current?.insertMath(latex, mode);
    }, 50);
  };

  const handleInsertCode = (code: string, language: string) => {
    setCodeOpen(false);
    setTimeout(() => {
      editorRef.current?.insertCodeBlock(code, language);
    }, 50);
  };

  const handleHelperSend = async () => {
    if (!helperInput.trim() || helperTyping) return;
    const userMessage: ChatMessage = { role: "user", content: helperInput.trim() };
    setHelperMessages((prev) => [...prev, userMessage]);
    setHelperInput("");
    setHelperTyping(true);

    // Strip HTML tags and truncate to keep context within token limits
    const docText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const pageContext = [
      `Subject: ${subject?.label || "Unknown"}`,
      `Document title: ${title.trim() || "Untitled"}`,
      `Document content:\n${docText.slice(0, 3000) || "(empty document)"}`,
      docText.length > 3000 ? `[…content truncated, ${docText.length} characters total]` : "",
    ].filter(Boolean).join("\n");

    const history = [...helperMessages, userMessage].slice(-8);
    try {
      const response = await getGroqCompletion(history, {
        subjects: [subjectId], hobbies: userPrefs.hobbies || [],
        grade: userPrefs.grade, learningStyle: userPrefs.learningStyle || "visual",
        responseLength: 2, analogyIntensity: 0.2,
        pageContext,
      });
      setHelperMessages((prev) => [...prev, response]);
    } catch {
      setHelperMessages((prev) => [...prev, { role: "assistant", content: "I couldn't reach the AI service. Try again in a moment." }]);
    } finally {
      setHelperTyping(false);
    }
  };

  if (!subject) return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <FileText className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-black text-foreground mb-2">Subject not found</h2>
      <Button onClick={() => router.push("/subjects")}>Go back to subjects</Button>
    </div>
  );

  if (!docId || docMissing) return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <FileText className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-black text-foreground mb-2">Document not found</h2>
      <Button onClick={() => router.push(`/subjects/${subjectId}`)}>Go back to subject</Button>
    </div>
  );

  const initials = subject.label.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6">
      {/* Math dialog */}
      <Dialog open={mathOpen} onOpenChange={(o) => { if (!o) setMathOpen(false); }}>
        <DialogContent className="sm:max-w-md glass-card border-border/40">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Insert Math</DialogTitle>
          </DialogHeader>
          <MathInput onInsert={handleInsertMath} onClose={() => setMathOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Code dialog */}
      <Dialog open={codeOpen} onOpenChange={(o) => { if (!o) setCodeOpen(false); }}>
        <DialogContent className="sm:max-w-lg glass-card border-border/40">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Insert Code Block</DialogTitle>
          </DialogHeader>
          <CodeBlockInput onInsert={handleInsertCode} onClose={() => setCodeOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => router.push(`/subjects/${subjectId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Subject documents</p>
          <h1 className="text-2xl font-black text-foreground">{subject.label}</h1>
        </div>
      </div>

      <motion.section className="space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Document header */}
        <div className="rounded-[2rem] border border-border/40 bg-background/70 overflow-hidden">
          <div className="h-16 bg-gradient-to-r from-primary/10 via-transparent to-transparent" />
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl border border-border/40 bg-muted/40 flex items-center justify-center text-lg font-black text-foreground">{initials || "ND"}</div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Document</p>
                  <h2 className="text-2xl font-black text-foreground">{title || "Untitled"}</h2>
                </div>
              </div>
              <div className="text-right text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {!canSave ? "Add a title to save" : isSaving ? "Saving..." : formatSavedLabel(lastSavedAt)}
              </div>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled"
              className={cn("h-14 text-3xl font-black tracking-tight bg-transparent border-none shadow-none px-0 focus-visible:ring-0", !canSave && "text-muted-foreground")}
            />
            <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              <div className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary" />Autosave on</div>
              <span>{stats.words} words</span>
              <span>{stats.characters} characters</span>
            </div>
          </div>
        </div>

        {/* Editor card */}
        <div className="rounded-[2rem] border border-border/40 bg-background/60 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-3 border-b border-border/40 bg-muted/20">
            {toolbarGroups.map((group, gi) => (
              <div key={gi} className="flex items-center gap-1">
                {group.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    title={item.label}
                    onMouseDown={(e) => { e.preventDefault(); item.action(); }}
                    className="h-8 w-8 rounded-lg border border-transparent bg-background/40 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-all flex items-center justify-center"
                  >
                    <item.icon className="w-3.5 h-3.5" />
                  </button>
                ))}
                <span className="h-5 w-px bg-border/40 mx-0.5" />
              </div>
            ))}

            {/* Math */}
            <button
              type="button"
              title="Insert Math (⌘M)"
              onMouseDown={(e) => { e.preventDefault(); setMathOpen(true); }}
              className="h-8 px-2.5 rounded-lg border border-transparent bg-background/40 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <Sigma className="w-3.5 h-3.5" />
              <span>Math</span>
            </button>

            {/* Code block */}
            <button
              type="button"
              title="Insert Code Block"
              onMouseDown={(e) => { e.preventDefault(); setCodeOpen(true); }}
              className="h-8 px-2.5 rounded-lg border border-transparent bg-background/40 hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <Braces className="w-3.5 h-3.5" />
              <span>Code</span>
            </button>
          </div>

          {/* Rich editor — only mount once initialContent is loaded */}
          <div className="p-6 sm:p-8">
            {initialContent !== null ? (
              <RichEditor
                ref={editorRef}
                initialContent={initialContent}
                onChange={setContent}
                placeholder="Start writing… select text to format, or use the toolbar above."
              />
            ) : (
              <div className="min-h-[55vh] flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Floating AI chat */}
      <div className="fixed bottom-6 right-6 z-50">
        {!chatOpen ? (
          <button type="button" onClick={() => setChatOpen(true)} className="h-14 w-14 rounded-full gradient-primary shadow-2xl flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </button>
        ) : (
          <div className="w-80 sm:w-96 h-[460px] glass-card p-4 flex flex-col border border-border/50 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><MessageCircle className="w-4 h-4 text-primary" /></div>
                <div>
                  <h3 className="text-sm font-black text-foreground">AI Helper</h3>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Your personal assistant</p>
                </div>
              </div>
              <button type="button" onClick={() => setChatOpen(false)} className="h-8 w-8 rounded-full border border-border/40 bg-background/40 hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {helperMessages.map((msg, i) => (
                <div key={i} className={cn("p-3 rounded-2xl text-xs leading-relaxed", msg.role === "assistant" ? "bg-muted/40 text-foreground" : "bg-primary/10 text-primary ml-6")}>
                  {msg.content}
                </div>
              ))}
              {helperTyping && <div className="p-3 rounded-2xl text-xs bg-muted/30 text-muted-foreground">Thinking...</div>}
            </div>
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border/40">
              <Input placeholder="Ask about this document..." value={helperInput} onChange={(e) => setHelperInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleHelperSend(); }} className="bg-muted/30 border-none h-10 rounded-xl text-sm" />
              <Button onClick={handleHelperSend} size="icon" className="h-10 w-10 rounded-xl gradient-primary"><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
