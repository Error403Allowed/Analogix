"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Search, FileText, Sparkles, GripHorizontal, ArrowRight, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabs, type AppTab, pathMeta } from "@/context/TabsContext";
import { useSidebar } from "@/components/ui/sidebar";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { useRouter, usePathname } from "next/navigation";
import { SUBJECT_CATALOG } from "@/constants/subjects";
import { subjectStore } from "@/utils/subjectStore";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { CommandMenu } from "@/components/CommandMenu";

interface TabBarProps {
  onNavigate: (path: string) => void;
}

// ── TabBar ────────────────────────────────────────────────────────────────────
export default function TabBar({ onNavigate }: TabBarProps) {
  const { tabs, activeTabId, hydrated, closeTab, setActiveTab, openTab, togglePin, reorderTabs } = useTabs();
  const pathname = usePathname(); // source of truth for active tab highlight
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toggleSidebar } = useSidebar();

  // ALL hooks must be declared before any early return
  const [newTabOpen, setNewTabOpen] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [createMode, setCreateMode] = useState<"document" | "study-guide" | "flashcards" | "quiz" | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const pinnedTabs = tabs.filter(t => t.isPinned);
  const regularTabs = tabs.filter(t => !t.isPinned);
  const isSingleTab = tabs.length <= 1;

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = "move";
    // Create a minimal drag image
    const dragImage = document.createElement("div");
    dragImage.style.width = "100px";
    dragImage.style.height = "28px";
    dragImage.style.background = "rgba(0,0,0,0.5)";
    dragImage.style.borderRadius = "6px";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 50, 14);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedTabId) {
      setDragOverIndex(index);
    }
  }, [draggedTabId]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, targetIndex: number, isPinned: boolean) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedTabId) return;
    
    const allTabs = [...pinnedTabs, ...regularTabs];
    const draggedIndex = allTabs.findIndex(t => t.id === draggedTabId);
    
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedTabId(null);
      return;
    }

    // Reorder the tabs
    const newTabs = [...allTabs];
    const [draggedTab] = newTabs.splice(draggedIndex, 1);
    
    // Adjust target index if we removed an item before it
    const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    newTabs.splice(adjustedTargetIndex, 0, draggedTab);
    
    reorderTabs(newTabs);
    setDraggedTabId(null);
  }, [draggedTabId, pinnedTabs, regularTabs, reorderTabs]);

  const handleDragEnd = useCallback(() => {
    setDraggedTabId(null);
    setDragOverIndex(null);
  }, []);

  const handleTabClick = (tab: AppTab) => {
    setActiveTab(tab.id);
    onNavigate(tab.path);
  };

  const closeTabById = (tabId: string, opts?: { allowPinned?: boolean }) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    if (tab.isPinned && !opts?.allowPinned) return;
    if (tabs.length <= 1) return;
    const isActive = tabId === activeTabId;
    closeTab(tabId);
    if (isActive) {
      const idx = tabs.findIndex(t => t.id === tabId);
      const remaining = tabs.filter(t => t.id !== tabId);
      if (remaining.length > 0) {
        const next = remaining[idx] ?? remaining[Math.max(0, idx - 1)];
        onNavigate(next.path);
      }
    }
  };

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTabById(tabId);
  };

  const handleMouseDown = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) { e.preventDefault(); handleClose(e, tabId); }
  };

  const handleCreateDocument = async (subjectId: string, title: string) => {
    try {
      if (!subjectId) {
        console.error("[TabBar] Cannot create document: subjectId is empty/undefined", { subjectId, title });
        toast.error("Please select a subject");
        return;
      }
      console.log("[TabBar] Creating document with subjectId:", { subjectId, title });
      const created = await subjectStore.createDocument(subjectId, title);
      console.log("[TabBar] Document created with subjectId:", { subjectId, docId: created.id, createdSubjectId: created.subjectId });
      toast.success(`Document "${title}" created!`);
      const url = `/subjects/${subjectId}/document/${created.id}`;
      openTab(url, title, "📄");
      router.push(url);
      setNewTabOpen(false);
      setShowSubjectPicker(false);
    } catch (error) {
      toast.error("Failed to create document");
      console.error(error);
    }
  };

  const handleCreateStudyGuide = async (subjectId: string, title: string) => {
    try {
      const created = await subjectStore.createDocument(subjectId, title);
      toast.success(`Study guide "${title}" created!`);
      const url = `/subjects/${subjectId}/document/${created.id}`;
      openTab(url, title, "📘");
      router.push(url);
      setNewTabOpen(false);
      setShowSubjectPicker(false);
    } catch (error) {
      toast.error("Failed to create study guide");
      console.error(error);
    }
  };

  const handleCreateFlashcards = async (subjectId: string, title: string) => {
    try {
      // For now, navigate to the flashcards page with the subject pre-selected
      toast.success(`Creating flashcards for ${title}`);
      router.push(`/flashcards?subjectId=${subjectId}`);
      setNewTabOpen(false);
      setShowSubjectPicker(false);
    } catch (error) {
      toast.error("Failed to create flashcards");
      console.error(error);
    }
  };

  const handleCreateQuiz = async (subjectId: string, title: string) => {
    try {
      // For now, navigate to the quiz page with the subject pre-selected
      toast.success(`Creating quiz for ${title}`);
      router.push(`/quiz?subjectId=${subjectId}`);
      setNewTabOpen(false);
      setShowSubjectPicker(false);
    } catch (error) {
      toast.error("Failed to create quiz");
      console.error(error);
    }
  };

  const handleOpenShortcut = (path: string) => {
    // Handle special "create" actions
    if (path === "new-document" || path === "new-study-guide") {
      setCreateMode(path === "new-document" ? "document" : "study-guide");
      setShowSubjectPicker(true);
      setNewTabOpen(false);
      return;
    }
    if (path === "new-flashcards") {
      setCreateMode("flashcards");
      setShowSubjectPicker(true);
      setNewTabOpen(false);
      return;
    }
    if (path === "new-event") {
      // Navigate to calendar with event creation hint
      openTab("/calendar", "Calendar", "📅");
      router.push("/calendar");
      setNewTabOpen(false);
      // Dispatch event to open the add event dialog
      window.dispatchEvent(new CustomEvent("openAddEvent"));
      return;
    }
    if (path.startsWith("doc:")) {
      const [, docId, subjectId] = path.split(":");
      if (!docId || !subjectId) {
        console.error("[TabBar] Invalid doc path format:", path);
        toast.error("Could not open document");
        return;
      }
      const url = `/subjects/${subjectId}/document/${docId}`;
      openTab(url, "Document", "📄");
      router.push(url);
      setNewTabOpen(false);
      return;
    }

    const meta = pathMeta(path);
    openTab(path, meta.label, meta.emoji);
    onNavigate(path);
    setNewTabOpen(false);
  };

  if (tabs.length === 0) return null;
  if (!hydrated) return <div className="h-9 shrink-0 border-b border-border/20 bg-background/80" />;

  return (
    <>
      <AnimatePresence>
        {newTabOpen && (
          <CommandMenu open={newTabOpen} onClose={() => setNewTabOpen(false)} onNavigate={handleOpenShortcut} />
        )}
      </AnimatePresence>
      <div className="relative h-11 shrink-0 border-b border-border/20 bg-background/80 px-3 py-1.5 backdrop-blur-lg">
        <div className="flex h-full items-center">
        {/* Sidebar toggle button */}
        <button
          onClick={toggleSidebar}
          className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-black/[0.03] text-muted-foreground/80 transition-all duration-200 hover:border-black/10 hover:bg-black/[0.05] hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/15 dark:hover:bg-white/[0.07]"
          title="Toggle Sidebar"
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </button>

        <div
          ref={scrollRef}
          className="flex h-8 min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none rounded-[20px] border border-black/[0.05] bg-black/[0.02] px-1.5 py-1 dark:border-white/[0.06] dark:bg-white/[0.02]"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <AnimatePresence initial={false}>
            {pinnedTabs.map((tab, index) => {
              const isActive = pathname ? tab.path === pathname : tab.id === activeTabId;
              const isDragging = draggedTabId === tab.id;
              const isDragOver = dragOverIndex === index;
              return (
                <ContextMenu key={tab.id}>
                  <ContextMenuTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, width: 0, x: -8 }}
                      animate={{ opacity: 1, width: "auto", x: 0 }}
                      exit={{ opacity: 0, width: 0, x: -8 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="shrink-0"
                    >
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, tab.id)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index, true)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleTabClick(tab)}
                        onMouseDown={(e) => handleMouseDown(e, tab.id)}
                        title={tab.label}
                        className={cn(
                          "group relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border text-xs font-semibold select-none transition-all duration-200",
                          isActive
                            ? "border-primary/20 bg-primary/10 text-foreground shadow-sm dark:border-primary/25 dark:bg-primary/15"
                            : "border-transparent bg-transparent text-muted-foreground/75 hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]",
                          isDragging && "opacity-50",
                          isDragOver && "ring-2 ring-foreground/10 ring-offset-1 ring-offset-background"
                        )}
                      >
                        <span className="text-[11px]">{tab.emoji}</span>
                      </div>
                    </motion.div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={() => togglePin(tab.id)}>
                      {tab.isPinned ? "Unpin Tab" : "Pin Tab"}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      disabled={isSingleTab}
                      onSelect={() => closeTabById(tab.id, { allowPinned: true })}
                    >
                      Close Tab
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </AnimatePresence>

          {pinnedTabs.length > 0 && regularTabs.length > 0 && (
            <div className="mx-1 h-5 w-px shrink-0 bg-gradient-to-b from-transparent via-border/70 to-transparent" />
          )}

          <AnimatePresence initial={false}>
            {regularTabs.map((tab, index) => {
              const isActive = pathname ? tab.path === pathname : tab.id === activeTabId;
              const isDragging = draggedTabId === tab.id;
              const isDragOver = dragOverIndex === index;
              const pinnedCount = pinnedTabs.length;
              return (
                <ContextMenu key={tab.id}>
                  <ContextMenuTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, width: 0, x: -8 }}
                      animate={{ opacity: 1, width: "auto", x: 0 }}
                      exit={{ opacity: 0, width: 0, x: -8 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="shrink-0"
                    >
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, tab.id)}
                        onDragOver={(e) => handleDragOver(e, pinnedCount + index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, pinnedCount + index, false)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleTabClick(tab)}
                        onMouseDown={(e) => handleMouseDown(e, tab.id)}
                        className={cn(
                          "group relative flex h-6 max-w-[190px] cursor-pointer select-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-semibold transition-all duration-200",
                          isActive
                            ? "border-primary/20 bg-primary/10 text-foreground shadow-sm dark:border-primary/25 dark:bg-primary/15"
                            : "border-transparent bg-transparent text-muted-foreground/75 hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.05]",
                          isDragging && "opacity-50",
                          isDragOver && "ring-2 ring-foreground/10 ring-offset-1 ring-offset-background"
                        )}
                      >
                        <GripHorizontal className="h-2.5 w-2.5 shrink-0 cursor-grab text-muted-foreground/35 opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100" />
                        <span className="text-[11px] shrink-0">{tab.emoji}</span>
                        <span className="truncate">{tab.label}</span>
                        <button
                          onClick={(e) => handleClose(e, tab.id)}
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all",
                            "opacity-0 group-hover:opacity-100",
                            isActive && "opacity-70",
                            "hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                          )}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </motion.div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onSelect={() => togglePin(tab.id)}>
                      {tab.isPinned ? "Unpin Tab" : "Pin Tab"}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      disabled={isSingleTab}
                      onSelect={() => closeTabById(tab.id, { allowPinned: true })}
                    >
                      Close Tab
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </AnimatePresence>
        </div>

        {/* New tab button */}
        <button
          onClick={() => setNewTabOpen(true)}
          className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-dashed border-black/10 bg-black/[0.03] text-muted-foreground/80 transition-all duration-200 hover:border-black/15 hover:bg-black/[0.05] hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
          title="New tab (jump to…)"
        >
          <Plus className="h-3.5 w-3.5 mx-auto" />
        </button>
        </div>
      </div>

      {/* Subject Picker Dialog for creating documents/study guides */}
      <AnimatePresence>
        {showSubjectPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSubjectPicker(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md mx-4 rounded-2xl border border-border/50 bg-card p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  {createMode === "document" ? (
                    <FileText className="w-5 h-5 text-primary" />
                  ) : createMode === "study-guide" ? (
                    <Sparkles className="w-5 h-5 text-primary" />
                  ) : createMode === "flashcards" ? (
                    <FileText className="w-5 h-5 text-primary" />
                  ) : (
                    <FileText className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {createMode === "document" 
                      ? "Create New Document" 
                      : createMode === "study-guide"
                      ? "Create AI Study Guide"
                      : createMode === "flashcards"
                      ? "Create Flashcards"
                      : "Create Quiz"}
                  </h3>
                  <p className="text-xs text-muted-foreground/60">
                    {createMode === "document"
                      ? "Start with a blank document in any subject"
                      : createMode === "study-guide"
                      ? "Generate a comprehensive study guide with AI"
                      : createMode === "flashcards"
                      ? "Create flashcards for a subject"
                      : "Create a quiz for a subject"}
                  </p>
                </div>
              </div>

              <SubjectForm
                mode={createMode || "document"}
                onSubmit={(subjectId, title) => {
                  if (createMode === "document") {
                    handleCreateDocument(subjectId, title);
                  } else if (createMode === "study-guide") {
                    handleCreateStudyGuide(subjectId, title);
                  } else if (createMode === "flashcards") {
                    handleCreateFlashcards(subjectId, title);
                  } else if (createMode === "quiz") {
                    handleCreateQuiz(subjectId, title);
                  }
                }}
                onCancel={() => {
                  setShowSubjectPicker(false);
                  setCreateMode(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── SubjectForm Component ────────────────────────────────────────────────────
function SubjectForm({
  mode,
  onSubmit,
  onCancel,
}: {
  mode: "document" | "study-guide" | "flashcards" | "quiz";
  onSubmit: (subjectId: string, title: string) => void;
  onCancel: () => void;
}) {
  const [subjects, setSubjects] = useState<Record<string, any>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECT_CATALOG[0]?.id || "");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user's actual subjects from store
    const loadSubjects = async () => {
      try {
        const subs = await subjectStore.getAll();
        setSubjects(subs);
        
        // Set default to first user subject
        if (Object.keys(subs).length > 0) {
          const firstUserSubject = Object.keys(subs)[0];
          setSelectedSubject(firstUserSubject);
        }
        // Otherwise keep the catalog default we set above
      } catch (e) {
        console.warn("Failed to load subjects, using catalog:", e);
        // Keep default already set
      } finally {
        setLoading(false);
      }
    };
    
    loadSubjects();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedSubject) {
      console.warn("Cannot submit: title or subject missing", { title, selectedSubject });
      return;
    }
    onSubmit(selectedSubject, title.trim());
  };

  const subjectOptions = Object.keys(subjects).length > 0 
    ? Object.keys(subjects)
    : SUBJECT_CATALOG.map(s => s.id);

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-foreground/70">Subject</Label>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            disabled={loading}
            className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border/50 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          >
            {loading ? (
              <option>Loading subjects...</option>
            ) : subjectOptions.length === 0 ? (
              <option value="">No subjects available</option>
            ) : (
              subjectOptions.map(subjectId => {
                const label = subjects[subjectId]?.name || SUBJECT_CATALOG.find(s => s.id === subjectId)?.label || subjectId;
                return (
                  <option key={subjectId} value={subjectId}>
                    {label}
                  </option>
                );
              })
            )}
          </select>
        </div>

        <div>
          <Label className="text-xs font-semibold text-foreground/70">
            {mode === "document" 
              ? "Document Title" 
              : mode === "study-guide"
              ? "Study Guide Topic"
              : mode === "flashcards"
              ? "Flashcards Set Title"
              : "Quiz Title"}
          </Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={
              mode === "document" 
                ? "e.g., Introduction to Algebra" 
                : mode === "study-guide"
                ? "e.g., Photosynthesis Basics"
                : mode === "flashcards"
                ? "e.g., Biology Terms"
                : "e.g., Chemistry Quiz"
            }
            className="mt-1.5"
            autoFocus
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-6">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="gradient-primary"
          disabled={!title.trim() || loading}
        >
          {mode === "document" 
            ? "Create Document" 
            : mode === "study-guide"
            ? "Generate Study Guide"
            : mode === "flashcards"
            ? "Create Flashcards"
            : "Create Quiz"}
        </Button>
      </div>
    </form>
  );
}
