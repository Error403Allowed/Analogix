"use client";

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpenText,
  FileText,
  Loader2,
  Pause,
  Play,
  Sparkles,
  Volume2,
  Wand2,
  MoreHorizontal,
  ChevronRight,
  Plus,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { useTabs } from "@/context/TabsContext";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { subjectStore } from "@/utils/subjectStore";
import type { GeneratedStudyGuide } from "@/services/groq";
import { generateStudyGuide } from "@/services/groq";
import type { BlockNoteHandle } from "@/components/BlockNoteEditor";
import {
  BN_PREFIX,
  isBNContent,
  serialiseBN,
} from "@/components/BlockNoteEditor";
import {
  createBlockNoteContentParser,
} from "@/components/blocknote/content";
import {
  type BlockNoteEditorBlock,
} from "@/components/blocknote/schema";
import {
  getDocumentPlainText,
  isStudyGuideDocument,
  type DocumentRole,
} from "@/lib/document-content";
import { pickStudyGuideTitle } from "@/utils/studyGuideGeneration";
import { studyGuideToMarkdown } from "@/utils/studyGuideMarkdown";
import { useDocumentCollaboration } from "@/hooks/useDocumentCollaboration";
import { EmojiPicker } from "@/components/EmojiPicker";
import { ShareDialog } from "@/components/ShareDialog";

type BlockNoteEditorComponent = typeof import("@/components/BlockNoteEditor").BlockNoteEditor;
type BlockNoteEditorProps = React.ComponentPropsWithoutRef<BlockNoteEditorComponent>;

const BlockNoteEditor = dynamic<BlockNoteEditorProps>(
  () => import("@/components/BlockNoteEditor").then((module) => module.BlockNoteEditor),
  { ssr: false },
) as BlockNoteEditorComponent;

interface SubjectDataUpdateResult {
  type: string;
  success?: boolean;
  docId?: string;
  subjectId?: string;
  newContent?: string;
}

interface SubjectDataUpdatedDetail {
  results?: SubjectDataUpdateResult[];
}

const formatSaved = (iso?: string | null) => {
  if (!iso) return "Not saved";
  const elapsedSeconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 10) return "Saved";
  if (elapsedSeconds < 60) return `Saved ${elapsedSeconds}s ago`;
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `Saved ${minutes}m ago`;
  return `Saved ${Math.floor(minutes / 60)}h ago`;
};

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

