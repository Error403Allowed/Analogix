import { GraphQLError } from "graphql";
import type { ToolCall, ToolResult, ToolExecutionResult } from "@analogix/shared/types";
import type { GraphQLContext } from "../context.js";
import type { ToolHandler } from "./tools/shared.js";
import { subjectsHandlers } from "./tools/subjects.js";
import { documentsHandlers } from "./tools/documents.js";
import { flashcardsHandlers } from "./tools/flashcards.js";
import { quizzesHandlers } from "./tools/quizzes.js";
import { calendarHandlers } from "./tools/calendar.js";

const handlers: Record<string, ToolHandler> = {
  ...subjectsHandlers,
  ...documentsHandlers,
  ...flashcardsHandlers,
  ...quizzesHandlers,
  ...calendarHandlers,
};

// ── Public API ──

export async function executeTools(
  tools: ToolCall[],
  ctx: GraphQLContext,
): Promise<ToolExecutionResult> {
  if (!ctx.user || !ctx.supabase) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED", http: { status: 401 } },
    });
  }
  const userId = ctx.user.id;
  const supabase = ctx.supabase;

  const results: ToolResult[] = [];

  for (const tool of tools) {
    try {
      const handler = handlers[tool.name];
      if (!handler) throw new Error(`Unknown tool: ${tool.name}`);
      const data = await handler(tool.args, userId, supabase);
      results.push({ toolName: tool.name, success: true, data });
    } catch (err) {
      results.push({
        toolName: tool.name,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { results };
}
