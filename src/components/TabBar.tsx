"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Search, FileText, Sparkles, GripHorizontal, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabs, type AppTab, pathMeta } from "@/context/TabsContext";
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

interface TabBarProps {
  onNavigate: (path: string) => void;
}

const NAV_SECTIONS = [
  {
    label: "Learn",
    items: [
      { path: "/chat",       emoji: "💬", label: "AI Tutor",     desc: "Ask anything, get explained" },
      { path: "/flashcards", emoji: "🃏", label: "Flashcards",   desc: "Review cards & spaced repetition" },
      { path: "/quiz",       emoji: "📝", label: "Quiz Hub",     desc: "Test yourself with AI quizzes" },
      { path: "/formulas",   emoji: "∑",  label: "Formulas",     desc: "Quick-access formula sheets" },
      { path: "/resources",  emoji: "📚", label: "Resources",    desc: "Curated study links" },
    ],
  },
  {
    label: "Organise",
    items: [
      { path: "/dashboard",    emoji: "🏠", label: "Dashboard",    desc: "Your study overview" },
      { path: "/subjects",     emoji: "🎓", label: "My Subjects",  desc: "Notes & documents" },
      { path: "/calendar",     emoji: "📅", label: "Calendar",     desc: "Deadlines & events" },
      { path: "/achievements", emoji: "🏆", label: "Achievements", desc: "Streaks & milestones" },
    ],
  },
  {
    label: "Create",
    items: [
      { path: "new-document",   emoji: "📄", label: "New Document",   desc: "Create a blank document" },
      { path: "new-flashcards", emoji: "🃏", label: "New Flashcards", desc: "Create flashcards for a subject" },
    ],
  },
];

const ALL_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

// ── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({
  item,
  active,
  onSelect,
  activeDataAttr,
}: {
  item: { path: string; emoji: string; label: string; desc: string };
  active?: boolean;
  onSelect: (path: string) => void;
  activeDataAttr?: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(item.path)}
      data-active={activeDataAttr && active ? "true" : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
        active 
          ? "bg-primary/10 shadow-sm" 
          : "hover:bg-muted/50 hover:shadow-sm"
      )}
    >
      <span className="text-lg w-7 text-center shrink-0 leading-none">{item.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold leading-tight transition-colors",
          active ? "text-primary" : "text-foreground/90 group-hover:text-foreground"
        )}>
          {item.label}
        </p>
        <p className="text-xs text-muted-foreground/50 leading-tight truncate mt-0.5">{item.desc}</p>
      </div>
      <ArrowRight className={cn(
        "w-3.5 h-3.5 shrink-0 transition-all",
        active ? "text-primary opacity-100 translate-x-0" : "text-muted-foreground/30 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
      )} />
    </button>
  );
}

