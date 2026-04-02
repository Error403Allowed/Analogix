import { describe, expect, it } from "vitest";
import { studyGuideToMarkdown } from "@/utils/studyGuideMarkdown";
import type { GeneratedStudyGuide } from "@/services/groq";

describe("studyGuideToMarkdown", () => {
  it("renders core sections into markdown headings and lists", () => {
    const markdown = studyGuideToMarkdown({
      title: "Biology Exam Guide",
      overview: "Revise enzymes and cellular respiration.",
      assessmentDate: "12 May 2026",
      assessmentType: "Exam",
      keyPoints: ["Know the lock-and-key model"],
      topics: ["Enzymes", "Respiration"],
      studySchedule: [
        {
          week: 1,
          label: "Foundations",
          tasks: ["Review definitions", "Practice short-answer responses"],
        },
      ],
      keyConcepts: [
        {
          title: "Enzyme specificity",
          content: "The active site matches the substrate.",
        },
      ],
      practiceQuestions: [
        {
          question: "Explain why high temperatures can denature enzymes.",
          answer: "Heat changes the active site's shape.",
        },
      ],
      resources: ["Class notes"],
      tips: ["Use labelled diagrams in your answers."],
    } as GeneratedStudyGuide);

    expect(markdown).toContain("# Biology Exam Guide");
    expect(markdown).toContain("## Key Points");
    expect(markdown).toContain("## Study Schedule");
    expect(markdown).toContain("### Week 1");
    expect(markdown).toContain("## Practice Questions");
  });
});
