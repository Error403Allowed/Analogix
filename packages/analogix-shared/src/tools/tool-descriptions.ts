import type { ToolProposal, ToolCall, ToolPreview } from "../types/tool-proposal.js";

export const TOOL_LIST_DESCRIPTION = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE TOOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You have access to tools that read and write the user's data. You decide when to call them.

RULES (hard requirements):
1. When the user explicitly asks to CREATE, EDIT, UPDATE, MODIFY, CHANGE, DELETE, REMOVE, ADD, or VIEW data — output ONLY TOOL_CALLS at the end. No conversational text before it. The tool card handles communication.
2. "Create flashcards about X", "edit my biology notes", "add cards to my mitosis set", "remove that flashcard", "update my algebra quiz", "delete that document", "show my events", "list my documents" ARE explicit — emit TOOL_CALLS with no preamble.
3. "I need to..." or "I have to..." are NOT explicit — just respond conversationally, no TOOL_CALLS.
4. Never mention tool names to the user. Never say "I'll use X", "you can use X", "let me X". The tool card is invisible to the user.
5. Always fill in ALL required arguments with real values. Never leave args empty.
6. CRITICAL: Use the EXACT tool name from below. Wrong names fail silently.
7. For reads (list, get, show): emit TOOL_CALLS the same way. The result appears after user approval.

Available tools:

=== FLASHCARDS ===
1. create_flashcard_set(subjectId: string, name: string, cards: [{front: string, back: string}])
   For "create flashcards about mitosis"

2. list_flashcard_sets(subjectId?: string)
   For "show my flashcards"

3. create_flashcards(setId: string, cards: [{front: string, back: string}])
   For "add more flashcards to the biology set"

4. list_flashcards(setId?: string, subjectId?: string, due?: boolean, limit?: number)
   For "show all flashcards in biology"

5. update_flashcard(flashcardId: string, front?: string, back?: string)
   For "edit flashcard 123"

6. delete_flashcard(flashcardId: string)
   For "remove that flashcard from the biology set"

7. delete_flashcard_set(setId: string)
   For "delete that entire flashcard set"

=== CALENDAR ===
8. create_event(title: string, date: string, endDate?: string, type?: "exam"|"assignment"|"event"|"class"|"lesson"|"reminder"|"sport"|"meeting"|"personal", subject?: string, color?: string, description?: string)
   For "create an exam on friday"

9. list_events(from?: string, to?: string)
   For "show my events this week"

10. update_event(eventId: string, title?: string, date?: string, endDate?: string, type?: string, subject?: string, color?: string, description?: string)
    For "change my exam to next week"

11. delete_event(eventId: string)
    For "delete that event"

=== DEADLINES ===
12. create_deadline(title: string, dueDate: string, subject?: string, priority?: "low"|"medium"|"high")
    For "add a homework deadline"

13. list_deadlines()
    For "show my deadlines"

=== DOCUMENTS ===
14. create_document(subjectId: string, title: string, content: string, contentFormat?: "html"|"markdown"|"json", role?: "notes"|"study-guide"|"shared")
    For "create a study guide for biology"

15. list_documents(subjectId?: string)
    For "what documents do I have"

16. get_document(documentId: string)
    For "show me the photosynthesis document"

17. update_document(documentId: string, title?: string, content?: string, contentFormat?: string)
    For "update my biology notes"

18. delete_document(documentId: string)
    For "delete that study guide"

=== QUIZZES ===
19. create_quiz(subjectId: string, title: string, difficulty?: "beginner"|"intermediate"|"advanced", questions: [{type: "multiple_choice"|"multiple_select"|"short_answer", question: string, options: [{id: string, text: string, isCorrect: boolean}], correctAnswer?: string, explanation?: string}])
    For "generate a quiz about algebra"

20. list_quizzes(subjectId?: string)
    For "show my quizzes"

21. get_quiz(quizId: string)
    For "show me the algebra quiz"

22. delete_quiz(quizId: string)
    For "delete that quiz"

23. get_quiz_attempts(quizId?: string)
    For "show my quiz history"

=== SUBJECTS ===
24. list_subjects()
    For "what subjects do I have"

25. get_subject(subjectId: string)
    For "show me my math subject"

26. update_subject_notes(subjectId: string, content: string)
    For "update my notes for math"

Important — date format:
- Always use ISO 8601 format: "2025-06-23T20:00:00.000Z"
- Convert relative dates to absolute: "today", "tomorrow", "next week" → actual date strings
- Include time in the date string

TOOL_CALLS format (output ONLY this at the end, no conversational text before it):
TOOL_CALLS: [
  {
    "name": "exact_tool_name",
    "args": { "param1": "value1", "param2": "value2" }
  }
]

