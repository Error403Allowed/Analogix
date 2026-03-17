"use client";

import React, {
  useState, useRef, useEffect, useCallback, KeyboardEvent,
} from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Sparkles, Wand2, SpellCheck, AlignLeft, Maximize2, Minimize2,
  BookOpen, MessageSquare, Loader2, Check, RotateCcw, X, ArrowRight,
  Zap, Brain, Bold, Italic, Underline, Strikethrough, Code, Heading1,
  Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon,
  ArrowDown, ArrowUp, Minus, Sigma, Image, Circle, Highlighter, Table,
  AlignCenter, AlignRight, AlignJustify, IndentIncrease, IndentDecrease,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";

// ── Types ──────────────────────────────────────────────────────────────────

export type AIAction =
  | "improve" | "fix" | "summarise" | "shorter" | "longer"
  | "formal" | "casual" | "explain" | "continue" | "custom";

export type FormatAction =
  | "heading1" | "heading2" | "heading3"
  | "bold" | "italic" | "underline" | "strike" | "code"
  | "bulletList" | "orderedList" | "blockquote"
  | "link";

interface AIMenuItem {
  id: AIAction;
  label: string;
  description: string;
  icon: React.ElementType;
  group: string;
}

interface FormatMenuItem {
  id: FormatAction;
  label: string;
  description: string;
  icon: React.ElementType;
  group: string;
  aliases?: string[];
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

const FORMAT_ITEMS: FormatMenuItem[] = [
  { id: "heading1", label: "Heading 1", description: "Large section heading", icon: Heading1, group: "Formatting", aliases: ["h1", "title", "header"] },
  { id: "heading2", label: "Heading 2", description: "Section heading", icon: Heading2, group: "Formatting", aliases: ["h2", "subtitle", "header"] },
  { id: "heading3", label: "Heading 3", description: "Subheading", icon: Heading3, group: "Formatting", aliases: ["h3", "header"] },
  { id: "bold", label: "Bold", description: "Emphasise selection", icon: Bold, group: "Formatting", aliases: ["strong", "b"] },
  { id: "italic", label: "Italic", description: "Emphasise lightly", icon: Italic, group: "Formatting", aliases: ["emphasize", "i", "emphasis"] },
  { id: "underline", label: "Underline", description: "Underline selection", icon: Underline, group: "Formatting", aliases: ["u"] },
  { id: "strike", label: "Strikethrough", description: "Strike out", icon: Strikethrough, group: "Formatting", aliases: ["strikethrough", "s", "delete"] },
  { id: "code", label: "Inline code", description: "Code formatting", icon: Code, group: "Formatting", aliases: ["inline", "monospace", "tt"] },
  { id: "bulletList", label: "Dot points", description: "Toggle dot point list", icon: List, group: "Formatting", aliases: ["bullet", "unordered", "list", "itemize"] },
  { id: "orderedList", label: "Numbered list", description: "Toggle numbered list", icon: ListOrdered, group: "Formatting", aliases: ["numbered", "ordered", "list", "enumerate"] },
  { id: "blockquote", label: "Quote", description: "Toggle block quote", icon: Quote, group: "Formatting", aliases: ["quote", "citation"] },
  { id: "link", label: "Link", description: "Add or edit link", icon: LinkIcon, group: "Formatting", aliases: ["url", "hyperlink", "anchor"] },
];

const QUICK_FORMAT_IDS: FormatAction[] = [
  "heading2",
  "bold",
  "italic",
  "underline",
  "link",
  "strike",
  "code",
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
  subject?: string,
) {
  try {
    const res = await fetch("/api/groq/notion-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ prompt, subject }),
    });

    if (!res.ok || !res.body) { onError("AI service unavailable."); return; }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        
        const data = trimmed.slice(5).trim(); // Remove "data: " prefix
        if (data === "[DONE]") {
          onDone();
          return;
        }
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || "";
          if (content) onChunk(content);
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
    
    // Process any remaining data in buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data:")) {
        const data = trimmed.slice(5).trim();
        if (data !== "[DONE]") {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) onChunk(content);
          } catch (e) {
            // Skip invalid JSON
          }
        }
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
  subject?: string,
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
    subject,
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
    <div className="flex items-center gap-1" style={{ height: 12 }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "hsl(var(--primary))" }}
          animate={{ y: [0, -4, 0] }}
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

