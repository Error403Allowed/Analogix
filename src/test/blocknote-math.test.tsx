// @vitest-environment jsdom

import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vitest";
import {
  MATH_MENU_GROUP,
  getMathSlashMenuItems,
  MATH_MENU_TITLE,
} from "@/components/blocknote/math";
import { createBlockNoteEditorSchema } from "@/components/blocknote/schema";

describe("blocknote math tools", () => {
  it("adds a Math / LaTeX item to the slash menu", () => {
    const editor = BlockNoteEditor.create({
      schema: createBlockNoteEditorSchema(),
    });

    const items = getMathSlashMenuItems(editor, "latex");
    const mathItem = items.find((item) => item.title === MATH_MENU_TITLE);

    expect(mathItem).toBeDefined();
    expect(mathItem?.group).toBe(MATH_MENU_GROUP);
  });

  it("inserts a math block when the slash item is clicked", () => {
    const editor = BlockNoteEditor.create({
      schema: createBlockNoteEditorSchema(),
    });

    const mathItem = getMathSlashMenuItems(editor, "math").find(
      (item) => item.title === MATH_MENU_TITLE,
    );

    expect(mathItem).toBeDefined();

    mathItem?.onItemClick();

    expect(editor.document.some((block) => block.type === "math")).toBe(true);
  });
});
