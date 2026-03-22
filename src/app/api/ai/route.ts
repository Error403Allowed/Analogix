import { createGroq } from "@ai-sdk/groq";
import { streamText, tool, convertToModelMessages } from "ai";
import { aiDocumentFormats, getProviderOverrides, injectDocumentStateMessages } from "@blocknote/xl-ai/server";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const model = groq("llama-3.3-70b-versatile");

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, toolDefinitions } = body;

  const format = aiDocumentFormats.html;
  const providerOverrides = getProviderOverrides(model);

  // Build tools map from BlockNote's tool definitions
  const tools: Record<string, any> = {};
  if (toolDefinitions) {
    for (const [name, def] of Object.entries(toolDefinitions as Record<string, any>)) {
      tools[name] = tool({
        description: def.description,
        inputSchema: def.parameters,
      });
    }
  }

  const messagesWithDocState = injectDocumentStateMessages(messages);
  const modelMessages = await convertToModelMessages(messagesWithDocState);

  const result = streamText({
    model,
    messages: modelMessages,
    tools,
    ...providerOverrides,
  });

  return result.toTextStreamResponse();
}
