"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import React, { useState, useCallback, forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import {
  AlignLeft, Heading1, Heading2, Heading3, Quote, Code, List, ListOrdered,
  Check, Minus, Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Sparkles,
} from "lucide-react";
import StarterKit from "@tiptap/starter-kit";
import Mathematics from "@tiptap/extension-mathematics";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import { AnimatePresence } from "framer-motion";
import type { Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import "katex/dist/katex.min.css";
import katex from "katex";
import { AICommandPalette, type CommandItem } from "./AIAgent";
import { FloatingDocAIToolbar } from "./FloatingDocAIToolbar";
import type { DocAIAction } from "./FloatingDocAIToolbar";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { motion } from "framer-motion";

const lowlight = createLowlight(common);

// Custom extension to render LaTeX from study guides (data-type="inline-math" and data-type="block-math")
const LaTeXRenderer = Extension.create({
  name: 'latexRenderer',
  addProseMirrorPlugins() {
    let renderTimeout: ReturnType<typeof setTimeout> | null = null;

    const renderLaTeX = (container: HTMLElement) => {
      if (!container) return;

      // Render inline math
      container.querySelectorAll('span[data-type="inline-math"][data-latex]').forEach((el: Element) => {
        const latexEl = el as HTMLElement;
        const latex = latexEl.getAttribute('data-latex');
        if (latex && !(latexEl as any)._katexRendered) {
          try {
            katex.render(latex, latexEl, {
              throwOnError: false,
              displayMode: false,
            });
            (latexEl as any)._katexRendered = true;
          } catch (e) {
            console.error('Failed to render inline LaTeX:', e);
          }
        }
      });

      // Render block math
      container.querySelectorAll('div[data-type="block-math"][data-latex]').forEach((el: Element) => {
        const latexEl = el as HTMLElement;
        const latex = latexEl.getAttribute('data-latex');
        if (latex && !(latexEl as any)._katexRendered) {
          try {
            katex.render(latex, latexEl, {
              throwOnError: false,
              displayMode: true,
            });
            (latexEl as any)._katexRendered = true;
          } catch (e) {
            console.error('Failed to render block LaTeX:', e);
          }
        }
      });
    };

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            // Only render on blur, not on every keystroke
            blur: (view) => {
              if (renderTimeout) clearTimeout(renderTimeout);
              renderTimeout = setTimeout(() => {
                renderLaTeX(view.dom);
              }, 100);
              return false;
            },
          },
        },
      }),
    ];
  },
});

export interface RichEditorHandle {
  editor: Editor | null;
  insertMath: (latex: string, mode: "inline" | "block") => void;
  insertCodeBlock: (code: string, language: string) => void;
  focus: () => void;
  setContent: (html: string) => void;
  renderLaTeX: () => void;
}

interface RichEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  placeholder?: string;
  subject?: string;
  onOpenAISettings?: () => void;
}

// ── Position helpers ─────────────────────────────────────────────────────────

function getCaretPos(): { top: number; left: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.top === 0 && rect.left === 0)) return null;
  const panelWidth = 420;
  const panelHeight = 420;
  const margin = 12;
  const offset = 12;
  const left = Math.min(
    Math.max(rect.left, margin),
    window.innerWidth - panelWidth - margin
  );
  const belowTop = rect.bottom + offset;
  const aboveTop = rect.top - panelHeight - offset;
  const top = belowTop + panelHeight > window.innerHeight && aboveTop > margin
    ? aboveTop
    : belowTop;
  return { top, left };
}

// ── Component ────────────────────────────────────────────────────────────────

