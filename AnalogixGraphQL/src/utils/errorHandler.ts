import { logger } from "../logger.js";

export function sanitizeError(
  error: unknown,
  meta?: { userId?: string; operation?: string }
): string {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "An unexpected error occurred";

  logger.error({ userId: meta?.userId, operation: meta?.operation, error }, message);

  return "An unexpected error occurred. Please try again.";
}
