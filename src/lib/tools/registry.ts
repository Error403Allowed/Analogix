import { z } from 'zod';

export const ToolSchemas = {
  start_quiz: {
    name: 'start_quiz',
    description: 'Start an interactive quiz on a specific topic. Use when the student wants to test their knowledge.',
    parameters: z.object({
      subjectId: z.string().describe('The subject ID for the quiz'),
      topic: z.string().optional().describe('Specific topic to focus on'),
      difficulty: z.enum(['foundational', 'intermediate', 'advanced']).describe('Difficulty level'),
      numberOfQuestions: z.number().min(3).max(20).default(5).describe('Number of questions'),
      timeLimitMinutes: z.number().min(0).max(60).default(0).describe('Time limit in minutes (0 = no limit)'),
    }),
  },

  get_documents: {
    name: 'get_documents',
    description: 'Retrieve documents from the user\'s workspace. Use to find study materials, notes, or study guides.',
    parameters: z.object({
      subjectId: z.string().optional().describe('Filter by subject ID'),
      type: z.enum(['document', 'study_guide', 'all']).default('all').describe('Document type to filter'),
      limit: z.number().min(1).max(50).default(20).describe('Maximum number of documents to return'),
    }),
  },

  get_flashcard_sets: {
    name: 'get_flashcard_sets',
    description: 'Get existing flashcard sets for review or study.',
    parameters: z.object({
      subjectId: z.string().optional().describe('Filter by subject ID'),
      limit: z.number().min(1).max(20).default(10).describe('Maximum number of sets to return'),
    }),
  },

  get_upcoming_events: {
    name: 'get_upcoming_events',
    description: 'Get upcoming calendar events, deadlines, and assignments.',
    parameters: z.object({
      days: z.number().min(1).max(30).default(7).describe('Number of days to look ahead'),
      subjectId: z.string().optional().describe('Filter by subject'),
    }),
  },

  create_study_guide: {
    name: 'create_study_guide',
    description: 'Create a structured study guide from provided content or existing documents.',
    parameters: z.object({
      subjectId: z.string().describe('Subject for the study guide'),
      title: z.string().describe('Title for the study guide'),
      sourceDocumentId: z.string().optional().describe('ID of document to base study guide on'),
      topics: z.array(z.string()).optional().describe('Topics to include'),
    }),
  },

  get_formulas: {
    name: 'get_formulas',
    description: 'Retrieve formula sheets and references for a subject.',
    parameters: z.object({
      subjectId: z.string().describe('Subject to get formulas for'),
      topic: z.string().optional().describe('Specific topic filter'),
    }),
  },

  get_quiz_performance: {
    name: 'get_quiz_performance',
    description: 'Get quiz performance history to identify weak areas.',
    parameters: z.object({
      subjectId: z.string().optional().describe('Filter by subject'),
      limit: z.number().min(1).max(20).default(10).describe('Number of recent quizzes'),
    }),
  },

  store_memory: {
    name: 'store_memory',
    description: 'Store important information about the student\'s preferences, goals, or learning patterns.',
    parameters: z.object({
      content: z.string().describe('The information to remember'),
      memoryType: z.enum(['fact', 'preference', 'goal', 'skill']).describe('Type of memory'),
      importance: z.number().min(0).max(1).default(0.5).describe('Importance level (0-1)'),
      subjectId: z.string().optional().describe('Related subject'),
    }),
  },

  search_workspace: {
    name: 'search_workspace',
    description: 'Search the workspace for documents, flashcards, or other content matching a query.',
    parameters: z.object({
      query: z.string().describe('Search query'),
      subjectId: z.string().optional().describe('Filter by subject'),
      type: z.enum(['documents', 'flashcards', 'quizzes', 'all']).default('all').describe('Content type'),
    }),
  },

  get_subjects: {
    name: 'get_subjects',
    description: 'Get list of subjects the student is studying.',
    parameters: z.object({}),
  },

  get_weak_areas: {
    name: 'get_weak_areas',
    description: 'Identify topics where the student needs more practice based on quiz performance.',
    parameters: z.object({
      subjectId: z.string().optional().describe('Filter by subject'),
    }),
  },
};

export type ToolName = keyof typeof ToolSchemas;

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodSchema;
}

export function getToolDefinition(name: ToolName): ToolDefinition {
  return ToolSchemas[name];
}

export function getAllToolDefinitions(): ToolDefinition[] {
  return Object.values(ToolSchemas);
}

export function getToolsForCompound(): object[] {
  return getAllToolDefinitions().map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}