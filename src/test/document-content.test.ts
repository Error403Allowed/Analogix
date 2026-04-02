import { describe, expect, it } from "vitest";
import {
  getDocumentPlainText,
  isStudyGuideDocument,
  tiptapJsonToPlainText,
} from "@/lib/document-content";
import { encodeStudyGuide } from "@/utils/studyGuideContent";

describe("document-content helpers", () => {
  it("extracts readable text from blocknote content", () => {
    const text = getDocumentPlainText({
      content: "__BN__" + JSON.stringify([
        { type: "heading", props: { level: 2 }, content: [{ type: "text", text: "Cell Division", styles: {} }] },
        { type: "paragraph", content: [{ type: "text", text: "Mitosis creates two identical daughter cells.", styles: {} }] },
      ]),
    });

    expect(text).toContain("Cell Division");
    expect(text).toContain("Mitosis creates two identical daughter cells.");
  });

  it("falls back to legacy study-guide storage safely", () => {
    const raw = encodeStudyGuide({
      title: "Physics Revision",
      overview: "Focus on forces and motion.",
      assessmentDate: "1 June 2026",
      assessmentType: "Exam",
      keyPoints: ["Know Newton's laws"],
      topics: ["Dynamics"],
      studySchedule: [],
      keyConcepts: [],
      practiceQuestions: [],
      resources: [],
      tips: [],
    });

    expect(isStudyGuideDocument({ content: raw })).toBe(true);
    expect(getDocumentPlainText({ content: raw })).toContain("Know Newton's laws");
  });
});
