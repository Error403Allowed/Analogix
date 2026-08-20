import { convertToModelMessages, streamText } from "ai";
import {
  getProviderOverrides,
  injectDocumentStateMessages,
  toolDefinitionsToToolSet,
} from "@blocknote/xl-ai/server";
import { buildBlockNoteAISystemPrompt } from "@/lib/blocknoteAi";
import { requireUser } from "@/lib/api-auth";
import { getGroqModel, resolveModelForUser } from "@/lib/ai/models";
import { ESTIMATE_CHARS_PER_TOKEN, TOTAL_BUDGET } from "@/lib/ai/budget";

interface BlockNoteAIRequestBody {
  messages?: any[];
  toolDefinitions?: Record<string, any>;
  subject?: string;
  documentTitle?: string;
}

const MAX_OUTPUT_TOKENS = 4096;

// Rough serialized-size of the BlockNote tool definitions + response format.
const TOOL_DEF_ALLOWANCE = 800;

const estimateMessagesChars = (msgs: any[]): number => {
  let chars = 0;
  const walkParts = (parts: any[]) => {
    for (const p of parts ?? []) {
      if (p?.type === "text" && typeof p.text === "string") chars += p.text.length;
      else if (p?.type === "tool-call" || p?.type === "tool-result") {
        const v = p.input ?? p.output;
        if (typeof v === "string") chars += v.length;
        else if (v) chars += JSON.stringify(v).length;
      }
    }
  };
  for (const m of msgs) walkParts(m.parts ?? []);
  return chars;
};

// Truncates document-state text parts (from the tail) so the request can never
// exceed Groq's TPM cap. The system prompt + tools are preserved.
const capInputTokens = (msgs: any[], systemChars: number, maxInputChars: number) => {
  let total = systemChars + estimateMessagesChars(msgs);
  if (total <= maxInputChars) return;
  for (let i = msgs.length - 1; i >= 0 && total > maxInputChars; i--) {
    const parts = msgs[i]?.parts ?? [];
    for (let j = parts.length - 1; j >= 0 && total > maxInputChars; j--) {
      const p = parts[j];
      if (p?.type === "text" && typeof p.text === "string" && p.text.length > 200) {
        const over = total - maxInputChars;
        const cut = Math.min(p.text.length - 200, Math.ceil(over * ESTIMATE_CHARS_PER_TOKEN) + 64);
        p.text = p.text.slice(0, p.text.length - cut) + "\n…[truncated]";
        total = systemChars + estimateMessagesChars(msgs);
      }
    }
  }
};

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = await req.json() as BlockNoteAIRequestBody;
    const { messages, toolDefinitions, subject, documentTitle } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("messages are required", { status: 400 });
    }

    if (!toolDefinitions || Object.keys(toolDefinitions).length === 0) {
      return new Response("toolDefinitions are required", { status: 400 });
    }

    const { model } = getGroqModel(resolveModelForUser());
    const tools = toolDefinitionsToToolSet(toolDefinitions) as any;
    const providerOverrides = getProviderOverrides(model as any);
    const messagesWithDocState = injectDocumentStateMessages(messages as any) as any;
    const systemPrompt = buildBlockNoteAISystemPrompt({ subject, documentTitle });
    const systemChars = systemPrompt.length;
    const maxInputChars =
      (TOTAL_BUDGET - MAX_OUTPUT_TOKENS - TOOL_DEF_ALLOWANCE) * ESTIMATE_CHARS_PER_TOKEN;
    capInputTokens(messagesWithDocState, systemChars, maxInputChars);
    const modelMessages = await convertToModelMessages(messagesWithDocState, {
      tools,
    });

    const result = streamText({
      model: model as any,
      system: systemPrompt,
      messages: modelMessages,
      tools,
      toolChoice: "required",
      temperature: 0.3,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxRetries: 2,
      ...providerOverrides,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onError: (error) => (error instanceof Error ? error.message : "AI service unavailable"),
    });
  } catch (error) {
    console.error("[/api/ai] Error:", error);
    return new Response("AI service unavailable", { status: 500 });
  }
}
