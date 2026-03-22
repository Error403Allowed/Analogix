import { describe, expect, it } from "vitest";
import {
  assessmentTypeToEventType,
  parseAssessmentDate,
  pickStudyGuideTitle,
} from "@/utils/studyGuideGeneration";

describe("study guide generation helpers", () => {
  it("parses ISO assessment dates without throwing", () => {
    const result = parseAssessmentDate("2026-03-23");

    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2026);
    expect(result?.getMonth()).toBe(2);
    expect(result?.getDate()).toBe(23);
  });

  it("ignores malformed assessment dates instead of throwing", () => {
    expect(parseAssessmentDate({ date: "2026-03-23" })).toBeNull();
    expect(parseAssessmentDate(["2026-03-23"])).toBeNull();
    expect(parseAssessmentDate(null)).toBeNull();
  });

  it("maps known assessment types and safely falls back for invalid values", () => {
    expect(assessmentTypeToEventType("Final Exam")).toBe("exam");
    expect(assessmentTypeToEventType("Research Assignment")).toBe("assignment");
    expect(assessmentTypeToEventType({ kind: "exam" })).toBe("event");
  });

  it("falls back to a safe title when the guide title is empty", () => {
    expect(pickStudyGuideTitle("  Macbeth Essay Guide  ")).toBe("Macbeth Essay Guide");
    expect(pickStudyGuideTitle("")).toBe("Study Guide");
    expect(pickStudyGuideTitle(undefined, "English Study Guide")).toBe("English Study Guide");
  });
});
