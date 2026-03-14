"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, Sparkles, Bold, Italic, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote,
  Link as LinkIcon, Image as ImageIcon, Table, Minus, Sigma,
  MessageCircle, Send, X, Braces, BookOpen, Brain, HelpCircle, Layers,
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { subjectStore, type SubjectDocumentItem } from "@/utils/subjectStore";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getGroqCompletion } from "@/services/groq";
import type { ChatMessage } from "@/types/chat";
import MathInput from "@/components/MathInput";
import CodeBlockInput from "@/components/CodeBlockInput";
import RichEditor, { type RichEditorHandle } from "@/components/RichEditor";
import StudyGuideView, { decodeStudyGuide, encodeStudyGuide } from "@/components/StudyGuideView";
import type { GeneratedStudyGuide } from "@/services/groq";
import { useTabs } from "@/context/TabsContext";

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

const isHtmlContent = (s: string) => s.trimStart().startsWith("<");

// ── Tabs ──────────────────────────────────────────────────────────────────────
type DocTab = "guide" | "notes" | "flashcards" | "quiz";

const TABS: { id: DocTab; label: string; icon: React.ElementType; studyGuideOnly?: boolean }[] = [
  { id: "guide",      label: "Study Guide",  icon: BookOpen,     studyGuideOnly: true  },
  { id: "notes",      label: "Notes",        icon: FileText                            },
  { id: "flashcards", label: "Flashcards",   icon: Layers                              },
  { id: "quiz",       label: "Quiz",         icon: HelpCircle                          },
];

