import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const mimeType = file.type;
    let text = "";

    // ── Plain text / markdown / CSV / RTF ─────────────────────────────────
    if (
      mimeType.startsWith("text/") ||
      mimeType === "application/rtf" ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".rtf")
    ) {
      text = await file.text();

    // ── PDF ────────────────────────────────────────────────────────────────
    } else if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      text = result.text || "";

    // ── DOCX ───────────────────────────────────────────────────────────────
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword" ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc")
    ) {
      const buffer = Buffer.from(await file.arrayBuffer());
      // Try mammoth first for clean extraction
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } catch {
        // Fallback: regex on raw XML inside the zip
        const xmlStr = buffer.toString("utf-8", 0, buffer.length);
        const matches = xmlStr.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        text = matches
          .map((m) => m.replace(/<[^>]+>/g, ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      }
      if (!text) {
        try { text = await file.text(); } catch { text = ""; }
      }

    // ── PPTX ───────────────────────────────────────────────────────────────
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      fileName.endsWith(".pptx") ||
      fileName.endsWith(".ppt")
    ) {
      const buffer = Buffer.from(await file.arrayBuffer());
      // Extract text from <a:t> tags in slide XML files inside the zip
      const xmlStr = buffer.toString("utf-8", 0, buffer.length);
      const matches = xmlStr.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
      text = matches
        .map((m) => m.replace(/<[^>]+>/g, "").trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

    // ── Images — return empty (could integrate OCR here later) ────────────
    } else if (mimeType.startsWith("image/")) {
      // For now return a helpful message so the AI knows it's an image
      text = `[Image file: ${file.name}. No text content could be extracted from this image.]`;

    // ── Fallback ───────────────────────────────────────────────────────────
    } else {
      try { text = await file.text(); } catch { text = ""; }
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No text could be extracted from this file. Try a .txt or .pdf." },
        { status: 422 }
      );
    }

    // Truncate to stay within model context limits (~14k chars ≈ ~3.5k tokens)
    return NextResponse.json({ text: text.slice(0, 14000) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[extract-text] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
