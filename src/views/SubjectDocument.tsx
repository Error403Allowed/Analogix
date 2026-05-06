/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
  RotateCcw,
  Brain,
  Target,
  ListChecks,
  GraduationCap,
  Lightbulb,
  MessageSquare,
  FileQuestion,
  Puzzle,
  Clock,
  AlertCircle,
  CheckCircle2,
  Layers,
  Trash2,
  Edit3,
  Type,
  AlignLeft,
  BookMarked,
  FlaskConical,
  Calculator,
  Atom,
  History,
  Globe,
  PenTool,
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
import { buildInterestList } from "@/utils/interests";

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
  type DocumentRole,
} from "@/lib/document-content";
import { EmojiPicker } from "@/components/EmojiPicker";
import { ShareToRoomDialog } from "@/components/ShareToRoomDialog";

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
  
  // First try to find in catalog
  const subject = SUBJECT_CATALOG.find((entry) => entry.id === subjectId);
  
  // If not in catalog, we'll load user-created subject dynamically
  const [userSubject, setUserSubject] = useState<{ id: string; label: string } | null>(null);
  const [subjectLoading, setSubjectLoading] = useState(!subject); // Only load if not in catalog
  
  // Load user-created subject if not in catalog
  useEffect(() => {
    if (subject || !subjectId || !subjectLoading) return;
    
    const loadUserSubject = async () => {
      try {
        await subjectStore.getSubject(subjectId);
        // For user subjects, use the subject ID as the label
        setUserSubject({ id: subjectId, label: subjectId });
      } catch (error) {
        console.error("Failed to load user subject:", error);
      } finally {
        setSubjectLoading(false);
      }
    };
    
    loadUserSubject();
  }, [subject, subjectId, subjectLoading]);
  
  // Resolve final subject for display - use user subject as fallback
  const displaySubject = subject || userSubject;
  
  const editorRef = useRef<BlockNoteHandle>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef({ title: "", content: "" });
  const latestContentRef = useRef<string>("");
  const remoteVersionRef = useRef("");

  const [title, setTitle] = useState("");
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [documentRole, setDocumentRole] = useState<DocumentRole>("notes");
  
  
  const [icon, setIcon] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [canRevert, setCanRevert] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [docMissing, setDocMissing] = useState(false);
  const [stats, setStats] = useState({ text: "", words: 0, characters: 0 });
  const [sidebarBusy, setSidebarBusy] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState("");
   const [userGrade] = useState<string | undefined>(() => {
     try {
       const preferences = JSON.parse(localStorage.getItem("userPreferences") || "{}");
       return typeof preferences.grade === "string" ? preferences.grade : undefined;
     } catch {
       return undefined;
     }
   });
   
   const [userHobbies] = useState<string[]>(() => {
     try {
       const preferences = JSON.parse(localStorage.getItem("userPreferences") || "{}");
       return buildInterestList(preferences, []);
     } catch {
       return [];
     }
   });

  const { updateTabLabelByPath } = useTabs();
  const { isSpeaking, isPaused, supported: ttsOk, speak, pause, resume, stop } = useTextToSpeech();

  const loadDocument = useCallback(async (external = false) => {
    const data = await subjectStore.getSubject(subjectId);
    if (!data) return;

    const document = (data.notes.documents || []).find((entry) => entry.id === docId);
    if (!document) {
      setDocMissing(true);
      return;
    }

    const content = document.content || "";
    const role: DocumentRole = "notes";
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
    
    
    
    const plainText = getDocumentPlainText(document);
    setStats({
      text: plainText,
      words: wordCount(plainText),
      characters: plainText.length,
    });
    setLastSaved(document.lastUpdated || null);
    setDocMissing(false);

    if (document.title) {
      updateTabLabelByPath(`/subjects/${subjectId}/document/${docId}`, document.title, document.icon || ("📄"));
    }
  }, [subjectId, docId, updateTabLabelByPath]);

  const queueSave = useCallback(async (
    nextContent: string,
    nextTitle: string,
    role = documentRole,
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
      });

      lastSavedRef.current = { title: nextTitle, content: nextContent };
      remoteVersionRef.current = nextContent;
      setIsSaving(false);
      setLastSaved(new Date().toISOString());
    }, 850);
  }, [docId, documentRole, subjectId]);



  useEffect(() => {
    loadDocument(false);

    // Check revert status
    fetch(`/api/documents/revert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: docId, action: "status" }),
    })
      .then((res) => res.json())
      .then((data) => {
        setCanRevert(data.canRevert === true);
      })
      .catch(() => {});

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SubjectDataUpdatedDetail>).detail;
      if (detail?.results?.some((result) => result.success && result.docId === docId)) {
        loadDocument(true);
        return;
      }
      loadDocument(true);
    };

    window.addEventListener("subjectDataUpdated", handler);
    return () => {
      window.removeEventListener("subjectDataUpdated", handler);
    };
  }, [docId, subjectId, loadDocument]);

  const handleRevert = useCallback(async () => {
    if (!canRevert || isReverting) return;
    
    const confirmed = window.confirm("Revert to the previous version? This will undo your latest changes.");
    if (!confirmed) return;
    
    setIsReverting(true);
    try {
      const res = await fetch(`/api/documents/revert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, action: "revert" }),
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Document reverted to previous version");
        setCanRevert(false);
        loadDocument(true);
      } else {
        toast.error(data.error || "Failed to revert");
      }
    } catch {
      toast.error("Failed to revert");
    } finally {
      setIsReverting(false);
    }
  }, [docId, canRevert, isReverting, loadDocument]);

  useEffect(() => {
    if (initialContent === null) return;
    latestContentRef.current = initialContent;
  }, [initialContent]);

  useEffect(() => {
    if (initialContent === null) return;
    queueSave(latestContentRef.current, title);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsAiPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [queueSave, title, initialContent]);

  const handleEditorChange = useCallback((raw: string) => {
    latestContentRef.current = raw;
    
    // Update stats - try editor first, fall back to parsing raw content
    let text = "";
    if (editorRef.current) {
      text = editorRef.current.getPlainText();
    }
    // Fallback: parse raw BlockNote content if editor text is empty
    if (!text && raw && isBNContent(raw)) {
      try {
        const parser = createBlockNoteContentParser();
        const parsed = parser.parse(raw);
        if (parsed) {
          text = parsed.map((block: BlockNoteEditorBlock) => {
          if (!Array.isArray(block.content)) return "";
          return block.content.map((item) => {
            if (item.type === "text") return item.text || "";
            if (item.type === "link") return item.content?.map((t: any) => t.text || "").join("") || "";
            return "";
          }).join("");
        }).join("\n");
        }
      } catch { /* ignore parse errors */ }
    }
    
    setStats({
      text,
      characters: text.length,
      words: wordCount(text),
    });
    
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
          subject: displaySubject?.label,
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
  }, [appendMarkdownSection, stats.text, displaySubject?.label]);


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

  // Still loading user subject or subject not found
  if (subjectLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-muted-foreground/50" />
        <p className="text-lg font-medium">Loading subject...</p>
      </div>
    );
  }

  if (!displaySubject) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground/20" />
        <p className="text-xl font-black">Subject not found</p>
        <Button onClick={() => router.push("/subjects")} size="sm" className="mt-4">Back to subjects</Button>
      </div>
    );
  }

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
            {displaySubject?.label}
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
          </div>

          {canRevert && (
            <button
              onClick={handleRevert}
              disabled={isReverting}
              className="notion-btn-minimal text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
              title="Revert to previous version"
            >
              {isReverting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </button>
          )}

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

          <ShareToRoomDialog
            documentId={docId}
            documentTitle={title || "Untitled"}
            trigger={<button className="notion-btn-minimal">Share to room</button>}
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
                  subjectLabel={displaySubject?.label}
                  documentTitle={title}
                />
              )}
            </div>

            {/* Footer Stats */}
            <div className="mt-24 pt-8 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground/40 font-medium tracking-wide uppercase">
              <div className="flex items-center gap-6">
                <span>{stats.words} words</span>
                <span>{stats.characters} characters</span>
                <span>{"Notes"}</span>
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
              className="w-80 border-l border-border bg-sidebar-background overflow-y-auto custom-scrollbar"
            >
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">AI Studio</h3>
                  </div>
                  <button 
                    onClick={() => setIsAiPanelOpen(false)}
                    className="p-1.5 hover:bg-muted rounded-md transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Transform your notes with AI</p>
              </div>

              <div className="p-4 space-y-6">
                {/* Quick Actions */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Quick Actions</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "summarise", label: "Summarise", desc: "Bullet summary", icon: ListChecks, shortcut: "S" },
                      { id: "quiz", label: "Quiz Me", desc: "Practice questions", icon: Target, shortcut: "Q" },
                      { id: "explain", label: "Explain", desc: "Simple explanation", icon: Lightbulb, shortcut: "E" },
                      { id: "fill-gaps", label: "Find Gaps", desc: "What's missing", icon: AlertCircle, shortcut: "G" },
                    ].map((action) => (
                      <button
                        key={action.id}
                        disabled={sidebarBusy !== null}
                        onClick={() => runSidebarAction(action.id, action.label)}
                        className="flex flex-col items-start p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/50 hover:border-primary/20 transition-all text-left group disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between w-full">
                          <action.icon className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors" />
                          <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground/50 font-mono">{action.shortcut}</kbd>
                        </div>
                        <span className="text-xs font-medium mt-2">{action.label}</span>
                        <span className="text-[10px] text-muted-foreground/60">{action.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Transform */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Transform</span>
                  <div className="space-y-1.5">
                    {[
                      { id: "simplify", label: "Simplify", desc: "Easier language", icon: Edit3 },
                      { id: "expand", label: "Expand", desc: "More details", icon: AlignLeft },
                      { id: "shorten", label: "Shorten", desc: "More concise", icon: Trash2 },
                      { id: "rewrite", label: "Rewrite", desc: "Better flow", icon: PenTool },
                    ].map((action) => (
                      <button
                        key={action.id}
                        disabled={sidebarBusy !== null}
                        onClick={() => runSidebarAction(action.id, action.label)}
                        className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted transition-colors text-left disabled:opacity-50"
                      >
                        <action.icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col items-start">
                          <span>{action.label}</span>
                          <span className="text-[10px] text-muted-foreground/50">{action.desc}</span>
                        </div>
                        {sidebarBusy === action.id && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Study Tools */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Study Tools</span>
                  <div className="space-y-1.5">
                    {[
                      { id: "flashcards", label: "Flashcards", desc: "Create flashcards from notes", icon: Layers },
                      { id: "key-terms", label: "Key Terms", desc: "Glossary of important terms", icon: BookMarked },
                      { id: "practice-problems", label: "Practice Problems", desc: "Worked solutions", icon: Puzzle },
                      { id: "add-examples", label: "Add Examples", desc: "Concrete examples", icon: GraduationCap },
                    ].map((action) => (
                      <button
                        key={action.id}
                        disabled={sidebarBusy !== null}
                        onClick={() => runSidebarAction(action.id, action.label)}
                        className="flex items-center gap-3 w-full p-2.5 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted transition-colors text-left disabled:opacity-50"
                      >
                        <action.icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col items-start">
                          <span>{action.label}</span>
                          <span className="text-[10px] text-muted-foreground/50">{action.desc}</span>
                        </div>
                        {sidebarBusy === action.id && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Command */}
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
