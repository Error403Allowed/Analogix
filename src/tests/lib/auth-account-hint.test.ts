import { describe, it, expect, vi, beforeEach } from "vitest";
import { signInWithEmail, getAccountAuthProvider } from "@/lib/auth-client";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithPassword: mocks.signInWithPassword },
  }),
}));

const googleOnlyResponse = {
  data: null,
  error: { code: "invalid_credentials", message: "Invalid login credentials" },
};

const fetchJson = (provider: unknown) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ provider }),
  }) as unknown as typeof fetch;

describe("getAccountAuthProvider", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  it("returns the provider from the API", async () => {
    global.fetch = fetchJson("google");
    await expect(getAccountAuthProvider("me@gmail.com")).resolves.toBe("google");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/account-provider?email=me%40gmail.com",
      { cache: "no-store" }
    );
  });

  it("returns null when the API responds with an error status", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    await expect(getAccountAuthProvider("x@y.com")).resolves.toBeNull();
  });

  it("returns null when fetch throws", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    await expect(getAccountAuthProvider("x@y.com")).resolves.toBeNull();
  });
});

describe("signInWithEmail", () => {
  beforeEach(() => {
    mocks.signInWithPassword.mockReset();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  it("throws a google_account_required error for a Google-only account", async () => {
    mocks.signInWithPassword.mockResolvedValue(googleOnlyResponse);
    global.fetch = fetchJson("google");

    await expect(signInWithEmail("me@gmail.com", "whatever")).rejects.toMatchObject({
      code: "google_account_required",
      message: "This email uses Google sign-in. Please sign in with Google to continue.",
    });
  });

  it("rethrows the original error when the account is not Google-only", async () => {
    mocks.signInWithPassword.mockResolvedValue(googleOnlyResponse);
    global.fetch = fetchJson("email");

    await expect(signInWithEmail("me@email.com", "wrong-password")).rejects.toMatchObject({
      code: "invalid_credentials",
    });
  });

  it("rethrows the original error when the provider lookup fails", async () => {
    mocks.signInWithPassword.mockResolvedValue(googleOnlyResponse);
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    await expect(signInWithEmail("me@email.com", "wrong-password")).rejects.toMatchObject({
      code: "invalid_credentials",
    });
  });

  it("returns the session on success without a provider lookup", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });

    const result = await signInWithEmail("a@b.com", "correct-password");
    expect(result).toEqual({ user: { id: "u1" } });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
