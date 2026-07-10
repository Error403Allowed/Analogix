export function formatToolResult(r: { toolName: string; success: boolean; data?: unknown; error?: string }): string {
  if (!r.success) return r.error ? `❌ ${r.toolName}: ${r.error}` : `❌ ${r.toolName}: Failed`;
  if (!r.data) return "";

  const d = r.data as any;
  switch (r.toolName) {
    case "list_events": {
      const events = Array.isArray(d) ? d : [];
      if (events.length === 0) return "📅 No events found.";
      return `📅 **Events** (${events.length}):\n${events.map((e: any) =>
        `- **${e.title}** — ${new Date(e.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}${e.type ? ` (${e.type})` : ""}`
      ).join("\n")}`;
    }
    case "list_deadlines": {
      const deadlines = Array.isArray(d) ? d : [];
      if (deadlines.length === 0) return "📋 No deadlines found.";
      return `📋 **Deadlines** (${deadlines.length}):\n${deadlines.map((e: any) =>
        `- **${e.title}** — due ${new Date(e.due_date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}${e.priority ? ` (${e.priority})` : ""}`
      ).join("\n")}`;
    }
    case "list_documents": {
      const docs = Array.isArray(d) ? d : [];
      if (docs.length === 0) return "📄 No documents found.";
      return `📄 **Documents** (${docs.length}):\n${docs.map((e: any) =>
        `- **${e.title}**${e.subject_id ? ` (${e.subject_id})` : ""}`
      ).join("\n")}`;
    }
    case "get_document":
      return `📄 **${d.title || "Document"}**:\n\n${d.content || "(no content)"}`;
    case "list_flashcard_sets": {
      const sets = Array.isArray(d) ? d : [];
      if (sets.length === 0) return "📇 No flashcard sets found.";
      return `📇 **Flashcard Sets** (${sets.length}):\n${sets.map((e: any) =>
        `- **${e.name}**${e.subject_id ? ` (${e.subject_id})` : ""}${e.card_count ? ` — ${e.card_count} cards` : ""}`
      ).join("\n")}`;
    }
    case "list_flashcards": {
      const cards = Array.isArray(d) ? d : [];
      if (cards.length === 0) return "📇 No flashcards found.";
      return `📇 **Flashcards** (${cards.length}):\n${cards.map((e: any) =>
        `- **Q:** ${e.front}\n  **A:** ${e.back}`
      ).join("\n")}`;
    }
    case "list_quizzes": {
      const quizzes = Array.isArray(d) ? d : [];
      if (quizzes.length === 0) return "❓ No quizzes found.";
      return `❓ **Quizzes** (${quizzes.length}):\n${quizzes.map((e: any) =>
        `- **${e.title}**${e.subject_id ? ` (${e.subject_id})` : ""}${e.questionCount ? ` — ${e.questionCount} questions` : ""}`
      ).join("\n")}`;
    }
    case "get_quiz":
      return `❓ **${d.title || "Quiz"}** (${d.subject_id || ""}): ${Array.isArray(d.questions) ? d.questions.length : 0} questions`;
    case "list_subjects": {
      const subjects = Array.isArray(d) ? d : [];
      if (subjects.length === 0) return "📚 No subjects found.";
      return `📚 **Subjects** (${subjects.length}):\n${subjects.map((e: any) =>
        `- **${e.name || e.id}**${e.notes ? ` — ${e.notes.slice(0, 80)}` : ""}`
      ).join("\n")}`;
    }
    case "get_subject":
      return `📚 **${d.name || d.id || "Subject"}**: ${d.notes || "(no notes)"}`;
    case "create_event":
      return `✅ **Event created**: ${d.title || ""} on ${d.date ? new Date(d.date).toLocaleDateString("en-AU") : ""}`;
    case "update_event":
      return `✅ **Event updated**: ${d.title || ""}`;
    case "delete_event":
      return `✅ **Event deleted**`;
    case "create_flashcard_set":
      return `✅ **Flashcard set created**: ${d.name || ""}`;
    case "create_flashcards":
      return `✅ **Flashcards added**`;
    case "update_flashcard":
      return `✅ **Flashcard updated**`;
    case "create_document":
      return `✅ **Document created**: ${d.title || ""}`;
    case "update_document":
      return `✅ **Document updated**: ${d.title || ""}`;
    case "update_subject_notes":
      return `✅ **Notes saved**`;
    case "create_quiz":
      return `✅ **Quiz created**: ${d.title || ""}`;
    case "get_quiz_attempts": {
      const attempts = Array.isArray(d) ? d : [];
      if (attempts.length === 0) return "📊 No quiz attempts found.";
      return `📊 **Quiz Attempts** (${attempts.length}):\n${attempts.map((e: any) =>
        `- ${new Date(e.created_at).toLocaleDateString("en-Au")} — ${e.score ?? "?"}/${e.total ?? "?"} (${e.percentage ?? "?"}%)`
      ).join("\n")}`;
    }
    default:
      return "";
  }
}
