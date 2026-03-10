import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vision-capable model for image reading
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export async function POST(request: Request) {
  console.log("[extract-text] POST request received");
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File is too large (max 50 MB). Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.` },
        { status: 413 }
      );
    }

    const fileName = file.name.toLowerCase();
    const mimeType = file.type;
    let text = "";

    // ── Plain text ──────────────────────────────────────────────────────────
    if (
      mimeType.startsWith("text/") || mimeType === "application/rtf" ||
      fileName.endsWith(".txt") || fileName.endsWith(".md") ||
      fileName.endsWith(".csv") || fileName.endsWith(".rtf")
    ) {
      text = await file.text();

    // ── PDF ─────────────────────────────────────────────────────────────────
    } else if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      text = result.text || "";

    // ── DOCX / DOC ──────────────────────────────────────────────────────────
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword" ||
      fileName.endsWith(".docx") || fileName.endsWith(".doc")
    ) {
      const buffer = Buffer.from(await file.arrayBuffer());
      try {
        const mammoth = require("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value || "";
      } catch {
        const xmlStr = buffer.toString("utf-8", 0, buffer.length);
        const matches = xmlStr.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        text = matches.map((m: string) => m.replace(/<[^>]+>/g, "")).join(" ").replace(/\s+/g, " ").trim();
      }

    // ── PPTX ────────────────────────────────────────────────────────────────
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      fileName.endsWith(".pptx") || fileName.endsWith(".ppt")
    ) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const xmlStr = buffer.toString("utf-8", 0, buffer.length);
      const matches = xmlStr.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
      text = matches.map((m: string) => m.replace(/<[^>]+>/g, "").trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

    // ── Images (PNG, JPG, WEBP, GIF, HEIC etc.) — send to vision model ─────
    } else if (mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic|heif|bmp|tiff?)$/i.test(fileName)) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");

      // Normalise MIME — Groq vision doesn't accept heic/heif directly, treat as jpeg
      const safeMime = (mimeType === "image/heic" || mimeType === "image/heif" || !mimeType.startsWith("image/"))
        ? "image/jpeg"
        : mimeType;

      // Try all available API keys with fallback
      const apiKeys = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
      ].filter((key): key is string => Boolean(key));

      if (apiKeys.length === 0) throw new Error("Missing GROQ_API_KEY");

      let lastError: unknown = null;
      let response: Response | null = null;

      for (let i = 0; i < apiKeys.length; i++) {
        try {
          response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKeys[i]}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: VISION_MODEL,
              max_tokens: 2048,
              messages: [{
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: `data:${safeMime};base64,${base64}` },
                  },
                  {
                    type: "text",
                    text: "You are helping an Australian secondary school student. Describe this image in full detail. If it contains text, transcribe it exactly. If it's a diagram, chart, screenshot, or notes, describe all content clearly and completely so the student can discuss it with their AI tutor.",
                  },
                ],
              }],
            }),
          });

          if (!response.ok) {
            const err = await response.text();
            if (response.status === 429) {
              console.warn(`[extract-text] Vision API rate limited on key #${i + 1}, trying next key...`);
              continue; // Try next key
            }
            throw new Error(`Vision API Error: ${response.status} - ${err}`);
          }

          console.log(`[extract-text] Vision API ✅ success with key #${i + 1}`);
          break; // Success

        } catch (error) {
          lastError = error;
          console.warn(`[extract-text] Vision API ❌ key #${i + 1} failed`);
        }
      }

      if (!response || !response.ok) {
        const msg = lastError instanceof Error ? lastError.message : "Vision API failed";
        console.error("[extract-text] All API keys exhausted:", msg);
        throw new Error(msg);
      }

      const json = await response.json();
      text = json.choices?.[0]?.message?.content || "";

    // ── Fallback: try reading as plain text ─────────────────────────────────
    } else {
      try { text = await file.text(); } catch { text = ""; }
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No content could be extracted from this file. Try a .txt, .pdf, or image file." },
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

