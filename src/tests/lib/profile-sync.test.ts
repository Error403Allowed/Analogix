import { describe, it, expect, beforeEach } from "vitest";
import {
  readUserPreferences,
  writeUserPreferences,
  hasProfileData,
  syncPrefsFromProfile,
  type ProfileRecord,
} from "@/lib/profile-sync";

const PROFILE_KEY = "userPreferences";

describe("readUserPreferences / writeUserPreferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty object when nothing is stored", () => {
    expect(readUserPreferences()).toEqual({});
  });

  it("round-trips stored preferences", () => {
    writeUserPreferences({ name: "Sam", grade: "10" });
    expect(readUserPreferences()).toEqual({ name: "Sam", grade: "10" });
  });

  it("returns an empty object for corrupt JSON", () => {
    localStorage.setItem(PROFILE_KEY, "{not-json");
    expect(readUserPreferences()).toEqual({});
  });
});

describe("hasProfileData", () => {
  it("is false for null/undefined", () => {
    expect(hasProfileData(null)).toBe(false);
    expect(hasProfileData(undefined)).toBe(false);
  });

  it("is true when onboarding is complete", () => {
    expect(hasProfileData({ onboarding_complete: true })).toBe(true);
  });

  it("is true when grade or state is set", () => {
    expect(hasProfileData({ grade: "11" })).toBe(true);
    expect(hasProfileData({ state: "VIC" })).toBe(true);
  });

  it("is true when subjects/hobbies are non-empty", () => {
    expect(hasProfileData({ subjects: ["math"] })).toBe(true);
    expect(hasProfileData({ hobbies: ["Sports"] })).toBe(true);
    expect(hasProfileData({ hobby_ids: ["sports"] })).toBe(true);
  });

  it("is true when hobby details exist", () => {
    expect(hasProfileData({ hobby_details: { sports: "basketball" } })).toBe(true);
  });

  it("is false for an empty auto-created profile", () => {
    expect(hasProfileData({ name: null, grade: null, state: null })).toBe(false);
    expect(hasProfileData({ subjects: [], hobbies: [], hobby_ids: [] })).toBe(false);
    expect(hasProfileData({ hobby_details: {} })).toBe(false);
  });
});

describe("syncPrefsFromProfile", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("merges the profile row into the local cache and marks onboarding complete", () => {
    const profile: ProfileRecord = {
      name: "Alex",
      grade: "12",
      state: "QLD",
      subjects: ["physics", "chemistry"],
      hobbies: ["Sports (basketball)"],
      hobby_ids: ["sports"],
      hobby_details: { sports: "basketball" },
      avatar_url: "data:image/png;base64,abc",
      onboarding_complete: true,
    };
    const prefs = syncPrefsFromProfile(profile, "u1");
    expect(prefs.name).toBe("Alex");
    expect(prefs.grade).toBe("12");
    expect(prefs.state).toBe("QLD");
    expect(prefs.subjects).toEqual(["physics", "chemistry"]);
    expect(prefs.hobbies).toEqual(["Sports (basketball)"]);
    expect(prefs.hobbyIds).toEqual(["sports"]);
    expect(prefs.hobbyDetails).toEqual({ sports: "basketball" });
    expect(prefs.avatarUrl).toBe("data:image/png;base64,abc");
    expect(prefs.onboardingComplete).toBe(true);
    expect(prefs.userId).toBe("u1");
    expect(readUserPreferences()).toEqual(prefs);
  });

  it("preserves local values that the profile does not override", () => {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ name: "LocalName", hobbyDetails: { local: "x" } })
    );
    const prefs = syncPrefsFromProfile({ grade: "9" }, "u1");
    expect(prefs.name).toBe("LocalName");
    expect(prefs.grade).toBe("9");
    expect(prefs.hobbyDetails).toEqual({ local: "x" });
  });

  it("falls back to 'Student' when neither the profile nor cache has a name", () => {
    const prefs = syncPrefsFromProfile({}, "u1");
    expect(prefs.name).toBe("Student");
  });
});