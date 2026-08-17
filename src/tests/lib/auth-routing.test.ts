import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveAuthDestination,
  type AuthDestination,
} from "@/lib/auth-routing";
import { readUserPreferences } from "@/lib/profile-sync";

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
  }),
}));

const newUserProfile = { id: "u1", onboarding_complete: false };
const returningProfile = {
  id: "u1",
  name: "Sam",
  grade: "10",
  state: "NSW",
  subjects: ["math", "english"],
  onboarding_complete: true,
};

describe("resolveAuthDestination", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.maybeSingle.mockReset();
  });

  it("routes to 'app' when the local cache has real onboarding data", async () => {
    localStorage.setItem(
      "userPreferences",
      JSON.stringify({
        onboardingComplete: true,
        userId: "u1",
        name: "Sam",
        grade: "10",
        state: "NSW",
        subjects: ["math", "english"],
      })
    );
    const dest: AuthDestination = await resolveAuthDestination("u1");
    expect(dest).toBe("app");
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("ignores an incomplete local cache and hydrates the missing details from the DB", async () => {
    // The cache says onboarding is done but carries no real data - it must not
    // be trusted. The canonical profiles row is fetched and hydrated instead.
    localStorage.setItem(
      "userPreferences",
      JSON.stringify({ onboardingComplete: true, userId: "u1", name: "Sam", grade: null })
    );
    mocks.maybeSingle.mockResolvedValue({ data: returningProfile, error: null });
    const dest: AuthDestination = await resolveAuthDestination("u1");
    expect(dest).toBe("app");
    const prefs = readUserPreferences();
    expect(prefs.grade).toBe("10");
    expect(prefs.subjects).toEqual(["math", "english"]);
  });

  it("ignores a local cache belonging to a different user", async () => {
    localStorage.setItem(
      "userPreferences",
      JSON.stringify({ onboardingComplete: true, userId: "u-other" })
    );
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const dest: AuthDestination = await resolveAuthDestination("u1");
    expect(dest).toBe("onboarding");
  });

  it("routes returning users (profile with onboarding data) to 'app'", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: returningProfile, error: null });
    const dest: AuthDestination = await resolveAuthDestination("u1");
    expect(dest).toBe("app");
  });

  it("hydrates the local cache for returning users", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: returningProfile, error: null });
    await resolveAuthDestination("u1");
    const prefs = readUserPreferences();
    expect(prefs.onboardingComplete).toBe(true);
    expect(prefs.name).toBe("Sam");
    expect(prefs.grade).toBe("10");
    expect(prefs.state).toBe("NSW");
    expect(prefs.subjects).toEqual(["math", "english"]);
    expect(prefs.userId).toBe("u1");
  });

  it("routes brand-new accounts (empty profile) to 'onboarding'", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: newUserProfile, error: null });
    const dest: AuthDestination = await resolveAuthDestination("u1");
    expect(dest).toBe("onboarding");
  });

  it("routes to 'onboarding' when no profile row exists", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const dest: AuthDestination = await resolveAuthDestination("u1");
    expect(dest).toBe("onboarding");
  });

  it("falls back to 'onboarding' when the DB lookup fails", async () => {
    mocks.maybeSingle.mockRejectedValue(new Error("network down"));
    const dest: AuthDestination = await resolveAuthDestination("u1");
    expect(dest).toBe("onboarding");
  });

  it("returns 'app' from a complete cache without touching the DB when the DB is down", async () => {
    localStorage.setItem(
      "userPreferences",
      JSON.stringify({
        onboardingComplete: true,
        userId: "u1",
        name: "Sam",
        grade: "10",
        state: "NSW",
        subjects: ["math", "english"],
      })
    );
    mocks.maybeSingle.mockRejectedValue(new Error("network down"));
    const dest: AuthDestination = await resolveAuthDestination("u1");
    expect(dest).toBe("app");
  });
});