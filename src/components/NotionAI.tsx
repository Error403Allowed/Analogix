"use client";

import {
  useState, useRef, useEffect, useCallback, KeyboardEvent,
} from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Sparkles, Wand2, SpellCheck, AlignLeft, Maximize2, Minimize2,
  BookOpen, MessageSquare, Loader2, Check, RotateCcw, X, ArrowRight,
  Zap, Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";

// ── Types ──────────────────────────────────────────────────────────────────

export type AIAction =
  | "improve" | "fix" | "summarise" | "shorter" | "longer"
  | "formal" | "casual" | "explain" | "continue" | "custom";

interface AIMenuItem {
  id: AIAction;
  label: string;
  description: string;
  icon: React.ElementType;
  group: string;
}

const MENU_ITEMS: AIMenuItem[] = [
  { id: "continue", label: "Continue writing",       description: "Expand what's already there",  icon: Zap,           group: "Generate" },
  { id: "improve",  label: "Improve writing",        description: "Enhance clarity and flow",     icon: Wand2,         group: "Edit" },
  { id: "fix",      label: "Fix spelling & grammar", description: "Correct language errors",      icon: SpellCheck,    group: "Edit" },
  { id: "formal",   label: "Make more formal",       description: "Professional tone",            icon: BookOpen,      group: "Edit" },
  { id: "casual",   label: "Make more casual",       description: "Conversational tone",          icon: MessageSquare, group: "Edit" },
  { id: "summarise",label: "Summarise",              description: "Condense to key points",       icon: AlignLeft,     group: "Transform" },
  { id: "shorter",  label: "Make shorter",           description: "Remove filler and trim",       icon: Minimize2,     group: "Transform" },
  { id: "longer",   label: "Make longer",            description: "Expand with more detail",      icon: Maximize2,     group: "Transform" },
  { id: "explain",  label: "Explain this",           description: "Break down in simple terms",   icon: Brain,         group: "Transform" },
];

// ── Prompts ────────────────────────────────────────────────────────────────

function buildPrompt(
  action: AIAction,
  text: string,
  custom?: string,
  subject?: string,
): string {
  const ctx  = subject ? ` The document subject is ${subject}.` : "";
  const base = `You are an expert writing assistant in a student notes app.${ctx} Output ONLY the rewritten or generated text — no preamble, no explanation, no code fences, no markdown backticks. Plain text only.`;

  const map: Record<AIAction, string> = {
    improve:  `${base}\n\nImprove the clarity, flow, and quality of this text:\n\n${text}`,
    fix:      `${base}\n\nFix all spelling, grammar, and punctuation in this text:\n\n${text}`,
    summarise:`${base}\n\nSummarise this text into concise bullet points (use • character, one per line):\n\n${text}`,
    shorter:  `${base}\n\nMake this text significantly shorter while keeping the key meaning:\n\n${text}`,
    longer:   `${base}\n\nExpand this text with more detail, examples, and explanation:\n\n${text}`,
    formal:   `${base}\n\nRewrite this text in a formal, professional academic tone:\n\n${text}`,
    casual:   `${base}\n\nRewrite this text in a friendly, conversational tone:\n\n${text}`,
    explain:  `${base}\n\nExplain this text in simple terms as if teaching a student:\n\n${text}`,
    continue: `${base}\n\nContinue writing naturally from where this text ends:\n\n${text}`,
    custom:   `${base}\n\nInstruction: ${custom}\n\nText:\n\n${text}`,
  };
  return map[action];
}

// ── Streaming ─────────────────────────────────────────────────────────────

async function streamAI(
  prompt: string,
  onChunk: (t: string) => void,
  onDone:  () => void,
  onError: (e: string) => void,
  signal:  AbortSignal,
) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok || !res.body) { onError("AI service unavailable."); return; }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buf     = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw);
          // Anthropic SSE: content_block_delta carries text_delta chunks
          if (parsed?.type === "content_block_delta" && parsed?.delta?.type === "text_delta") {
            const t = parsed.delta.text ?? "";
            if (t) onChunk(t);
          }
        } catch { /* skip malformed lines */ }
      }
    }
    onDone();
  } catch (e: any) {
    if (e?.name === "AbortError") return;
    onError("Something went wrong. Try again.");
  }
}

// ── Live writer ────────────────────────────────────────────────────────────
// Uses direct ProseMirror transactions (editor.view.dispatch) so each chunk
// is applied atomically and synchronously — no React batching issues.

interface LiveWriter { abort: () => void }

