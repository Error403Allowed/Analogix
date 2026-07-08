import { createRequire } from "node:module";
import { logger } from "../logger.js";

const requireCjs = createRequire(import.meta.url);

interface ExtractInput {
  base64?: string;
  url?: string;
  mimeType: string;
  fileName?: string;
}

// Allowed URL schemes for SSRF prevention
const ALLOWED_URL_PREFIXES = [
  "https://",
];

function isAllowedUrl(url: string): boolean {
  const lower = url.toLowerCase().trim();
  return ALLOWED_URL_PREFIXES.some((prefix) => lower.startsWith(prefix));
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
      if (input.base64.length > 20_000_000) {
        logger.warn("[extractText] base64 payload too large");
        return "";
      }
      buffer = Buffer.from(input.base64, "base64");
    } else if (input.url) {
      if (!isAllowedUrl(input.url)) {
        logger.warn({ url: input.url }, "[extractText] Blocked SSRF attempt — URL not allowed");
        return "";
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const res = await fetch(input.url, { signal: controller.signal });
        buffer = Buffer.from(await res.arrayBuffer());
      } finally {
        clearTimeout(timeout);
      }
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
