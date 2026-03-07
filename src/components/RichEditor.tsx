"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mathematics from "@tiptap/extension-mathematics";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import {
  useEffect, useImperativeHandle, forwardRef,
  useState, useRef, useCallback,
} from "react";
import { AnimatePresence } from "framer-motion";
import type { Editor } from "@tiptap/react";
import "katex/dist/katex.min.css";
import { AICommandPalette, FloatingAIToolbar } from "./NotionAI";

const lowlight = createLowlight(common);

export interface RichEditorHandle {
  editor: Editor | null;
  insertMath: (latex: string, mode: "inline" | "block") => void;
  insertCodeBlock: (code: string, language: string) => void;
  focus: () => void;
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
  return { top: rect.bottom + 8, left: Math.max(rect.left, 16) };
}

function getSelectionPos(): { top: number; left: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  if (!rect) return null;
  // Centre the panel above the selection; keep on screen
  const left = Math.max(rect.left + rect.width / 2 - 210, 16);
  return { top: rect.top - 12, left };
}

// ── Component ────────────────────────────────────────────────────────────────

const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(
  ({ initialContent, onChange, placeholder, subject }, ref) => {
    const [palettePos,   setPalettePos]   = useState<{ top: number; left: number } | null>(null);
    const [toolbarPos,   setToolbarPos]   = useState<{ top: number; left: number } | null>(null);
    const [selectedText, setSelectedText] = useState("");
    const [selFrom,      setSelFrom]      = useState(0);
    const [selTo,        setSelTo]        = useState(0);

    const selTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const editorInstanceRef = useRef<Editor | null>(null);

    // ── Detect /ai trigger ─────────────────────────────────────────────────
    const checkSlashAI = useCallback((ed: Editor) => {
      if (!ed.state.selection.empty) return;
      const { $anchor } = ed.state.selection;
      const blockText = ed.state.doc.textBetween($anchor.start(), $anchor.end());
      if (blockText.trim().toLowerCase() === "/ai") {
        const pos = getCaretPos();
        if (pos) setPalettePos(pos);
      } else {
        setPalettePos(null);
      }
    }, []);

    // ── Detect text selection ──────────────────────────────────────────────
    const checkSelection = useCallback(() => {
      if (selTimerRef.current) clearTimeout(selTimerRef.current);
      selTimerRef.current = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          setToolbarPos(null);
          setSelectedText("");
          return;
        }
        const text = sel.toString().trim();
        if (text.length < 3) { setToolbarPos(null); return; }
        const pos = getSelectionPos();
        if (pos && editorInstanceRef.current) {
          const ed = editorInstanceRef.current;
          setSelectedText(text);
          setSelFrom(ed.state.selection.from);
          setSelTo(ed.state.selection.to);
          setToolbarPos(pos);
          setPalettePos(null);
        }
      }, 300);
    }, []);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        Mathematics,
        CodeBlockLowlight.configure({ lowlight, defaultLanguage: "python" }),
        Placeholder.configure({
          placeholder: placeholder ?? "Start writing… or type /ai for AI help.",
          emptyEditorClass: "is-editor-empty",
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Link.configure({ openOnClick: false }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
      ],
      content: initialContent || "",
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
        checkSlashAI(editor);
        if (editor.state.selection.empty) {
          setToolbarPos(null);
          setSelectedText("");
        }
      },
      onSelectionUpdate: ({ editor }) => {
        checkSlashAI(editor);
      },
      editorProps: {
        attributes: {
          class: "rich-editor-content focus:outline-none min-h-[60vh] text-base leading-relaxed",
        },
        handleKeyDown: (_view, event) => {
          if (event.key === "Escape") {
            setPalettePos(null);
            setToolbarPos(null);
          }
          return false;
        },
      },
    });

    useEffect(() => { editorInstanceRef.current = editor ?? null; }, [editor]);

    useEffect(() => {
      document.addEventListener("mouseup", checkSelection);
      return () => document.removeEventListener("mouseup", checkSelection);
    }, [checkSelection]);

    // Close palette when clicking outside AI overlays
    useEffect(() => {
      const handle = (e: MouseEvent) => {
        if ((e.target as HTMLElement).closest("[data-ai-overlay]")) return;
        setPalettePos(null);
      };
      document.addEventListener("mousedown", handle);
      return () => document.removeEventListener("mousedown", handle);
    }, []);

    useEffect(() => {
      if (!editor || !initialContent) return;
      if (editor.isEmpty && initialContent !== "<p></p>") {
        editor.commands.setContent(initialContent, { emitUpdate: false });
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor]);

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
    }));

    return (
      <>
        <EditorContent editor={editor} />

        {/* ── AI overlays (animated with AnimatePresence) ──────────────── */}
        <AnimatePresence>
          {palettePos && editor && (
            <AICommandPalette
              key="palette"
              editor={editor}
              subject={subject}
              position={palettePos}
              onClose={() => setPalettePos(null)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toolbarPos && selectedText && editor && (
            <FloatingAIToolbar
              key="toolbar"
              editor={editor}
              subject={subject}
              selectedText={selectedText}
              selFrom={selFrom}
              selTo={selTo}
              position={toolbarPos}
              onClose={() => { setToolbarPos(null); setSelectedText(""); }}
            />
          )}
        </AnimatePresence>
      </>
    );
  }
);

RichEditor.displayName = "RichEditor";
export default RichEditor;
