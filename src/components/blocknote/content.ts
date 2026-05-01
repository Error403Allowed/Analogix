import { BlockNoteEditor as CoreBlockNoteEditor } from "@blocknote/core";
import {
  createBlockNoteEditorSchema,
  type BlockNoteEditorBlock,
  type BlockNoteEditorPartialBlock,
} from "@/components/blocknote/schema";

export const BN_PREFIX = "__BN__";

export const isBNContent = (value: string) =>
  typeof value === "string" && value.startsWith(BN_PREFIX);

export const serialiseBN = (blocks: BlockNoteEditorBlock[]) =>
  BN_PREFIX + JSON.stringify(blocks);

export function parseBNBlocks(raw: string): BlockNoteEditorPartialBlock[] | undefined {
  try {
    const parsed = JSON.parse(raw.slice(BN_PREFIX.length));
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as BlockNoteEditorPartialBlock[])
      : undefined;
  } catch {
    return undefined;
  }
}

export function htmlToPlainBlocks(html: string): BlockNoteEditorPartialBlock[] | undefined {
  if (!html) return undefined;

  try {
    const text = html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "• $1\n")
      .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();

    if (!text) return undefined;

    return text.split(/\n{2,}/).filter(Boolean).map((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line.trim(), styles: {} }],
    }));
  } catch {
    return undefined;
  }
}

const looksLikeHtml = (raw: string) => /<\/?[a-z][\s\S]*>/i.test(raw);

// Convert LaTeX to BlockNote math blocks
function preprocessLatexToBlocks(raw: string): BlockNoteEditorPartialBlock[] {
  const blocks: BlockNoteEditorPartialBlock[] = [];
  const remaining = raw;
  
  // Match display math $$...$$ and inline $...$
  const mathRegex = /\$\$([\s\S]*?)\$\$|\$([^\n]+?)\$/g;
  let lastIndex = 0;
  let match;
  
  while ((match = mathRegex.exec(remaining)) !== null) {
    // Add text before the match
    const textBefore = remaining.slice(lastIndex, match.index).trim();
    if (textBefore) {
      const textBlocks = textBefore.split(/\n{2,}/).filter(Boolean).map((para) => ({
        type: "paragraph" as const,
        content: [{ type: "text" as const, text: para.trim(), styles: {} as Record<string, unknown> }],
      }));
      blocks.push(...textBlocks);
    }
    
    // Add math block - $$ is display mode, $ is inline
    const formula = (match[1] || match[2] || "").trim();
    if (formula) {
      blocks.push({
        type: "math",
        props: { formula },
      });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last match
  const textAfter = remaining.slice(lastIndex).trim();
  if (textAfter) {
    const textBlocks = textAfter.split(/\n{2,}/).filter(Boolean).map((para) => ({
      type: "paragraph" as const,
      content: [{ type: "text" as const, text: para.trim(), styles: {} as any }],
    }));
    blocks.push(...textBlocks);
  }
  
  return blocks.length > 0 ? blocks : [];
}

// Check if string contains LaTeX
function containsLatex(raw: string): boolean {
  return /\$\$[\s\S]*?\$\$|\$[^\n]+?\$/.test(raw);
}

export function createBlockNoteContentParser() {
  const parser = CoreBlockNoteEditor.create({
    schema: createBlockNoteEditorSchema(),
  });

  return {
    parse(raw: string): BlockNoteEditorPartialBlock[] | undefined {
      if (!raw?.trim()) return undefined;
      if (isBNContent(raw)) return parseBNBlocks(raw);

      // Check for LaTeX and convert to math blocks
      if (containsLatex(raw)) {
        const latexBlocks = preprocessLatexToBlocks(raw);
        if (latexBlocks.length > 0) return latexBlocks;
      }

      const rendered = raw.trim();

      try {
        if (looksLikeHtml(rendered)) {
          const htmlBlocks = parser.tryParseHTMLToBlocks(rendered);
          if (htmlBlocks.length > 0) return htmlBlocks;
        }

        const markdownBlocks = parser.tryParseMarkdownToBlocks(rendered);
        if (markdownBlocks.length > 0) return markdownBlocks;
      } catch {
        // Fall back to plain paragraph conversion below.
      }

      return htmlToPlainBlocks(rendered);
    },
  };
}