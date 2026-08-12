import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { subjectTools } from "./tools/subjects.js";
import { documentTools } from "./tools/documents.js";
import { flashcardTools } from "./tools/flashcards.js";
import { quizTools } from "./tools/quizzes.js";
import { calendarTools } from "./tools/calendar.js";

const allTools = [
  ...subjectTools,
  ...documentTools,
  ...flashcardTools,
  ...quizTools,
  ...calendarTools,
];

const server = new Server(
  { name: "analogix-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments ?? {};

  const tool = allTools.find((t) => t.name === toolName);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
      isError: true,
    };
  }

  try {
    return await tool.handler(args as Record<string, unknown>);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: message }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});
