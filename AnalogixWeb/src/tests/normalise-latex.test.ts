// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { normaliseLatex } from "@/components/MarkdownRenderer";

describe("normaliseLatex", () => {
  it("normalises \\[ \\] display delimiters to $$", () => {
    expect(normaliseLatex("\\[x^2\\]")).toContain("$$");
    expect(normaliseLatex("\\[x^2\\]")).toMatch(/\$\$\s*\n\s*x\^2\s*\n\s*\$\$/);
  });

  it("normalises \\( \\) inline delimiters to $", () => {
    expect(normaliseLatex("\\(x=5\\)")).toBe("$x=5$");
  });

  it("keeps aligned environments intact (with &) inside $$", () => {
    const input = "\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}";
    const out = normaliseLatex(input);
    expect(out).toContain("$$");
    expect(out).toContain("\\begin{aligned}");
    expect(out).toContain("\\end{aligned}");
    expect(out).toContain("&=");
    expect(out).toContain("\\\\");
  });

  it("keeps cases environments intact", () => {
    const input = "\\begin{cases} x & \\text{if } y \\\\ 0 & \\text{otherwise} \\end{cases}";
    const out = normaliseLatex(input);
    expect(out).toContain("\\begin{cases}");
    expect(out).toContain("&");
  });

  it("rewrites unsupported align env to aligned", () => {
    const input = "\\begin{align} a &= b \\end{align}";
    const out = normaliseLatex(input);
    expect(out).toContain("\\begin{aligned}");
    expect(out).toContain("\\end{aligned}");
    expect(out).not.toContain("\\begin{align}");
  });

  it("rewrites unsupported equation env to aligned", () => {
    const input = "\\begin{equation} E = mc^2 \\end{equation}";
    const out = normaliseLatex(input);
    expect(out).toContain("\\begin{aligned}");
    expect(out).not.toContain("\\begin{equation}");
  });

  it("handles null/empty input", () => {
    expect(normaliseLatex(null)).toBe("");
    expect(normaliseLatex("")).toBe("");
    expect(normaliseLatex(undefined)).toBe("");
  });

  it("leaves plain text untouched", () => {
    expect(normaliseLatex("Hello world")).toBe("Hello world");
  });
});
