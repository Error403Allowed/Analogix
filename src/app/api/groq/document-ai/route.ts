import { NextResponse } from "next/server";
import { callGroqChat } from "../_utils";

export const runtime = "nodejs";

type OutputFormat = "text" | "markdown";
type ApplyMode = "replace" | "insert_after";

interface ActionConfig {
  format: OutputFormat;
  mode: ApplyMode;
  preview: string;
  instruction: (text: string, subject?: string, documentText?: string, customPrompt?: string) => string;
}

const actionMap: Record<string, ActionConfig> = {
  rewrite: {
    format: "text",
    mode: "replace",
    preview: "Rewrote the selected text",
    instruction: (text) => `Rewrite this text for stronger clarity, flow, and precision while preserving the original meaning.\n\n${text}`,
  },
  shorten: {
    format: "text",
    mode: "replace",
    preview: "Condensed the selected text",
    instruction: (text) => `Make this text much more concise without losing the key meaning.\n\n${text}`,
  },
  simplify: {
    format: "text",
    mode: "replace",
    preview: "Simplified the selected text",
    instruction: (text) => `Rewrite this text so a student can understand it quickly. Use simple language and shorter sentences.\n\n${text}`,
  },
  expand: {
    format: "text",
    mode: "replace",
    preview: "Expanded the selected text",
    instruction: (text, subject) =>
      `Expand this text with more explanation, context, and examples.${subject ? ` The subject is ${subject}.` : ""}\n\n${text}`,
  },
  formal: {
    format: "text",
    mode: "replace",
    preview: "Shifted the tone to formal",
    instruction: (text) => `Rewrite this text in a formal academic tone.\n\n${text}`,
  },
  casual: {
    format: "text",
    mode: "replace",
    preview: "Shifted the tone to conversational",
    instruction: (text) => `Rewrite this text in a casual, conversational tone while keeping the ideas intact.\n\n${text}`,
  },
  "fix-grammar": {
    format: "text",
    mode: "replace",
    preview: "Corrected grammar and wording",
    instruction: (text) => `Fix spelling, grammar, punctuation, and awkward phrasing in this text.\n\n${text}`,
  },
  summarise: {
    format: "markdown",
    mode: "replace",
    preview: "Summarised the selected text",
    instruction: (text) =>
      `Summarise this text into crisp markdown bullet points. Keep it exam-useful and remove filler.\n\n${text}`,
  },
  "bullet-points": {
    format: "markdown",
    mode: "replace",
    preview: "Converted the text into bullet points",
    instruction: (text) => `Turn this text into markdown bullet points with one idea per bullet.\n\n${text}`,
  },
  checklist: {
    format: "markdown",
    mode: "replace",
    preview: "Converted the text into a checklist",
    instruction: (text) => `Turn this text into a markdown task checklist of practical actions.\n\n${text}`,
  },
  "key-terms": {
    format: "markdown",
    mode: "replace",
    preview: "Extracted key terms",
    instruction: (text) =>
      `Extract the key terms from this text and format them in markdown as a glossary with bold terms and short definitions.\n\n${text}`,
  },
  explain: {
    format: "markdown",
    mode: "insert_after",
    preview: "Added a plain-English explanation",
    instruction: (text, subject) =>
      `Explain this material in plain English.${subject ? ` The subject is ${subject}.` : ""} Return markdown with a short heading, a simple explanation, and one helpful analogy.\n\n${text}`,
  },
  "add-examples": {
    format: "markdown",
    mode: "insert_after",
    preview: "Added concrete examples",
    instruction: (text, subject) =>
      `Add 2 to 4 concrete, exam-relevant examples for this material.${subject ? ` The subject is ${subject}.` : ""} Return markdown.\n\n${text}`,
  },
  "add-steps": {
    format: "markdown",
    mode: "replace",
    preview: "Broke the material into steps",
    instruction: (text) => `Turn this material into a clean markdown numbered process.\n\n${text}`,
  },
  "revision-summary": {
    format: "markdown",
    mode: "insert_after",
    preview: "Created a revision summary",
    instruction: (text, subject) =>
      `Create a markdown revision summary for this material.${subject ? ` The subject is ${subject}.` : ""} Include key ideas, common traps, and what to memorise.\n\n${text}`,
  },
  "expand-explanations": {
    format: "markdown",
    mode: "insert_after",
    preview: "Expanded the explanation",
    instruction: (text, subject) =>
      `Expand this material into richer study notes.${subject ? ` The subject is ${subject}.` : ""} Return markdown with headings, bullets, and one worked example if relevant.\n\n${text}`,
  },
  flashcards: {
    format: "markdown",
    mode: "insert_after",
    preview: "Generated flashcards",
    instruction: (text, subject) =>
      `Create 6 to 10 high-quality flashcards from this material.${subject ? ` The subject is ${subject}.` : ""} Return markdown using this pattern:\n## Flashcards\n- **Front:** ...\n  **Back:** ...\n\n${text}`,
  },
  quiz: {
    format: "markdown",
    mode: "insert_after",
    preview: "Generated quiz questions",
    instruction: (text, subject) =>
      `Create 5 to 8 exam-style quiz questions from this material.${subject ? ` The subject is ${subject}.` : ""} Return markdown with each question followed by a short answer key.\n\n${text}`,
  },
  "practice-problems": {
    format: "markdown",
    mode: "insert_after",
    preview: "Generated practice problems",
    instruction: (text, subject) =>
      `Create 4 to 6 practice problems with worked solutions from this material.${subject ? ` The subject is ${subject}.` : ""} Return markdown.\n\n${text}`,
  },
  "fill-gaps": {
    format: "markdown",
    mode: "insert_after",
    preview: "Identified missing concepts",
    instruction: (text, subject, documentText) =>
      `You are reviewing a student's notes to find missing but important ideas.${subject ? ` The subject is ${subject}.` : ""} Use the selected material and the wider document context to identify conceptual gaps, blind spots, or weak links. Return markdown with three sections: "Missing Concepts", "Why They Matter", and "What To Add".\n\nSelected material:\n${text}\n\nDocument context:\n${(documentText || "").slice(0, 6000)}`,
  },
  custom: {
    format: "markdown",
    mode: "insert_after",
    preview: "Applied the custom AI instruction",
    instruction: (text, subject, documentText, customPrompt) =>
      `Follow this instruction exactly: ${customPrompt || "Improve this material"}.\n${subject ? `The subject is ${subject}.` : ""}\nUse markdown when structure helps.\n\nSelected material:\n${text}\n\nDocument context:\n${(documentText || "").slice(0, 6000)}`,
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "";
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject : undefined;
    const documentText = typeof body.documentText === "string" ? body.documentText : undefined;
    const customPrompt = typeof body.customPrompt === "string" ? body.customPrompt.trim() : undefined;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const config = actionMap[action];
    if (!config) {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    const prompt = config.instruction(text, subject, documentText, customPrompt);
    const formatHint = config.format === "markdown"
      ? "Return markdown only. No code fences. No preamble."
      : "Return plain text only. No markdown. No preamble.";

    const content = await callGroqChat(
      {
        messages: [
          {
            role: "system",
            content: `You are Analogix Document AI, an educational writing assistant for student notes.${subject ? ` The subject is ${subject}.` : ""} ${formatHint}`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 2200,
        temperature: 0.45,
      },
      "default",
    );

    return NextResponse.json({
      mode: config.mode,
      format: config.format,
      preview: config.preview,
      content: content.trim(),
    });
  } catch (error) {
    console.error("[/api/groq/document-ai] Error:", error);
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 500 },
    );
  }
}
