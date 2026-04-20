"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, CalendarPlus, FileText, FolderOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { subjectStore } from "@/utils/subjectStore";
import type { SubjectDocumentItem } from "@/utils/subjectStore";
import { SUBJECT_CATALOG } from "@/constants/subjects";

// Simple emoji map for subjects (since SUBJECT_CATALOG uses Lucide icons)
const SUBJECT_EMOJI: Record<string, string> = {
  math: "🔢", biology: "🧬", history: "🏛️", physics: "⚡", chemistry: "🧪",
  english: "📖", computing: "💻", economics: "📊", business: "💼", commerce: "💰",
  pdhpe: "❤️", geography: "🌍", engineering: "🔧", medicine: "🩺", languages: "🗣️",
};

export const NAV_SECTIONS = [
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
      { path: "new-event",      emoji: "📅", label: "New Event",      desc: "Add a deadline or event" },
    ],
  },
];

export const ALL_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

interface DocResult {
  type: "document";
  doc: SubjectDocumentItem;
  subjectId: string;
  subjectLabel: string;
  subjectEmoji: string;
}

interface NavResult {
  type: "nav";
  item: { path: string; emoji: string; label: string; desc: string };
}

type Result = DocResult | NavResult;

function NavItem({
  item,
  active,
  onSelect,
}: {
  item: { path: string; emoji: string; label: string; desc: string };
  active?: boolean;
  onSelect: (path: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(item.path)}
      data-active={active ? "true" : undefined}
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

function DocItem({
  doc,
  subjectId,
  subjectLabel,
  subjectEmoji,
  active,
  onSelect,
}: {
  doc: SubjectDocumentItem;
  subjectId: string;
  subjectLabel: string;
  subjectEmoji: string;
  active?: boolean;
  onSelect: (path: string) => void;
}) {
  const icon = doc.icon || (doc.role === "study-guide" ? "📘" : "📄");

  return (
    <button
      onClick={() => onSelect(`doc:${doc.id}:${subjectId}`)}
      data-active={active ? "true" : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
        active
          ? "bg-primary/10 shadow-sm"
          : "hover:bg-muted/50 hover:shadow-sm"
      )}
    >
      <span className="text-base w-7 text-center shrink-0 leading-none">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold leading-tight truncate transition-colors",
          active ? "text-primary" : "text-foreground/90 group-hover:text-foreground"
        )}>
          {doc.title || "Untitled"}
        </p>
        <p className="text-xs text-muted-foreground/50 leading-tight truncate mt-0.5 flex items-center gap-1">
          <span>{subjectEmoji}</span>
          <span>{subjectLabel}</span>
          {doc.role === "study-guide" && <span className="text-[9px] uppercase font-bold tracking-wider text-primary/60">· Study Guide</span>}
        </p>
      </div>
      <ArrowRight className={cn(
        "w-3.5 h-3.5 shrink-0 transition-all",
        active ? "text-primary opacity-100 translate-x-0" : "text-muted-foreground/30 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0"
      )} />
    </button>
  );
}

