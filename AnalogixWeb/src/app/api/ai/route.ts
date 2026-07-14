import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText } from "ai";
import {
  getProviderOverrides,
  injectDocumentStateMessages,
  toolDefinitionsToToolSet,
} from "@blocknote/xl-ai/server";
import { buildBlockNoteAISystemPrompt } from "@/lib/blocknoteAi";
import { requireUser, unauthResponse } from "@/lib/api-auth";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const model = groq("llama-3.3-70b-versatile");

interface BlockNoteAIRequestBody {
  messages?: any[];
  toolDefinitions?: Record<string, any>;
  subject?: string;
  documentTitle?: string;
}

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

    const tools = toolDefinitionsToToolSet(toolDefinitions) as any;
    const providerOverrides = getProviderOverrides(model as any);
    const messagesWithDocState = injectDocumentStateMessages(messages as any) as any;
    const modelMessages = await convertToModelMessages(messagesWithDocState, {
      tools,
    });

    const result = streamText({
      model: model as any,
      system: buildBlockNoteAISystemPrompt({ subject, documentTitle }),
      messages: modelMessages,
      tools,
      toolChoice: "required",
      temperature: 0.3,
      ...providerOverrides,
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
    });
  } catch (error) {
    console.error("[/api/ai] Error:", error);
    return new Response("AI service unavailable", { status: 500 });
  }
}