export default function SubjectDocument() {
  const params = useParams();
  const router = useRouter();
  const subjectId = (params?.id as string) || "";
  const docId = (params?.docId as string) || "";
  const subject = SUBJECT_CATALOG.find((entry) => entry.id === subjectId);
  const editorRef = useRef<BlockNoteHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef({ title: "", content: "" });
  const latestContentRef = useRef<string>("");
  const remoteVersionRef = useRef("");

  const [title, setTitle] = useState("");
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [documentRole, setDocumentRole] = useState<DocumentRole>("notes");
  const [studyGuideData, setStudyGuideData] = useState<GeneratedStudyGuide | null>(null);
  const [studyGuideMarkdown, setStudyGuideMarkdown] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [docMissing, setDocMissing] = useState(false);
  const [stats, setStats] = useState({ text: "", words: 0, characters: 0 });
  const [sidebarBusy, setSidebarBusy] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [userGrade, setUserGrade] = useState<string | undefined>(undefined);

  // useDocumentCollaboration is initialised with a stable empty doc until
  // initialContent is loaded from Supabase, then re-keyed via the BlockNote key.
  const collab = useDocumentCollaboration({
    documentId: docId,
    displayName: userGrade ? `Year ${userGrade}` : undefined,
  });
  // Mirror live values into the shape the rest of the UI already expects.
  const collaboration = useMemo(
    () => ({ status: collab.status, peerCount: collab.peerCount }),
    [collab.status, collab.peerCount],
  );

  const { updateTabLabelByPath } = useTabs();
  const { isSpeaking, isPaused, supported: ttsOk, speak, pause, resume, stop } = useTextToSpeech();

  // Flush a final Yjs snapshot to Supabase when the user navigates away.
  const flushRef = useRef(collab.flush);
  useEffect(() => { flushRef.current = collab.flush; }, [collab.flush]);
  useEffect(() => {
    return () => { flushRef.current().catch(console.warn); };
  }, []);

  const queueSave = useCallback(async (
    nextContent: string,
    nextTitle: string,
    role = documentRole,
    guideData = studyGuideData,
    guideMarkdown = studyGuideMarkdown,
  ) => {
    if (nextContent === lastSavedRef.current.content && nextTitle === lastSavedRef.current.title) {
      setIsSaving(false);
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setIsSaving(true);

    saveTimer.current = setTimeout(async () => {
      // For BlockNote, we store the serialised string in 'content'
      // and maybe also in 'contentJson' if we want to be compatible with existing schema.
      // But 'content' is better for serialised BlockNote strings (starting with __BN__).
      
      await subjectStore.updateDocument(subjectId, docId, {
        title: nextTitle,
        content: nextContent,
        role,
        studyGuideMarkdown: role === "study-guide" ? guideMarkdown ?? null : null,
        studyGuideData: role === "study-guide" ? guideData ?? null : null,
      });

      lastSavedRef.current = { title: nextTitle, content: nextContent };
      remoteVersionRef.current = nextContent;
      setIsSaving(false);
      setLastSaved(new Date().toISOString());
    }, 850);
  }, [docId, documentRole, studyGuideData, studyGuideMarkdown, subjectId]);

  useEffect(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem("userPreferences") || "{}");
      setUserGrade(typeof preferences.grade === "string" ? preferences.grade : undefined);
    } catch {
      setUserGrade(undefined);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const load = async (external = false) => {
      const data = await subjectStore.getSubject(subjectId);
      if (!active) return;

      const document = (data.notes.documents || []).find((entry) => entry.id === docId);
      if (!document) {
        setDocMissing(true);
        return;
      }

      const content = document.content || "";
      const role: DocumentRole = isStudyGuideDocument(document) ? "study-guide" : "notes";
      const remoteKey = content;

      if (external && remoteKey === remoteVersionRef.current && document.title === lastSavedRef.current.title) {
        return;
      }

      remoteVersionRef.current = remoteKey;
      lastSavedRef.current = { title: document.title || "", content };
      latestContentRef.current = content;
      setTitle(document.title || "");
      setIcon(document.icon || null);
      setCover(document.cover || null);
      setInitialContent(content);
      setDocumentRole(role);
      setStudyGuideData(document.studyGuideData || null);
      setStudyGuideMarkdown(document.studyGuideMarkdown || null);
      
      const plainText = getDocumentPlainText(document);
      setStats({
        text: plainText,
        words: wordCount(plainText),
        characters: plainText.length,
      });
      setLastSaved(document.lastUpdated || null);
      setDocMissing(false);

      if (document.title) {
        updateTabLabelByPath(`/subjects/${subjectId}/document/${docId}`, document.title, document.icon || (role === "study-guide" ? "📘" : "📄"));
      }
    };

    load(false);

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SubjectDataUpdatedDetail>).detail;
      if (detail?.results?.some((result) => result.success && result.docId === docId)) {
        load(true);
        return;
      }
      load(true);
    };

    window.addEventListener("subjectDataUpdated", handler);
    return () => {
      active = false;
      window.removeEventListener("subjectDataUpdated", handler);
    };
  }, [docId, subjectId, updateTabLabelByPath]);

  useEffect(() => {
    if (initialContent === null) return;
    latestContentRef.current = initialContent;
  }, [initialContent]);

  useEffect(() => {
    if (initialContent === null) return;
    queueSave(latestContentRef.current, title);
  }, [queueSave, title, initialContent]);

  const handleEditorChange = useCallback((raw: string) => {
    latestContentRef.current = raw;
    
    // Update stats periodically or on change
    if (editorRef.current) {
      const text = editorRef.current.getPlainText();
      setStats({
        text,
        characters: text.length,
        words: wordCount(text),
      });
    }
    
    queueSave(raw, title);
  }, [queueSave, title]);

  const appendMarkdownSection = useCallback((heading: string, markdown: string) => {
    if (!editorRef.current) return;

    editorRef.current.appendMarkdown(`## ${heading}\n\n${markdown}`);
  }, []);

  const runSidebarAction = useCallback(async (action: string, label: string, customPrompt?: string) => {
    const text = editorRef.current?.getPlainText().trim() || getDocumentPlainText({
      contentText: stats.text,
    });

    if (!text) {
      toast.error("Add some notes first.");
      return;
    }

    setSidebarBusy(action);

    try {
      const response = await fetch("/api/groq/document-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text,
          subject: subject?.label,
          documentText: text,
          customPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error("AI service unavailable");
      }

      const result = await response.json() as {
        content: string;
        format: "text" | "markdown";
      };

      appendMarkdownSection(
        label,
        result.format === "markdown" ? result.content : result.content.replace(/\n/g, "\n\n"),
      );
      toast.success(`${label} added to the document.`);
      setCustomInstruction("");
    } catch (issue: unknown) {
      toast.error(issue instanceof Error ? issue.message : "Could not run AI action");
    } finally {
      setSidebarBusy(null);
    }
  }, [appendMarkdownSection, stats.text, subject?.label]);

  const handleGenerateStudyGuide = useCallback(async () => {
    const text = editorRef.current?.getPlainText().trim() || stats.text;
    if (!text) {
      toast.error("Add some notes before generating a study guide.");
      return;
    }

    setSidebarBusy("study-guide");

    try {
      const result = await generateStudyGuide({
        assessmentDetails: text,
        fileName: title || `${subject?.label || "Notes"} Study Guide`,
        subject: subject?.label,
        grade: userGrade,
      });

      if (!result) {
        throw new Error("No study guide was returned.");
      }

      const markdown = (result as GeneratedStudyGuide & { markdown?: string }).markdown || studyGuideToMarkdown(result);
      
      // For study guides, we can just store the markdown which BlockNote can parse,
      // but it's better to serialise it to BN format.
      // We can use createBlockNoteContentParser to get the blocks from markdown.
      const parser = createBlockNoteContentParser();
      const blocks = parser.parse(markdown);
      const content = blocks ? serialiseBN(blocks as BlockNoteEditorBlock[]) : markdown;
      
      const guideTitle = pickStudyGuideTitle(result.title, `${title || subject?.label || "Study"} Guide`);
      const created = await subjectStore.createDocument(subjectId, guideTitle);

      await subjectStore.updateDocument(subjectId, created.id, {
        title: guideTitle,
        content,
        role: "study-guide",
        studyGuideMarkdown: markdown,
        studyGuideData: result,
      });

      toast.success("Study guide created.");
      router.push(`/subjects/${subjectId}/document/${created.id}`);
    } catch (issue: unknown) {
      toast.error(issue instanceof Error ? issue.message : "Could not generate study guide");
    } finally {
      setSidebarBusy(null);
    }
  }, [router, stats.text, subject?.label, subjectId, title, userGrade]);

  const handleListen = useCallback(() => {
    if (isSpeaking && !isPaused) {
      pause();
      return;
    }
    if (isPaused) {
      resume();
      return;
    }
    const text = editorRef.current?.getPlainText() || stats.text;
    if (text) speak(text, { rate: 1, pitch: 1 });
  }, [isPaused, isSpeaking, pause, resume, speak, stats.text]);

  if (!subject) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/20" />
        <p className="text-xl font-black">Subject not found</p>
        <Button onClick={() => router.push("/subjects")} size="sm" className="mt-4">Back to subjects</Button>
      </div>
    );
  }

  const handleIconChange = useCallback(async (newIcon: string) => {
    setIcon(newIcon);
    updateTabLabelByPath(`/subjects/${subjectId}/document/${docId}`, title, newIcon);
    await subjectStore.updateDocument(subjectId, docId, { icon: newIcon });
    toast.success("Icon updated");
  }, [docId, subjectId, title, updateTabLabelByPath]);

  const handleCoverChange = useCallback(async (newCover: string | null) => {
    setCover(newCover);
    await subjectStore.updateDocument(subjectId, docId, { cover: newCover });
    toast.success(newCover ? "Cover updated" : "Cover removed");
  }, [docId, subjectId]);

  const SUBJECT_COVER_STYLES: Record<string, string> = {
    sunset: "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500",
    ocean: "bg-gradient-to-r from-blue-400 via-cyan-500 to-teal-500",
    forest: "bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500",
    berry: "bg-gradient-to-r from-pink-500 via-rose-500 to-red-500",
    sky: "bg-gradient-to-r from-blue-300 via-blue-500 to-indigo-500",
    twilight: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
    fire: "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500",
    midnight: "bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900",
    gold: "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500",
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="document-shell notion-ui fade-in"
    >

      {/* Header */}
      <header className="document-header">
        <div className="flex items-center gap-2 overflow-hidden mr-4">
          <button
            onClick={() => router.push("/subjects")}
            className="notion-btn-minimal shrink-0"
          >
            Subjects
          </button>
          <span className="text-muted-foreground/30">/</span>
          <button
            onClick={() => router.push(`/subjects/${subjectId}`)}
            className="notion-btn-minimal truncate"
          >
            {subject.label}
          </button>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-sm font-medium truncate text-foreground/70 px-2">
            {title || "Untitled"}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="mr-2 flex items-center gap-3">
            {isSaving ? (
              <span className="text-[11px] text-muted-foreground/50 animate-pulse">Saving...</span>
            ) : (
              <span className="text-[11px] text-muted-foreground/40">{formatSaved(lastSaved)}</span>
            )}
            {collaboration.peerCount > 0 && (
              <div className="flex -space-x-2">
                {[...Array(Math.min(collaboration.peerCount + 1, 3))].map((_, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-[8px] font-bold">
                    {i === 0 ? "You" : ""}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
            className={cn(
              "notion-btn-minimal",
              isAiPanelOpen && "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">AI Studio</span>
          </button>

          <ShareDialog
            documentId={docId}
            subjectId={subjectId}
            documentTitle={title}
            trigger={
              <button className="notion-btn-minimal" title="Share document">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            }
          />

          <button className="notion-btn-minimal">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="document-content-area flex relative">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="document-container">
            {/* Document Icon & Title */}
            <div className="flex flex-col gap-4 mb-8 group/title">
              <button
                onClick={() => setEmojiPickerOpen(true)}
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-5xl hover:bg-muted/50 transition-colors text-left -ml-2"
              >
                {icon || "📄"}
              </button>

              <textarea
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  event.target.style.height = "auto";
                  event.target.style.height = `${event.target.scrollHeight}px`;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                placeholder="Untitled"
                rows={1}
                style={{ resize: "none", overflow: "hidden" }}
                className="document-title-input mb-0"
              />
            </div>

            {/* Editor Area */}
            <div className="min-h-[70vh]">
              {initialContent === null ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
                </div>
              ) : (
                <BlockNoteEditor
                  key={docId}
                  ref={editorRef}
                  initialContent={initialContent}
                  onChange={handleEditorChange}
                  subjectLabel={subject.label}
                  documentTitle={title}
                  collaboration={collab}
                />
              )}
            </div>

            {/* Footer Stats */}
            <div className="mt-24 pt-8 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground/40 font-medium tracking-wide uppercase">
              <div className="flex items-center gap-6">
                <span>{stats.words} words</span>
                <span>{stats.characters} characters</span>
                <span>{documentRole === "study-guide" ? "Study Guide" : "Notes"}</span>
              </div>
              {ttsOk && (
                <button
                  onClick={handleListen}
                  className="hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  {isSpeaking ? (isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />) : <Volume2 className="h-3 w-3" />}
                  {isSpeaking ? (isPaused ? "Resume" : "Pause") : "Listen"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* AI Studio Sidebar - Collapsible */}
        <AnimatePresence>
          {isAiPanelOpen && (
            <motion.aside
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-80 border-l border-border bg-sidebar-background overflow-y-auto p-4 space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">AI Studio</h3>
                <button 
                  onClick={() => setIsAiPanelOpen(false)}
                  className="p-1 hover:bg-muted rounded-md transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-semibold">Transform Notes</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Convert your messy notes into structured revision materials instantly.
                  </p>
                  <Button
                    onClick={handleGenerateStudyGuide}
                    disabled={sidebarBusy !== null}
                    className="w-full h-9 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm"
                  >
                    {sidebarBusy === "study-guide" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <BookOpenText className="mr-2 h-3.5 w-3.5" />}
                    Generate Study Guide
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: "summarise", label: "Summarise", icon: Sparkles },
                    { id: "quiz", label: "Quiz Me", icon: BookOpenText },
                    { id: "explain", label: "Explain Simply", icon: Wand2 },
                    { id: "fill-gaps", label: "Find Gaps", icon: Sparkles },
                  ].map((action) => (
                    <button
                      key={action.id}
                      disabled={sidebarBusy !== null}
                      onClick={() => runSidebarAction(action.id, action.label)}
                      className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted transition-colors text-left disabled:opacity-50"
                    >
                      <action.icon className="h-4 w-4 text-muted-foreground" />
                      {action.label}
                      {sidebarBusy === action.id && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Custom Command</span>
                  </div>
                  <textarea
                    value={customInstruction}
                    onChange={(event) => setCustomInstruction(event.target.value)}
                    placeholder="e.g. Turn these notes into a rapid-recall checklist..."
                    rows={4}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                  />
                  <Button
                    variant="secondary"
                    className="w-full h-9 text-xs font-semibold rounded-lg"
                    disabled={sidebarBusy !== null || !customInstruction.trim()}
                    onClick={() => runSidebarAction("custom", "AI Output", customInstruction)}
                  >
                    {sidebarBusy === "custom" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
                    Run Instruction
                  </Button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      <EmojiPicker
        open={emojiPickerOpen}
        onOpenChange={setEmojiPickerOpen}
        selectedEmoji={icon || "📄"}
        onSelect={handleIconChange}
      />
    </motion.div>
  );
}