// ── AICommandPalette (slash menu) ─────────────────────────────────────────

export type CommandItem = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  group: string;
  type: "ai" | "format";
  run?: () => void;
  aliases?: string[];
};

interface CommandPaletteProps {
  editor:   Editor;
  subject?: string;
  position: { top: number; left: number };
  query: string;
  focused: number;
  onFocusedChange: (index: number) => void;
  onSelect: (item: CommandItem) => void;
  onClose:  () => void;
}

export function AICommandPalette({ editor, subject, position, query, focused, onFocusedChange, onSelect, onClose }: CommandPaletteProps) {
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState("");
  const writerRef = useRef<LiveWriter | null>(null);

  useEffect(() => { setWriting(false); setError(""); }, [query]);

  const deleteSlashCommand = useCallback(() => {
    const { $anchor } = editor.state.selection;
    const blockText = editor.state.doc.textBetween($anchor.start(), $anchor.end(), "\n", "\0");
    const before = blockText.slice(0, $anchor.parentOffset);
    const match = before.match(/(?:^|\s)\/(\S*)$/);
    if (!match) return;
    const slashIndex = before.lastIndexOf("/");
    const from = $anchor.start() + slashIndex;
    const to = $anchor.start() + $anchor.parentOffset;
    editor.chain().focus().deleteRange({ from, to }).run();
  }, [editor]);

  const runAIAction = useCallback((action: AIAction, custom?: string) => {
    if (writing) return;
    deleteSlashCommand();
    setWriting(true);
    setError("");

    const docText = editor.state.doc.textContent.slice(0, 2000);
    const prompt = buildPrompt(action, custom || docText, custom, subject);

    writerRef.current = liveWrite(
      editor, prompt,
      (status) => {
        if (status === "done")  { setWriting(false); onClose(); }
        if (status === "error") { setWriting(false); }
      },
      () => {},
      (e) => setError(e),
      subject,
    );
  }, [editor, subject, writing, deleteSlashCommand, onClose]);

  const runFormatAction = useCallback((fn: () => void) => {
    deleteSlashCommand();
    fn();
    onClose();
  }, [deleteSlashCommand, onClose]);

  const applyListIndent = useCallback((dir: "in" | "out") => {
    const chain = editor.chain().focus();
    if (dir === "in") {
      if (editor.can().sinkListItem("listItem")) chain.sinkListItem("listItem").run();
      else if (editor.can().sinkListItem("taskItem")) chain.sinkListItem("taskItem").run();
    } else {
      if (editor.can().liftListItem("listItem")) chain.liftListItem("listItem").run();
      else if (editor.can().liftListItem("taskItem")) chain.liftListItem("taskItem").run();
    }
  }, [editor]);

  // Palettes (static, no need to memoize)
  const colorPalette = [
    { name: "Red", value: "#ef4444" },
    { name: "Orange", value: "#f97316" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Yellow", value: "#eab308" },
    { name: "Lime", value: "#84cc16" },
    { name: "Green", value: "#22c55e" },
    { name: "Teal", value: "#14b8a6" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Violet", value: "#8b5cf6" },
    { name: "Pink", value: "#ec4899" },
    { name: "Gray", value: "#64748b" },
  ];

  const highlightPalette = [
    { name: "Yellow", value: "#fde047" },
    { name: "Orange", value: "#fdba74" },
    { name: "Red", value: "#fca5a5" },
    { name: "Pink", value: "#f9a8d4" },
    { name: "Purple", value: "#d8b4fe" },
    { name: "Indigo", value: "#c7d2fe" },
    { name: "Blue", value: "#93c5fd" },
    { name: "Teal", value: "#99f6e4" },
    { name: "Green", value: "#86efac" },
    { name: "Lime", value: "#bef264" },
    { name: "Gray", value: "#e2e8f0" },
  ];

  // Memoize all item arrays to prevent recalculation on every render
  const formatItems = React.useMemo<CommandItem[]>(() => [
    { id: "paragraph", label: "Paragraph", description: "Normal text", icon: AlignLeft, group: "Blocks", type: "format", run: () => editor.chain().focus().setParagraph().run() },
    { id: "heading1", label: "Heading 1", description: "Large heading", icon: Heading1, group: "Blocks", type: "format", run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), aliases: ["h1", "title", "header"] },
    { id: "heading2", label: "Heading 2", description: "Section heading", icon: Heading2, group: "Blocks", type: "format", run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), aliases: ["h2", "subtitle", "header"] },
    { id: "heading3", label: "Heading 3", description: "Subheading", icon: Heading3, group: "Blocks", type: "format", run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), aliases: ["h3", "header"] },
    { id: "heading4", label: "Heading 4", description: "Small heading", icon: Heading3, group: "Blocks", type: "format", run: () => editor.chain().focus().toggleHeading({ level: 4 }).run(), aliases: ["h4", "header"] },
    { id: "heading5", label: "Heading 5", description: "Smaller heading", icon: Heading3, group: "Blocks", type: "format", run: () => editor.chain().focus().toggleHeading({ level: 5 }).run(), aliases: ["h5", "header"] },
    { id: "heading6", label: "Heading 6", description: "Tiny heading", icon: Heading3, group: "Blocks", type: "format", run: () => editor.chain().focus().toggleHeading({ level: 6 }).run(), aliases: ["h6", "header"] },
    { id: "blockquote", label: "Blockquote", description: "Quote block", icon: Quote, group: "Blocks", type: "format", run: () => editor.chain().focus().toggleBlockquote().run(), aliases: ["quote", "citation"] },
    { id: "codeblock", label: "Code block", description: "Monospace code block", icon: Code, group: "Blocks", type: "format", run: () => editor.chain().focus().toggleCodeBlock().run(), aliases: ["code", "pre", "programming"] },
    { id: "bulletlist", label: "Dot points", description: "Bullet list", icon: List, group: "Lists", type: "format", run: () => editor.chain().focus().toggleBulletList().run(), aliases: ["bullet", "unordered", "list", "itemize"] },
    { id: "orderedlist", label: "Numbered list", description: "Ordered list", icon: ListOrdered, group: "Lists", type: "format", run: () => editor.chain().focus().toggleOrderedList().run(), aliases: ["numbered", "ordered", "list", "enumerate"] },
    { id: "tasklist", label: "Task list", description: "Checklist", icon: Check, group: "Lists", type: "format", run: () => editor.chain().focus().toggleTaskList().run(), aliases: ["todo", "checkbox", "checklist"] },
    { id: "indent", label: "Indent list item", description: "Increase list depth", icon: IndentIncrease, group: "Lists", type: "format", run: () => applyListIndent("in") },
    { id: "outdent", label: "Outdent list item", description: "Decrease list depth", icon: IndentDecrease, group: "Lists", type: "format", run: () => applyListIndent("out") },
    { id: "divider", label: "Horizontal rule", description: "Divider line", icon: Minus, group: "Insert", type: "format", run: () => editor.chain().focus().setHorizontalRule().run(), aliases: ["line", "separator", "hr"] },
    { id: "hardbreak", label: "Line break", description: "Insert line break", icon: AlignLeft, group: "Insert", type: "format", run: () => editor.chain().focus().setHardBreak().run(), aliases: ["newline", "break", "enter"] },
    { id: "inline-math", label: "Inline math", description: "Insert inline LaTeX", icon: Sigma, group: "Insert", type: "format", run: () => {
      const latex = window.prompt("Inline LaTeX", "");
      if (!latex) return;
      (editor.chain().focus() as any).insertInlineMath({ latex }).run();
    }, aliases: ["latex", "equation", "formula", "math"] },
    { id: "block-math", label: "Block math", description: "Insert block LaTeX", icon: Sigma, group: "Insert", type: "format", run: () => {
      const latex = window.prompt("Block LaTeX", "");
      if (!latex) return;
      (editor.chain().focus() as any).insertBlockMath({ latex }).run();
    }, aliases: ["latex", "equation", "formula", "math"] },
    { id: "image", label: "Image from URL", description: "Insert image", icon: Image, group: "Insert", type: "format", run: () => {
      const url = window.prompt("Image URL", "https://");
      if (!url) return;
      editor.chain().focus().setImage({ src: url }).run();
    }, aliases: ["picture", "photo", "img"] },
    { id: "link", label: "Add or edit link", description: "Set link on selection", icon: LinkIcon, group: "Insert", type: "format", run: () => {
      const prev = editor.getAttributes("link").href as string | undefined;
      const url = window.prompt("Enter URL", prev || "https://");
      if (url === null) return;
      if (!url.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
      else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    }, aliases: ["url", "hyperlink", "anchor"] },
    { id: "bold", label: "Bold", description: "Emphasise selection", icon: Bold, group: "Text", type: "format", run: () => editor.chain().focus().toggleBold().run(), aliases: ["strong", "b"] },
    { id: "italic", label: "Italic", description: "Emphasise lightly", icon: Italic, group: "Text", type: "format", run: () => editor.chain().focus().toggleItalic().run(), aliases: ["emphasize", "i", "emphasis"] },
    { id: "underline", label: "Underline", description: "Underline selection", icon: Underline, group: "Text", type: "format", run: () => editor.chain().focus().toggleUnderline().run(), aliases: ["u"] },
    { id: "strike", label: "Strikethrough", description: "Strike out", icon: Strikethrough, group: "Text", type: "format", run: () => editor.chain().focus().toggleStrike().run(), aliases: ["strikethrough", "s", "delete"] },
    { id: "code", label: "Inline code", description: "Code formatting", icon: Code, group: "Text", type: "format", run: () => editor.chain().focus().toggleCode().run(), aliases: ["inline", "monospace", "tt"] },
    { id: "subscript", label: "Subscript", description: "Lowered text", icon: ArrowDown, group: "Text", type: "format", run: () => editor.chain().focus().toggleSubscript().run(), aliases: ["sub"] },
    { id: "superscript", label: "Superscript", description: "Raised text", icon: ArrowUp, group: "Text", type: "format", run: () => editor.chain().focus().toggleSuperscript().run(), aliases: ["superscript", "sup", "exponent"] },
    { id: "clear", label: "Clear formatting", description: "Remove marks & nodes", icon: X, group: "Text", type: "format", run: () => editor.chain().focus().unsetAllMarks().clearNodes().run(), aliases: ["reset", "remove", "plain"] },
    { id: "align-left", label: "Align left", description: "Left aligned text", icon: AlignLeft, group: "Alignment", type: "format", run: () => editor.chain().focus().setTextAlign("left").run() },
    { id: "align-center", label: "Align center", description: "Centered text", icon: AlignCenter, group: "Alignment", type: "format", run: () => editor.chain().focus().setTextAlign("center").run() },
    { id: "align-right", label: "Align right", description: "Right aligned text", icon: AlignRight, group: "Alignment", type: "format", run: () => editor.chain().focus().setTextAlign("right").run() },
    { id: "align-justify", label: "Justify", description: "Justified text", icon: AlignJustify, group: "Alignment", type: "format", run: () => editor.chain().focus().setTextAlign("justify").run(), aliases: ["justified", "full"] },
  ], [editor, applyListIndent]);

  const colorItems = React.useMemo<CommandItem[]>(() => colorPalette.map((c) => ({
    id: `color-${c.name.toLowerCase()}`,
    label: `Text color: ${c.name}`,
    description: `Set text color to ${c.name}`,
    icon: Circle,
    group: "Color",
    type: "format",
    run: () => editor.chain().focus().setColor(c.value).run(),
  })), [editor]);

  const clearColorItem: CommandItem = {
    id: "color-reset",
    label: "Text color: Default",
    description: "Remove custom text color",
    icon: Circle,
    group: "Color",
    type: "format",
    run: () => editor.chain().focus().unsetColor().run(),
  };

  const highlightItems = React.useMemo<CommandItem[]>(() => highlightPalette.map((c) => ({
    id: `highlight-${c.name.toLowerCase()}`,
    label: `Highlight: ${c.name}`,
    description: `Highlight text ${c.name.toLowerCase()}`,
    icon: Highlighter,
    group: "Highlight",
    type: "format",
    run: () => editor.chain().focus().toggleHighlight({ color: c.value }).run(),
  })), [editor]);

  const clearHighlightItem: CommandItem = {
    id: "highlight-clear",
    label: "Highlight: Clear",
    description: "Remove highlight",
    icon: Highlighter,
    group: "Highlight",
    type: "format",
    run: () => editor.chain().focus().unsetHighlight().run(),
  };

  const tableInsertItems = React.useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];
    for (let rows = 1; rows <= 6; rows++) {
      for (let cols = 1; cols <= 6; cols++) {
        items.push({
          id: `table-${rows}x${cols}`,
          label: `Table ${rows}×${cols}`,
          description: `Insert a ${rows} by ${cols} table`,
          icon: Table,
          group: "Table Insert",
          type: "format",
          run: () => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run(),
        });
      }
    }
    return items;
  }, [editor]);

  const tableEditItems = React.useMemo<CommandItem[]>(() => [
    { id: "table-row-before", label: "Add row above", description: "Insert row above", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().addRowBefore()) editor.chain().focus().addRowBefore().run();
    }},
    { id: "table-row-after", label: "Add row below", description: "Insert row below", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().addRowAfter()) editor.chain().focus().addRowAfter().run();
    }},
    { id: "table-delete-row", label: "Delete row", description: "Remove current row", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().deleteRow()) editor.chain().focus().deleteRow().run();
    }},
    { id: "table-col-before", label: "Add column left", description: "Insert column left", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().addColumnBefore()) editor.chain().focus().addColumnBefore().run();
    }},
    { id: "table-col-after", label: "Add column right", description: "Insert column right", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().addColumnAfter()) editor.chain().focus().addColumnAfter().run();
    }},
    { id: "table-delete-col", label: "Delete column", description: "Remove current column", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().deleteColumn()) editor.chain().focus().deleteColumn().run();
    }},
    { id: "table-merge", label: "Merge cells", description: "Merge selected cells", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().mergeCells()) editor.chain().focus().mergeCells().run();
    }},
    { id: "table-split", label: "Split cell", description: "Split merged cell", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().splitCell()) editor.chain().focus().splitCell().run();
    }},
    { id: "table-header-row", label: "Toggle header row", description: "Header row on/off", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().toggleHeaderRow()) editor.chain().focus().toggleHeaderRow().run();
    }},
    { id: "table-header-col", label: "Toggle header column", description: "Header column on/off", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().toggleHeaderColumn()) editor.chain().focus().toggleHeaderColumn().run();
    }},
    { id: "table-header-cell", label: "Toggle header cell", description: "Header cell on/off", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().toggleHeaderCell()) editor.chain().focus().toggleHeaderCell().run();
    }},
    { id: "table-delete", label: "Delete table", description: "Remove entire table", icon: Table, group: "Table Edit", type: "format", run: () => {
      if (editor.can().deleteTable()) editor.chain().focus().deleteTable().run();
    }},
  ], [editor]);

  const aiItems: CommandItem[] = MENU_ITEMS.map(item => ({
    id: item.id,
    label: item.label,
    description: item.description,
    icon: item.icon,
    group: "AI",
    type: "ai",
    run: () => runAIAction(item.id as AIAction),
  }));

  // Only show table edit items when inside a table (or when searching)
  const isInTable = React.useMemo(() => 
    editor.isActive("table") || editor.isActive("tableRow") || 
    editor.isActive("tableCell") || editor.isActive("tableHeader"),
  [editor]);

  const visibleTableEditItems = React.useMemo(() => 
    query ? tableEditItems : tableEditItems.filter(() => isInTable),
  [query, tableEditItems, isInTable]);

  // Memoize allItems to prevent array reconstruction on every render
  const allItems = React.useMemo<CommandItem[]>(() => [
    ...formatItems,
    ...colorItems,
    clearColorItem,
    ...highlightItems,
    clearHighlightItem,
    ...tableInsertItems,
    ...visibleTableEditItems,
  ], [formatItems, colorItems, highlightItems, tableInsertItems, visibleTableEditItems]);

  // Memoize filtered results
  const filtered = React.useMemo(() => {
    if (!query) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(item => {
      const labelMatch = item.label.toLowerCase().includes(q);
      const descMatch = item.description.toLowerCase().includes(q);
      const aliasMatch = item.aliases?.some(alias => alias.toLowerCase().includes(q));
      return labelMatch || descMatch || aliasMatch;
    });
  }, [query, allItems]);

  const groups = React.useMemo(() => 
    [...new Set(filtered.map(i => i.group))],
  [filtered]);

  return (
    <motion.div
      data-ai-overlay
      variants={panelVariants} initial="hidden" animate="visible" exit="exit"
      className="fixed z-[9999] w-[320px] rounded-lg border border-border/60 bg-card shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{ top: position.top, left: position.left }}
      onMouseDown={e => e.preventDefault()}
    >
      {error && <p className="px-2 py-1 text-[10px] text-destructive bg-destructive/5">{error}</p>}

      {writing && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-2 py-2 flex items-center justify-between"
        >
          <div className="flex items-center gap-1.5">
            <TypingDots />
            <span className="text-[10px] text-muted-foreground/60">Writing…</span>
          </div>
          <button
            onClick={() => { writerRef.current?.abort(); setWriting(false); onClose(); }}
            className="text-[9px] text-muted-foreground/40 hover:text-muted-foreground underline"
          >
            Stop
          </button>
        </motion.div>
      )}

      {!writing && (
        <div className="max-h-[280px] overflow-y-auto py-0.5">
          {groups.map(group => (
            <div key={group}>
              <p className="px-2 pt-1 pb-0.5 text-[7px] font-black uppercase tracking-[0.2em] text-muted-foreground/35">
                {group}
              </p>
              {filtered.filter(i => i.group === group).map(item => {
                const idx = filtered.indexOf(item);
                const isFocused = idx === focused;
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    custom={idx} variants={itemVariants} initial="hidden" animate="visible"
                    onMouseEnter={() => onFocusedChange(idx)}
                    onClick={() => onSelect(item)}
                    className={cn(
                      "w-full flex items-center gap-1.5 px-2 py-1 text-left transition-colors",
                      isFocused ? "bg-primary/10" : "hover:bg-muted/40"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors",
                      isFocused ? "bg-primary/20" : "bg-muted/50"
                    )}>
                      <Icon className={cn("w-2.5 h-2.5 transition-colors",
                        isFocused ? "text-primary" : "text-muted-foreground/60")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[12px] font-medium transition-colors truncate",
                        isFocused ? "text-foreground" : "text-foreground/70")}>
                        {item.label}
                      </p>
                      <p className="text-[9px] text-muted-foreground/40 mt-0 truncate">{item.description}</p>
                    </div>
                    <AnimatePresence>
                      {isFocused && (
                        <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                          <ArrowRight className="w-2.5 h-2.5 text-primary/50 shrink-0" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          ))}
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
  const [query,         setQuery]         = useState("");
  const [focused,       setFocused]       = useState(0);
  const [lastCustom,    setLastCustom]    = useState("");
  const [aiFrom,        setAiFrom]        = useState(0);
  const [aiTo,          setAiTo]          = useState(0);
  const writerRef = useRef<LiveWriter | null>(null);
  const queryRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setFocused(0); }, [query]);

  const runAction = useCallback((action: AIAction, custom?: string) => {
    setCurrentAction(action);
    setPhase("writing");
    setError("");
    if (action === "custom" && custom) setLastCustom(custom);

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
      subject,
    );
  }, [editor, subject, selectedText, selFrom, selTo]);

  const runFormat = useCallback((action: FormatAction) => {
    const chain = editor.chain().focus();
    switch (action) {
      case "heading1":
        chain.toggleHeading({ level: 1 }).run();
        break;
      case "heading2":
        chain.toggleHeading({ level: 2 }).run();
        break;
      case "heading3":
        chain.toggleHeading({ level: 3 }).run();
        break;
      case "bold":
        chain.toggleBold().run();
        break;
      case "italic":
        chain.toggleItalic().run();
        break;
      case "underline":
        chain.toggleUnderline().run();
        break;
      case "strike":
        chain.toggleStrike().run();
        break;
      case "code":
        chain.toggleCode().run();
        break;
      case "bulletList":
        chain.toggleBulletList().run();
        break;
      case "orderedList":
        chain.toggleOrderedList().run();
        break;
      case "blockquote":
        chain.toggleBlockquote().run();
        break;
      case "link": {
        const prev = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Enter URL", prev || "https://");
        if (url === null) return;
        if (!url.trim()) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
        } else {
          editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
        }
        break;
      }
      default:
        break;
    }
    onClose();
  }, [editor, onClose]);

  const selectionItems = [
    ...FORMAT_ITEMS.map(item => ({ ...item, type: "format" as const })),
    ...MENU_ITEMS.map(item => ({ ...item, type: "ai" as const })),
  ];
  const quickFormatItems = FORMAT_ITEMS.filter(item => QUICK_FORMAT_IDS.includes(item.id));
  const filteredItems = query
    ? selectionItems.filter(item => {
        const q = query.toLowerCase();
        const labelMatch = item.label.toLowerCase().includes(q);
        const descMatch = item.description.toLowerCase().includes(q);
        const aliasMatch = (item as any).aliases?.some((alias: string) => alias.toLowerCase().includes(q));
        return labelMatch || descMatch || aliasMatch;
      })
    : selectionItems;
  const totalRows = filteredItems.length + (query ? 1 : 0);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { writerRef.current?.abort(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocused(f => (f + 1) % Math.max(totalRows, 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setFocused(f => (f - 1 + Math.max(totalRows, 1)) % Math.max(totalRows, 1)); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (!query) return;
      if (filteredItems[focused]) {
        const item = filteredItems[focused];
        if (item.type === "format") runFormat(item.id as FormatAction);
        else runAction(item.id as AIAction);
      } else if (query) {
        runAction("custom", query);
      }
    }
  };

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
    runAction(currentAction, currentAction === "custom" ? lastCustom : undefined);
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
      onMouseDown={e => {
        const target = e.target as HTMLElement;
        if (target.closest("input,textarea")) return;
        e.preventDefault();
      }}
    >
      {/* Header (only for AI writing states) */}
      {phase !== "menu" && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/30 bg-primary/5">
          <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
            {phase === "writing"
              ? <Loader2 className="w-3 h-3 text-primary animate-spin" />
              : <Sparkles className="w-3 h-3 text-primary" />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 flex-1">
            {phase === "writing" ? "Editing live…"
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
      )}

      <AnimatePresence mode="wait">

        {/* MENU */}
        {phase === "menu" && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="px-3 py-2 flex items-center gap-1.5 border-b border-border/30">
              {quickFormatItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => runFormat(item.id)}
                    className="h-8 w-8 rounded-lg border border-border/40 bg-muted/30 hover:bg-muted/60 flex items-center justify-center"
                    title={item.label}
                  >
                    <Icon className="w-4 h-4 text-foreground/70" />
                  </button>
                );
              })}
              <div className="flex-1" />
              <button
                onClick={() => { writerRef.current?.abort(); onClose(); }}
                className="h-8 w-8 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/50 flex items-center justify-center"
                title="Close"
              >
                <X className="w-4 h-4 text-muted-foreground/70" />
              </button>
            </div>

            <div className="px-3 py-2 border-b border-border/30">
              <input
                ref={queryRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search AI + formatting…"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-muted/20 rounded-lg px-3 py-2 text-sm outline-none border border-border/40 focus:border-primary/40"
              />
            </div>

            <div className="max-h-72 overflow-y-auto py-2">
              {query ? (
                <>
                  {filteredItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isFocused = idx === focused;
                    return (
                      <button
                        key={`${item.type}-${item.id}`}
                        onMouseEnter={() => setFocused(idx)}
                        onClick={() => item.type === "format" ? runFormat(item.id as FormatAction) : runAction(item.id as AIAction)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          isFocused ? "bg-primary/10" : "hover:bg-muted/40"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                          isFocused ? "bg-primary/20" : "bg-muted/50"
                        )}>
                          <Icon className={cn("w-3.5 h-3.5", isFocused ? "text-primary" : "text-muted-foreground/60")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground/80">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground/40">{item.description}</p>
                        </div>
                      </button>
                    );
                  })}
                  {query && (
                    <button
                      onMouseEnter={() => setFocused(filteredItems.length)}
                      onClick={() => runAction("custom", query)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-t border-border/20 mt-1",
                        focused === filteredItems.length ? "bg-primary/10" : "hover:bg-muted/40"
                      )}
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-primary truncate">Ask AI: “{query}”</p>
                      <ArrowRight className="w-3.5 h-3.5 text-primary/50 ml-auto shrink-0" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="px-4 pt-2 pb-1 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/35">Formatting</p>
                  {FORMAT_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => runFormat(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground/80">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground/40">{item.description}</p>
                        </div>
                      </button>
                    );
                  })}

                  <div className="h-px bg-border/25 mx-4 my-1" />
                  <p className="px-4 pt-2 pb-1 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/35">AI</p>
                  {MENU_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => runAction(item.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground/80">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground/40">{item.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
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