Examples — your full response should be ONLY the TOOL_CALLS block (empty/blank before it):
- User: "create 5 flashcards about mitosis" → You: TOOL_CALLS: [{"name":"create_flashcard_set","args":{"subjectId":"biology","name":"Mitosis","cards":[{"front":"What is mitosis?","back":"Cell division"},{"front":"What are the phases?","back":"Prophase, metaphase, anaphase, telophase"}]}}]
- User: "add 3 more cards to my mitosis set" → TOOL_CALLS: [{"name":"create_flashcards","args":{"setId":"<id from list>","cards":[{"front":"...","back":"..."}]}}]
- User: "remove that flashcard about anaphase" → TOOL_CALLS: [{"name":"delete_flashcard","args":{"flashcardId":"<id from list>"}}]
- User: "edit flashcard 123" → TOOL_CALLS: [{"name":"update_flashcard","args":{"flashcardId":"123","front":"fixed text","back":"fixed answer"}}]
- User: "edit my biology notes — change the title to 'Cell Biology' and add a section about organelles" → You first get the doc: TOOL_CALLS: [{"name":"list_documents","args":{"subjectId":"biology"}}] then update: TOOL_CALLS: [{"name":"update_document","args":{"documentId":"<id>","title":"Cell Biology","content":"new content"}}]
- User: "delete that document" → TOOL_CALLS: [{"name":"delete_document","args":{"documentId":"<id>"}}]
- User: "show my documents" → You: TOOL_CALLS: [{"name":"list_documents","args":{}}]
- User: "what subjects do I have" → You: TOOL_CALLS: [{"name":"list_subjects","args":{}}]
- User: "create an exam on friday for biology" → You: TOOL_CALLS: [{"name":"create_event","args":{"title":"Biology Exam","date":"2025-06-27T09:00:00.000Z","type":"exam","subject":"biology"}}]
- User: "change my exam to next week" → TOOL_CALLS: [{"name":"update_event","args":{"eventId":"<id>","date":"<new date>"}}]
- User: "delete that quiz" → TOOL_CALLS: [{"name":"delete_quiz","args":{"quizId":"<id>"}}]
- User: "I need to study for my exam" → You: "What subject is the exam on? I can help you create flashcards or a study guide." (no TOOL_CALLS — not explicit)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

export function summarizeToolCall(name: string, args: Record<string, unknown>): string {
  const title = (args.title as string) || (args.name as string) || "";
  const subject = (args.subjectId as string) || (args.subject as string) || "";
  const count = (args.cards as any[])?.length || 0;
  const questionCount = (args.questions as any[])?.length || (args.numberOfQuestions as number) || 0;

  switch (name) {
    case "create_flashcard_set":
      return `Create flashcard set: "${title}" (${count} cards)${subject ? ` in ${subject}` : ""}`;
    case "create_flashcards":
      return `Add ${count} cards to flashcard set`;
    case "list_flashcard_sets":
      return `Show flashcard sets${subject ? ` (${subject})` : ""}`;
    case "list_flashcards":
      return `Show flashcards${subject ? ` (${subject})` : ""}`;
    case "update_flashcard":
      return "Update flashcard";
    case "delete_flashcard":
      return `Delete flashcard from set`;
    case "delete_flashcard_set":
      return `Delete flashcard set${title ? `: "${title}"` : ""}`;
    case "create_event":
      return `Create event: "${title}"${subject ? ` (${subject})` : ""}`;
    case "update_event":
      return `Update event: "${title || "untitled"}"`;
    case "delete_event":
      return `Delete event${title ? `: "${title}"` : ""}`;
    case "list_events":
      return "Show calendar events";
    case "create_deadline":
      return `Create deadline: "${title}"${subject ? ` (${subject})` : ""}`;
    case "list_deadlines":
      return "Show homework deadlines";
    case "create_document":
      return `Create document: "${title}"${subject ? ` in ${subject}` : ""}`;
    case "list_documents":
      return `Show documents${subject ? ` (${subject})` : ""}`;
    case "get_document":
      return `Get document: "${title || "(by ID)"}"`;
    case "update_document":
      return `Update document: "${title || "untitled"}"`;
    case "delete_document":
      return `Delete document${title ? `: "${title}"` : ""}`;
    case "create_quiz":
    case "generate_quiz":
      return `Create quiz: "${title}" (${questionCount} questions)${subject ? ` in ${subject}` : ""}`;
    case "list_quizzes":
      return `Show quizzes${subject ? ` (${subject})` : ""}`;
    case "get_quiz":
      return `Get quiz: "${title || "(by ID)"}"`;
    case "delete_quiz":
      return `Delete quiz${title ? `: "${title}"` : ""}`;
    case "get_quiz_attempts":
      return "Show quiz history";
    case "list_subjects":
      return "Show all subjects";
    case "get_subject":
      return `Get subject: "${subject || "(by ID)"}"`;
    case "update_subject_notes":
      return `Update notes for ${subject || "subject"}`;
    default:
      return `${name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}${title ? `: ${title}` : ""}`;
  }
}

export function parseToolCallsFromResponse(content: string): { text: string; toolCalls: ToolCall[] | null } {
  const idx = content.lastIndexOf("TOOL_CALLS:");
  if (idx !== -1) {
    const beforeText = content.slice(0, idx).trim();
    let afterStr = content.slice(idx + "TOOL_CALLS:".length).trim();
    afterStr = afterStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    try {
      const calls = JSON.parse(afterStr) as ToolCall[];
      return { text: beforeText, toolCalls: calls };
    } catch {
      return { text: beforeText, toolCalls: null };
    }
  }
  return { text: content, toolCalls: null };
}

export function buildToolProposal(toolCalls: ToolCall[], summary: string, description: string): ToolProposal {
  return {
    id: crypto.randomUUID(),
    summary,
    description,
    tools: toolCalls,
    previews: toolCalls.map(tc => ({
      type: (tc.name.includes("flashcard") ? "flashcards"
        : tc.name.includes("event") ? "event"
        : tc.name.includes("deadline") ? "deadline"
        : tc.name.includes("document") ? "document"
        : tc.name.includes("quiz") ? "quiz"
        : tc.name.includes("subject") ? "subject"
        : tc.name.includes("note") ? "subject"
        : "event") as ToolPreview["type"],
      action: (tc.name.startsWith("create") || tc.name.startsWith("generate") ? "create"
        : tc.name.startsWith("update") ? "update"
        : tc.name.startsWith("delete") ? "delete"
        : "read") as ToolPreview["action"],
      after: tc.args as Record<string, unknown>,
      summary,
    })),
  };
}
