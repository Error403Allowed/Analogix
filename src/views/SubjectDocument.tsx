"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, FileText, Sparkles,
  MessageCircle, Send, X, BookOpen, HelpCircle, Layers,
  Volume2, VolumeX, Pause, Play,
} from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { subjectStore, type SubjectDocumentItem } from "@/utils/subjectStore";
import { studyGuideToHtml } from "@/utils/studyGuideHtml";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getGroqCompletion } from "@/services/groq";
import type { ChatMessage } from "@/types/chat";
import RichEditor, { type RichEditorHandle } from "@/components/RichEditor";
import { decodeStudyGuide } from "@/components/StudyGuideView";
import { useTabs } from "@/context/TabsContext";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

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
type DocTab = "notes";

const TABS: { id: DocTab; label: string; icon: React.ElementType }[] = [
  { id: "notes", label: "Document", icon: FileText },
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
  const [activeTab, setActiveTab]     = useState<DocTab>("notes");

  const [userPrefs, setUserPrefs] = useState<{ grade?: string; hobbies?: string[]; learningStyle?: string }>({});
  const [helperMessages, setHelperMessages] = useState<ChatMessage[]>([]);
  const [helperInput, setHelperInput]       = useState("");
  const [helperTyping, setHelperTyping]     = useState(false);
  const [chatOpen, setChatOpen]             = useState(false);
  const { updateTabLabelByPath } = useTabs();
  const [isInserting, setIsInserting]       = useState(false);
  const [usePageContext, setUsePageContext]  = useState(true);
  const [extraContext, setExtraContext]      = useState("");
  const [showExtraContext, setShowExtraContext] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const editorRef      = useRef<RichEditorHandle>(null);
  const lastSavedRef   = useRef<{ title: string; content: string }>({ title: "", content: "" });
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Text-to-speech for reading the document
  const { isSpeaking, isPaused, supported: ttsSupported, speak, pause, resume, stop } = useTextToSpeech();
  const [showTTSControls, setShowTTSControls] = useState(false);

  const handleListenToDocument = useCallback(() => {
    if (!content) return;
    
    // Strip HTML tags for speech
    const textContent = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    
    if (isSpeaking && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    } else if (isSpeaking && isPaused) {
      resume();
    } else {
      speak(textContent, { rate: 1.0, pitch: 1.0 });
      setShowTTSControls(true);
    }
  }, [content, isSpeaking, isPaused, speak, pause, resume]);

  const handleStopListening = useCallback(() => {
    stop();
    setShowTTSControls(false);
  }, [stop]);

  useEffect(() => {
    return () => {
      // Cleanup TTS on unmount
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
      const rawTitle   = typeof doc.title === "string" ? doc.title : "";
      const rawContent = doc.content || "";

      // Wait a tick for the tab to be created by DashLayout
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Update the app-level tab label to show the document title
      if (rawTitle) {
        updateTabLabelByPath(`/subjects/${subjectId}/document/${docId}`, rawTitle, "📄");
      }

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
        const html = studyGuideToHtml(parsed);
      setContent(html);
      setInitialContent(html);
        if (isFirstLoad.current) setActiveTab("notes");
        // Force autosave to persist conversion to editable HTML
        lastSavedRef.current = { title: rawTitle, content: rawContent };
        setLastSavedAt(doc.lastUpdated || data.notes.lastUpdated || null);
        isFirstLoad.current = false;
        // Render LaTeX after study guide is loaded
        setTimeout(() => editorRef.current?.renderLaTeX(), 100);
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
            const html = studyGuideToHtml(parsed);
            setActiveTab("notes");
            setContent(html);
            setInitialContent(html);
            lastSavedRef.current = { title, content: raw };
            lastRemoteContent.current = raw;
            // Render LaTeX after study guide update
            setTimeout(() => editorRef.current?.renderLaTeX(), 100);
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

  const stats = useMemo(() => {
    const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").length : 0;
    return { words };
  }, [content]);

  // Stream text from doc-chat and return the full accumulated string
  const streamDocChat = async (
    history: ChatMessage[],
    pageContext: string,
    signal: AbortSignal,
  ): Promise<string> => {
    const response = await fetch("/api/groq/doc-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
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
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.choices?.[0]?.delta?.content) accumulated += parsed.choices[0].delta.content;
        } catch { /* skip malformed chunks */ }
      }
    }
    return accumulated;
  };

  const handleHelperSend = async (insertIntoDoc = false) => {
    if (!helperInput.trim() || helperTyping) return;

    // Capture input BEFORE clearing — used throughout this function
    const requestText = helperInput.trim();

    const userMessage: ChatMessage = { role: "user", content: requestText };
    setHelperMessages((prev) => [...prev, userMessage]);
    setHelperInput("");
    setHelperTyping(true);

    const history = [...helperMessages, userMessage].slice(-8);

    // Page context for chat replies — respects the user's context toggle
    const docText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const autoContext = usePageContext
      ? `Subject: ${subject?.label}\nDocument: ${title}\n\n${docText.slice(0, 3000)}`
      : `Subject: ${subject?.label}`;
    const pageContext = extraContext.trim()
      ? `${autoContext}\n\nAdditional context provided by user:\n${extraContext.trim()}`
      : autoContext;

    if (insertIntoDoc) {
      setIsInserting(true);
      abortControllerRef.current = new AbortController();

      try {
        // ── Document: stream from doc-chat and insert HTML into TipTap ─
        const text = await streamDocChat(history, pageContext, abortControllerRef.current.signal);
        const editor = editorRef.current?.editor;
        if (text && editor) {
          const html = text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/`(.*?)`/g, "<code>$1</code>")
            .replace(/^# (.+)$/gm, "<h1>$1</h1>")
            .replace(/^## (.+)$/gm, "<h2>$1</h2>")
            .replace(/^### (.+)$/gm, "<h3>$1</h3>")
            .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
            .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
            .replace(/\n\n/g, "</p><p>")
            .replace(/^([^<\n].+)$/gm, "<p>$1</p>")
            .replace(/<p><\/p>/g, "")
            .trim();
          editor.chain().focus().insertContent(html || text).run();
          toast.success("Inserted into your document!");
          setHelperMessages((prev) => [...prev, { role: "assistant", content: "Inserted into your document." }]);
        } else if (text) {
          setHelperMessages((prev) => [...prev, { role: "assistant", content: text }]);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          setHelperMessages((prev) => [...prev, {
            role: "assistant",
            content: "Couldn't reach the AI service. Try again in a moment.",
          }]);
        }
      } finally {
        setIsInserting(false);
        abortControllerRef.current = null;
        setHelperTyping(false);
      }

    } else {
      // ── Standard chat reply ───────────────────────────────────────────
      try {
        const response = await getGroqCompletion(history, {
          subjects: [subjectId], hobbies: userPrefs.hobbies || [],
          grade: userPrefs.grade, learningStyle: userPrefs.learningStyle || "visual",
          responseLength: 2, analogyIntensity: 0.2, pageContext,
        });
        setHelperMessages((prev) => [...prev, response]);
      } catch {
        setHelperMessages((prev) => [...prev, { role: "assistant", content: "Couldn't reach the AI service. Try again in a moment." }]);
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

  const visibleTabs = TABS;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-full"
    >
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
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled document"
              className="h-auto text-3xl font-black tracking-tight bg-transparent border-none shadow-none px-0 py-0 focus-visible:ring-0 text-foreground font-display placeholder:text-muted-foreground/25"
            />
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground/50">
              <span className="px-2 py-0.5 rounded-md bg-muted/50 font-semibold">{subject.label}</span>
              <span>{stats.words} words</span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-primary/50" />
                Autosave
              </span>
              {ttsSupported && (
                <button
                  onClick={isSpeaking ? handleStopListening : handleListenToDocument}
                  className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  title={isSpeaking ? "Stop reading" : "Read document aloud"}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-2.5 h-2.5" />
                      <span className="font-semibold">Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-2.5 h-2.5" />
                      <span className="font-semibold">Listen</span>
                    </>
                  )}
                </button>
              )}
              {isSpeaking && (
                <button
                  onClick={isPaused ? resume : pause}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  title={isPaused ? "Resume" : "Pause"}
                >
                  {isPaused ? (
                    <Play className="w-2.5 h-2.5" />
                  ) : (
                    <Pause className="w-2.5 h-2.5" />
                  )}
                </button>
              )}
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
          {/* NOTES TAB */}
          {activeTab === "notes" && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Editor canvas */}
              <div className="min-h-[65vh]">
                {initialContent !== null ? (
                  <RichEditor
                    ref={editorRef}
                    initialContent={initialContent}
                    onChange={setContent}
                    placeholder="Start writing… or type / for commands."
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
            {/* ── Context bar ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setUsePageContext(v => !v)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors",
                    usePageContext
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted/40 text-muted-foreground/50 border border-border/30"
                  )}
                  title={usePageContext ? "Include this document in AI context" : "Exclude this document from AI context"}
                >
                  <span className="text-xs">{usePageContext ? "📄" : "○"}</span>
                  {usePageContext ? "Include document" : "No document context"}
                </button>
                <button
                  onClick={() => setShowExtraContext(v => !v)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors"
                >
                  <span className="text-xs">＋</span> Add context
                </button>
              </div>
              {showExtraContext && (
                <textarea
                  value={extraContext}
                  onChange={e => setExtraContext(e.target.value)}
                  placeholder="Paste extra context here (e.g. syllabus notes, rubric details)…"
                  rows={3}
                  className="w-full text-xs bg-muted/30 border border-border/40 rounded-lg px-2.5 py-2 resize-none outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground/30"
                />
              )}
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
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleHelperSend(false); }}
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
                  title="Send message"
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
