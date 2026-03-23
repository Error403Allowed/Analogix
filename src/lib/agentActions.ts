export const BOTTOM_RIGHT_AGENT_DOCUMENT_EDIT_MESSAGE =
  "I can read your workspace, but document edits need to happen inside the document editor. Open the document and use /ai there.";

export const BOTTOM_RIGHT_AGENT_ACTION_TYPES = [
  "add_flashcards",
  "start_quiz",
] as const;

export type BottomRightAgentActionType =
  (typeof BOTTOM_RIGHT_AGENT_ACTION_TYPES)[number];

export function isBottomRightAgentActionType(
  value: unknown,
): value is BottomRightAgentActionType {
  return typeof value === "string" &&
    (BOTTOM_RIGHT_AGENT_ACTION_TYPES as readonly string[]).includes(value);
}

export function filterBottomRightAgentActions<T extends Record<string, unknown>>(
  actions: T[],
): T[] {
  return actions.filter((action) => isBottomRightAgentActionType(action.type));
}

