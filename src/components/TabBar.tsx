"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabs, type AppTab, pathMeta } from "@/context/TabsContext";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

interface TabBarProps {
  onNavigate: (path: string) => void;
}

const NAV_SECTIONS = [
  {
    label: "Learn",
    items: [
      { path: "/chat",       emoji: "💬", label: "AI Tutor",     desc: "Ask anything, get explained" },
      { path: "/flashcards", emoji: "🃏", label: "Flashcards",   desc: "Quiz yourself on any topic" },
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
];

const ALL_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

// ── NavItem ──────────────────────────────────────────────────────────────────
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
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group",
        active ? "bg-muted/70" : "hover:bg-muted/40"
      )}
    >
      <span className="text-lg w-7 text-center shrink-0 leading-none">{item.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground leading-tight">{item.label}</p>
        <p className="text-xs text-muted-foreground/60 leading-tight truncate mt-0.5">{item.desc}</p>
      </div>
    </button>
  );
}

// ── NewTabOverlay — Notion-style fullscreen jump menu ────────────────────────
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, visibleItems.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); if (visibleItems[activeIdx]) onNavigate(visibleItems[activeIdx].path); }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Search bar — centred, Notion style */}
      <div className="w-full max-w-2xl mx-auto pt-[15vh] px-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/60 bg-card shadow-xl">
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

        {/* Results */}
        <div className="mt-3 rounded-xl border border-border/40 bg-card shadow-xl overflow-hidden">
          {filtered !== null && filtered.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground/50 text-center">No results for "{search}"</p>
          ) : filtered !== null ? (
            <div className="p-1.5 space-y-0.5">
              {filtered.map((item, i) => (
                <NavItem key={item.path} item={item} active={i === activeIdx} onSelect={onNavigate} />
              ))}
            </div>
          ) : (
            NAV_SECTIONS.map(section => (
              <div key={section.label}>
                <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                  {section.label}
                </p>
                <div className="px-1.5 pb-1.5 space-y-0.5">
                  {section.items.map((item, i) => {
                    const globalIdx = ALL_ITEMS.indexOf(item);
                    return (
                      <NavItem key={item.path} item={item} active={globalIdx === activeIdx} onSelect={onNavigate} />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 mt-3 px-1">
          <span className="text-[11px] text-muted-foreground/40 flex items-center gap-1.5">
            <kbd className="font-mono border border-border/40 rounded px-1 py-0.5 text-[10px]">↑↓</kbd> navigate
          </span>
          <span className="text-[11px] text-muted-foreground/40 flex items-center gap-1.5">
            <kbd className="font-mono border border-border/40 rounded px-1 py-0.5 text-[10px]">↵</kbd> open
          </span>
        </div>
      </div>
    </div>
  );
}

// ── TabBar ────────────────────────────────────────────────────────────────────
export default function TabBar({ onNavigate }: TabBarProps) {
  const { tabs, activeTabId, closeTab, setActiveTab, openTab, togglePin } = useTabs();
  const scrollRef = useRef<HTMLDivElement>(null);

  // ALL hooks must be declared before any early return
  const [newTabOpen, setNewTabOpen] = useState(false);

  const pinnedTabs = tabs.filter(t => t.isPinned);
  const regularTabs = tabs.filter(t => !t.isPinned);
  const isSingleTab = tabs.length <= 1;

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

  const handleOpenShortcut = (path: string) => {
    const meta = pathMeta(path);
    openTab(path, meta.label, meta.emoji);
    onNavigate(path);
    setNewTabOpen(false);
  };

  if (tabs.length === 0) return null;

  return (
    <>
      <NewTabOverlay open={newTabOpen} onClose={() => setNewTabOpen(false)} onNavigate={handleOpenShortcut} />

      <div className="h-9 flex items-end bg-background/80 backdrop-blur-sm border-b border-border/40 px-2 shrink-0">
        <div ref={scrollRef} className="flex items-end gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0">
          <AnimatePresence initial={false}>
            {pinnedTabs.map((tab) => {
              const isActive = tab.id === activeTabId;
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
                        onClick={() => handleTabClick(tab)}
                        onMouseDown={(e) => handleMouseDown(e, tab.id)}
                        title={tab.label}
                        className={cn(
                          "group flex items-center justify-center h-7 w-7 rounded-md cursor-pointer transition-all relative select-none text-xs font-semibold",
                          isActive
                            ? "bg-background border border-border/50 text-foreground shadow-sm"
                            : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/30"
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
            {regularTabs.map((tab) => {
              const isActive = tab.id === activeTabId;
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
                        onClick={() => handleTabClick(tab)}
                        onMouseDown={(e) => handleMouseDown(e, tab.id)}
                        className={cn(
                          "group flex items-center gap-1.5 h-7 px-2.5 rounded-md cursor-pointer transition-all relative select-none whitespace-nowrap text-xs font-semibold max-w-[180px]",
                          isActive
                            ? "bg-background border border-border/50 text-foreground shadow-sm"
                            : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/30"
                        )}
                      >
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
    </>
  );
}