function liveWrite(
  editor: Editor,
  prompt: string,
  onStatus: (s: "writing" | "done" | "error") => void,
  onRange:  (from: number, to: number) => void,
  onError:  (e: string) => void,
): LiveWriter {
  const ctrl = new AbortController();
  let fromPos = -1;

  streamAI(
    prompt,
    (chunk) => {
      // Use raw ProseMirror dispatch — bypasses TipTap command queue entirely
      const { state, dispatch } = editor.view;
      if (fromPos === -1) fromPos = state.selection.from;
      const tr = state.tr.insertText(chunk);
      dispatch(tr);
      const toPos = editor.view.state.selection.from;
      onRange(fromPos, toPos);
    },
    () => {
      const toPos = editor.view.state.selection.from;
      if (fromPos === -1) fromPos = toPos;
      onRange(fromPos, toPos);
      onStatus("done");
    },
    (err) => {
      onStatus("error");
      onError(err);
    },
    ctrl.signal,
  );

  onStatus("writing");
  return { abort: () => ctrl.abort() };
}

// ── Animation variants ─────────────────────────────────────────────────────

const panelVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.95, y: -8 },
  visible: { opacity: 1, scale: 1,    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 26 } },
  exit:    { opacity: 0, scale: 0.95, y: -6,
    transition: { duration: 0.14 } },
};

const itemVariants: Variants = {
  hidden:  { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.04, duration: 0.16, ease: "easeOut" },
  }),
};