const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(
  ({ initialContent, onChange, placeholder, subject, onOpenAISettings }, ref) => {
    const [palettePos,   setPalettePos]   = useState<{ top: number; left: number } | null>(null);
    const [slashQuery,   setSlashQuery]   = useState("");
    const [focusedIndex, setFocusedIndex] = useState(0);
    const lastSlashRef = useRef<string>("");
    const isClosingRef = useRef(false);
    const lastMenuPositionRef = useRef<number | null>(null);
    const lastTypedCharRef = useRef<string>("");

    // Floating AI toolbar state
    const [aiToolbarPos, setAiToolbarPos] = useState<{ top: number; left: number } | null>(null);
    const [selectedText, setSelectedText] = useState("");

    // Get caret position for toolbar placement
    const getCaretPos = useCallback((placeAbove: boolean = false) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return null;
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      if (rects.length === 0) return null;
      const rect = rects[0];
      const panelHeight = 280; // Match menu max-height
      const margin = 12;
      const offset = 8; // Small gap above text

      if (placeAbove) {
        // Position above the text
        const top = rect.top - panelHeight - offset;
        return {
          top: Math.max(margin, top),
          left: Math.min(rect.left, window.innerWidth - 340),
        };
      } else {
        // Position below the text
        return {
          top: rect.bottom + offset - 10,
          left: Math.min(rect.left, window.innerWidth - 340),
        };
      }
    }, []);

    // Check for text selection to show AI toolbar
    const checkSelection = useCallback((ed: Editor) => {
      const { from, to } = ed.state.selection;
      if (from === to) {
        // No selection
        setAiToolbarPos(null);
        setSelectedText("");
        return;
      }
      
      const text = ed.state.doc.textBetween(from, to, " ");
      if (text.trim().length > 0) {
        const pos = getCaretPos();
        if (pos) {
          setAiToolbarPos(pos);
          setSelectedText(text);
        }
      } else {
        setAiToolbarPos(null);
        setSelectedText("");
      }
    }, [getCaretPos]);

    // ── Detect / trigger ───────────────────────────────────────────────────
    const checkSlashAI = useCallback((ed: Editor) => {
      // Don't trigger if we're in the process of closing the menu
      if (isClosingRef.current) {
        return;
      }

      if (!ed.state.selection.empty) {
        setPalettePos(null);
        setSlashQuery("");
        lastSlashRef.current = "";
        setFocusedIndex(0);
        lastMenuPositionRef.current = null;
        return;
      }

      const { $anchor } = ed.state.selection;
      const blockText = ed.state.doc.textBetween($anchor.start(), $anchor.end(), "\n", "\0");
      const before = blockText.slice(0, $anchor.parentOffset);
      const match = before.match(/(?:^|\s)\/(\S*)$/);

      if (match) {
        const slashPos = $anchor.start() + before.lastIndexOf("/");
        
        // Only open menu if "/" was the last character typed (not clicked)
        const justTypedSlash = lastTypedCharRef.current === "/";
        
        // Menu not open - only open if slash was just typed
        if (!palettePos) {
          if (justTypedSlash && lastMenuPositionRef.current !== slashPos) {
            lastMenuPositionRef.current = slashPos;
            const pos = getCaretPos(true); // Place above text
            if (pos) setPalettePos(pos);
            setSlashQuery(match[1] ?? "");
            setFocusedIndex(0);
          }
        } else {
          // Menu is open - always update query as user types
          setSlashQuery(match[1] ?? "");
          setFocusedIndex(0);
        }
      } else {
        // No slash found - reset everything
        lastSlashRef.current = "";
        lastMenuPositionRef.current = null;
        lastTypedCharRef.current = "";
        setPalettePos(null);
        setSlashQuery("");
        setFocusedIndex(0);
      }
    }, [getCaretPos, palettePos]);

    // ── Slash menu keyboard navigation ─────────────────────────────────────
    const slashMenuItemsRef = useRef<CommandItem[]>([]);
    const slashMenuOnSelectRef = useRef<((item: CommandItem) => void) | null>(null);

    const handleSlashMenuKey = useCallback((event: KeyboardEvent): boolean => {
      if (!palettePos) return false;

      if (event.key === "Escape") {
        // Close menu but keep the slash and typed text
        isClosingRef.current = true;
        setPalettePos(null);
        lastMenuPositionRef.current = null;
        lastTypedCharRef.current = "";
        setTimeout(() => {
          isClosingRef.current = false;
          lastSlashRef.current = "";
        }, 100);
        return true;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusedIndex(f => (f + 1) % Math.max(1, slashMenuItemsRef.current.length || 1));
        return true;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusedIndex(f => (f - 1 + Math.max(1, slashMenuItemsRef.current.length || 1)) % Math.max(1, slashMenuItemsRef.current.length || 1));
        return true;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        // Trigger the focused item
        const item = slashMenuItemsRef.current[focusedIndex];
        if (item && slashMenuOnSelectRef.current) {
          slashMenuOnSelectRef.current(item);
        }
        return true;
      }

      return false;
    }, [palettePos, focusedIndex]);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        Underline,
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
        Subscript,
        Superscript,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Mathematics,
        LaTeXRenderer,
        CodeBlockLowlight.configure({ lowlight, defaultLanguage: "python" }),
        Placeholder.configure({
          placeholder: placeholder ?? "Start writing… or type / for commands.",
          emptyEditorClass: "is-editor-empty",
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Link.configure({ openOnClick: false }),
        Image,
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      content: initialContent || "",
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
        checkSlashAI(editor);
      },
      onSelectionUpdate: ({ editor }) => {
        checkSlashAI(editor);
        checkSelection(editor);
      },
      editorProps: {
        attributes: {
          class: "rich-editor-content focus:outline-none min-h-[60vh] text-base leading-relaxed",
        },
        handleKeyDown: (_view, event) => {
          // Track last typed character for slash menu detection
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            lastTypedCharRef.current = event.key;
          }
          
          // Handle slash menu keyboard navigation first
          if (handleSlashMenuKey(event)) {
            return true;
          }

          // Keyboard shortcuts for formatting
          const isMod = event.metaKey || event.ctrlKey;
          
          if (isMod && event.key === "b") {
            event.preventDefault();
            editor?.chain().focus().toggleBold().run();
            return true;
          }
          if (isMod && event.key === "i") {
            event.preventDefault();
            editor?.chain().focus().toggleItalic().run();
            return true;
          }
          if (isMod && event.key === "u") {
            event.preventDefault();
            editor?.chain().focus().toggleUnderline().run();
            return true;
          }
          if (isMod && event.key === "s") {
            event.preventDefault();
            editor?.chain().focus().toggleStrike().run();
            return true;
          }
          if (isMod && event.key === "h") {
            event.preventDefault();
            editor?.chain().focus().toggleHighlight().run();
            return true;
          }
          if (isMod && event.shiftKey && event.key === "h") {
            event.preventDefault();
            editor?.chain().focus().toggleHeading({ level: 1 }).run();
            return true;
          }
          if (isMod && event.shiftKey && event.key === "j") {
            event.preventDefault();
            editor?.chain().focus().toggleHeading({ level: 2 }).run();
            return true;
          }
          if (isMod && event.shiftKey && event.key === "k") {
            event.preventDefault();
            editor?.chain().focus().toggleHeading({ level: 3 }).run();
            return true;
          }
          if (isMod && event.altKey && event.key === "c") {
            event.preventDefault();
            editor?.chain().focus().toggleCode().run();
            return true;
          }
          if (isMod && event.shiftKey && event.key === "c") {
            event.preventDefault();
            editor?.chain().focus().toggleCodeBlock().run();
            return true;
          }
          if (isMod && event.shiftKey && event.key === "l") {
            event.preventDefault();
            editor?.chain().focus().toggleBulletList().run();
            return true;
          }
          if (isMod && event.shiftKey && event.key === "o") {
            event.preventDefault();
            editor?.chain().focus().toggleOrderedList().run();
            return true;
          }
          if (isMod && event.altKey && event.key === "q") {
            event.preventDefault();
            editor?.chain().focus().toggleBlockquote().run();
            return true;
          }
          if (isMod && event.key === "z") {
            event.preventDefault();
            if (event.shiftKey) {
              editor?.chain().focus().redo().run();
            } else {
              editor?.chain().focus().undo().run();
            }
            return true;
          }
          if (event.key === "Tab") {
            if (editor?.isActive('taskItem')) {
              event.preventDefault();
              if (event.shiftKey) {
                editor.chain().focus().liftListItem('taskItem').run();
              } else {
                editor.chain().focus().sinkListItem('taskItem').run();
              }
              return true;
            }
            // Tab in table cell - move to next cell
            if (editor?.isActive('tableCell') || editor?.isActive('tableHeader')) {
              event.preventDefault();
              if (event.shiftKey) {
                editor.chain().focus().goToPreviousCell().run();
              } else {
                editor.chain().focus().goToNextCell().run();
              }
              return true;
            }
          }
          // Table editing shortcuts
          if (event.key === "Backspace" && event.altKey) {
            if (editor?.isActive('tableCell') || editor?.isActive('tableHeader')) {
              event.preventDefault();
              editor.chain().focus().deleteColumn().run();
              return true;
            }
          }
          if (event.key === "Delete" && event.altKey) {
            if (editor?.isActive('tableCell') || editor?.isActive('tableHeader')) {
              event.preventDefault();
              editor.chain().focus().deleteRow().run();
              return true;
            }
          }
          return false;
        },
      },
    });

    // Close palette when clicking outside AI overlays
    useEffect(() => {
      const handle = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest("[data-ai-overlay]")) return;
        setPalettePos(null);
      };
      document.addEventListener("mousedown", handle);
      return () => document.removeEventListener("mousedown", handle);
    }, []);

    // Set content on first mount
    useEffect(() => {
      if (!editor || !initialContent) return;
      if (editor.isEmpty && initialContent !== "<p></p>") {
        editor.commands.setContent(initialContent, { emitUpdate: false });
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor]);

    // When initialContent changes externally (e.g. agent edit), push it into
    // the editor — but only if the new content genuinely differs from what
    // the editor already has, to avoid clobbering in-progress user edits.
    const prevInitialContent = useRef(initialContent);
    useEffect(() => {
      if (!editor) return;
      if (initialContent === prevInitialContent.current) return;
      prevInitialContent.current = initialContent;
      const currentHtml = editor.getHTML();
      if (currentHtml !== initialContent) {
        editor.commands.setContent(initialContent, { emitUpdate: false });
      }
    }, [editor, initialContent]);

    useImperativeHandle(ref, () => ({
      editor: editor ?? null,
      insertMath: (latex, mode) => {
        if (!editor) return;
        if (mode === "inline") {
          (editor.chain().focus() as any).insertInlineMath({ latex }).run();
        } else {
          (editor.chain().focus() as any).insertBlockMath({ latex }).run();
        }
      },
      insertCodeBlock: (code, language) => {
        if (!editor) return;
        editor.chain().focus().setCodeBlock({ language }).run();
        editor.chain().focus().insertContent(code).run();
      },
      focus: () => editor?.commands.focus(),
      setContent: (html: string) => {
        if (!editor) return;
        editor.commands.setContent(html, { emitUpdate: false });
      },
      renderLaTeX: () => {
        if (!editor) return;
        requestAnimationFrame(() => {
          if (editor.view.dom) {
            editor.view.dom.querySelectorAll('span[data-type="inline-math"][data-latex], div[data-type="block-math"][data-latex]').forEach((el: Element) => {
              const latexEl = el as HTMLElement;
              const latex = latexEl.getAttribute('data-latex');
              if (latex) {
                (latexEl as any)._katexRendered = false;
                try {
                  katex.render(latex, latexEl, {
                    throwOnError: false,
                    displayMode: latexEl.tagName === 'DIV',
                  });
                  (latexEl as any)._katexRendered = true;
                } catch (e) {
                  console.error('Failed to render LaTeX:', e);
                }
              }
            });
          }
        });
      },
    }));

    // ── Slash menu item handlers ───────────────────────────────────────────
    const deleteSlashCommand = useCallback(() => {
      if (!editor) return;
      const { $anchor } = editor.state.selection;
      const blockText = editor.state.doc.textBetween($anchor.start(), $anchor.end(), "\n", "\0");
      const before = blockText.slice(0, $anchor.parentOffset);
      const match = before.match(/(?:^|\s)\/(\S*)$/);
      if (!match) return;
      const slashIndex = before.lastIndexOf("/");
      const from = $anchor.start() + slashIndex;
      const to = $anchor.start() + $anchor.parentOffset;
      // Don't call focus() here - user is already focused since they're typing
      editor.chain().deleteRange({ from, to }).run();
    }, [editor]);

    const handleSelectItem = useCallback((item: CommandItem) => {
      if (!editor) return;

      // Delete the slash command text
      deleteSlashCommand();

      // Run the item's action (without focus to prevent scroll jump)
      if (item.type === "format" && item.run) {
        item.run();
      }

      // Close the menu
      isClosingRef.current = true;
      setPalettePos(null);
      lastMenuPositionRef.current = null;
      lastTypedCharRef.current = "";
      setTimeout(() => {
        isClosingRef.current = false;
        lastSlashRef.current = "";
        setFocusedIndex(0);
      }, 100);
    }, [editor, deleteSlashCommand]);

    // ── Build slash menu items (mirrors logic in AIAgent) ────────────────
    // We need this here to support keyboard navigation with proper item count
    const allFormatItems = React.useMemo(() => {
      // Import the format items from AIAgent - simplified version
      // Note: Don't use .focus() to prevent scroll jumping
      return [
        { id: "paragraph", label: "Paragraph", description: "Normal text", icon: AlignLeft, group: "Blocks", type: "format" as const, run: () => editor?.chain().setParagraph().run() },
        { id: "heading1", label: "Heading 1", description: "Large heading", icon: Heading1, group: "Blocks", type: "format" as const, run: () => editor?.chain().toggleHeading({ level: 1 }).run() },
        { id: "heading2", label: "Heading 2", description: "Section heading", icon: Heading2, group: "Blocks", type: "format" as const, run: () => editor?.chain().toggleHeading({ level: 2 }).run() },
        { id: "heading3", label: "Heading 3", description: "Subheading", icon: Heading3, group: "Blocks", type: "format" as const, run: () => editor?.chain().toggleHeading({ level: 3 }).run() },
        { id: "blockquote", label: "Blockquote", description: "Quote block", icon: Quote, group: "Blocks", type: "format" as const, run: () => editor?.chain().toggleBlockquote().run() },
        { id: "codeblock", label: "Code block", description: "Monospace code block", icon: Code, group: "Blocks", type: "format" as const, run: () => editor?.chain().toggleCodeBlock().run() },
        { id: "bulletlist", label: "Dot points", description: "Bullet list", icon: List, group: "Lists", type: "format" as const, run: () => editor?.chain().toggleBulletList().run() },
        { id: "orderedlist", label: "Numbered list", description: "Ordered list", icon: ListOrdered, group: "Lists", type: "format" as const, run: () => editor?.chain().toggleOrderedList().run() },
        { id: "tasklist", label: "Task list", description: "Checklist", icon: Check, group: "Lists", type: "format" as const, run: () => editor?.chain().toggleTaskList().run() },
        { id: "divider", label: "Horizontal rule", description: "Divider line", icon: Minus, group: "Insert", type: "format" as const, run: () => editor?.chain().setHorizontalRule().run() },
        { id: "bold", label: "Bold", description: "Emphasise selection", icon: Bold, group: "Text", type: "format" as const, run: () => editor?.chain().toggleBold().run() },
        { id: "italic", label: "Italic", description: "Emphasise lightly", icon: Italic, group: "Text", type: "format" as const, run: () => editor?.chain().toggleItalic().run() },
        { id: "underline", label: "Underline", description: "Underline selection", icon: UnderlineIcon, group: "Text", type: "format" as const, run: () => editor?.chain().toggleUnderline().run() },
        { id: "strike", label: "Strikethrough", description: "Strike out", icon: Strikethrough, group: "Text", type: "format" as const, run: () => editor?.chain().toggleStrike().run() },
        { id: "code", label: "Inline code", description: "Code formatting", icon: Code, group: "Text", type: "format" as const, run: () => editor?.chain().toggleCode().run() },
      ] as CommandItem[];
    }, [editor]);

    const filteredSlashItems = React.useMemo(() => {
      if (!slashQuery) return allFormatItems;
      const q = slashQuery.toLowerCase();
      return allFormatItems.filter(item => {
        const labelMatch = item.label.toLowerCase().includes(q);
        const descMatch = item.description.toLowerCase().includes(q);
        return labelMatch || descMatch;
      });
    }, [slashQuery, allFormatItems]);

    // Update ref with current filtered items for keyboard navigation
    useEffect(() => {
      slashMenuItemsRef.current = filteredSlashItems;
      slashMenuOnSelectRef.current = handleSelectItem;
    }, [filteredSlashItems, handleSelectItem]);

    return (
      <>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <EditorContent editor={editor} />
          </ContextMenuTrigger>
          <ContextMenuContent className="w-56">
            <ContextMenuItem
              disabled={!editor?.isActive('tableCell') && !editor?.isActive('tableHeader')}
              onClick={() => editor?.chain().focus().addRowBefore().run()}
            >
              Add row above
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!editor?.isActive('tableCell') && !editor?.isActive('tableHeader')}
              onClick={() => editor?.chain().focus().addRowAfter().run()}
            >
              Add row below
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!editor?.isActive('tableCell') && !editor?.isActive('tableHeader')}
              onClick={() => editor?.chain().focus().addColumnBefore().run()}
            >
              Add column left
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!editor?.isActive('tableCell') && !editor?.isActive('tableHeader')}
              onClick={() => editor?.chain().focus().addColumnAfter().run()}
            >
              Add column right
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={!editor?.isActive('tableCell') && !editor?.isActive('tableHeader')}
              onClick={() => editor?.chain().focus().deleteRow().run()}
              className="text-destructive focus:text-destructive"
            >
              Delete row
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!editor?.isActive('tableCell') && !editor?.isActive('tableHeader')}
              onClick={() => editor?.chain().focus().deleteColumn().run()}
              className="text-destructive focus:text-destructive"
            >
              Delete column
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={!editor?.isActive('tableCell') && !editor?.isActive('tableHeader')}
              onClick={() => editor?.chain().focus().deleteTable().run()}
              className="text-destructive focus:text-destructive"
            >
              Delete table
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* ── AI overlays (animated with AnimatePresence) ──────────────── */}
        <AnimatePresence>
          {palettePos && editor && (
            <AICommandPalette
              key="palette"
              editor={editor}
              subject={subject}
              position={palettePos}
              query={slashQuery}
              focused={focusedIndex}
              onFocusedChange={setFocusedIndex}
              onSelect={handleSelectItem}
              onClose={() => {
                isClosingRef.current = true;
                setPalettePos(null);
                lastMenuPositionRef.current = null;
                lastTypedCharRef.current = "";
                setTimeout(() => {
                  isClosingRef.current = false;
                  lastSlashRef.current = "";
                  setFocusedIndex(0);
                }, 100);
              }}
            />
          )}
          {aiToolbarPos && editor && selectedText && (
            <FloatingDocAIToolbar
              key="ai-toolbar"
              editor={editor}
              subject={subject}
              selectedText={selectedText}
              position={aiToolbarPos}
              onClose={() => {
                setAiToolbarPos(null);
                setSelectedText("");
              }}
              onActionComplete={() => {
                setAiToolbarPos(null);
                setSelectedText("");
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Floating AI Settings Button (top-right corner) ──────────────── */}
        {onOpenAISettings && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenAISettings}
            className="fixed bottom-6 right-6 z-50 p-3 rounded-full gradient-primary shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            title="AI Settings"
          >
            <Sparkles className="w-5 h-5 text-primary-foreground" />
            <span className="text-xs font-bold text-primary-foreground hidden sm:inline">
              AI Settings
            </span>
          </motion.button>
        )}
      </>
    );
  }
);

RichEditor.displayName = "RichEditor";
export default RichEditor;
