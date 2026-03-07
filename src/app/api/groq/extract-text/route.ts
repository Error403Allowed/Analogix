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

    if (
      mimeType.startsWith("text/") ||
      mimeType === "application/rtf" ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md") ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".rtf")
    ) {
      text = await file.text();

    } else if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      text = result.text || "";

    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword" ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc")
    ) {
      const buffer = Buffer.from(await file.arrayBuffer());
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } catch {
        const xmlStr = buffer.toString("utf-8", 0, buffer.length);
        const matches = xmlStr.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        text = matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ").replace(/\s+/g, " ").trim();
      }
      if (!text) {
        try { text = await file.text(); } catch { text = ""; }
      }

    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      fileName.endsWith(".pptx") ||
      fileName.endsWith(".ppt")
    ) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const xmlStr = buffer.toString("utf-8", 0, buffer.length);
      const matches = xmlStr.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
      text = matches.map((m) => m.replace(/<[^>]+>/g, "").trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

    } else if (mimeType.startsWith("image/")) {
      text = `[Image file: ${file.name}. No text content could be extracted from this image.]`;

    } else {
      try { text = await file.text(); } catch { text = ""; }
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No text could be extracted from this file. Try a .txt or .pdf." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text: text.slice(0, 14000) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/groq/extract-text] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
