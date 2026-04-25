"use client";

import { forwardRef, useEffect, useRef, useImperativeHandle, useMemo, useCallback } from "react";
import { en } from "@blocknote/core/locales";
import {
  FormattingToolbarController,
  SideMenuController,
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
import type { RoomCollaborationRuntime } from "@/hooks/useRoomCollaboration";

const editorStyles = `
  .document-editor-wrapper .bn-container {
    padding: 12px 16px;
  }

  .document-editor-wrapper .bn-editor {
    padding: 12px 16px;
  }
`;

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
  appendMarkdown: (markdown: string) => void;
}

interface Props {
  initialContent: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  editable?: boolean;
  subjectLabel?: string;
  documentTitle?: string;
  collaboration?: Pick<RoomCollaborationRuntime, "fragment" | "user" | "provider">;
}

// ── Component ─────────────────────────────────────────────────────────────────
const BlockNoteEditor = forwardRef<BlockNoteHandle, Props>(
  ({ initialContent, onChange, placeholder, editable = true, subjectLabel, documentTitle, collaboration }, ref) => {
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

    const collabConfig = useMemo(() => {
      if (!collaboration) return undefined;
      return {
        fragment: collaboration.fragment,
        user: {
          name: collaboration.user.name,
          color: collaboration.user.color,
        },
        provider: collaboration.provider ?? undefined,
      };
    }, [collaboration?.fragment, collaboration?.user.name, collaboration?.user.color, collaboration?.provider]);

    const editor = useCreateBlockNote({
      schema: editorSchema,
      initialContent: collaboration ? undefined : initialBlocks,
      dictionary,
      extensions: aiExtensions,
      collaboration: collabConfig,
      placeholderText: placeholder ?? "Type '/' for commands, '/ai' for help, or '/math' for equations",
    }, [aiExtensions, dictionary, editorSchema, collabConfig]);

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

    const hasSeededRef = useRef(false);
    // Handle seeding when collaborating and the doc is empty
    useEffect(() => {
      if (!collaboration || !editor || !initialBlocks || initialBlocks.length === 0 || hasSeededRef.current) return;

      // If the shared document is empty (one default paragraph with no text), seed it
      const isDocEmpty =
        editor.document.length === 1 &&
        (!editor.document[0].content ||
          (Array.isArray(editor.document[0].content) &&
            editor.document[0].content.length === 0) ||
          (Array.isArray(editor.document[0].content) &&
            editor.document[0].content.length === 1 &&
            editor.document[0].content[0].type === "text" &&
            !editor.document[0].content[0].text));

      if (isDocEmpty) {
        hasSeededRef.current = true;
        editor.replaceBlocks(editor.document, initialBlocks);
      }
    }, [collaboration?.fragment, editor, initialBlocks]);

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
        if (!editor) return;
        const blocks = parseContent(raw);
        if (blocks?.length) {
          try {
            editor.replaceBlocks(editor.document, blocks);
          } catch (e) {
            console.warn("[BlockNoteEditor] setContent error:", e);
          }
        }
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
      appendMarkdown: (markdown: string) => {
        const blocks = editor.tryParseMarkdownToBlocks(markdown);
        if (blocks.length > 0) {
          editor.insertBlocks(blocks, editor.document[editor.document.length - 1], "after");
        }
      },
    }), [editor, parseContent]);

    if (!editor) return null;

    return (
      <>
        <style>{editorStyles}</style>
        <div className="relative document-editor-wrapper">
          <BlockNoteView
            editor={editor}
            className="document-editor-shell px-4 py-3"
            theme={editorTheme}
            editable={editable}
            sideMenu={false}
            slashMenu={false}
            formattingToolbar={false}
          >
            {editable && (
              <>
                <SideMenuController />
                <FormattingToolbarController formattingToolbar={MathFormattingToolbar} />
                <SuggestionMenuController triggerCharacter="/" getItems={getSlashMenuItems} />
                <AIMenuController />
              </>
            )}
          </BlockNoteView>
        </div>
      </>
    );
  }
);

export { BlockNoteEditor };
