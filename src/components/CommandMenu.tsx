"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
    ],
  },
];

export const ALL_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

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