// ── Typing dots component ──────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5" style={{ height: 16 }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "hsl(var(--primary))" }}
          animate={{ y: [0, -6, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.65,
            delay: i * 0.13,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── AICommandPalette (/ai on empty line) ───────────────────────────────────

interface CommandPaletteProps {
  editor:   Editor;
  subject?: string;
  position: { top: number; left: number };
  onClose:  () => void;
}

export function AICommandPalette({ editor, subject, position, onClose }: CommandPaletteProps) {
  const [query,   setQuery]   = useState("");
  const [focused, setFocused] = useState(0);
  const [writing, setWriting] = useState(false);
  const [error,   setError]   = useState("");
  const inputRef  = useRef<HTMLInputElement>(null);
  const writerRef = useRef<LiveWriter | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setFocused(0); }, [query]);

  const filtered  = MENU_ITEMS.filter(
    item => !query || item.label.toLowerCase().includes(query.toLowerCase())
  );
  const groups    = [...new Set(filtered.map(i => i.group))];
  const totalRows = filtered.length + (query ? 1 : 0);

  const runAction = useCallback((action: AIAction, custom?: string) => {
    if (writing) return;

    // Delete "/ai" from the current block
    const { $anchor } = editor.state.selection;
    editor.chain().focus().deleteRange({
      from: $anchor.start(),
      to:   $anchor.end(),
    }).run();

    setWriting(true);
    setError("");

    // Use the doc text as context
    const docText = editor.state.doc.textContent.slice(0, 1500);
    const prompt  = buildPrompt(action, custom || docText, custom, subject);

    writerRef.current = liveWrite(
      editor, prompt,
      (status) => {
        if (status === "done")  { setWriting(false); onClose(); }
        if (status === "error") { setWriting(false); }
      },
      () => {},
      (e) => setError(e),
    );
  }, [editor, subject, writing, onClose]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { writerRef.current?.abort(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => (f + 1) % Math.max(totalRows, 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocused(f => (f - 1 + Math.max(totalRows, 1)) % Math.max(totalRows, 1)); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (focused < filtered.length) runAction(filtered[focused].id);
      else if (query)                runAction("custom", query);
    }
  };

  return (
    <motion.div
      data-ai-overlay
      variants={panelVariants} initial="hidden" animate="visible" exit="exit"
      className="fixed z-[9999] w-[400px] rounded-2xl border border-border/60 bg-card shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{ top: position.top, left: position.left }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          {writing ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                   : <Sparkles className="w-3.5 h-3.5 text-primary" />}
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder={writing ? "Writing…" : "Ask AI to write or edit…"}
          disabled={writing}
          autoComplete="off" autoCorrect="off" autoCapitalize="off"
          spellCheck={false} data-form-type="other" data-lpignore="true"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
        />
        {query && !writing && (
          <button onClick={() => setQuery("")} className="text-muted-foreground/30 hover:text-muted-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => { writerRef.current?.abort(); onClose(); }}
          className="text-muted-foreground/30 hover:text-muted-foreground ml-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && <p className="px-4 py-2 text-xs text-destructive bg-destructive/5">{error}</p>}

      {/* Writing state */}
      {writing && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-4 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <TypingDots />
            <span className="text-xs text-muted-foreground/60">Writing into your document…</span>
          </div>
          <button
            onClick={() => { writerRef.current?.abort(); setWriting(false); onClose(); }}
            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground underline"
          >
            Stop
          </button>
        </motion.div>
      )}

      {/* Menu */}
      {!writing && (
        <div className="max-h-80 overflow-y-auto py-2">
          {groups.map(group => (
            <div key={group}>
              <p className="px-4 pt-2 pb-1 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/35">
                {group}
              </p>
              {filtered.filter(i => i.group === group).map(item => {
                const idx      = filtered.indexOf(item);
                const isFocused = idx === focused;
                const Icon     = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    custom={idx} variants={itemVariants} initial="hidden" animate="visible"
                    onMouseEnter={() => setFocused(idx)}
                    onClick={() => runAction(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      isFocused ? "bg-primary/10" : "hover:bg-muted/40"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isFocused ? "bg-primary/20" : "bg-muted/50"
                    )}>
                      <Icon className={cn("w-3.5 h-3.5 transition-colors",
                        isFocused ? "text-primary" : "text-muted-foreground/60")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium transition-colors",
                        isFocused ? "text-foreground" : "text-foreground/70")}>
                        {item.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground/40 mt-0.5">{item.description}</p>
                    </div>
                    <AnimatePresence>
                      {isFocused && (
                        <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                          <ArrowRight className="w-3.5 h-3.5 text-primary/50 shrink-0" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          ))}

          {query && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onMouseEnter={() => setFocused(filtered.length)}
              onClick={() => runAction("custom", query)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-t border-border/20 mt-1",
                focused === filtered.length ? "bg-primary/10" : "hover:bg-muted/40"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <p className="text-sm font-medium text-primary truncate">"{query}"</p>
              <ArrowRight className="w-3.5 h-3.5 text-primary/50 ml-auto shrink-0" />
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── FloatingAIToolbar (text selection) ────────────────────────────────────

interface FloatingAIToolbarProps {
  editor:       Editor;
  subject?:     string;
  selectedText: string;
  selFrom:      number;
  selTo:        number;
  position:     { top: number; left: number };
  onClose:      () => void;
}

type Phase = "menu" | "writing" | "done" | "error";

export function FloatingAIToolbar({
  editor, subject, selectedText, selFrom, selTo, position, onClose,
}: FloatingAIToolbarProps) {
  const [phase,         setPhase]         = useState<Phase>("menu");
  const [currentAction, setCurrentAction] = useState<AIAction | null>(null);
  const [error,         setError]         = useState("");
  const [customInput,   setCustomInput]   = useState("");
  const [showCustom,    setShowCustom]    = useState(false);
  const [aiFrom,        setAiFrom]        = useState(0);
  const [aiTo,          setAiTo]          = useState(0);
  const writerRef = useRef<LiveWriter | null>(null);
  const customRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (showCustom) customRef.current?.focus(); }, [showCustom]);

  const runAction = useCallback((action: AIAction, custom?: string) => {
    setCurrentAction(action);
    setPhase("writing");
    setError("");
    setShowCustom(false);

    // Delete selection and record where AI will write
    editor.chain().focus().deleteRange({ from: selFrom, to: selTo }).run();
    const insertAt = editor.state.selection.from;
    setAiFrom(insertAt);

    const prompt = buildPrompt(action, selectedText, custom, subject);

    writerRef.current = liveWrite(
      editor, prompt,
      (status) => {
        if (status === "done")  setPhase("done");
        if (status === "error") setPhase("error");
      },
      (_from, to) => setAiTo(to),
      (e) => setError(e),
    );
  }, [editor, subject, selectedText, selFrom, selTo]);

  const handleAccept  = () => onClose();

  const handleDiscard = () => {
    // Remove AI text, restore original
    const currentTo = editor.view.state.selection.from;
    const to = aiTo > 0 ? aiTo : currentTo;
    editor.chain().focus()
      .deleteRange({ from: aiFrom, to })
      .insertContentAt(aiFrom, selectedText)
      .run();
    onClose();
  };

  const handleKeepBoth = () => {
    // Re-insert original text before AI text
    editor.chain().focus().insertContentAt(aiFrom, selectedText + "\n").run();
    onClose();
  };

  const handleRetry = () => {
    if (!currentAction) return;
    editor.chain().focus()
      .deleteRange({ from: aiFrom, to: aiTo })
      .insertContentAt(aiFrom, selectedText)
      .run();
    editor.commands.setTextSelection({ from: aiFrom, to: aiFrom + selectedText.length });
    runAction(currentAction, customInput || undefined);
  };

  const handleAbort = () => {
    writerRef.current?.abort();
    const currentTo = editor.view.state.selection.from;
    const to = aiTo > 0 ? aiTo : currentTo;
    editor.chain().focus()
      .deleteRange({ from: aiFrom, to })
      .insertContentAt(aiFrom, selectedText)
      .run();
    setPhase("menu");
  };

  return (
    <motion.div
      data-ai-overlay
      variants={panelVariants} initial="hidden" animate="visible" exit="exit"
      className="fixed z-[9999] w-[420px] rounded-2xl border border-border/60 bg-card shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{ top: position.top, left: position.left }}
      onMouseDown={e => e.preventDefault()}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/30 bg-primary/5">
        <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
          {phase === "writing"
            ? <Loader2 className="w-3 h-3 text-primary animate-spin" />
            : <Sparkles className="w-3 h-3 text-primary" />}
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 flex-1">
          {phase === "menu"    ? "AI Edit"
          : phase === "writing" ? "Editing live…"
          : phase === "done"    ? "Done — keep or discard?"
          :                       "Something went wrong"}
        </span>
        <span className="text-[10px] text-muted-foreground/30 truncate max-w-[160px]">
          "{selectedText.slice(0, 35)}{selectedText.length > 35 ? "…" : ""}"
        </span>
        <button onClick={() => { writerRef.current?.abort(); onClose(); }}
          className="text-muted-foreground/30 hover:text-muted-foreground ml-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence mode="wait">

        {/* MENU */}
        {phase === "menu" && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-2">
            <AnimatePresence mode="wait">
              {showCustom ? (
                <motion.div key="inp"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="px-4 pb-2">
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      ref={customRef}
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                      placeholder="Describe what to do…"
                      onKeyDown={e => {
                        if (e.key === "Enter" && customInput.trim()) runAction("custom", customInput.trim());
                        if (e.key === "Escape") { setShowCustom(false); setCustomInput(""); }
                      }}
                      autoComplete="off" autoCorrect="off" data-form-type="other" data-lpignore="true"
                      className="flex-1 bg-muted/30 rounded-lg px-3 py-2 text-sm outline-none border border-primary/20 focus:border-primary/40 transition-colors"
                    />
                    <button
                      onClick={() => { if (customInput.trim()) runAction("custom", customInput.trim()); }}
                      disabled={!customInput.trim()}
                      className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.button key="cust" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => setShowCustom(true)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary">Custom instruction…</span>
                </motion.button>
              )}
            </AnimatePresence>

            <div className="h-px bg-border/25 mx-4 my-1" />
            <p className="px-4 pt-2 pb-1 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/35">Edit</p>
            {MENU_ITEMS.filter(i => i.group === "Edit").map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.button key={item.id} custom={idx} variants={itemVariants} initial="hidden" animate="visible"
                  onClick={() => runAction(item.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-muted/40 group-hover:bg-primary/10 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground/40">{item.description}</p>
                  </div>
                </motion.button>
              );
            })}

            <div className="h-px bg-border/25 mx-4 my-1" />
            <p className="px-4 pt-2 pb-1 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/35">Transform</p>
            {MENU_ITEMS.filter(i => i.group === "Transform").map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.button key={item.id} custom={idx + 4} variants={itemVariants} initial="hidden" animate="visible"
                  onClick={() => runAction(item.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors group">
                  <div className="w-7 h-7 rounded-lg bg-muted/40 group-hover:bg-primary/10 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground/40">{item.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* WRITING */}
        {phase === "writing" && (
          <motion.div key="writing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TypingDots />
              <span className="text-xs text-muted-foreground/60">Editing your text live…</span>
            </div>
            <button onClick={handleAbort}
              className="text-[11px] text-muted-foreground/50 hover:text-destructive flex items-center gap-1">
              <X className="w-3 h-3" /> Stop
            </button>
          </motion.div>
        )}

        {/* DONE / ERROR */}
        {(phase === "done" || phase === "error") && (
          <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="px-4 py-3 flex items-center gap-2 flex-wrap">
            {phase === "error" && <p className="w-full text-xs text-destructive mb-1">{error}</p>}
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleAccept}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-sm">
              <Check className="w-3.5 h-3.5" /> Accept
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleKeepBoth}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-muted/60 text-foreground text-sm font-medium hover:bg-muted">
              Keep both
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleRetry}
              className="px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40">
              <RotateCcw className="w-3.5 h-3.5" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleDiscard}
              className="px-3 py-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Discard
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
