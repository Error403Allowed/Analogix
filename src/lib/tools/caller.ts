import { getFlashcardSets, type CreateFlashcardsParams } from './handlers/flashcard';
import { getDocuments, searchWorkspace, type GetDocumentsParams } from './handlers/document';
import { getQuizPerformance, getWeakAreas, type StartQuizParams } from './handlers/quiz';
import { getUpcomingEvents, getSubjects } from './handlers/calendar';
import { storeMemory, retrieveRelevantMemories, type StoreMemoryParams } from './handlers/memory';
import type { ToolName } from './registry';

export interface ToolCall {
  name: ToolName;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function executeToolCall(
  userId: string,
  toolCall: ToolCall
): Promise<ToolResult> {
  const { name, arguments: args } = toolCall;

  try {
    switch (name) {
      

      case 'get_documents':
        return await handleGetDocuments(userId, args);

      case 'get_flashcard_sets':
        return await handleGetFlashcardSets(userId, args);

      case 'start_quiz':
        return await handleStartQuiz(userId, args);

      case 'get_quiz_performance':
        return await handleGetQuizPerformance(userId, args);

      case 'get_upcoming_events':
        return await handleGetUpcomingEvents(userId, args);

      

      case 'get_subjects':
        return await handleGetSubjects(userId);

      case 'store_memory':
        return await handleStoreMemory(userId, args);

      case 'search_workspace':
        return await handleSearchWorkspace(userId, args);

      case 'get_weak_areas':
        return await handleGetWeakAreas(userId, args);

      case 'create_study_guide':
        return { success: false, error: 'Study guide creation requires document generation' };

      case 'get_formulas':
        return { success: false, error: 'Formula retrieval not implemented yet' };

      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    console.error(`[executeToolCall] Error in ${name}:`, err);
    return { success: false, error: `Tool execution failed: ${err}` };
  }
}

async function handleGetDocuments(userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const params: GetDocumentsParams = {
    subjectId: args.subjectId as string | undefined,
    type: args.type as GetDocumentsParams['type'],
    limit: args.limit as number,
  };

  const docs = await getDocuments(userId, params);
  return { success: true, data: docs };
}

async function handleGetFlashcardSets(userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const sets = await getFlashcardSets(
    userId,
    args.subjectId as string | undefined,
    args.limit as number
  );
  return { success: true, data: sets };
}

async function handleStartQuiz(userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const params: StartQuizParams = {
    subjectId: args.subjectId as string,
    topic: args.topic as string | undefined,
    difficulty: args.difficulty as StartQuizParams['difficulty'],
    numberOfQuestions: args.numberOfQuestions as number,
    timeLimitMinutes: args.timeLimitMinutes as number,
  };

  return {
    success: true,
    data: {
      quizConfig: params,
      message: `Starting ${params.numberOfQuestions}-question quiz on ${params.subjectId}`,
    },
  };
}

async function handleGetQuizPerformance(userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const performance = await getQuizPerformance(
    userId,
    args.subjectId as string | undefined,
    args.limit as number
  );
  return { success: true, data: performance };
}

async function handleGetUpcomingEvents(userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const events = await getUpcomingEvents(
    userId,
    args.days as number,
    args.subjectId as string | undefined
  );
  return { success: true, data: events };
}

async function handleGetSubjects(userId: string): Promise<ToolResult> {
  const subjects = await getSubjects(userId);
  return { success: true, data: subjects };
}

async function handleStoreMemory(userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const params: StoreMemoryParams = {
    content: args.content as string,
    memoryType: args.memoryType as StoreMemoryParams['memoryType'],
    importance: args.importance as number | undefined,
    subjectId: args.subjectId as string | undefined,
  };

  const result = await storeMemory(userId, params);
  return result.success
    ? { success: true, data: { memoryId: result.memoryId } }
    : { success: false, error: result.error };
}

async function handleSearchWorkspace(userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const docs = await searchWorkspace(
    userId,
    args.query as string,
    {
      subjectId: args.subjectId as string | undefined,
      type: args.type as string | undefined,
    }
  );
  return { success: true, data: docs };
}

async function handleGetWeakAreas(userId: string, args: Record<string, unknown>): Promise<ToolResult> {
  const weakAreas = await getWeakAreas(userId, args.subjectId as string | undefined);
  return { success: true, data: weakAreas };
}