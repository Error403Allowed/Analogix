import { type BlockNoteEditor } from "@blocknote/core";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import {
  FormattingToolbar,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  type DefaultReactSuggestionItem,
  type FormattingToolbarProps,
  useBlockNoteEditor,
  useComponentsContext,
  useExtension,
  useEditorState,
} from "@blocknote/react";
import { AIExtension } from "@blocknote/xl-ai";
import { Sigma } from "lucide-react";
import { RiSparkling2Fill } from "react-icons/ri";
import {
  type BlockNoteEditorPartialBlock,
  type BlockNoteEditorSchema,
} from "@/components/blocknote/schema";

type MathBlockNoteEditor = BlockNoteEditor<
  BlockNoteEditorSchema["blockSchema"],
  BlockNoteEditorSchema["inlineContentSchema"],
  BlockNoteEditorSchema["styleSchema"]
>;

export const MATH_MENU_TITLE = "Math / LaTeX";
export const MATH_MENU_GROUP = "Math";

const MATH_MENU_ALIASES = [
  "math",
  "latex",
  "equation",
  "equations",
  "formula",
  "katex",
] as const;

export function createMathBlock(formula = ""): BlockNoteEditorPartialBlock {
  return {
    type: "math",
    props: { formula },
  };
}

export function insertMathBlock(editor: MathBlockNoteEditor, formula = "") {
  editor.focus();
  return insertOrUpdateBlockForSlashMenu(editor, createMathBlock(formula));
}

function openAIMenuSafely(editor: MathBlockNoteEditor) {
  const ai = editor.getExtension(AIExtension);
  if (!ai) return;

  try {
    const selection = editor.getSelection();
    const blockId = selection?.blocks?.[selection.blocks.length - 1]?.id;
    if (blockId) {
      ai.openAIMenuAtBlock(blockId);
      return;
    }
  } catch (error) {
    console.warn("[BlockNote AI] Failed to read selection:", error);
  }

  try {
    const cursor = editor.getTextCursorPosition();
    const blockId = cursor.prevBlock?.id || cursor.block.id;
    if (blockId) {
      ai.openAIMenuAtBlock(blockId);
    }
  } catch (error) {
    console.warn("[BlockNote AI] Failed to open AI menu:", error);
  }
}

function BlockNoteAIToolbarButton() {
  const editor = useBlockNoteEditor<
    BlockNoteEditorSchema["blockSchema"],
    BlockNoteEditorSchema["inlineContentSchema"],
    BlockNoteEditorSchema["styleSchema"]
  >();
  const ai = useExtension(AIExtension);
  const Components = useComponentsContext()!;

  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor.isEditable || !ai) return undefined;

      try {
        const selection = currentEditor.getSelection();
        if (selection?.blocks?.length) {
          return { enabled: true };
        }

        const cursor = currentEditor.getTextCursorPosition();
        return { enabled: Boolean(cursor.block.id) };
      } catch {
        return undefined;
      }
    },
  });

  if (!state?.enabled) return null;

  return (
    <Components.Generic.Toolbar.Button
      className="bn-button"
      label="Ask AI"
      mainTooltip="Ask AI"
      icon={<RiSparkling2Fill />}
      onClick={() => openAIMenuSafely(editor)}
    />
  );
}

function MathFormattingToolbarButton() {
  const editor = useBlockNoteEditor<
    BlockNoteEditorSchema["blockSchema"],
    BlockNoteEditorSchema["inlineContentSchema"],
    BlockNoteEditorSchema["styleSchema"]
  >();
  const Components = useComponentsContext()!;

  const state = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor.isEditable) return undefined;

      let cursorBlock;
      try {
        cursorBlock = currentEditor.getTextCursorPosition().block;
      } catch {
        return undefined;
      }

      const selectedBlocks = currentEditor.getSelection()?.blocks || [cursorBlock];

      if (!selectedBlocks.find((block) => block.content !== undefined)) {
        return undefined;
      }

      return {
        formula: currentEditor.getSelectedText().trim(),
      };
    },
  });

  if (!state) return null;

  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label={MATH_MENU_TITLE}
      mainTooltip="Insert Math / LaTeX"
      secondaryTooltip="Uses selected text when available"
      icon={<Sigma />}
      onClick={() => insertMathBlock(editor, state.formula)}
    />
  );
}

export function MathFormattingToolbar(props: FormattingToolbarProps) {
  return (
    <FormattingToolbar blockTypeSelectItems={props.blockTypeSelectItems}>
      {[
        ...getFormattingToolbarItems(props.blockTypeSelectItems),
        <BlockNoteAIToolbarButton key="aiFormattingToolbarButton" />,
        <MathFormattingToolbarButton key="mathFormattingToolbarButton" />,
      ]}
    </FormattingToolbar>
  );
}

export function createMathSlashMenuItem(
  editor: MathBlockNoteEditor,
): DefaultReactSuggestionItem {
  return {
    title: MATH_MENU_TITLE,
    subtext: "Insert a rendered equation block with LaTeX / KaTeX.",
    aliases: [...MATH_MENU_ALIASES],
    group: MATH_MENU_GROUP,
    icon: <Sigma size={18} />,
    onItemClick: () => {
      insertMathBlock(editor);
    },
  };
}

export function getMathSlashMenuItems(
  editor: MathBlockNoteEditor,
  query: string,
) {
  return filterSuggestionItems(
    [
      ...getDefaultReactSlashMenuItems(editor),
      {
        title: "Ask AI",
        subtext: "Edit, expand, or rewrite this block with AI.",
        aliases: ["ai", "assist", "assistant", "rewrite", "summarise", "summarize"],
        group: "AI",
        icon: <RiSparkling2Fill size={18} />,
        onItemClick: () => openAIMenuSafely(editor),
      },
      createMathSlashMenuItem(editor),
    ],
    query,
  );
}
