// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: mocks.createClient,
}));

import { useProfileAvatar } from "@/hooks/useProfileAvatar";

describe("useProfileAvatar", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.useAuth.mockReturnValue({ user: { id: "user-1" }, loading: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the cached avatar from localStorage", () => {
    localStorage.setItem("userPreferences", JSON.stringify({ name: "A", avatarUrl: "https://example.com/a.png" }));

    const { result } = renderHook(() => useProfileAvatar());

    expect(result.current).toBe("https://example.com/a.png");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("falls back to the DB avatar when the cache is empty and persists it", async () => {
    mocks.createClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: { avatar_url: "https://example.com/db.png" }, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useProfileAvatar());

    expect(result.current).toBe("");
    await waitFor(() => expect(result.current).toBe("https://example.com/db.png"));

    const prefs = JSON.parse(localStorage.getItem("userPreferences") || "{}");
    expect(prefs.avatarUrl).toBe("https://example.com/db.png");
  });

  it("returns an empty string when neither source has an avatar", async () => {
    mocks.createClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { avatar_url: null }, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useProfileAvatar());

    await waitFor(() => expect(result.current).toBe(""));
    expect(result.current).toBe("");
  });
});
