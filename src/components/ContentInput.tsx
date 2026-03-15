"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, X, FileText, Plus, AtSign, Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ContextItem {
  id: string;
  title: string;
  subject: string;
  icon?: string;
  preview: string;
  type: 'doc' | 'page' | 'file';
}

interface ContentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string, contextIds: string[], files: File[]) => void;
  onFilesChange: (files: File[]) => void;
  onToggleContextOptions?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  placeholder?: string;
  disabled?: boolean;
  currentPage?: string;
  recentContext?: ContextItem[];
  className?: string;
  height?: 'compact' | 'normal' | 'tall';
}

export default function ContentInput({
  value,
  onChange,
  onSend,
  onFilesChange,
  onToggleContextOptions,
  inputRef,
  placeholder = "Type a message or @mention docs...",
  disabled,
  currentPage = "Dashboard",
  recentContext = [
    { id: "current-page", title: currentPage, subject: "Current", type: 'page', preview: "What's on screen now", icon: "👁️" },
    { id: "maths-notes", title: "Maths Notes", subject: "math", type: 'doc', preview: "Recent quadratic equations", icon: "📝" },
    { id: "chem-guide", title: "Chem Study Guide", subject: "chemistry", type: 'doc', preview: "Practical task prep", icon: "📚" },
    { id: "phys-flashcards", title: "Physics Flashcards", subject: "physics", type: 'doc', preview: "20 cards due today", icon: "💳" },
  ],
  className,
  height = 'normal',
}: ContentInputProps) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedContext, setSelectedContext] = useState<ContextItem[]>([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const resolvedInputRef = inputRef ?? internalInputRef;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentPageItem = recentContext.find(item => item.type === 'page') || null;
  const linkableContext = recentContext.filter(item => item !== currentPageItem);
  const query = mentionQuery.trim().toLowerCase();
  const filteredContext = query.length === 0
    ? linkableContext
    : linkableContext.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.subject.toLowerCase().includes(query)
      );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMentions(false);
        setMentionQuery('');
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setShowActionMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // No longer needed - context is tracked separately from input text
  }, [value, selectedContext.length]);

  const handleMentionSelect = (item: ContextItem) => {
    // Don't add @ to the input - just track in selectedContext
    setSelectedContext(prev => prev.some(p => p.id === item.id) ? prev : [...prev, item]);
    setShowMentions(false);
    setMentionQuery('');
    resolvedInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '@') {
      setShowMentions(true);
      setMentionQuery('');
      setShowActionMenu(false);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
      setShowActionMenu(false);
    } else if (showMentions && e.key === 'ArrowDown') {
      // Dropdown keyboard navigation
      e.preventDefault();
    }
  };

  const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const removeContext = (item: ContextItem) => {
    setSelectedContext(prev => prev.filter(p => p.id !== item.id));
  };

  const openContextPicker = () => {
    // Just open the picker - don't modify input value
    setShowMentions(true);
    setMentionQuery("");
    setShowActionMenu(false);
    setTimeout(() => resolvedInputRef.current?.focus(), 0);
  };

  const openFilePicker = () => {
    setShowActionMenu(false);
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.currentTarget.value;
    onChange(next);
    setShowActionMenu(false);
    // No longer tracking @ mentions in input text
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const newFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => {
      const next = [...prev, ...newFiles];
      onFilesChange(next);
      return next;
    });
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim() && files.length === 0) return;
    onSend(value, selectedContext.map(item => item.title), files);
    setFiles([]);
    setSelectedContext([]);
    onFilesChange([]);
  };

  const fileCount = files.length;

  return (
    <div className={cn("flex items-end gap-2 p-3 bg-card/90 backdrop-blur-sm rounded-2xl border border-border/40 shadow-lg", className)}>
      <div className="flex-1 relative min-h-[56px]">
        <div className={cn("relative", dragging && "ring-2 ring-primary/30 rounded-2xl")}>
          {selectedContext.length > 0 && (
            <div className="absolute left-12 right-4 top-2 flex flex-wrap gap-1.5 max-h-10 overflow-hidden">
              {selectedContext.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/70 border border-border/60 text-[11px] text-foreground/80"
                >
                  {item.icon ? (
                    <span className="text-[11px]">{item.icon}</span>
                  ) : (
                    <FileText className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className="max-w-[120px] truncate">{item.title}</span>
                  <button
                    onClick={() => removeContext(item)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${item.title}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Input
            ref={resolvedInputRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "h-auto min-h-[56px] max-h-40 w-full px-4 pb-12 pr-12 pl-12 text-sm leading-relaxed border-none bg-transparent rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ring-offset-background resize-none",
              selectedContext.length > 0 ? "pt-9" : "pt-3"
            )}
            onDragOver={(e) => {
              e.dataTransfer!.dropEffect = 'copy';
              e.preventDefault();
            }}
            onDragEnter={(e) => {
              e.dataTransfer!.dropEffect = 'copy';
              setDragging(true);
            }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
            }}
            onDrop={handleFileDrop}
          />

          <div className="absolute left-2 bottom-2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl border border-border/40 hover:bg-muted/60"
              onClick={() => {
                setShowActionMenu(prev => !prev);
                setShowMentions(false);
              }}
              title="Add"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl border border-border/40 hover:bg-muted/60"
              title="Context settings"
              onClick={() => {
                setShowActionMenu(false);
                setShowMentions(false);
                onToggleContextOptions?.();
              }}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          {/* File upload preview */}
          <AnimatePresence>
            {fileCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-14 bottom-2 flex items-center gap-1.5 pr-2 py-1 rounded-full bg-muted/90 backdrop-blur text-xs text-muted-foreground font-medium"
              >
                {fileCount} file{fileCount > 1 ? 's' : ''} attached
                <button onClick={() => { setFiles([]); onFilesChange([]); }} className="ml-1 text-destructive hover:text-destructive/80">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action menu */}
        <AnimatePresence>
          {showActionMenu && (
            <motion.div
              ref={actionMenuRef}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              className="absolute bottom-full left-0 mb-2 w-[260px] bg-card border border-border/50 rounded-2xl shadow-2xl p-1.5 z-50"
            >
              <button
                onClick={openFilePicker}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/50 text-left text-sm"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span>Add images, PDFs or CSVs</span>
              </button>
              <button
                onClick={openContextPicker}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/50 text-left text-sm"
              >
                <AtSign className="w-4 h-4 text-muted-foreground" />
                <span>@ Add context</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notion-style @mention dropdown */}
        <AnimatePresence>
          {showMentions && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              className="absolute bottom-full left-0 right-0 bg-card border border-border/50 rounded-2xl shadow-2xl py-2 z-50 max-h-72 overflow-y-auto"
            >
              <div className="px-3 pt-2 pb-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground/60 absolute left-2.5 top-2.5" />
                  <Input
                    ref={searchInputRef}
                    value={mentionQuery}
                    onChange={(e) => setMentionQuery(e.currentTarget.value)}
                    placeholder="Search..."
                    className="h-8 pl-8 text-xs bg-muted/30 border-border/50 focus-visible:ring-primary/40"
                  />
                </div>
              </div>

              <div className="px-3 pt-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                Current page
              </div>
              {currentPageItem ? (
                <button
                  key={currentPageItem.id}
                  onClick={() => handleMentionSelect(currentPageItem)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors text-sm"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center border border-border/50 shrink-0">
                    {currentPageItem.icon
                      ? <span className="text-sm">{currentPageItem.icon}</span>
                      : <FileText className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{currentPageItem.title}</p>
                    <p className="text-[11px] text-muted-foreground/70 truncate">{currentPageItem.subject}</p>
                  </div>
                </button>
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground/70">
                  No current page detected
                </div>
              )}

              <div className="mx-3 my-2 h-px bg-border/60" />

              <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                Pages
              </div>
              {filteredContext.length === 0 ? (
                <div className="px-3 py-3 text-xs text-muted-foreground/70">
                  No matching pages
                </div>
              ) : (
                filteredContext.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMentionSelect(item)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors text-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center border border-border/50 shrink-0">
                      {item.icon
                        ? <span className="text-sm">{item.icon}</span>
                        : <FileText className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground/70 truncate">{item.subject}</p>
                    </div>
                    {item.preview && (
                      <p className="text-[10px] text-muted-foreground/50 italic truncate max-w-[120px]">
                        {item.preview}
                      </p>
                    )}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Send button */}
      <Button
        type="button"
        onClick={handleSend}
        disabled={!value.trim() && files.length === 0 || disabled}
        className="h-11 w-11 rounded-2xl gradient-primary shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.csv,.doc,.docx,.txt,.md"
        onChange={(e) => {
          const newFiles = Array.from(e.target.files || []);
          setFiles(prev => {
            const next = [...prev, ...newFiles];
            onFilesChange(next);
            return next;
          });
        }}
        className="hidden"
      />
    </div>
  );
}
