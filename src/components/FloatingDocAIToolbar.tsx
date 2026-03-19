"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Wand2, SpellCheck, AlignLeft, Maximize2, Minimize2,
  BookOpen, Brain, Loader2, Check, RotateCcw, X, ArrowRight, Zap,
  List, FileText, MessageSquare, ClipboardList, Lightbulb,
  ChevronDown, Shuffle, RefreshCw, GraduationCap, Target, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";
import type { DocumentPatch, StructuredDocument } from "@/lib/document-structure";
import { applyPatch, htmlToBlocks, blocksToHtml } from "@/lib/document-structure";

export type DocAIAction =
  | "rewrite" | "shorten" | "simplify" | "expand" | "formal" | "casual"
  | "summarise" | "explain" | "flashcards" | "quiz" | "bullet-points"
  | "key-terms" | "add-examples" | "add-steps" | "revision-summary"
  | "checklist" | "fix-grammar" | "expand-explanations" | "practice-problems";

interface DocAIActionItem {
  id: DocAIAction;
  label: string;
  description: string;
  icon: React.ElementType;
  group: string;
}

const AI_ACTIONS: DocAIActionItem[] = [
  // Edit actions
  { id: "rewrite", label: "Rewrite", description: "Improve clarity and flow", icon: Wand2, group: "Edit" },
  { id: "shorten", label: "Shorten", description: "Make more concise", icon: Minimize2, group: "Edit" },
  { id: "simplify", label: "Simplify", description: "Use simpler language", icon: AlignLeft, group: "Edit" },
  { id: "expand", label: "Expand", description: "Add more detail", icon: Maximize2, group: "Edit" },
  { id: "formal", label: "Make formal", description: "Professional tone", icon: BookOpen, group: "Edit" },
  { id: "casual", label: "Make casual", description: "Conversational tone", icon: MessageSquare, group: "Edit" },
  { id: "fix-grammar", label: "Fix grammar", description: "Correct errors", icon: SpellCheck, group: "Edit" },
  
  // Transform actions
  { id: "summarise", label: "Summarise", description: "Key points only", icon: AlignLeft, group: "Transform" },
  { id: "bullet-points", label: "Bullet points", description: "Convert to list", icon: List, group: "Transform" },
  { id: "checklist", label: "Checklist", description: "Action items", icon: ClipboardList, group: "Transform" },
  { id: "key-terms", label: "Key terms", description: "Extract vocabulary", icon: FileText, group: "Transform" },
  { id: "revision-summary", label: "Revision summary", description: "Condensed notes", icon: Target, group: "Transform" },
  
  // Learn actions
  { id: "explain", label: "Explain", description: "Break it down", icon: Brain, group: "Learn" },
  { id: "add-examples", label: "Add examples", description: "Insert examples", icon: Lightbulb, group: "Learn" },
  { id: "add-steps", label: "Add steps", description: "Break into steps", icon: Layers, group: "Learn" },
  { id: "expand-explanations", label: "Expand explanations", description: "Add depth", icon: Maximize2, group: "Learn" },
  
  // Practice actions
  { id: "flashcards", label: "Flashcards", description: "Generate Q&A cards", icon: GraduationCap, group: "Practice" },
  { id: "quiz", label: "Quiz questions", description: "Practice questions", icon: Shuffle, group: "Practice" },
  { id: "practice-problems", label: "Practice problems", description: "With solutions", icon: RefreshCw, group: "Practice" },
];

interface FloatingDocAIToolbarProps {
  editor: Editor;
  subject?: string;
  selectedText: string;
  position: { top: number; left: number };
  onClose: () => void;
  onActionComplete?: (action: DocAIAction, patch: DocumentPatch) => void;
}

type Phase = "menu" | "loading" | "review" | "error";

