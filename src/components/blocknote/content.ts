import { BlockNoteEditor as CoreBlockNoteEditor } from "@blocknote/core";
import type { GeneratedStudyGuide } from "@/services/groq";
import { studyGuideToHtml } from "@/utils/studyGuideHtml";
import { decodeStudyGuide } from "@/utils/studyGuideContent";
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

const renderStudyGuide = (raw: string): string => {
  const guide = decodeStudyGuide(raw);
  return guide ? studyGuideToHtml(guide as GeneratedStudyGuide) : raw;
};

export function createBlockNoteContentParser() {
  const parser = CoreBlockNoteEditor.create({
    schema: createBlockNoteEditorSchema(),
  });

  return {
    parse(raw: string): BlockNoteEditorPartialBlock[] | undefined {
      if (!raw?.trim()) return undefined;
      if (isBNContent(raw)) return parseBNBlocks(raw);

      const rendered = renderStudyGuide(raw).trim();

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
