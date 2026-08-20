import { describe, it, expect } from "vitest";
import { sanitizeParts, isSupportedPartType } from "@/lib/ai/parts";
import { convertToModelMessages } from "ai";
import type { UIMessage } from "ai";

describe("sanitizeParts", () => {
  it("keeps text, file, reasoning and step-start parts", () => {
    expect(sanitizeParts([
      { type: "text", text: "hi" },
      { type: "file", mediaType: "image/png", data: "data:image/png;base64,x", url: "data:image/png;base64,x" },
      { type: "reasoning", text: "thinking" },
      { type: "step-start" },
    ])).toHaveLength(4);
  });

  it("keeps real v6 tool parts (`tool-<name>` and `dynamic-tool`)", () => {
    expect(sanitizeParts([
      { type: "tool-create_document", toolCallId: "c1", state: "approval-requested", input: { title: "x" }, approval: { id: "a1", signature: "sig" } },
      { type: "tool-create_document", toolCallId: "c1", state: "approval-responded", input: { title: "x" }, approval: { id: "a1", approved: true, signature: "sig" } },
      { type: "dynamic-tool", toolName: "create_document", toolCallId: "c2", state: "output-available", input: {}, output: {} },
    ])).toHaveLength(3);
  });

  it("drops legacy parts that would make convertToModelMessages throw", () => {
    expect(sanitizeParts([
      { type: "tool-invocation", toolCallId: "c1", state: "result", toolName: "x", args: {}, result: {} },
      { type: "thinking", text: "x" },
      { type: "sources", sources: [] },
      { type: "source-url", sourceId: "s1", url: "https://x" },
      { type: "source-document", sourceId: "s2", mediaType: "text/plain", title: "t" },
      { type: "data-foo", id: "d1", data: {} },
    ])).toEqual([
      { type: "data-foo", id: "d1", data: {} },
    ]);
  });

  it("survives non-array input", () => {
    expect(sanitizeParts(undefined)).toEqual([]);
    expect(sanitizeParts(null)).toEqual([]);
  });

  it("recognises every supported type without throwing on odd input", () => {
    expect(isSupportedPartType("text")).toBe(true);
    expect(isSupportedPartType("tool-anything")).toBe(true);
    expect(isSupportedPartType("dynamic-tool")).toBe(true);
    expect(isSupportedPartType("step-start")).toBe(true);
    expect(isSupportedPartType("data-part")).toBe(true);
    expect(isSupportedPartType("source-url")).toBe(false);
    expect(isSupportedPartType("")).toBe(false);
  });
});

describe("approval round-trip through convertToModelMessages", () => {
  it("re-emits the tool-approval-response so the server can execute the approved tool", async () => {
    const messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "Create a study doc for math" }] },
      {
        id: "a1",
        role: "assistant",
        parts: sanitizeParts([
          { type: "tool-create_document", toolCallId: "call-1", toolName: "create_document", state: "approval-responded", input: { title: "Math Notes", subjectId: "math" }, approval: { id: "approval-1", approved: true, signature: "sig-abc" } },
        ]) as unknown[],
      },
    ] as unknown as UIMessage[];

    const modelMessages = await convertToModelMessages(messages);
    const assistantContent = modelMessages[1].content as Array<{ type: string; toolCallId?: string; approvalId?: string; approved?: boolean; signature?: string }>;
    const toolMessage = modelMessages.find((m) => m.role === "tool");
    const toolContent = (toolMessage?.content ?? []) as Array<{ type: string; approvalId?: string; approved?: boolean; toolCallId?: string }>;
    const approvalResponse = toolContent.find((p) => p.type === "tool-approval-response");

    expect(assistantContent.some((p) => p.type === "tool-call" && p.toolCallId === "call-1")).toBe(true);
    expect(assistantContent.some((p) => p.type === "tool-approval-request" && p.approvalId === "approval-1" && p.signature === "sig-abc")).toBe(true);
    expect(approvalResponse).toMatchObject({ type: "tool-approval-response", approvalId: "approval-1", approved: true });
  });
});