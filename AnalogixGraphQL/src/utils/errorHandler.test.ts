import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../logger.js", () => ({
  logger: {
    error: vi.fn(),
  },
}));

const { sanitizeError } = await import("./errorHandler.js");
const { logger } = await import("../logger.js");

describe("sanitizeError", () => {
  it("returns a generic message for Error instances", () => {
    const result = sanitizeError(new Error("something broke"));
    expect(result).toBe("An unexpected error occurred. Please try again.");
  });

  it("returns a generic message for string errors", () => {
    const result = sanitizeError("string error");
    expect(result).toBe("An unexpected error occurred. Please try again.");
  });

  it("returns a generic message for unknown error types", () => {
    const result = sanitizeError(42);
    expect(result).toBe("An unexpected error occurred. Please try again.");
  });

  it("returns a generic message for null/undefined", () => {
    const result = sanitizeError(null);
    expect(result).toBe("An unexpected error occurred. Please try again.");
  });

  it("logs the error with metadata when provided", () => {
    const error = new Error("db failure");
    sanitizeError(error, { userId: "u1", operation: "getProfile" });
    expect(logger.error).toHaveBeenCalledWith(
      { userId: "u1", operation: "getProfile", error },
      "db failure"
    );
  });

  it("logs the error without metadata when not provided", () => {
    const error = new Error("bare error");
    sanitizeError(error);
    expect(logger.error).toHaveBeenCalledWith(
      { userId: undefined, operation: undefined, error },
      "bare error"
    );
  });
});
