import { describe, expect, it } from "vitest";
import {
  DEFAULT_OUTPUT_TOKENS,
  ESTIMATE_CHARS_PER_TOKEN,
  FILE_PART_TOKEN_ESTIMATE,
  MIN_SAFE_OUTPUT,
  REASONING_TOKEN_RESERVE,
  computeChatOutputBudget,
  estimateUIMessagesTokens,
} from "@/lib/ai/budget";

describe("estimateUIMessagesTokens", () => {
  it("counts text parts", () => {
    const msg = { role: "user", parts: [{ type: "text", text: "hello world" }] };
    expect(estimateUIMessagesTokens([msg])).toBe(Math.ceil(11 / ESTIMATE_CHARS_PER_TOKEN));
  });

  it("counts tool-call and tool-result parts as JSON", () => {
    const msg = {
      role: "assistant",
      parts: [
        { type: "tool-call", toolCallId: "t1", toolName: "createQuiz", input: { a: 1 } },
      ],
    };
    const viaJson = Math.ceil(JSON.stringify({ a: 1 }).length / ESTIMATE_CHARS_PER_TOKEN);
    expect(estimateUIMessagesTokens([msg])).toBe(viaJson);
  });

  it("counts file parts as vision tokens, not base64 chars", () => {
    const msg = { role: "user", parts: [{ type: "file", url: "data:image/png;base64," + "A".repeat(50000) }] };
    const result = estimateUIMessagesTokens([msg]);
    // Must be ~FILE_PART_TOKEN_ESTIMATE, NOT 50000/3.5
    expect(result).toBe(Math.ceil((FILE_PART_TOKEN_ESTIMATE * ESTIMATE_CHARS_PER_TOKEN) / ESTIMATE_CHARS_PER_TOKEN));
    expect(result).toBe(FILE_PART_TOKEN_ESTIMATE);
  });

  it("handles a mix of parts across messages", () => {
    const messages = [
      { role: "user", parts: [{ type: "text", text: "hello" }] },
      { role: "assistant", parts: [{ type: "tool-call", input: { q: "x" } }] },
      { role: "user", parts: [{ type: "file" }] },
    ];
    const result = estimateUIMessagesTokens(messages);
    const expected = Math.ceil(
      (5 + JSON.stringify({ q: "x" }).length + FILE_PART_TOKEN_ESTIMATE * ESTIMATE_CHARS_PER_TOKEN) /
        ESTIMATE_CHARS_PER_TOKEN,
    );
    expect(result).toBe(expected);
  });

  it("returns zero for empty messages or empty parts", () => {
    expect(estimateUIMessagesTokens([])).toBe(0);
    expect(estimateUIMessagesTokens([{ role: "user", parts: [] }])).toBe(0);
  });
});

describe("computeChatOutputBudget", () => {
  it("never lets the target act as a ceiling on a normal chat", () => {
    // Regression: Math.min(minOutput, outputBudget) with minOutput=256 produced
    // maxOutputTokens=256 on every default gpt-oss chat, cutting off the model's
    // chain-of-thought before any answer appeared.
    const result = computeChatOutputBudget({
      isSimpleGreeting: false,
      wantsLongResponse: false,
      reasons: false,
      outputHardCap: 4096,
      outputBudget: 4000,
    });
    expect(result.requested).toBe(DEFAULT_OUTPUT_TOKENS);
    expect(result.maxOutputTokens).toBe(DEFAULT_OUTPUT_TOKENS);
  });

  it("reserves reasoning headroom for CoT models so the answer still fits", () => {
    const result = computeChatOutputBudget({
      isSimpleGreeting: false,
      wantsLongResponse: false,
      reasons: true,
      outputHardCap: 4096,
      outputBudget: 5000,
    });
    expect(result.requested).toBe(DEFAULT_OUTPUT_TOKENS + REASONING_TOKEN_RESERVE);
    expect(result.maxOutputTokens).toBe(DEFAULT_OUTPUT_TOKENS + REASONING_TOKEN_RESERVE);
  });

  it("clamps to the output budget on tight requests but never below the floor", () => {
    const tight = computeChatOutputBudget({
      isSimpleGreeting: false,
      wantsLongResponse: false,
      reasons: false,
      outputHardCap: 4096,
      outputBudget: 300,
    });
    expect(tight.maxOutputTokens).toBe(300);

    const floor = computeChatOutputBudget({
      isSimpleGreeting: false,
      wantsLongResponse: false,
      reasons: false,
      outputHardCap: 4096,
      outputBudget: 40,
    });
    expect(floor.maxOutputTokens).toBe(MIN_SAFE_OUTPUT);
  });

  it("uses the hard cap for long-form requests and keeps greeting small", () => {
    const long = computeChatOutputBudget({
      isSimpleGreeting: false,
      wantsLongResponse: true,
      reasons: false,
      outputHardCap: 4096,
      outputBudget: 7600,
    });
    expect(long.requested).toBe(4096);

    const greeting = computeChatOutputBudget({
      isSimpleGreeting: true,
      wantsLongResponse: false,
      reasons: false,
      outputHardCap: 4096,
      outputBudget: 3000,
    });
    expect(greeting.requested).toBe(300);
  });
});