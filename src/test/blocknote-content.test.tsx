// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createBlockNoteContentParser } from "@/components/blocknote/content";
import { encodeStudyGuide } from "@/utils/studyGuideContent";

describe("createBlockNoteContentParser", () => {
  it("parses html headings and lists into structured blocks", () => {
    const parser = createBlockNoteContentParser();
    const blocks = parser.parse("<h1>Study Guide</h1><ul><li>Point one</li><li>Point two</li></ul>");

    expect(blocks?.[0]?.type).toBe("heading");
    expect(blocks?.some((block) => block.type === "bulletListItem")).toBe(true);
  });

  it("parses markdown instead of leaving literal markers", () => {
    const parser = createBlockNoteContentParser();
    const blocks = parser.parse("# Title\n\n## Overview\n\n- First point");

    expect(blocks?.[0]?.type).toBe("heading");
    expect(blocks?.[1]?.type).toBe("heading");
    expect(blocks?.[2]?.type).toBe("bulletListItem");
  });

  it("renders encoded study guides as structured content", () => {
    const parser = createBlockNoteContentParser();
    const blocks = parser.parse(encodeStudyGuide({
      title: "Power and Morality",
      overview: "Focus on Shakespeare and literary analysis.",
      assessmentDate: "2026-03-23",
      assessmentType: "Exam",
      keyPoints: ["Analyse the question carefully"],
      topics: ["Macbeth", "Othello"],
      studySchedule: [],
      keyConcepts: [],
      practiceQuestions: [],
      resources: [],
      tips: [],
    }));

    expect(blocks?.[0]?.type).toBe("heading");
    expect(blocks?.some((block) => block.type === "bulletListItem")).toBe(true);
  });
});
