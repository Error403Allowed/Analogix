import { describe, it, expect } from "vitest";
import { buildPromptSuggestions } from "@analogix/shared/prompts";

describe("buildPromptSuggestions", () => {
  it("always returns exactly 4 unique suggestions", () => {
    expect(buildPromptSuggestions({})).toHaveLength(4);
    const suggestions = buildPromptSuggestions(
      { subjects: ["Biology"], grade: "12", hobbies: ["Gaming"] },
      { seed: 42 },
    );
    expect(suggestions).toHaveLength(4);
    expect(new Set(suggestions.map((s) => s.label)).size).toBe(4);
  });

  it("varies across seeds so each visit shows different suggestions", () => {
    const profile = { subjects: ["Biology", "Mathematics"], grade: "12", hobbies: ["Gaming", "Sports"] };
    const sets = [1, 2, 3, 4, 5].map((seed) =>
      JSON.stringify(buildPromptSuggestions(profile, { seed })),
    );
    expect(new Set(sets).size).toBeGreaterThan(1);
  });

  it("is deterministic for the same seed", () => {
    const profile = { subjects: ["Biology"], grade: "12", hobbies: ["Gaming"] };
    expect(buildPromptSuggestions(profile, { seed: 42 })).toEqual(
      buildPromptSuggestions(profile, { seed: 42 }),
    );
  });

  it("personalises prompts with the user's subject", () => {
    const suggestions = buildPromptSuggestions({ subjects: ["Biology"] }, { seed: 42 });
    expect(suggestions.some((s) => s.prompt.includes("Biology"))).toBe(true);
  });

  it("lets the selected subject override profile subjects", () => {
    const suggestions = buildPromptSuggestions(
      { subjects: ["Biology"] },
      { currentSubject: "Mathematics", seed: 42 },
    );
    expect(suggestions.some((s) => s.prompt.includes("Mathematics"))).toBe(true);
    expect(suggestions.some((s) => s.prompt.includes("Biology"))).toBe(false);
  });

  it("anchors a suggestion to a hobby when present", () => {
    const suggestions = buildPromptSuggestions({ hobbies: ["Gaming"] }, { seed: 7 });
    expect(suggestions.some((s) => s.label === "Learn with Gaming")).toBe(true);
  });

  it("cleans hobby labels that carry sub-interests in parentheses", () => {
    const suggestions = buildPromptSuggestions(
      { hobbies: ["Sports (Soccer, Formula 1)"] },
      { seed: 3 },
    );
    const hobbySuggestion = suggestions.find((s) => s.label === "Learn with Sports");
    expect(hobbySuggestion).toBeDefined();
    expect(hobbySuggestion!.prompt).toContain("Sports");
    expect(hobbySuggestion!.prompt).not.toContain("Soccer");
  });

  it("includes the grade in the study plan prompt when provided", () => {
    const suggestions = buildPromptSuggestions({ grade: "12" }, { seed: 5 });
    expect(suggestions.find((s) => s.label === "Study plan")!.prompt).toContain("Year 12");
  });

  it("accepts a numeric grade without throwing", () => {
    const suggestions = buildPromptSuggestions({ grade: 12 }, { seed: 5 });
    expect(suggestions.find((s) => s.label === "Study plan")!.prompt).toContain("Year 12");
  });

  it("falls back to a generic study plan without a grade", () => {
    const suggestions = buildPromptSuggestions({}, { seed: 5 });
    expect(suggestions.find((s) => s.label === "Study plan")!.prompt).toContain("study");
  });

  it("treats a whitespace-or-zero grade as no grade", () => {
    for (const falsy of ["", "   ", 0]) {
      const suggestions = buildPromptSuggestions({ grade: falsy as never }, { seed: 5 });
      const studyPlan = suggestions.find((s) => s.label === "Study plan")!.prompt;
      expect(studyPlan).toContain("study");
      expect(studyPlan).not.toContain("Year");
    }
  });
});