export function CommandMenu({
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
  const [documents, setDocuments] = useState<{ doc: SubjectDocumentItem; subjectId: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load documents when menu opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    subjectStore.getAll().then(all => {
      if (cancelled) return;
      const docs: { doc: SubjectDocumentItem; subjectId: string }[] = [];
      for (const [subjectId, data] of Object.entries(all)) {
        const subjectDocs = data.notes.documents || [];
        for (const doc of subjectDocs) {
          // Use document's stored subjectId if available, otherwise use loop variable
          const docSubjectId = doc.subjectId || subjectId;
          docs.push({ doc, subjectId: docSubjectId });
        }
      }
      // Sort by lastUpdated descending
      docs.sort((a, b) => b.doc.lastUpdated.localeCompare(a.doc.lastUpdated));
      setDocuments(docs);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Build results
  const results = useCallback((): Result[] => {
    const q = search.trim().toLowerCase();

    // Nav items
    const navItems = q
      ? ALL_ITEMS.filter(i =>
          i.label.toLowerCase().includes(q) ||
          i.desc.toLowerCase().includes(q)
        )
      : ALL_ITEMS;

    // Document items
    const docItems = q
      ? documents.filter(({ doc, subjectId }) => {
          const subject = SUBJECT_CATALOG.find(s => s.id === subjectId);
          const subjectLabel = subject?.label || subjectId;
          return (
            doc.title.toLowerCase().includes(q) ||
            subjectLabel.toLowerCase().includes(q) ||
            (doc.contentText || "").toLowerCase().includes(q)
          );
        })
      : documents;

    const navResults: NavResult[] = navItems.map(item => ({ type: "nav" as const, item }));
    const docResults: DocResult[] = docItems.map(({ doc, subjectId }) => {
      const subject = SUBJECT_CATALOG.find(s => s.id === subjectId);
      return {
        type: "document" as const,
        doc,
        subjectId,
        subjectLabel: subject?.label || subjectId,
        subjectEmoji: SUBJECT_EMOJI[subjectId] || "📚",
      };
    });

    // If searching, mix them together (nav first, then docs)
    // If not searching, show sections with docs at the bottom
    if (q) {
      return [...navResults, ...docResults];
    }
    return [...navResults, ...docResults];
  }, [search, documents]);

  const allResults = results();
  const visibleItems = allResults;

  // Scroll active into view
  useEffect(() => {
    if (!resultsRef.current) return;
    const active = resultsRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, visibleItems.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = visibleItems[activeIdx];
      if (!item) return;
      if (item.type === "nav") {
        onNavigate(item.item.path);
      } else {
        onNavigate(`doc:${item.doc.id}:${item.subjectId}`);
      }
    }
  };

  const handleSelect = (path: string) => {
    onNavigate(path);
  };

  if (!open) return null;

  // Group results for display
  const hasDocs = visibleItems.some(r => r.type === "document");
  const hasNav = visibleItems.some(r => r.type === "nav");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-md"
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
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30 shrink-0">
            <Search className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveIdx(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Jump to a page or search documents…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 text-foreground"
            />
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/40 shrink-0" />}
            <kbd className="text-[10px] text-muted-foreground/40 border border-border/40 rounded px-1.5 py-0.5 font-mono shrink-0">esc</kbd>
          </div>

          {/* Results */}
          <div ref={resultsRef} className="overflow-y-auto scrollbar-none flex-1">
            {visibleItems.length === 0 && !loading ? (
              <p className="px-4 py-10 text-sm text-muted-foreground/50 text-center">No results for "{search}"</p>
            ) : (
              <div className="p-2 space-y-0.5">
                {/* Navigation section header (only when not searching) */}
                {!search.trim() && hasNav && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                    Navigation
                  </p>
                )}

                {visibleItems.map((item, i) => {
                  if (item.type === "nav") {
                    return (
                      <NavItem
                        key={`nav-${item.item.path}`}
                        item={item.item}
                        active={i === activeIdx}
                        onSelect={handleSelect}
                      />
                    );
                  }

                  // Document section header
                  if (item.type === "document") {
                    const prevItem = visibleItems[i - 1];
                    const isFirstDoc = !prevItem || prevItem.type === "nav";
                    return (
                      <div key={`doc-${item.doc.id}`}>
                        {isFirstDoc && (
                          <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 flex items-center gap-1.5">
                            <FolderOpen className="w-3 h-3" />
                            Your Documents
                          </p>
                        )}
                        <DocItem
                          doc={item.doc}
                          subjectId={item.subjectId}
                          subjectLabel={item.subjectLabel}
                          subjectEmoji={item.subjectEmoji}
                          active={i === activeIdx}
                          onSelect={handleSelect}
                        />
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>

          {/* Footer */}
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
    </AnimatePresence>
  );
}
