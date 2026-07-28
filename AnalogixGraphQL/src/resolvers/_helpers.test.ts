import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";
import type { GraphQLContext } from "../context.js";

vi.mock("../utils/errorHandler.js", () => ({
  sanitizeError: vi.fn((error: unknown) => "An unexpected error occurred. Please try again."),
}));

const { requireUser, throwSanitized } = await import("./_helpers.js");
const { sanitizeError } = await import("../utils/errorHandler.js");

function mockContext(overrides?: Partial<GraphQLContext>): GraphQLContext {
  return {
    user: { id: "user-1", email: "test@test.com", role: "authenticated", appMetadata: {}, userMetadata: {} },
    supabase: {} as any,
    pubsub: {} as any,
    requestId: "req-1",
    loaders: null,
    ...overrides,
  };
}

describe("requireUser", () => {
  it("returns the user when authenticated", () => {
    const ctx = mockContext();
    expect(requireUser(ctx)).toEqual({ id: "user-1", email: "test@test.com", role: "authenticated", appMetadata: {}, userMetadata: {} });
  });

  it("throws when user is null", () => {
    const ctx = mockContext({ user: null });
    expect(() => requireUser(ctx)).toThrow(GraphQLError);
    expect(() => requireUser(ctx)).toThrow("Authentication required");
  });

  it("throws when supabase is null", () => {
    const ctx = mockContext({ supabase: null });
    expect(() => requireUser(ctx)).toThrow(GraphQLError);
    expect(() => requireUser(ctx)).toThrow("Authentication required");
  });

  it("throws with UNAUTHENTICATED code", () => {
    const ctx = mockContext({ user: null });
    try {
      requireUser(ctx);
    } catch (e) {
      expect(e).toBeInstanceOf(GraphQLError);
      expect((e as GraphQLError).extensions?.code).toBe("UNAUTHENTICATED");
    }
  });
});

describe("throwSanitized", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws a sanitized GraphQLError", () => {
    const ctx = mockContext();
    const original = new Error("Internal DB constraint violation: users_pkey");
    expect(() => throwSanitized(original, ctx)).toThrow(GraphQLError);
    expect(() => throwSanitized(original, ctx)).toThrow("An unexpected error occurred");
  });

  it("calls sanitizeError with userId and operation", () => {
    const ctx = mockContext();
    const original = new Error("test error");
    try {
      throwSanitized(original, ctx, "testOperation");
    } catch {}
    expect(sanitizeError).toHaveBeenCalledWith(original, {
      userId: "user-1",
      operation: "testOperation",
    });
  });

  it("uses 'unknown' userId when context has no user", () => {
    const ctx = mockContext({ user: null });
    const original = new Error("test");
    try {
      throwSanitized(original, ctx);
    } catch {}
    expect(sanitizeError).toHaveBeenCalledWith(original, {
      userId: "unknown",
      operation: undefined,
    });
  });
});
