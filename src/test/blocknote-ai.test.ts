import { describe, expect, it } from "vitest";
import { buildBlockNoteAISystemPrompt } from "@/lib/blocknoteAi";

describe("buildBlockNoteAISystemPrompt", () => {
  it("adds Analogix-specific editing guidance", () => {
    const prompt = buildBlockNoteAISystemPrompt();

    expect(prompt).toContain("You are Analogix's educational document editor.");
    expect(prompt).toContain("Preserve headings, lists, equations, and the existing structure");
  });

  it("includes document context when subject metadata is available", () => {
    const prompt = buildBlockNoteAISystemPrompt({
      subject: "Mathematics",
      documentTitle: "Quadratic Equations",
    });

    expect(prompt).toContain("Current document context:");
    expect(prompt).toContain("Subject: Mathematics");
    expect(prompt).toContain("Document title: Quadratic Equations");
  });
});
