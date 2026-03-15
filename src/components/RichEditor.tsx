"use client";

import { useEditor, EditorContent } from "@tiptap/react";
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
import {
  useEffect, useImperativeHandle, forwardRef,
  useState, useRef, useCallback,
} from "react";
import { AnimatePresence } from "framer-motion";
import type { Editor } from "@tiptap/react";
import "katex/dist/katex.min.css";
import { AICommandPalette } from "./NotionAI";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

const lowlight = createLowlight(common);

export interface RichEditorHandle {
  editor: Editor | null;
  insertMath: (latex: string, mode: "inline" | "block") => void;
  insertCodeBlock: (code: string, language: string) => void;
  focus: () => void;
  setContent: (html: string) => void;
}

interface RichEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  placeholder?: string;
  subject?: string;
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
  ({ initialContent, onChange, placeholder, subject }, ref) => {
    const [palettePos,   setPalettePos]   = useState<{ top: number; left: number } | null>(null);
    const [slashQuery,   setSlashQuery]   = useState("");

    // ── Detect / trigger ───────────────────────────────────────────────────
    const checkSlashAI = useCallback((ed: Editor) => {
      if (!ed.state.selection.empty) {
        setPalettePos(null);
        setSlashQuery("");
        return;
      }
      const { $anchor } = ed.state.selection;
      const blockText = ed.state.doc.textBetween($anchor.start(), $anchor.end(), "\n", "\0");
      const before = blockText.slice(0, $anchor.parentOffset);
      const match = before.match(/(?:^|\s)\/(\S*)$/);
      if (match) {
        const pos = getCaretPos();
        if (pos) setPalettePos(pos);
        setSlashQuery(match[1] ?? "");
      } else {
        setPalettePos(null);
        setSlashQuery("");
      }
    }, []);

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
      },
      editorProps: {
        attributes: {
          class: "rich-editor-content focus:outline-none min-h-[60vh] text-base leading-relaxed",
        },
        handleKeyDown: (_view, event) => {
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
          if (event.key === "Escape") {
            setPalettePos(null);
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
    }));

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
              initialQuery={slashQuery}
              onClose={() => setPalettePos(null)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }
);

RichEditor.displayName = "RichEditor";
export default RichEditor;
