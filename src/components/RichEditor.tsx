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
import { useEffect, useImperativeHandle, forwardRef } from "react";
import type { Editor } from "@tiptap/react";
import "katex/dist/katex.min.css";

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
}

const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(
  ({ initialContent, onChange, placeholder }, ref) => {
    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        Mathematics,
        CodeBlockLowlight.configure({ lowlight, defaultLanguage: "python" }),
        Placeholder.configure({
          placeholder: placeholder ?? "Start writing…",
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
      },
      editorProps: {
        attributes: {
          class: "rich-editor-content focus:outline-none min-h-[55vh] text-base leading-relaxed",
        },
      },
    });

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

    return <EditorContent editor={editor} />;
  }
);

RichEditor.displayName = "RichEditor";
export default RichEditor;
