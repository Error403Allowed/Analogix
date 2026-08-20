// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildInterestList, buildInterestsObject } from "@/utils/interests";

describe("buildInterestsObject", () => {
  it("produces a structured object keyed by category with concrete details", () => {
    const prefs = {
      hobbyIds: ["gaming", "sports"],
      hobbyDetails: { gaming: "Rocket League, FIFA", sports: "Soccer" },
      hobbies: ["Gaming (Rocket League, FIFA)", "Sports (Soccer)"],
    };
    const { tags, byCategory } = buildInterestsObject(prefs);
    expect(byCategory.Gaming).toEqual(["Rocket League games", "FIFA games"]);
    expect(byCategory.Sports).toEqual(["Soccer"]);
    expect(tags).toContain("Soccer");
  });

  it("keeps the object machine-readable (an object, not a flat string)", () => {
    const { byCategory } = buildInterestsObject({
      hobbyIds: ["gaming"],
      hobbyDetails: { gaming: "Rocket League" },
    });
    expect(byCategory).toBeInstanceOf(Object);
    expect(Object.keys(byCategory).length).toBeGreaterThan(0);
    expect(byCategory.Gaming).toEqual(["Rocket League games"]);
  });

  it("returns empty object when no prefs exist", () => {
    expect(buildInterestsObject(null)).toEqual({ tags: [], byCategory: {} });
    expect(buildInterestsObject({})).toEqual({ tags: [], byCategory: {} });
  });

  it("falls back to flat labels when only plain hobbies exist", () => {
    const { byCategory } = buildInterestsObject({
      hobbies: ["Soccer"],
    });
    expect(byCategory.General).toContain("Soccer");
  });

  it("surface interest list keeps flat tags for quick matching", () => {
    const prefs = {
      hobbyIds: ["music"],
      hobbyDetails: { music: "K-Pop" },
    };
    const { tags } = buildInterestsObject(prefs);
    expect(Array.isArray(tags)).toBe(true);
    expect(tags).toEqual(expect.arrayContaining(["K-Pop"]));
  });
});

describe("buildInterestList regression", () => {
  it("still flattens into a plain list", () => {
    const list = buildInterestList({
      hobbyIds: ["gaming"],
      hobbyDetails: { gaming: "Rocket League" },
    });
    expect(list).toEqual(["Rocket League games"]);
  });

  it("appends 'food' to cooking sub-interests so cuisines read clearly", () => {
    const list = buildInterestList({
      hobbyIds: ["cooking"],
      hobbyDetails: { cooking: "Asian, Mexican, Italian, Baking, Desserts" },
    });
    expect(list).toContain("Asian food");
    expect(list).toContain("Mexican food");
    expect(list).toContain("Italian food");
    expect(list).toContain("Baking");
    expect(list).toContain("Desserts");
  });

  it("appends 'food' to cooking sub-interests from parenthesised hobbies", () => {
    const list = buildInterestList({
      hobbies: ["Cooking (Asian, Mexican)"],
    });
    expect(list).toContain("Asian food");
    expect(list).toContain("Mexican food");
  });
});