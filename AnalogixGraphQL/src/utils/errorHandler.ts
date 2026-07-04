import { logger } from "../logger.js";

export function sanitizeError(
  error: unknown,
  { userId, operation }: { userId: string; operation: string; isDev?: boolean }
): string {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "An unexpected error occurred";

  logger.error({ userId, operation, error }, message);

  return "An unexpected error occurred. Please try again.";
}
