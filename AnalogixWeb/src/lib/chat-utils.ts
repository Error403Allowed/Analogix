import type { ToolCall } from "@analogix/shared/types";
import type { SubjectId } from "@/constants/subjects";
import { detectSubject } from "@/services/groq";

export function getToolAutoApproval() {
  if (typeof window === "undefined") return { autoApproveAll: false, autoApproveRead: false, autoApproveSubjects: [] as string[] };
  try {
    const stored = localStorage.getItem("ai_personality");
    if (!stored) return { autoApproveAll: false, autoApproveRead: false, autoApproveSubjects: [] as string[] };
    const p = JSON.parse(stored);
    return {
      autoApproveAll: p.auto_approve_tools === true,
      autoApproveRead: p.auto_approve_read_tools === true,
      autoApproveSubjects: Array.isArray(p.auto_approve_write_subjects) ? p.auto_approve_write_subjects : [],
    };
  } catch {
    return { autoApproveAll: false, autoApproveRead: false, autoApproveSubjects: [] as string[] };
  }
}

export function shouldAutoApprove(tools: ToolCall[]): boolean {
  const { autoApproveAll, autoApproveRead, autoApproveSubjects } = getToolAutoApproval();
  if (autoApproveAll) return true;

  const readTools = new Set(["list_subjects", "get_subject", "list_documents", "get_document", "list_flashcard_sets", "list_flashcards", "list_quizzes", "get_quiz", "get_quiz_attempts", "list_events", "list_deadlines"]);
  const writeTools = new Set(["create_flashcard_set", "create_flashcards", "update_flashcard", "create_event", "update_event", "delete_event", "create_deadline", "create_document", "update_document", "create_quiz", "update_subject_notes"]);

  if (autoApproveRead && tools.every(t => readTools.has(t.name))) return true;

  if (autoApproveSubjects.length > 0) {
    return tools.every(t => {
      if (readTools.has(t.name)) return true;
      if (!writeTools.has(t.name)) return false;
      const subject = (t.args.subjectId || t.args.subject || "") as string;
      if (!subject) return false;
      return autoApproveSubjects.some((s: any) => subject.toLowerCase().includes(s.toLowerCase()));
    });
  }

  return false;
}

export function findAnchor(text: string, userHobbies: string[]): string | null {
  const lower = text.toLowerCase();
  const matched = userHobbies.find((interest) => lower.includes(interest.toLowerCase()));
  return matched || null;
}

export function welcomeTemplates(userName: string) {
  return (subjectLabel: string) => [
    `Hi ${userName}. Great choice picking ${subjectLabel}.\n\nWhat specific topic or concept would you like to explore today? Just tell me what's on your mind, and I'll find something that doesn't bore you to death.`,
    `Hey ${userName}! ${subjectLabel} is a strong pick.\n\nTell me a topic or concept you're curious about, and I'll explain it with your interests.`,
    `Nice, ${userName}. ${subjectLabel} unlocked.\n\nWhat should we explore first? I'll make it click with things you actually like.`,
    `Alright ${userName}, ${subjectLabel} it is.\n\nName a concept and I'll break it down so you're like "Ah, I get it now!"`,
    `Welcome, ${userName}. Let's dive into ${subjectLabel}.\n\nWhat topic do you want to tackle today?`,
  ];
}

export function buildWelcomeMessage(subjectLabel: string, userName: string, previous?: string) {
  const templates = welcomeTemplates(userName)(subjectLabel);
  if (templates.length === 0) return "";
  let next = templates[Math.floor(Math.random() * templates.length)];
  if (previous && templates.length > 1) {
    let attempts = 0;
    while (next === previous && attempts < 6) {
      next = templates[Math.floor(Math.random() * templates.length)];
      attempts += 1;
    }
  }
  return next;
}

export function cleanForDisplay(text: string) {
  return text
    .replace(/<system-reminder[\s\S]*?<\/system-reminder>/gi, "")
    .replace(/<system-reminder[\s\S]*$/gi, "")
    .replace(/<\|[\w_]+\|>/g, "")
    .replace(/<internal\s*>[\s\S]*?<\/internal\s*>/gi, "")
    .replace(/<internal\s*>[\s\S]*/gi, "")
    .replace(/\n\s*Actions\s*$/gi, "")
    .replace(/\n\s*\n\s*$/g, "\n")
    .trim();
}

export function getLocalStorageData() {
  if (typeof window === "undefined") return null;
  const personality = localStorage.getItem("ai_personality");
  const memories = localStorage.getItem("ai_memories");
  return {
    personality: personality ? JSON.parse(personality) : null,
    memories: memories ? JSON.parse(memories) : [],
  };
}

export async function detectSubjectFromMessage(userMessage: string): Promise<SubjectId | null> {
  const detected = await detectSubject(userMessage);
  if (detected) return detected as SubjectId;
  return null;
}
