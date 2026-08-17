import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { completeAuthCodeExchange, redirectWithError } from "@/lib/auth-callback";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  upsertCall: vi.fn(),
  maybeSingle: vi.fn(),
  resolve: vi.fn(),
  replaceState: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getUser: mocks.getUser,
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.maybeSingle }),
      }),
      upsert: (record: unknown, opts: unknown) => {
        mocks.upsertCall(record, opts);
        return { maybeSingle: mocks.maybeSingle };
      },
    }),
  }),
}));

vi.mock("@/lib/auth-routing", () => ({
  resolveAuthDestination: mocks.resolve,
}));

const user = (overrides: Record<string, unknown> = {}) => ({
  id: "u1",
  email: "sam@test.ai",
  user_metadata: { name: "Sam", avatar_url: "https://example.com/avatar.png" },
  ...overrides,
});

const originalWindow = (globalThis as { window?: unknown }).window;

beforeEach(() => {
  (globalThis as { window?: unknown }).window = {
    location: {
      origin: "http://localhost:3000",
      href: "http://localhost:3000/?code=FAKECODE&state=flow-1",
    },
    history: { replaceState: mocks.replaceState },
  };
  mocks.exchangeCodeForSession.mockReset();
  mocks.getUser.mockReset();
  mocks.upsertCall.mockReset();
  mocks.maybeSingle.mockReset();
  mocks.resolve.mockReset();
  mocks.replaceState.mockReset();
});

afterEach(() => {
  (globalThis as { window?: unknown }).window = originalWindow;
});

describe("redirectWithError", () => {
  it("builds a /login URL with the auth failure details", () => {
    const url = redirectWithError("https://example.com", "pkce_code_verifier_not_found", "Code verifier not found");
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/login");
    expect(parsed.searchParams.get("error")).toBe("auth_failed");
    expect(parsed.searchParams.get("error_code")).toBe("pkce_code_verifier_not_found");
    expect(parsed.searchParams.get("error_description")).toBe("Code verifier not found");
  });

  it("omits the description when none is provided", () => {
    const url = redirectWithError("https://example.com", "missing_code", null);
    expect(url).toContain("error_code=missing_code");
    expect(url).not.toContain("error_description");
  });
});

describe("completeAuthCodeExchange", () => {
  it("returns a login error URL when the code exchange fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: { code: "pkce_code_verifier_not_found", message: "Code verifier not found" },
    });
    const target = await completeAuthCodeExchange("BADCODE");
    const parsed = new URL(target);
    expect(parsed.searchParams.get("error_code")).toBe("pkce_code_verifier_not_found");
    expect(parsed.searchParams.get("error_description")).toBe("Code verifier not found");
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("returns a plain /login when the user cannot be resolved", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("missing") });
    const target = await completeAuthCodeExchange("CODE");
    expect(target).toBe("http://localhost:3000/login");
  });

  it("upserts the profile and routes returning users to /dashboard", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: user() }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.resolve.mockResolvedValue("app");

    const target = await completeAuthCodeExchange("CODE");

    expect(mocks.upsertCall).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u1", name: "Sam", avatar_url: "https://example.com/avatar.png" }),
      { onConflict: "id" }
    );
    expect(target).toBe("/dashboard");
  });

  it("routes brand-new accounts through onboarding", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: user() }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.resolve.mockResolvedValue("onboarding");

    const target = await completeAuthCodeExchange("CODE");
    expect(target).toBe("/onboarding?step=1");
  });

  it("does not block sign-in when the profile upsert fails", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: user() }, error: null });
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mocks.maybeSingle.mockRejectedValue(new Error("row level security blocked"));
    mocks.resolve.mockResolvedValue("app");

    const target = await completeAuthCodeExchange("CODE");
    expect(target).toBe("/dashboard");
  });

  it("preserves a user's saved name instead of overwriting it with Google metadata", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: user() }, error: null });
    // The existing profile row already carries the user's own name.
    mocks.maybeSingle.mockResolvedValueOnce({ data: { name: "Shrav" }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.resolve.mockResolvedValue("app");

    const target = await completeAuthCodeExchange("CODE");

    const upserted = mocks.upsertCall.mock.calls[0][0];
    expect(upserted).toMatchObject({ id: "u1", avatar_url: "https://example.com/avatar.png" });
    expect(upserted).not.toHaveProperty("name");
    expect(target).toBe("/dashboard");
  });

  it("backfills name and avatar for a brand-new account with no saved name", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: user() }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.resolve.mockResolvedValue("app");

    const target = await completeAuthCodeExchange("CODE");

    expect(mocks.upsertCall).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u1", name: "Sam", avatar_url: "https://example.com/avatar.png" }),
      { onConflict: "id" }
    );
    expect(target).toBe("/dashboard");
  });

  it("skips the profile write when there is no name/avatar metadata", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: user({ user_metadata: {} }) }, error: null });
    mocks.resolve.mockResolvedValue("app");

    await completeAuthCodeExchange("CODE");
    expect(mocks.upsertCall).not.toHaveBeenCalled();
  });

  it("strips the code/state params from the URL on success", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: user() }, error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.resolve.mockResolvedValue("app");

    await completeAuthCodeExchange("CODE");
    expect(mocks.replaceState).toHaveBeenCalled();
    const replacedUrl = mocks.replaceState.mock.calls[0][2];
    expect(replacedUrl).not.toContain("code=");
    expect(replacedUrl).not.toContain("state=");
  });

  it("maps unexpected errors to a login error URL", async () => {
    mocks.exchangeCodeForSession.mockRejectedValue(new Error("network exploded"));
    const target = await completeAuthCodeExchange("CODE");
    const parsed = new URL(target);
    expect(parsed.searchParams.get("error_code")).toBe("unexpected");
    expect(parsed.searchParams.get("error_description")).toBe("network exploded");
  });
});
