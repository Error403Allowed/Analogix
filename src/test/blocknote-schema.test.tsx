// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createBlockNoteEditorSchema } from "@/components/blocknote/schema";

describe("createBlockNoteEditorSchema", () => {
  it("builds the custom math schema without throwing", () => {
    expect(() => createBlockNoteEditorSchema()).not.toThrow();
  });

  it("includes the custom math block spec", () => {
    const schema = createBlockNoteEditorSchema();

    expect(schema.blockSchema.math.type).toBe("math");
    expect(schema.blockSpecs.math.config.type).toBe("math");
  });
});
