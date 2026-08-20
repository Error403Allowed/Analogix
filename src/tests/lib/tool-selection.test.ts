import { describe, expect, it } from "vitest";
import {
  buildToolSet,
  estimateToolTokens,
  getToolsForRequest,
} from "@/lib/ai/tools/registry";

const fakeCtx = { userId: "test", supabase: {} } as never;

describe("getToolsForRequest", () => {
  it("returns no tools for lightweight greetings", () => {
    expect(getToolsForRequest("hi", "lightweight")).toEqual([]);
  });

  it("always includes core read tools + storeMemory for normal chat", () => {
    const names = getToolsForRequest("Explain the water cycle", "default");
    expect(names).toContain("searchWorkspace");
    expect(names).toContain("searchCurriculum");
    expect(names).toContain("storeMemory");
  });

  it("matches quiz requests (plural and verb forms)", () => {
    const names = getToolsForRequest("Create a quiz for me", "default");
    expect(names).toContain("createQuiz");
    expect(names).toContain("deleteQuiz");
  });

  it("matches flashcard requests (plural form)", () => {
    const names = getToolsForRequest("Make me some flashcards about WW2", "default");
    expect(names).toContain("createFlashcardSet");
    expect(names).toContain("deleteFlashcard");
  });

  it("matches calendar write tools for schedule requests", () => {
    const names = getToolsForRequest("Add an event for my exam next week", "default");
    expect(names).toContain("createEvent");
    expect(names).toContain("createDeadline");
  });

  it("matches document write tools for writing requests", () => {
    const names = getToolsForRequest("Summarise my notes", "default");
    expect(names).toContain("createDocument");
    expect(names).toContain("updateSubjectNotes");
  });

  it("omits write tools when the intent is absent", () => {
    const names = getToolsForRequest("Explain photosynthesis", "default");
    expect(names).not.toContain("createQuiz");
    expect(names).not.toContain("createEvent");
    expect(names).not.toContain("createDocument");
  });
});

describe("estimateToolTokens", () => {
  it("is cheaper than loading the full tool set", () => {
    const ctx = fakeCtx;
    const full = buildToolSet(ctx);
    const subset = buildToolSet(ctx, getToolsForRequest("Explain photosynthesis", "default"));
    expect(estimateToolTokens(subset)).toBeLessThan(estimateToolTokens(full));
  });

  it("is roughly zero for an empty tool set", () => {
    expect(estimateToolTokens(buildToolSet(fakeCtx, []))).toBeLessThan(50);
  });
});