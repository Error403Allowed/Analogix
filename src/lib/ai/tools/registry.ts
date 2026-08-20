import { asSchema, tool } from "ai";
import type { ToolSet } from "ai";
import { z } from "zod";
import { estimateRequestTokens } from "../budget";
import type { TaskType } from "../models";
import {
  readToolDefinitions,
  writeToolDefinitions,
  type AIToolName,
  type ReadToolName,
  type WriteToolName,
} from "./definitions";
import { bindings, type ToolBindings } from "./bindings";

// ============================================================================
// TOOL REGISTRY
// ----------------------------------------------------------------------------
// Builds the AI-SDK-native `tools` object for streamText/generateText. Read
// tools auto-run inside the agent loop; write tools declare `needsApproval` so
// the server emits a tool-approval-request and the client shows Allow/Deny.
// ============================================================================

export type { ToolBindings };

const defineReadTool = (
  name: string,
  description: string,
  inputSchema: z.ZodSchema,
  ctx: ToolBindings,
) =>
  tool({
    description,
    inputSchema,
    execute: async (args) => {
      try {
        const result = await bindings[name](ctx, args);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Tool execution failed",
        };
      }
    },
  });

const defineWriteTool = (
  name: string,
  description: string,
  inputSchema: z.ZodSchema,
  ctx: ToolBindings,
) =>
  tool({
    description,
    inputSchema,
    needsApproval: true,
    execute: async (args) => {
      try {
        const result = await bindings[name](ctx, args);
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Tool execution failed",
        };
      }
    },
  });

export const buildToolSet = (ctx: ToolBindings, names?: AIToolName[]): ToolSet => {
  const tools: ToolSet = {};
  const wanted = new Set(
    names ??
      ([
        ...Object.keys(readToolDefinitions),
        ...Object.keys(writeToolDefinitions),
      ] as AIToolName[]),
  );

  for (const [name, def] of Object.entries(readToolDefinitions)) {
    if (wanted.has(name as AIToolName)) {
      tools[name] = defineReadTool(name, def.description, def.inputSchema, ctx);
    }
  }
  for (const [name, def] of Object.entries(writeToolDefinitions)) {
    if (wanted.has(name as AIToolName)) {
      tools[name] = defineWriteTool(name, def.description, def.inputSchema, ctx);
    }
  }

  return tools;
};

export const getToolNames = (): { reads: string[]; writes: string[] } => ({
  reads: Object.keys(readToolDefinitions),
  writes: Object.keys(writeToolDefinitions),
});

// ============================================================================
// PER-REQUEST TOOL SUBSET
// ----------------------------------------------------------------------------
// Groq counts the serialized tool definitions against the request/TPM budget.
// Sending all 30 tools (~3.7k tokens) leaves almost no room for long-form
// output on the free tier, so we select only the tools relevant to the
// current message. This is what keeps essays/study guides from being cut off.
// ============================================================================

const CORE_READ_TOOLS: ReadToolName[] = [
  "searchWorkspace",
  "searchDocuments",
  "getDocument",
  "listSubjects",
  "listEvents",
  "listDeadlines",
  "searchCurriculum",
  "getQuizPerformance",
  "getWeakAreas",
  "listFlashcardSets",
  "listQuizzes",
  "listFlashcards",
];

const QUIZ_WRITE_TOOLS: WriteToolName[] = ["createQuiz", "deleteQuiz"];
const FLASHCARD_WRITE_TOOLS: WriteToolName[] = [
  "createFlashcardSet",
  "addFlashcards",
  "updateFlashcard",
  "deleteFlashcard",
  "deleteFlashcardSet",
];
const CALENDAR_WRITE_TOOLS: WriteToolName[] = [
  "createEvent",
  "updateEvent",
  "deleteEvent",
  "createDeadline",
];
const DOC_WRITE_TOOLS: WriteToolName[] = [
  "createDocument",
  "updateDocument",
  "deleteDocument",
  "updateSubjectNotes",
];

export const getToolsForRequest = (
  latestUserMsg: string,
  taskType: TaskType,
): AIToolName[] => {
  if (taskType === "lightweight") return [];
  const msg = latestUserMsg.toLowerCase();
  const has = (re: RegExp) => re.test(msg);

  const names = new Set<AIToolName>(CORE_READ_TOOLS);
  if (has(/\b(quiz|quizz|flashcard)/)) {
    QUIZ_WRITE_TOOLS.forEach((t) => names.add(t));
    FLASHCARD_WRITE_TOOLS.forEach((t) => names.add(t));
  }
  if (
    has(/\b(event|deadline|exam|assignment|schedul|calendar|remind|due|when is)/)
  ) {
    CALENDAR_WRITE_TOOLS.forEach((t) => names.add(t));
  }
  if (
    has(/\b(document|note|essay|writ|report|study guide|summari|rewrit|simplif|revision|paragraph)/)
  ) {
    DOC_WRITE_TOOLS.forEach((t) => names.add(t));
  }
  names.add("storeMemory");
  return [...names];
};

// Serializes tools exactly the way the provider does (JSON Schema via
// `asSchema`) so the token estimate matches what Groq actually counts.
export const estimateToolTokens = (tools: ToolSet): number => {
  const payload = JSON.stringify(
    Object.entries(tools).map(([name, t]) => ({
      type: "function",
      function: {
        name,
        description: t.description,
        parameters: asSchema(t.inputSchema).jsonSchema,
      },
    })),
  );
  return estimateRequestTokens(payload);
};