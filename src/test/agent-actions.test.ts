import { describe, expect, it } from "vitest";
import {
  BOTTOM_RIGHT_AGENT_DOCUMENT_EDIT_MESSAGE,
  filterBottomRightAgentActions,
  isBottomRightAgentActionType,
} from "@/lib/agentActions";

describe("bottom-right agent actions", () => {
  it("only allows flashcard and quiz actions", () => {
    expect(isBottomRightAgentActionType("add_flashcards")).toBe(true);
    expect(isBottomRightAgentActionType("start_quiz")).toBe(true);
    expect(isBottomRightAgentActionType("update_document")).toBe(false);
    expect(isBottomRightAgentActionType("patch_document_field")).toBe(false);
  });

  it("filters out document-edit actions", () => {
    const filtered = filterBottomRightAgentActions([
      { type: "update_document", docTitle: "Notes" },
      { type: "add_flashcards", subjectId: "math" },
      { type: "start_quiz", subjectId: "physics" },
      { type: "create_document", title: "Draft" },
    ]);

    expect(filtered).toEqual([
      { type: "add_flashcards", subjectId: "math" },
      { type: "start_quiz", subjectId: "physics" },
    ]);
  });

  it("keeps the redirect message stable", () => {
    expect(BOTTOM_RIGHT_AGENT_DOCUMENT_EDIT_MESSAGE).toContain("use /ai");
  });
});