export default function SubjectDocument() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const docId = (params?.docId as string) || "";
  const subject = SUBJECT_CATALOG.find((s) => s.id === subjectId);

  const [documents, setDocuments]     = useState<SubjectDocumentItem[]>([]);
  const [title, setTitle]             = useState("");
  const [content, setContent]         = useState("");
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [isSaving, setIsSaving]       = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [docMissing, setDocMissing]   = useState(false);
  const [studyGuide, setStudyGuide]   = useState<GeneratedStudyGuide | null>(null);
  const [activeTab, setActiveTab]     = useState<DocTab>("notes");
  const hasSetInitialTab = useRef(false);

  const [mathOpen, setMathOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  const [userPrefs, setUserPrefs] = useState<{ grade?: string; hobbies?: string[]; learningStyle?: string }>({});
  const [helperMessages, setHelperMessages] = useState<ChatMessage[]>([]);
  const [helperInput, setHelperInput]       = useState("");
  const [helperTyping, setHelperTyping]     = useState(false);
  const [chatOpen, setChatOpen]             = useState(false);
  const { updateActiveTabLabel } = useTabs();
  const [isInserting, setIsInserting]       = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const editorRef      = useRef<RichEditorHandle>(null);
  const lastSavedRef   = useRef<{ title: string; content: string }>({ title: "", content: "" });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      setUserPrefs(prefs || {});
    } catch { setUserPrefs({}); }
  }, []);

  useEffect(() => {
    if (!subject) return;
    setHelperMessages([{
      role: "assistant",
      content: `Hey! Ask me anything about ${subject.label}. I can explain concepts, check your notes, or quiz you.`,
    }]);
  }, [subject?.label]);

  // Track whether this is the very first load so we can set the tab once
  const isFirstLoad = useRef(true);
  // Track the last remote content we loaded so we only apply real changes
  const lastRemoteContent = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async (isExternal = false) => {
      console.log("[SubjectDocument] load called, isExternal:", isExternal, "subjectId:", subjectId, "docId:", docId);
      if (!subjectId) return;
      const data = await subjectStore.getSubject(subjectId);
      console.log("[SubjectDocument] fetched data, documents count:", data.notes.documents?.length || 0);
      if (!active) return;
      const docs = data.notes.documents || [];
      setDocuments(docs);
      const doc = docs.find((item) => item.id === docId);
      console.log("[SubjectDocument] found doc:", doc ? doc.title : "not found");
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
      const rawTitle   = typeof doc.title === "string" ? doc.title : "";
      const rawContent = doc.content || "";

      // Update the app-level tab label to show the document title
      if (rawTitle) updateActiveTabLabel(rawTitle, "📄");

      // On external updates (agent edits), skip if content hasn't changed remotely
      if (isExternal && rawContent === lastRemoteContent.current) {
        console.log("[SubjectDocument] skipping update, content unchanged");
        return;
      }
      console.log("[SubjectDocument] content changed, updating state");
      lastRemoteContent.current = rawContent;

      setTitle(rawTitle);
      const parsed = decodeStudyGuide(rawContent);
      if (parsed) {
        // Always update the study guide data so the UI reflects the edit
        setStudyGuide(parsed);
        setContent(rawContent);
        setInitialContent(rawContent);
        // Only set tab on the very first load
        if (isFirstLoad.current) setActiveTab("guide");
        lastSavedRef.current = { title: rawTitle, content: rawContent };
        setLastSavedAt(doc.lastUpdated || data.notes.lastUpdated || null);
        isFirstLoad.current = false;
        return;
      }
      const html = isHtmlContent(rawContent) ? rawContent : (rawContent ? `<p>${rawContent.replace(/\n/g, "</p><p>")}</p>` : "");
      setContent(html);
      setInitialContent(html);
      if (isFirstLoad.current) setActiveTab("notes");
      lastSavedRef.current = { title: rawTitle, content: html };
      setLastSavedAt(doc.lastUpdated || data.notes.lastUpdated || null);
      isFirstLoad.current = false;
    };
    isFirstLoad.current = true;
    lastRemoteContent.current = null;
    load(false);
    // Handler for generic refresh (no payload) — re-fetches from Supabase
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { results?: Array<Record<string, unknown>> } | undefined;

      // If the event carries an update_document result for THIS doc, apply
      // the new content directly — skipping the Supabase re-read entirely.
      // This mirrors Notion's optimistic-update pattern: local state is
      // mutated instantly so the editor always shows the latest version.
      if (detail?.results) {
        const docUpdate = detail.results.find(
          (r) =>
            (r.type === "update_document" || r.type === "update_study_guide" || r.type === "replace_study_guide") &&
            r.success === true &&
            r.subjectId === subjectId &&
            r.docId === docId
        );
        if (docUpdate && typeof docUpdate.newContent === "string") {
          const raw = docUpdate.newContent as string;
          const parsed = decodeStudyGuide(raw);
          if (parsed) {
            setStudyGuide(parsed);
            setContent(raw);
            setInitialContent(raw);
            lastSavedRef.current = { title, content: raw };
            lastRemoteContent.current = raw;
          } else {
            const html = isHtmlContent(raw) ? raw : (raw ? `<p>${raw.replace(/\n/g, "</p><p>")}</p>` : "");
            setContent(html);
            setInitialContent(html);
            lastSavedRef.current = { title, content: html };
            lastRemoteContent.current = html;
          }
          return; // no need to re-fetch
        }
      }

      load(true);
    };
    window.addEventListener("subjectDataUpdated", handler);
    return () => { active = false; window.removeEventListener("subjectDataUpdated", handler); };
  }, [subjectId, docId, subject?.label]);

  const canSave = title.trim().length > 0;

  const handleStartQuiz = useCallback(() => {
    try {
      const cached = localStorage.getItem(`docQuiz:${docId}`);
      if (cached) sessionStorage.setItem("pendingQuiz", cached);
    } catch {
      // Ignore storage errors
    }
    router.push(`/quiz?subjectId=${subjectId}&docId=${docId}`);
  }, [docId, router, subjectId]);

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

  const handleStudyGuideChange = useCallback((updated: GeneratedStudyGuide) => {
    setStudyGuide(updated);
    setContent(encodeStudyGuide(updated));
  }, []);

  const stats = useMemo(() => {
    const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").length : 0;
    return { words };
  }, [content]);

  const cmd = () => editorRef.current?.editor;

  const toolbarGroups = [
    [
      { label: "H1", icon: Heading1, action: () => cmd()?.chain().focus().toggleHeading({ level: 1 }).run() },
      { label: "H2", icon: Heading2, action: () => cmd()?.chain().focus().toggleHeading({ level: 2 }).run() },
      { label: "H3", icon: Heading3, action: () => cmd()?.chain().focus().toggleHeading({ level: 3 }).run() },
    ],
    [
      { label: "Bold",   icon: Bold,          action: () => cmd()?.chain().focus().toggleBold().run()        },
      { label: "Italic", icon: Italic,        action: () => cmd()?.chain().focus().toggleItalic().run()      },
      { label: "Strike", icon: Strikethrough, action: () => cmd()?.chain().focus().toggleStrike().run()      },
      { label: "Code",   icon: Code,          action: () => cmd()?.chain().focus().toggleCode().run()        },
    ],
    [
      { label: "Bullet list",   icon: List,          action: () => cmd()?.chain().focus().toggleBulletList().run()   },
      { label: "Ordered list",  icon: ListOrdered,   action: () => cmd()?.chain().focus().toggleOrderedList().run()  },
      { label: "Task list",     icon: CheckSquare,   action: () => cmd()?.chain().focus().toggleTaskList().run()     },
      { label: "Blockquote",    icon: Quote,         action: () => cmd()?.chain().focus().toggleBlockquote().run()   },
    ],
    [
      { label: "Link",    icon: LinkIcon,  action: () => { const u = prompt("URL:"); if (u) cmd()?.chain().focus().setLink({ href: u }).run(); } },
      { label: "Image",   icon: ImageIcon, action: () => { const u = prompt("Image URL:"); if (u) cmd()?.chain().focus().insertContent(`<img src="${u}" />`).run(); } },
      { label: "Table",   icon: Table,     action: () => cmd()?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
      { label: "Divider", icon: Minus,     action: () => cmd()?.chain().focus().setHorizontalRule().run() },
    ],
  ];

  const handleInsertMath = (latex: string, mode: "inline" | "block") => {
    setMathOpen(false);
    setTimeout(() => editorRef.current?.insertMath(latex, mode), 50);
  };

  const handleInsertCode = (code: string, language: string) => {
    setCodeOpen(false);
    setTimeout(() => editorRef.current?.insertCodeBlock(code, language), 50);
  };

  const handleHelperSend = async (insertIntoDoc = false) => {
    if (!helperInput.trim() || helperTyping) return;
    
    const userMessage: ChatMessage = { role: "user", content: helperInput.trim() };
    setHelperMessages((prev) => [...prev, userMessage]);
    setHelperInput("");
    setHelperTyping(true);
    
    const docText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const pageContext = [
      `Subject: ${subject?.label || "Unknown"}`,
      `Document title: ${title.trim() || "Untitled"}`,
      `Document content:\n${docText.slice(0, 3000) || "(empty document)"}`,
    ].filter(Boolean).join("\n");
    
    const history = [...helperMessages, userMessage].slice(-8);
    
    if (insertIntoDoc) {
      // Streaming insertion into document
      setIsInserting(true);
      abortControllerRef.current = new AbortController();
      
      try {
        const response = await fetch("/api/groq/doc-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            messages: history,
            userContext: {
              subjects: [subjectId],
              hobbies: userPrefs.hobbies || [],
              grade: userPrefs.grade,
              learningStyle: userPrefs.learningStyle || "visual",
              responseLength: 2,
              analogyIntensity: 0.2,
              pageContext,
            },
          }),
        });

        if (!response.ok) throw new Error("AI service unavailable");
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.choices?.[0]?.delta?.content) {
                accumulatedContent += parsed.choices[0].delta.content;
              }
            } catch {
              // Non-JSON or malformed, treat as raw content
              if (data && data !== "[DONE]") {
                accumulatedContent += data;
              }
            }
          }
        }

        // Insert the accumulated content into the editor
        if (accumulatedContent && editorRef.current?.editor) {
          const editor = editorRef.current.editor;
          // Insert at cursor position or at end
          const pos = editor.state.selection.from;
          editor.chain().focus().insertContentAt(pos, accumulatedContent).run();
        }

      } catch (error: any) {
        if (error?.name !== "AbortError") {
          setHelperMessages((prev) => [...prev, { 
            role: "assistant", 
            content: "I couldn't reach the AI service. Try again in a moment." 
          }]);
        }
      } finally {
        setIsInserting(false);
        abortControllerRef.current = null;
      }
    } else {
      // Standard chat response (non-streaming for backward compatibility)
      try {
        const response = await getGroqCompletion(history, {
          subjects: [subjectId], hobbies: userPrefs.hobbies || [],
          grade: userPrefs.grade, learningStyle: userPrefs.learningStyle || "visual",
          responseLength: 2, analogyIntensity: 0.2, pageContext,
        });
        setHelperMessages((prev) => [...prev, response]);
      } catch {
        setHelperMessages((prev) => [...prev, { role: "assistant", content: "I couldn't reach the AI service. Try again in a moment." }]);
      } finally {
        setHelperTyping(false);
      }
    }
  };

  if (!subject) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
      <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
      <h2 className="text-xl font-black text-foreground mb-2">Subject not found</h2>
      <Button onClick={() => router.push("/subjects")} size="sm">Go back to subjects</Button>
    </div>
  );

  if (!docId || docMissing) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
      <FileText className="w-12 h-12 text-muted-foreground/20 mb-4" />
      <h2 className="text-xl font-black text-foreground mb-2">Document not found</h2>
      <Button onClick={() => router.push(`/subjects/${subjectId}`)} size="sm">Go back</Button>
    </div>
  );

  // Visible tabs — if it's a study guide, show all 4; otherwise hide the guide tab
  const visibleTabs = studyGuide ? TABS : TABS.filter(t => !t.studyGuideOnly);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-full"
    >
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

      {/* ── TOP BAR: breadcrumb + save status ─────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-4xl mx-auto px-8 h-11 flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <button
              onClick={() => router.push(`/subjects/${subjectId}`)}
              className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              {subject.label}
            </button>
            <span className="text-muted-foreground/30">/</span>
            <span className="truncate text-foreground/70">{title || "Untitled"}</span>
          </div>

          {/* Save status */}
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40 shrink-0">
            {!canSave ? "Title required to save" : isSaving ? "Saving…" : formatSavedLabel(lastSavedAt)}
          </span>
        </div>
      </div>

      {/* ── DOCUMENT HEADER ───────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto w-full px-8 pt-10 pb-2">
        <div className="flex items-start gap-4 mb-6">
          {/* Subject colour dot + icon */}
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
            <BookOpen className="w-4.5 h-4.5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            {studyGuide ? (
              <h1 className="text-3xl font-black text-foreground leading-tight font-display">{title}</h1>
            ) : (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled document"
                className="h-auto text-3xl font-black tracking-tight bg-transparent border-none shadow-none px-0 py-0 focus-visible:ring-0 text-foreground font-display placeholder:text-muted-foreground/25"
              />
            )}
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground/50">
              <span className="px-2 py-0.5 rounded-md bg-muted/50 font-semibold">{subject.label}</span>
              {!studyGuide && <span>{stats.words} words</span>}
              <span className="flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-primary/50" />
                Autosave
              </span>
            </div>
          </div>
        </div>

        {/* ── TAB BAR ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0.5 border-b border-border/50">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all relative -mb-px rounded-t-lg",
                  isActive
                    ? "text-foreground bg-background border border-border/50 border-b-background"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/30"
                )}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB CONTENT ───────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-8 py-8">
        <AnimatePresence mode="wait">
          {/* STUDY GUIDE TAB */}
          {activeTab === "guide" && studyGuide && (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <StudyGuideView guide={studyGuide} onChange={handleStudyGuideChange} />
            </motion.div>
          )}

          {/* NOTES TAB */}
          {activeTab === "notes" && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-0.5 mb-5 pb-4 border-b border-border/40">
                {toolbarGroups.map((group, gi) => (
                  <div key={gi} className="flex items-center gap-0.5">
                    {group.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        title={item.label}
                        onMouseDown={(e) => { e.preventDefault(); item.action(); }}
                        className="h-7 w-7 rounded-md hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground transition-all flex items-center justify-center"
                      >
                        <item.icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                    {gi < toolbarGroups.length - 1 && (
                      <span className="h-4 w-px bg-border/50 mx-1" />
                    )}
                  </div>
                ))}
                <span className="h-4 w-px bg-border/50 mx-1" />
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setMathOpen(true); }}
                  className="h-7 px-2 rounded-md hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground transition-all flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Sigma className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setCodeOpen(true); }}
                  className="h-7 px-2 rounded-md hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground transition-all flex items-center gap-1.5 text-xs font-semibold"
                >
                  <Braces className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Editor canvas */}
              <div className="min-h-[65vh]">
                {initialContent !== null ? (
                  <RichEditor
                    ref={editorRef}
                    initialContent={studyGuide ? "" : initialContent}
                    onChange={setContent}
                    placeholder="Start writing… or type /ai for AI help."
                    subject={subject?.label}
                  />
                ) : (
                  <div className="min-h-[55vh] flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* FLASHCARDS TAB — placeholder */}
          {activeTab === "flashcards" && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center"
            >
              <Layers className="w-12 h-12 text-muted-foreground/15 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1">Flashcards</h3>
              <p className="text-sm text-muted-foreground/60 mb-6 max-w-xs">
                Generate a flashcard deck from this document to drill the key concepts.
              </p>
              <Button
                size="sm"
                className="gradient-primary"
                onClick={() => router.push(`/flashcards?subjectId=${subjectId}&docId=${docId}`)}
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                Go to Flashcards
              </Button>
            </motion.div>
          )}

          {/* QUIZ TAB — placeholder */}
          {activeTab === "quiz" && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center"
            >
              <HelpCircle className="w-12 h-12 text-muted-foreground/15 mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-1">Quiz yourself</h3>
              <p className="text-sm text-muted-foreground/60 mb-6 max-w-xs">
                Test your knowledge on the material in this document.
              </p>
              <Button
                size="sm"
                className="gradient-primary"
                onClick={handleStartQuiz}
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                Start a Quiz
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Floating AI chat ────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50">
        {!chatOpen ? (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="h-12 w-12 rounded-2xl gradient-primary shadow-xl shadow-primary/20 flex items-center justify-center"
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </button>
        ) : (
          <div className="w-80 sm:w-96 h-[440px] rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">AI Helper</h3>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">{subject.label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="h-7 w-7 rounded-lg hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {helperMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "px-3 py-2.5 rounded-xl text-xs leading-relaxed",
                    msg.role === "assistant"
                      ? "bg-muted/40 text-foreground"
                      : "bg-primary/10 text-primary ml-8"
                  )}
                >
                  <MarkdownRenderer content={msg.content} className="text-xs" />
                </div>
              ))}
              {helperTyping && (
                <div className="px-3 py-2.5 rounded-xl text-xs bg-muted/30 text-muted-foreground flex items-center gap-1.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              )}
              {isInserting && (
                <div className="px-3 py-2.5 rounded-xl text-xs bg-primary/10 text-primary flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <span>Inserting into document…</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border/30">
              <Input
                placeholder="Ask anything…"
                value={helperInput}
                onChange={(e) => setHelperInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleHelperSend(false); }}
                className="bg-muted/30 border-none h-9 rounded-xl text-sm"
              />
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => handleHelperSend(true)}
                  size="sm"
                  disabled={helperTyping || isInserting}
                  className="h-9 px-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                  title="Insert into document"
                >
                  <FileText className="w-3.5 h-3.5" />
                </Button>
                <Button
                  onClick={() => handleHelperSend(false)}
                  size="icon"
                  disabled={helperTyping || isInserting}
                  className="h-9 w-9 rounded-xl gradient-primary shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
