import { z } from "zod";

// ============================================================================
// FRESH SDK-NATIVE TOOL SET
// ----------------------------------------------------------------------------
// camelCase, AI-SDK-native tool vocabulary. Read tools are auto-run in the
// agent loop; write tools require the user's Allow/Deny approval first.
// ============================================================================

const subjectIdSchema = z.string().describe("A subject id, e.g. math, english, science");
const optionalSubjectIdSchema = z.string().optional().describe("Filter by subject id");

export const readToolDefinitions = {
  searchDocuments: {
    description:
      "Search the student's workspace documents by keyword. Returns matching documents with a short preview. Use when the student asks about their notes, documents, or study guides.",
    inputSchema: z.object({
      query: z.string().describe("Search keywords to match against document titles and content"),
      subjectId: optionalSubjectIdSchema,
    }),
  },
  getDocument: {
    description:
      "Fetch the full content of a single document by its id. Use when you need the complete text of a document the student references.",
    inputSchema: z.object({
      documentId: z.string().describe("The document id"),
    }),
  },
  listFlashcardSets: {
    description:
      "List the student's flashcard sets with their card counts. Use when the student asks about their flashcards or wants to review.",
    inputSchema: z.object({
      subjectId: optionalSubjectIdSchema,
    }),
  },
  listFlashcards: {
    description:
      "List the student's flashcards. Filter by set, subject, or only cards due for review.",
    inputSchema: z.object({
      setId: z.string().optional().describe("Flashcard set id to filter by"),
      subjectId: optionalSubjectIdSchema,
      due: z.boolean().optional().describe("Only return cards due for review"),
      limit: z.number().min(1).max(100).optional().describe("Maximum number of cards to return"),
    }),
  },
  listQuizzes: {
    description:
      "List the student's saved quizzes. Use when the student asks about their quizzes or wants to do one.",
    inputSchema: z.object({
      subjectId: optionalSubjectIdSchema,
    }),
  },
  getQuizPerformance: {
    description:
      "Get the student's quiz performance history aggregated by subject, including attempts and average scores.",
    inputSchema: z.object({
      subjectId: optionalSubjectIdSchema,
      limit: z.number().min(1).max(20).optional().describe("Number of recent attempts to consider"),
    }),
  },
  getWeakAreas: {
    description:
      "Identify the student's weaker areas from their quiz performance, so the tutor can target practice.",
    inputSchema: z.object({
      subjectId: optionalSubjectIdSchema,
    }),
  },
  listEvents: {
    description:
      "List the student's calendar events (exams, assignments, classes) in a date range.",
    inputSchema: z.object({
      from: z.string().optional().describe("ISO date to start from (default: today)"),
      to: z.string().optional().describe("ISO date to end at"),
    }),
  },
  listDeadlines: {
    description:
      "List the student's deadlines in a date range.",
    inputSchema: z.object({
      from: z.string().optional().describe("ISO date to start from (default: today)"),
      to: z.string().optional().describe("ISO date to end at"),
    }),
  },
  listSubjects: {
    description:
      "List the subjects the student is enrolled in.",
    inputSchema: z.object({}),
  },
  searchCurriculum: {
    description:
      "Search the Australian curriculum for learning outcomes, topics, and content descriptions aligned to the student's grade, state, and subject.",
    inputSchema: z.object({
      query: z.string().describe("The search query for curriculum content"),
      subject: z.string().optional().describe("Filter by subject name (e.g. Mathematics, Science)"),
      grade: z.string().optional().describe("Year level (e.g. 7, 8, 9, 10, 11, 12)"),
    }),
  },
  searchWorkspace: {
    description:
      "Search across the student's workspace (documents, flashcards, quizzes) for anything matching a query.",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      subjectId: optionalSubjectIdSchema,
    }),
  },
} as const;

