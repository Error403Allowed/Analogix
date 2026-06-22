import { aiDocumentFormats } from "@blocknote/xl-ai/server";

export interface BlockNoteAIContext {
  subject?: string | null;
  documentTitle?: string | null;
}

const ANALOGIX_EDITOR_GUIDANCE = [
  "You are Analogix's educational document editor.",
  "Keep edits accurate, concise, and useful for student study materials.",
  "Preserve headings, lists, equations, and the existing structure unless the user explicitly asks for a restructure.",
  "Only add facts that are clearly supported by the current document or the user's request.",
].join(" ");

export function buildBlockNoteAISystemPrompt(context: BlockNoteAIContext = {}) {
  const contextLines = [
    context.subject?.trim() ? `Subject: ${context.subject.trim()}` : undefined,
    context.documentTitle?.trim() ? `Document title: ${context.documentTitle.trim()}` : undefined,
  ].filter((line): line is string => Boolean(line));

  return [
    aiDocumentFormats.html.systemPrompt,
    ANALOGIX_EDITOR_GUIDANCE,
    contextLines.length > 0
      ? `Current document context:\n${contextLines.join("\n")}`
      : undefined,
  ].filter((section): section is string => Boolean(section)).join("\n\n");
}
