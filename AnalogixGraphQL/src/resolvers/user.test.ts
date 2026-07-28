import { describe, it, expect, vi, beforeEach } from "vitest";
import { GraphQLError } from "graphql";

const mockUser = { id: "user-1", email: "test@test.com" };

vi.mock("./_helpers.js", () => ({
  requireUser: vi.fn().mockReturnValue(mockUser),
  throwSanitized: vi.fn(),
}));

vi.mock("../supabase.js", () => ({
  serviceClient: {
    auth: {
      admin: {
        deleteUser: vi.fn(),
      },
    },
  },
}));

const { userResolvers } = await import("./user.js");
const { requireUser, throwSanitized } = await import("./_helpers.js");
const { serviceClient } = await import("../supabase.js");

function mockContext(overrides?: Record<string, unknown>) {
  return {
    user: mockUser,
    supabase: {} as any,
    pubsub: {} as any,
    requestId: "req-1",
    ...overrides,
  } as any;
}

describe("userResolvers.Query.me", () => {
  it("fetches profile from supabase", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "user-1", name: "Test" }, error: null }),
    };
    const ctx = mockContext({ supabase: mockSupabase });
    const result = await userResolvers.Query.me(null, {}, ctx);
    expect(result).toEqual({ id: "user-1", name: "Test" });
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
  });

  it("throws sanitized error on supabase failure", async () => {
    const dbError = new Error("db connection failed");
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: dbError }),
    };
    const ctx = mockContext({ supabase: mockSupabase });
    await userResolvers.Query.me(null, {}, ctx);
    expect(throwSanitized).toHaveBeenCalledWith(dbError, ctx);
  });
});

describe("userResolvers.Mutation.deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if confirmation is not 'DELETE'", async () => {
    const ctx = mockContext();
    await expect(
      userResolvers.Mutation.deleteAccount(null, { confirmation: "wrong" }, ctx)
    ).rejects.toThrow(GraphQLError);

    await expect(
      userResolvers.Mutation.deleteAccount(null, { confirmation: "wrong" }, ctx)
    ).rejects.toThrow("Must provide confirmation");
  });

  it("calls admin.deleteUser with correct id when confirmed", async () => {
    vi.mocked(serviceClient.auth.admin.deleteUser).mockResolvedValueOnce({
      data: { user: {} },
      error: null,
    } as any);

    const ctx = mockContext();
    const result = await userResolvers.Mutation.deleteAccount(
      null,
      { confirmation: "DELETE" },
      ctx
    );

    expect(serviceClient.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({ success: true });
  });

  it("throws sanitized error on admin.deleteUser failure", async () => {
    const dbError = new Error("user not found in auth");
    vi.mocked(serviceClient.auth.admin.deleteUser).mockResolvedValueOnce({
      data: null,
      error: dbError,
    } as any);

    const ctx = mockContext();
    await userResolvers.Mutation.deleteAccount(null, { confirmation: "DELETE" }, ctx);
    expect(throwSanitized).toHaveBeenCalledWith(dbError, ctx);
  });
});
