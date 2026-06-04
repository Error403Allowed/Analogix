import { createRequire } from "node:module";
import { logger } from "../logger.js";

const requireCjs = createRequire(import.meta.url);

interface ExtractInput {
  base64?: string;
  url?: string;
  mimeType: string;
  fileName?: string;
}

/**
 * Extracts plain text from a PDF, DOCX, or plain-text payload.
 * Uses pdf-parse for PDFs and mammoth for DOCX.
 * Returns empty string for unsupported types.
 */
export async function extractTextFromPayload(input: ExtractInput): Promise<string> {
  try {
    let buffer: Buffer | null = null;
    if (input.base64) {
      buffer = Buffer.from(input.base64, "base64");
    } else if (input.url) {
      const res = await fetch(input.url);
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      throw new Error("Either base64 or url must be provided");
    }

    if (!buffer) throw new Error("Failed to load document buffer");

    const lower = input.mimeType.toLowerCase();
    if (lower.includes("pdf")) {
      const pdfParse = requireCjs("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
      const out = await pdfParse(buffer);
      return out.text;
    }
    if (lower.includes("word") || lower.includes("officedocument") || lower.includes("docx")) {
      const mammoth = requireCjs("mammoth") as { extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }> };
      const out = await mammoth.extractRawText({ buffer });
      return out.value;
    }
    if (lower.startsWith("text/") || lower.includes("markdown")) {
      return buffer.toString("utf-8");
    }
    logger.warn({ mimeType: input.mimeType }, "[extractText] unsupported mime type");
    return "";
  } catch (err) {
    logger.error({ err, mimeType: input.mimeType }, "[extractText] failed");
    return "";
  }
}
