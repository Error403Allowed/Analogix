"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import { useCallback, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code,
  Link as LinkIcon, Undo, Redo, Highlighter, CheckSquare,
  Table as TableIcon, Image as ImageIcon, Minus, Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export interface TipTapEditorHandle {
  insertText: (text: string) => void;
  setContent: (html: string) => void;
}

const TipTapEditor = forwardRef<TipTapEditorHandle, TipTapEditorProps>(
  ({ content, onChange, placeholder = "Start writing..." }, ref) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3], HTMLAttributes: { class: "font-bold text-foreground" } },
          bulletList: { HTMLAttributes: { class: "list-disc list-outside ml-4" } },
          orderedList: { HTMLAttributes: { class: "list-decimal list-outside ml-4" } },
          codeBlock: { HTMLAttributes: { class: "bg-muted/50 rounded-lg p-4 font-mono text-sm" } },
          code: { HTMLAttributes: { class: "bg-muted px-1.5 py-0.5 rounded font-mono text-sm" } },
          blockquote: { HTMLAttributes: { class: "border-l-4 border-primary/30 pl-4 italic" } },
        }),
        Underline,
        Placeholder.configure({ placeholder }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline" },
        }),
        TaskList.configure({ HTMLAttributes: { class: "not-prose pl-2" } }),
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      ],
      content,
      editorProps: {
        attributes: {
          class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60vh] px-4 py-2",
        },
      },
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
    });

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        editor?.chain().focus().insertContent(text).run();
      },
      setContent: (html: string) => {
        editor?.commands.setContent(html);
      },
    }));

    // Sync external content changes (e.g. from AI agent)
    useEffect(() => {
      if (!editor) return;
      const current = editor.getHTML();
      if (content !== current) {
        editor.commands.setContent(content);
      }
    }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

    const setLink = useCallback(() => {
      if (!editor) return;
      const previousUrl = editor.getAttributes("link").href;
      const url = window.prompt("URL", previousUrl);
      if (url === null) return;
      if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }, [editor]);

    const insertTable = useCallback(() => {
      editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }, [editor]);

    const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      const reader = new FileReader();
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run();
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, [editor]);

    if (!editor) return null;

    const Divider = () => <div className="w-px h-4 bg-border/50 mx-1" />;
    const Btn = ({ onClick, active, title, children, disabled }: {
      onClick: () => void; active?: boolean; title: string;
      children: React.ReactNode; disabled?: boolean;
    }) => (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={cn(
          "p-1.5 rounded hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
          active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {children}
      </button>
    );

    return (
      <div className="border border-border/40 rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border/40 bg-muted/30">
          {/* Text formatting */}
          <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
            <Bold className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
            <Italic className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline (Ctrl+U)">
            <UnderlineIcon className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
            <Strikethrough className="w-3.5 h-3.5" />
          </Btn>

          <Divider />

          {/* Headings */}
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
            className={cn("px-2 py-1 rounded hover:bg-muted/60 transition-colors text-xs font-bold",
              editor.isActive("heading", { level: 1 }) ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
          >H1</button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
            className={cn("px-2 py-1 rounded hover:bg-muted/60 transition-colors text-xs font-bold",
              editor.isActive("heading", { level: 2 }) ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
          >H2</button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
            className={cn("px-2 py-1 rounded hover:bg-muted/60 transition-colors text-xs font-bold",
              editor.isActive("heading", { level: 3 }) ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}
          >H3</button>

          <Divider />

          {/* Lists */}
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
            <List className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
            <ListOrdered className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Task List">
            <CheckSquare className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
            <Quote className="w-3.5 h-3.5" />
          </Btn>

          <Divider />

          {/* Code */}
          <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
            <Code className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
            <Code2 className="w-3.5 h-3.5" />
          </Btn>

          <Divider />

          {/* Insert */}
          <Btn onClick={setLink} active={editor.isActive("link")} title="Link">
            <LinkIcon className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={insertTable} title="Insert Table">
            <TableIcon className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => fileInputRef.current?.click()} title="Insert Image">
            <ImageIcon className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
            <Minus className="w-3.5 h-3.5" />
          </Btn>

          <Divider />

          {/* History */}
          <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
            <Undo className="w-3.5 h-3.5" />
          </Btn>
          <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Shift+Z)">
            <Redo className="w-3.5 h-3.5" />
          </Btn>
        </div>

        {/* Hidden image input */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {/* Editor Content */}
        <EditorContent editor={editor} className="bg-background" />
      </div>
    );
  }
);

TipTapEditor.displayName = "TipTapEditor";

export default TipTapEditor;