export function FloatingDocAIToolbar({
  editor, subject, selectedText, position, onClose, onActionComplete,
}: FloatingDocAIToolbarProps) {
  const [phase, setPhase] = useState<Phase>("menu");
  const [currentAction, setCurrentAction] = useState<DocAIAction | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(0);
  const [patch, setPatch] = useState<DocumentPatch | null>(null);
  const [preview, setPreview] = useState("");
  const queryRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setFocused(0); }, [query]);

  const runAction = useCallback(async (action: DocAIAction) => {
    setPhase("loading");
    setCurrentAction(action);
    setError("");
    setPatch(null);
    setPreview("");

    try {
      // Get current document as structured blocks
      const html = editor.getHTML();
      const document = htmlToBlocks(html, "Document");
      
      // Get selected block IDs (simplified - in production, track block IDs properly)
      const selectedBlockIds = document.blocks.slice(0, 3).map(b => b.id);

      const res = await fetch("/api/groq/document-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text: selectedText,
          subject,
          document,
          selectedBlockIds,
        }),
      });

      if (!res.ok) {
        throw new Error("AI service unavailable");
      }

      const data = await res.json();
      setPatch(data.patch);
      setPreview(data.preview || "Changes ready to apply");
      setPhase("review");
    } catch (e: any) {
      setError(e.message || "Something went wrong. Try again.");
      setPhase("error");
    }
  }, [editor, selectedText, subject]);

  const handleAccept = () => {
    if (patch && currentAction) {
      // Apply patch to document
      const html = editor.getHTML();
      const document = htmlToBlocks(html, "Document");
      const updatedDoc = applyPatch(document, patch);
      const newHtml = blocksToHtml(updatedDoc.blocks);
      
      // Update editor with new HTML
      editor.chain().focus().setContent(newHtml).run();
      
      onActionComplete?.(currentAction, patch);
    }
    onClose();
  };

  const handleDiscard = () => {
    onClose();
  };

  const handleRetry = () => {
    if (currentAction) {
      runAction(currentAction);
    }
  };

  const filteredActions = query
    ? AI_ACTIONS.filter(action => {
        const q = query.toLowerCase();
        return action.label.toLowerCase().includes(q) || 
               action.description.toLowerCase().includes(q);
      })
    : AI_ACTIONS;

  const groups = [...new Set(filteredActions.map(a => a.group))];

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => (f + 1) % Math.max(filteredActions.length, 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocused(f => (f - 1 + Math.max(filteredActions.length, 1)) % Math.max(filteredActions.length, 1)); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredActions[focused]) {
        runAction(filteredActions[focused].id);
      }
    }
  };

  return (
    <motion.div
      data-ai-overlay
      initial={{ opacity: 0, scale: 0.95, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -6 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className="fixed z-[9999] w-[420px] rounded-2xl border border-border/60 bg-card shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{ top: position.top, left: position.left }}
      onMouseDown={e => {
        const target = e.target as HTMLElement;
        if (target.closest("input,textarea")) return;
        e.preventDefault();
      }}
    >
      {/* Header */}
      {phase !== "menu" && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/30 bg-primary/5">
          <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
            {phase === "loading"
              ? <Loader2 className="w-3 h-3 text-primary animate-spin" />
              : <Sparkles className="w-3 h-3 text-primary" />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 flex-1">
            {phase === "loading" ? "AI thinking…"
            : phase === "review" ? "Review changes"
            : "Something went wrong"}
          </span>
          <button onClick={() => { setPhase("menu"); setError(""); }}
            className="text-muted-foreground/30 hover:text-muted-foreground ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* MENU */}
        {phase === "menu" && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Search */}
            <div className="px-3 py-2 border-b border-border/30">
              <input
                ref={queryRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search AI actions…"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-muted/20 rounded-lg px-3 py-2 text-sm outline-none border border-border/40 focus:border-primary/40"
              />
            </div>

            {/* Actions list */}
            <div className="max-h-[420px] overflow-y-auto py-2">
              {groups.map(group => (
                <div key={group}>
                  <p className="px-4 pt-2 pb-1 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/35">
                    {group}
                  </p>
                  {filteredActions.filter(a => a.group === group).map((action, idx) => {
                    const globalIdx = filteredActions.indexOf(action);
                    const isFocused = globalIdx === focused;
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onMouseEnter={() => setFocused(globalIdx)}
                        onClick={() => runAction(action.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          isFocused ? "bg-primary/10 border-primary/20" : "hover:bg-muted/40 border-transparent",
                          "border rounded-lg"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isFocused ? "bg-primary/20" : "bg-muted/50"
                        )}>
                          <Icon className={cn("w-3.5 h-3.5 transition-colors", isFocused ? "text-primary" : "text-muted-foreground/60")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground/80">{action.label}</p>
                          <p className="text-[11px] text-muted-foreground/40">{action.description}</p>
                        </div>
                        {isFocused && (
                          <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* LOADING */}
        {phase === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-4 py-8 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground/60">AI is editing your document…</span>
          </motion.div>
        )}

        {/* REVIEW */}
        {phase === "review" && (
          <motion.div key="review" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col">
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {preview}
              </p>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/30 text-sm leading-relaxed max-h-60 overflow-y-auto">
                <p className="text-muted-foreground/60 text-xs mb-2">
                  Changes will be applied to the selected text.
                </p>
                {patch?.edits.map((edit, i) => (
                  <div key={i} className="text-xs font-mono text-muted-foreground/50 mb-1">
                    {edit.op}: {edit.op === "replace" ? edit.path : "block operation"}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 py-3 flex items-center gap-2 flex-wrap border-t border-border/30">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleAccept}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" /> Apply changes
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleDiscard}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted/60 text-foreground text-sm font-medium hover:bg-muted/80"
              >
                Discard
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleRetry}
                className="px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ERROR */}
        {phase === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-4 py-6">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <div className="flex items-center gap-2">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleDiscard}
                className="px-4 py-2 rounded-xl bg-muted/60 text-foreground text-sm font-medium hover:bg-muted/80"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
