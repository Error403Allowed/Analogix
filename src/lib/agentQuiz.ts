export const AGENT_QUIZ_SESSION_KEY = "analogix.pending-agent-quiz";

export interface PendingAgentQuiz {
  subjectId: string;
  topic: string;
  difficulty: "foundational" | "intermediate" | "advanced";
  numberOfQuestions: number;
  timeLimitMinutes: number;
}

const QUIZ_DIFFICULTY_ALIASES: Record<string, PendingAgentQuiz["difficulty"]> = {
  beginner: "foundational",
  foundational: "foundational",
  intermediate: "intermediate",
  advanced: "advanced",
};

const clampInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
};

export function normaliseAgentQuizAction(
  action: Record<string, unknown>,
  fallbackSubjectId?: string | null,
): PendingAgentQuiz | null {
  if (action.type !== "start_quiz") return null;

  const subjectCandidate =
    typeof action.subjectId === "string" && action.subjectId.trim().length > 0
      ? action.subjectId
      : fallbackSubjectId;

  if (!subjectCandidate) return null;

  const difficulty =
    typeof action.difficulty === "string"
      ? QUIZ_DIFFICULTY_ALIASES[action.difficulty.trim().toLowerCase()] || "intermediate"
      : "intermediate";

  return {
    subjectId: subjectCandidate.trim().toLowerCase(),
    topic: typeof action.topic === "string" ? action.topic.trim() : "",
    difficulty,
    numberOfQuestions: clampInteger(action.numberOfQuestions, 5, 3, 20),
    timeLimitMinutes: clampInteger(action.timeLimitMinutes, 0, 0, 120),
  };
}
