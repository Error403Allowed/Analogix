import { describe, expect, it } from "vitest";
import type { GeneratedStudyGuide } from "@/services/groq";
import { studyGuideToHtml } from "@/utils/studyGuideHtml";

const baseGuide = {
  title: "Motion",
  overview: "Revise \\(F=ma\\) and $$a=\\\\frac{v-u}{t}$$.",
  assessmentDate: "1 April 2026",
  assessmentType: "Exam",
  keyPoints: ["Remember \\(F=ma\\).", "Rearrange $$v=u+at$$ carefully."],
  topics: ["Kinematics"],
  studySchedule: [],
  keyConcepts: [
    {
      title: "Acceleration",
      content: "Use $$a=\\\\frac{v-u}{t}$$ to find acceleration.",
    },
  ],
  practiceQuestions: [
    {
      question: "Show that $$s=ut+\\\\frac12at^2$$ works for constant acceleration.",
      answer: "Substitute known values into $$s=ut+\\\\frac12at^2$$.",
    },
  ],
  resources: [],
  tips: ["Check units for \\(a\\) and \\(t\\)."],
} as GeneratedStudyGuide;

describe("studyGuideToHtml", () => {
  it("preserves inline and display math placeholders across study-guide sections", () => {
    const html = studyGuideToHtml({
      ...baseGuide,
      formulaSheet: [
        {
          formula: "$$E=mc^2$$",
          description: "Energy-mass equivalence.",
          variables: "\\(E\\), \\(m\\), \\(c\\)",
          example: "Use $$E=mc^2$$ for a rest-mass calculation.",
        },
      ],
    });

    expect(html).toContain('data-type="inline-math"');
    expect(html).toContain('data-type="block-math"');
    expect(html).toContain("E=mc^2");
    expect(html).toContain("s=ut+");
  });
});