export const writeToolDefinitions = {
  createFlashcardSet: {
    description:
      "Create a new flashcard set with the given cards.",
    inputSchema: z.object({
      subjectId: subjectIdSchema,
      name: z.string().describe("Name of the flashcard set"),
      cards: z.array(
        z.object({
          front: z.string(),
          back: z.string(),
        }),
      ).min(1).describe("Cards to create (front = question, back = answer)"),
    }),
  },
  addFlashcards: {
    description:
      "Add cards to an existing flashcard set.",
    inputSchema: z.object({
      setId: z.string().describe("The flashcard set id"),
      cards: z.array(
        z.object({
          front: z.string(),
          back: z.string(),
        }),
      ).min(1),
    }),
  },
  updateFlashcard: {
    description: "Update the front and/or back of a single flashcard.",
    inputSchema: z.object({
      flashcardId: z.string(),
      front: z.string().optional(),
      back: z.string().optional(),
    }),
  },
  deleteFlashcard: {
    description: "Delete a single flashcard.",
    inputSchema: z.object({
      flashcardId: z.string(),
    }),
  },
  deleteFlashcardSet: {
    description: "Delete a flashcard set and all of its cards.",
    inputSchema: z.object({
      setId: z.string(),
    }),
  },
  createQuiz: {
    description:
      "Create a saved quiz in the app. Use when the student asks to make a quiz or be quizzed. Every question MUST include a correctAnswer (the 0-based index of the correct option) — never omit it.",
    inputSchema: z.object({
      subjectId: subjectIdSchema,
      title: z.string(),
      difficulty: z.enum(["foundational", "intermediate", "advanced"]).optional(),
      questions: z.array(
        z.object({
          question: z.string(),
          options: z.array(z.string()).describe("The answer choices as plain text strings, e.g. [\"Paris\", \"London\", \"Rome\", \"Berlin\"]"),
          correctAnswer: z.number().describe("The 0-based INDEX of the correct option within options. ALWAYS set this for every question."),
          explanation: z.string().optional(),
        }),
      ).min(1).describe("Quiz questions. Each question must include the correctAnswer index."),
    }),
  },
  deleteQuiz: {
    description: "Delete a saved quiz.",
    inputSchema: z.object({
      quizId: z.string(),
    }),
  },
  createEvent: {
    description: "Create a calendar event (exam, assignment, class, etc.).",
    inputSchema: z.object({
      title: z.string(),
      date: z.string().describe("ISO date/time of the event"),
      endDate: z.string().optional(),
      type: z.string().optional().describe("Event type, e.g. exam, assignment, class"),
      subject: z.string().optional().describe("Subject id"),
      description: z.string().optional(),
    }),
  },
  updateEvent: {
    description: "Update a calendar event.",
    inputSchema: z.object({
      eventId: z.string(),
      title: z.string().optional(),
      date: z.string().optional(),
      endDate: z.string().optional(),
      type: z.string().optional(),
      subject: z.string().optional(),
      description: z.string().optional(),
    }),
  },
  deleteEvent: {
    description: "Delete a calendar event.",
    inputSchema: z.object({
      eventId: z.string(),
    }),
  },
  createDeadline: {
    description: "Create a deadline.",
    inputSchema: z.object({
      title: z.string(),
      dueDate: z.string().describe("ISO date/time the deadline is due"),
      subject: z.string().optional(),
      priority: z.string().optional().describe("low, medium, or high"),
    }),
  },
  createDocument: {
    description:
      "Create a new document in the student's workspace with the given content.",
    inputSchema: z.object({
      subjectId: subjectIdSchema,
      title: z.string(),
      content: z.string().describe("The document body text"),
    }),
  },
  updateDocument: {
    description: "Update a document's title and/or content.",
    inputSchema: z.object({
      documentId: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
    }),
  },
  deleteDocument: {
    description: "Delete a document from the student's workspace.",
    inputSchema: z.object({
      documentId: z.string(),
    }),
  },
  updateSubjectNotes: {
    description: "Update the notes for a subject.",
    inputSchema: z.object({
      subjectId: subjectIdSchema,
      notes: z.string(),
    }),
  },
  storeMemory: {
    description:
      "Store a fact about the student (preferences, goals, learning style) so Analogix can personalise future sessions.",
    inputSchema: z.object({
      content: z.string().describe("The information to remember"),
      memoryType: z.enum(["fact", "preference", "goal", "skill"]).optional(),
      importance: z.number().min(0).max(1).optional(),
      subjectId: z.string().optional(),
    }),
  },
} as const;

export type ReadToolName = keyof typeof readToolDefinitions;
export type WriteToolName = keyof typeof writeToolDefinitions;
export type AIToolName = ReadToolName | WriteToolName;