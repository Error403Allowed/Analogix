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
  useEditorState,
} from "@blocknote/react";
import { Sigma } from "lucide-react";
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

      const selectedBlocks = currentEditor.getSelection()?.blocks || [
        currentEditor.getTextCursorPosition().block,
      ];

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
    [...getDefaultReactSlashMenuItems(editor), createMathSlashMenuItem(editor)],
    query,
  );
}
