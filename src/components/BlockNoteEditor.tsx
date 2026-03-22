"use client";

import { forwardRef, useEffect, useRef, useImperativeHandle, useMemo, useCallback } from "react";
import {
  FormattingToolbarController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { useTheme } from "next-themes";
import "katex/dist/katex.min.css";
import "@blocknote/shadcn/style.css";
import {
  createBlockNoteEditorSchema,
  type BlockNoteEditorPartialBlock,
} from "@/components/blocknote/schema";
import {
  createBlockNoteContentParser,
  serialiseBN,
} from "@/components/blocknote/content";
import {
  getMathSlashMenuItems,
  MathFormattingToolbar,
} from "@/components/blocknote/math";
export {
  BN_PREFIX,
  isBNContent,
  serialiseBN,
  parseBNBlocks,
  htmlToPlainBlocks,
} from "@/components/blocknote/content";

// ── Handle + Props ────────────────────────────────────────────────────────────
export interface BlockNoteHandle {
  getContent: () => string;
  setContent: (raw: string) => void;
  getPlainText: () => string;
}

interface Props {
  initialContent: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  editable?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
const BlockNoteEditor = forwardRef<BlockNoteHandle, Props>(
  ({ initialContent, onChange, placeholder, editable = true }, ref) => {
    const { resolvedTheme } = useTheme();
    const contentParser = useMemo(createBlockNoteContentParser, []);
    const editorSchema = useMemo(createBlockNoteEditorSchema, []);
    const initialBlocks = useMemo(
      () => contentParser.parse(initialContent),
      [contentParser, initialContent],
    );

    const editor = useCreateBlockNote({
      schema: editorSchema,
      initialContent: initialBlocks,
      placeholderText: placeholder ?? "Type '/' for commands, '/math' for equations, or ask AI…",
    }, [editorSchema]);

    const lastRawRef = useRef<string>("");
    const parseContent = useCallback(
      (raw: string): BlockNoteEditorPartialBlock[] | undefined => contentParser.parse(raw),
      [contentParser],
    );
    const getSlashMenuItems = useCallback(
      async (query: string) => getMathSlashMenuItems(editor, query),
      [editor],
    );
    const editorTheme = resolvedTheme === "light" ? "light" : "dark";

    useEffect(() => {
      const unsub = editor.onChange(() => {
        const raw = serialiseBN(editor.document);
        if (raw !== lastRawRef.current) {
          lastRawRef.current = raw;
          onChange(raw);
        }
      });
      return unsub;
    }, [editor, onChange]);

    useImperativeHandle(ref, () => ({
      getContent: () => serialiseBN(editor.document),
      setContent: (raw: string) => {
        const blocks = parseContent(raw);
        if (blocks?.length) editor.replaceBlocks(editor.document, blocks);
      },
      getPlainText: () =>
        editor.document
          .map((block) => {
            if (!Array.isArray(block.content)) return "";

            return block.content
              .map((item) => {
                if (item.type === "text") return item.text;
                if (item.type === "link") return item.content.map((text) => text.text).join("");
                return "";
              })
              .join("");
          })
          .join("\n"),
    }), [editor, parseContent]);

    if (!editor) return null;

    return (
      <div className="relative">
        <BlockNoteView
          editor={editor}
          className="document-editor-shell"
          theme={editorTheme}
          editable={editable}
          slashMenu={false}
          formattingToolbar={false}
        >
          {editable && (
            <>
              <FormattingToolbarController formattingToolbar={MathFormattingToolbar} />
              <SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} />
            </>
          )}
        </BlockNoteView>
      </div>
    );
  }
);

export { BlockNoteEditor };
