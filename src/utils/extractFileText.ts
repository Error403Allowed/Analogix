/**
 * extractFileText — browser-side utility
 * Handles: .txt .md .csv .rtf  →  read directly
 *          .pdf .docx .pptx    →  send to /api/groq/extract-text
 * Returns the extracted string, or throws with a user-friendly message.
 */

const TEXT_TYPES = new Set([
  "text/plain", "text/markdown", "text/csv", "text/richtext",
  "application/rtf", "text/rtf",
]);
const TEXT_EXTS = new Set([".txt", ".md", ".csv", ".rtf"]);

const SERVER_EXTS = new Set([".pdf", ".docx", ".pptx", ".doc"]);
const SERVER_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
]);

function ext(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export async function extractFileText(file: File): Promise<string> {
  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large (max 10 MB). Try compressing it first.");
  }

  const fileExt  = ext(file.name);
  const mimeType = file.type;

  // ── Plain text types (read in-browser) ─────────────────────────────────
  if (TEXT_TYPES.has(mimeType) || TEXT_EXTS.has(fileExt)) {
    const text = await file.text();
    if (!text.trim()) throw new Error("The file appears to be empty.");
    return text.slice(0, 14000);
  }

  // ── Server-side extraction (PDF / DOCX / PPTX) ──────────────────────────
  if (SERVER_TYPES.has(mimeType) || SERVER_EXTS.has(fileExt)) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/groq/extract-text", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Extraction failed.");
    if (!json.text?.trim()) throw new Error("Couldn't extract text from this file. Try a .txt or .pdf.");
    return json.text;
  }

  // ── Image — send to server vision API ──────────────────────────────────────
  if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic|heif|bmp|tiff?)$/i.test(file.name)) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/groq/extract-text", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Image reading failed.");
    return json.text || `[Image: ${file.name}]`;
  }

  // ── Fallback: try reading as text ───────────────────────────────────────
  try {
    const text = await file.text();
    if (text.trim()) return text.slice(0, 14000);
    throw new Error("No readable text found.");
  } catch {
    throw new Error(`Unsupported file type: ${fileExt || mimeType || "unknown"}.`);
  }
}

/** Human-readable accepted formats string for <input accept=""> */
export const ACCEPTED_FILE_TYPES =
  ".pdf,.docx,.doc,.pptx,.txt,.md,.csv,.rtf,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif,text/*,image/*";

/** Label for upload UI */
export const ACCEPTED_FILE_LABEL =
  "PDF, Word, PowerPoint, TXT, CSV, images (PNG, JPG, HEIC, etc.)";