// ── NewTabOverlay — centred modal jump menu ───────────────────────────────────
function NewTabOverlay({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = search.trim()
    ? ALL_ITEMS.filter(i =>
        i.label.toLowerCase().includes(search.toLowerCase()) ||
        i.desc.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const visibleItems = filtered ?? ALL_ITEMS;

  // Scroll active item into view
  useEffect(() => {
    if (!resultsRef.current) return;
    const active = resultsRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, visibleItems.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); if (visibleItems[activeIdx]) onNavigate(visibleItems[activeIdx].path); }
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -8 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="w-full max-w-lg mx-4 flex flex-col rounded-2xl border border-border/50 bg-card shadow-2xl overflow-hidden"
        style={{ maxHeight: "min(540px, calc(100vh - 8rem))" }}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30 shrink-0">
          <Search className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setActiveIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Jump to…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 text-foreground"
          />
          <kbd className="text-[10px] text-muted-foreground/40 border border-border/40 rounded px-1.5 py-0.5 font-mono shrink-0">esc</kbd>
        </div>

        {/* Scrollable results */}
        <div ref={resultsRef} className="overflow-y-auto scrollbar-none flex-1">
          {filtered !== null && filtered.length === 0 ? (
            <p className="px-4 py-10 text-sm text-muted-foreground/50 text-center">No results for "{search}"</p>
          ) : filtered !== null ? (
            <div className="p-2 space-y-0.5">
              {filtered.map((item, i) => (
                <NavItem key={item.path} item={item} active={i === activeIdx} onSelect={onNavigate} activeDataAttr />
              ))}
            </div>
          ) : (
            NAV_SECTIONS.map(section => (
              <div key={section.label}>
                <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                  {section.label}
                </p>
                <div className="px-2 pb-2 space-y-0.5">
                  {section.items.map((item) => {
                    const globalIdx = ALL_ITEMS.indexOf(item);
                    return (
                      <NavItem key={item.path} item={item} active={globalIdx === activeIdx} onSelect={onNavigate} activeDataAttr />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border/30 shrink-0">
          <span className="text-[11px] text-muted-foreground/40 flex items-center gap-1.5">
            <kbd className="font-mono border border-border/40 rounded px-1 py-0.5 text-[10px]">↑↓</kbd> navigate
          </span>
          <span className="text-[11px] text-muted-foreground/40 flex items-center gap-1.5">
            <kbd className="font-mono border border-border/40 rounded px-1 py-0.5 text-[10px]">↵</kbd> open
          </span>
          <span className="text-[11px] text-muted-foreground/40 flex items-center gap-1.5">
            <kbd className="font-mono border border-border/40 rounded px-1 py-0.5 text-[10px]">esc</kbd> close
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── TabBar ────────────────────────────────────────────────────────────────────
export default function TabBar({ onNavigate }: TabBarProps) {
  const { tabs, activeTabId, hydrated, closeTab, setActiveTab, openTab, togglePin, reorderTabs } = useTabs();
  const pathname = usePathname(); // source of truth for active tab highlight
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const created = await subjectStore.createDocument(subjectId, title);
      toast.success(`Document "${title}" created!`);
      router.push(`/subjects/${subjectId}/document/${created.id}`);
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
      router.push(`/subjects/${subjectId}/document/${created.id}`);
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

    const meta = pathMeta(path);
    openTab(path, meta.label, meta.emoji);
    onNavigate(path);
    setNewTabOpen(false);
  };

  if (tabs.length === 0) return null;
  if (!hydrated) return <div className="h-9 shrink-0 border-b border-border/40" />;

  return (
    <>
      <AnimatePresence>
        {newTabOpen && (
          <NewTabOverlay open={newTabOpen} onClose={() => setNewTabOpen(false)} onNavigate={handleOpenShortcut} />
        )}
      </AnimatePresence>
      <div className="h-9 flex items-end bg-background/80 backdrop-blur-sm border-b border-border/40 px-2 shrink-0">
        <div ref={scrollRef} className="flex items-end gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0">
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
                          "group flex items-center justify-center h-7 w-7 rounded-md cursor-pointer transition-all relative select-none text-xs font-semibold",
                          isActive
                            ? "bg-background border border-border/50 text-foreground shadow-sm"
                            : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/30",
                          isDragging && "opacity-50",
                          isDragOver && "ring-2 ring-primary ring-offset-1"
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
            <div className="mx-1 h-5 w-px bg-border/50 shrink-0" />
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
                          "group flex items-center gap-1.5 h-7 px-2.5 rounded-md cursor-pointer transition-all relative select-none whitespace-nowrap text-xs font-semibold max-w-[180px]",
                          isActive
                            ? "bg-background border border-border/50 text-foreground shadow-sm"
                            : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/30",
                          isDragging && "opacity-50",
                          isDragOver && "ring-2 ring-primary ring-offset-1"
                        )}
                      >
                        <GripHorizontal className="w-2.5 h-2.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0" />
                        <span className="text-[11px] shrink-0">{tab.emoji}</span>
                        <span className="truncate">{tab.label}</span>
                        <button
                          onClick={(e) => handleClose(e, tab.id)}
                          className={cn(
                            "shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all",
                            "opacity-0 group-hover:opacity-100",
                            isActive && "opacity-60",
                            "hover:opacity-100 hover:bg-muted/60 hover:text-foreground text-muted-foreground/60"
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
          className="ml-1 h-7 w-7 shrink-0 rounded-md border border-transparent text-muted-foreground/80 hover:text-foreground hover:bg-muted/40 transition-colors"
          title="New tab (jump to…)"
        >
          <Plus className="h-3.5 w-3.5 mx-auto" />
        </button>
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
  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECT_CATALOG[0]?.id || "");
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedSubject) return;
    onSubmit(selectedSubject, title.trim());
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-foreground/70">Subject</Label>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border/50 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {SUBJECT_CATALOG.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
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
          disabled={!title.trim()}
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
