// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { cleanForDisplay } from "@/lib/chat-utils";

describe("cleanForDisplay", () => {
  it("strips decorative divider lines (---, ***, ===) used between sections", () => {
    const input = [
      "Conceptual Overview",
      "---",
      "Integration is adding tiny slices.",
      "***",
      "More text",
      "===",
      "Still more text",
    ].join("\n");
    const out = cleanForDisplay(input);
    expect(out).not.toContain("---");
    expect(out).not.toContain("***");
    expect(out).not.toContain("===");
  });

  it("keeps markdown table separator rows intact", () => {
    const input = [
      "| term | meaning |",
      "| --- | --- |",
      "| ana | like |",
    ].join("\n");
    expect(cleanForDisplay(input)).toBe(input);
  });

  it("strips Fermat/uni divider styles (━━━) and collapses blank runs", () => {
    const out = cleanForDisplay("Head\n\n━━━━━━━━━━━━━━\nBody\n\n\n\nTail");
    expect(out).not.toContain("━");
    expect(out).toContain("Body");
    expect(out).not.toContain("\n\n\n");
  });

  it("leaves normal prose and math unchanged", () => {
    const input = "Think of it like a Rocket League boost: distance is $v(t)\\,dt$ summed up.";
    expect(cleanForDisplay(input)).toBe(input);
  });
});