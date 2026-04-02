import type { GeneratedStudyGuide } from "@/services/groq";
import { decodeStudyGuide, STUDY_GUIDE_V2_PREFIX } from "@/utils/studyGuideContent";

export const TIPTAP_CONTENT_FORMAT = "tiptap-json-v1";
export const BLOCKNOTE_CONTENT_FORMAT = "blocknote-json-v1";

export type DocumentRole = "notes" | "study-guide";

export interface DocumentContentLike {
  content?: string | null;
  contentJson?: string | null;
  contentText?: string | null;
  contentFormat?: string | null;
  role?: string | null;
  studyGuideData?: GeneratedStudyGuide | null;
}

export const EMPTY_TIPTAP_DOC: any = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const BLOCK_BREAK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "codeBlock",
  "horizontalRule",
  "callout",
  "table",
  "tableRow",
  "details",
  "detailsSummary",
  "detailsContent",
]);

const normaliseWhitespace = (text: string) =>
  text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

export const stripHtml = (value: string) =>
  normaliseWhitespace(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|pre|tr|table|section|article)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"),
  );

export const isLegacyStudyGuideContent = (value?: string | null) =>
  typeof value === "string" && value.startsWith(STUDY_GUIDE_V2_PREFIX);

export const parseTipTapContentJson = (value?: string | null): any | null => {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value);
    if (parsed?.type === "doc") return parsed;
  } catch {
    return null;
  }

  return null;
};

const collectText = (node: any | any[] | null | undefined, parts: string[]) => {
  if (!node) return;

  if (Array.isArray(node)) {
    node.forEach((child) => collectText(child, parts));
    return;
  }

  if (node.type === "text" && typeof node.text === "string") {
    parts.push(node.text);
  }

  if (node.type === "hardBreak") {
    parts.push("\n");
  }

  if (node.type === "horizontalRule") {
    parts.push("\n---\n");
  }

  if (Array.isArray(node.content)) {
    collectText(node.content, parts);
  }

  if (node.type && BLOCK_BREAK_TYPES.has(node.type)) {
    parts.push("\n");
  }
};

export const tiptapJsonToPlainText = (content: any | null | undefined) => {
  const parts: string[] = [];
  collectText(content, parts);
  return normaliseWhitespace(parts.join(""));
};

export const blockNoteToPlainText = (content: string | null | undefined) => {
  if (typeof content !== "string" || !content.startsWith("__BN__")) return "";
  try {
    const blocks = JSON.parse(content.slice(6));
    if (!Array.isArray(blocks)) return "";

    const extractText = (blocks: any[]): string => {
      return blocks
        .map((block) => {
          let text = "";
          if (Array.isArray(block.content)) {
            text = block.content
              .map((item: any) => {
                if (item.type === "text") return item.text;
                if (item.type === "link") return item.content?.map((t: any) => t.text).join("") || "";
                return "";
              })
              .join("");
          }
          if (Array.isArray(block.children)) {
            text += "\n" + extractText(block.children);
          }
          return text;
        })
        .join("\n");
    };

    return normaliseWhitespace(extractText(blocks));
  } catch {
    return "";
  }
};

export const studyGuideToPlainText = (guide: GeneratedStudyGuide) => {
  const parts: string[] = [];

  if (guide.title) parts.push(guide.title);
  if (guide.overview) parts.push(guide.overview);
  if (guide.assessmentType) parts.push(`Assessment type: ${guide.assessmentType}`);
  if (guide.assessmentDate) parts.push(`Assessment date: ${guide.assessmentDate}`);
  if (guide.keyPoints?.length) parts.push(`Key points:\n${guide.keyPoints.map((item) => `- ${item}`).join("\n")}`);
  if (guide.topics?.length) parts.push(`Topics:\n${guide.topics.map((item) => `- ${item}`).join("\n")}`);
  if (guide.requiredMaterials?.length) {
    parts.push(`Required materials:\n${guide.requiredMaterials.map((item) => `- ${item}`).join("\n")}`);
  }
  if (guide.keyConcepts?.length) {
    parts.push(
      `Key concepts:\n${guide.keyConcepts
        .map((concept) => `- ${concept.title}: ${concept.content}`)
        .join("\n")}`,
    );
  }
  if (guide.studySchedule?.length) {
    parts.push(
      `Study schedule:\n${guide.studySchedule
        .map((week) => `Week ${week.week} ${week.label}: ${week.tasks.join("; ")}`)
        .join("\n")}`,
    );
  }
  if (guide.practiceQuestions?.length) {
    parts.push(
      `Practice questions:\n${guide.practiceQuestions
        .map((question, index) => `${index + 1}. ${question.question}\nAnswer: ${question.answer}`)
        .join("\n\n")}`,
    );
  }
  if (guide.resources?.length) parts.push(`Resources:\n${guide.resources.map((item) => `- ${item}`).join("\n")}`);
  if (guide.tips?.length) parts.push(`Study tips:\n${guide.tips.map((item) => `- ${item}`).join("\n")}`);
  if (guide.commonMistakes?.length) {
    parts.push(`Common mistakes:\n${guide.commonMistakes.map((item) => `- ${item}`).join("\n")}`);
  }
  if (guide.glossary?.length) {
    parts.push(
      `Glossary:\n${guide.glossary.map((entry) => `- ${entry.term}: ${entry.definition}`).join("\n")}`,
    );
  }

  return normaliseWhitespace(parts.join("\n\n"));
};

export const isStudyGuideDocument = (document: DocumentContentLike | null | undefined) => {
  if (!document) return false;
  if (document.role === "study-guide") return true;
  if (document.studyGuideData) return true;
  return isLegacyStudyGuideContent(document.content);
};

export const getDocumentPlainText = (document: DocumentContentLike | null | undefined) => {
  if (!document) return "";

  if (typeof document.contentText === "string" && document.contentText.trim()) {
    return normaliseWhitespace(document.contentText);
  }

  if (document.studyGuideData) {
    return studyGuideToPlainText(document.studyGuideData);
  }

  if (typeof document.content === "string" && document.content.startsWith("__BN__")) {
    return blockNoteToPlainText(document.content);
  }

  const tiptapContent = document.contentFormat === TIPTAP_CONTENT_FORMAT
    ? parseTipTapContentJson(document.contentJson)
    : null;

  if (tiptapContent) {
    return tiptapJsonToPlainText(tiptapContent);
  }

  if (isLegacyStudyGuideContent(document.content)) {
    const guide = decodeStudyGuide(document.content || "");
    return guide ? studyGuideToPlainText(guide) : "";
  }

  if (typeof document.content === "string" && document.content.trim()) {
    const stripped = stripHtml(document.content);
    return stripped || normaliseWhitespace(document.content);
  }

  return "";
};

export const getDocumentPreviewText = (
  document: DocumentContentLike | null | undefined,
  maxChars = 180,
) => {
  const text = getDocumentPlainText(document);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trim()}…`;
};
