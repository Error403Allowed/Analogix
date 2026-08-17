// @vitest-environment node
import { describe, it, expect } from "vitest";
import { extractStructuredJson } from "@/lib/memory/jsonExtract";

describe("extractStructuredJson", () => {
  it("parses a clean JSON object", () => {
    const raw = '{"memories": [{"content": "Loves basketball", "type": "preference", "importance": 0.6}]}';
    expect(extractStructuredJson(raw)).toEqual({
      memories: [{ content: "Loves basketball", type: "preference", importance: 0.6 }],
    });
  });

  it("parses JSON wrapped in markdown code fences", () => {
    const raw = '```json\n{"memories": []}\n```';
    expect(extractStructuredJson(raw)).toEqual({ memories: [] });
  });

  it("parses JSON surrounded by explanatory prose", () => {
    const raw = 'Here are the memories I extracted:\n{"memories": [{"content": "Night owl", "type": "context", "importance": 0.4}]}\nHope that helps!';
    expect(extractStructuredJson(raw)).toEqual({
      memories: [{ content: "Night owl", type: "context", importance: 0.4 }],
    });
  });

  it("parses a JSON array", () => {
    const raw = '[{"a": 1}, {"a": 2}]';
    expect(extractStructuredJson(raw)).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("tolerates strings containing braces and brackets", () => {
    const raw = '{"memories": [{"content": "Likes {curly} syntax and [brackets]", "type": "preference", "importance": 0.5}]}';
    expect(extractStructuredJson(raw)).toEqual({
      memories: [{ content: "Likes {curly} syntax and [brackets]", type: "preference", importance: 0.5 }],
    });
  });

  it("tolerates escaped quotes inside strings", () => {
    const raw = '{"memories": [{"content": "Said \\"maths is fun\\"", "type": "context", "importance": 0.3}]}';
    expect(extractStructuredJson(raw)).toEqual({
      memories: [{ content: 'Said "maths is fun"', type: "context", importance: 0.3 }],
    });
  });

  it("returns null for empty or non-JSON output", () => {
    expect(extractStructuredJson("")).toBeNull();
    expect(extractStructuredJson("   ")).toBeNull();
    expect(extractStructuredJson("I could not find any facts.")).toBeNull();
    expect(extractStructuredJson("nothing here")).toBeNull();
  });

  it("returns null for truncated/invalid JSON", () => {
    const truncated = '{"memories": [{"content": "Incomplete';
    expect(extractStructuredJson(truncated)).toBeNull();
  });

  it("recovers when an earlier candidate fails and a later one is valid", () => {
    const raw = '{"memories": [broken], then {"memories": []} is fine';
    expect(extractStructuredJson(raw)).toEqual({ memories: [] });
  });
});