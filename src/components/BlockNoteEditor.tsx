"use client";

import { forwardRef, useEffect, useRef, useImperativeHandle, useMemo, useCallback } from "react";
import { en } from "@blocknote/core/locales";
import {
  FormattingToolbarController,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { AIExtension, AIMenuController } from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import { DefaultChatTransport } from "ai";
import { useTheme } from "next-themes";
import "katex/dist/katex.min.css";
import "@blocknote/shadcn/style.css";
import "@blocknote/xl-ai/style.css";
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
  subjectLabel?: string;
  documentTitle?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
const BlockNoteEditor = forwardRef<BlockNoteHandle, Props>(
  ({ initialContent, onChange, placeholder, editable = true, subjectLabel, documentTitle }, ref) => {
    const { resolvedTheme } = useTheme();
    const contentParser = useMemo(createBlockNoteContentParser, []);
    const editorSchema = useMemo(createBlockNoteEditorSchema, []);
    const aiContextRef = useRef({ subjectLabel, documentTitle });
    const initialBlocks = useMemo(
      () => contentParser.parse(initialContent),
      [contentParser, initialContent],
    );
    const dictionary = useMemo(() => ({ ...en, ai: aiEn }), []);
    const aiTransport = useMemo(
      () =>
        new DefaultChatTransport({
          api: "/api/ai",
          body: () => ({
            subject: aiContextRef.current.subjectLabel,
            documentTitle: aiContextRef.current.documentTitle,
          }),
        }),
      [],
    );
    const aiExtensions = useMemo(
      () => [
        AIExtension({
          transport: aiTransport,
          agentCursor: {
            name: "Analogix AI",
            color: "#38bdf8",
          },
        }),
      ],
      [aiTransport],
    );

    const editor = useCreateBlockNote({
      schema: editorSchema,
      initialContent: initialBlocks,
      dictionary,
      extensions: aiExtensions,
      placeholderText: placeholder ?? "Type '/' for commands, '/ai' for help, or '/math' for equations",
    }, [aiExtensions, dictionary, editorSchema]);

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
      aiContextRef.current = { subjectLabel, documentTitle };
    }, [documentTitle, subjectLabel]);

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
              <AIMenuController />
            </>
          )}
        </BlockNoteView>
      </div>
    );
  }
);

export { BlockNoteEditor };
