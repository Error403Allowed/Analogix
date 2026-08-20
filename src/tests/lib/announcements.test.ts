import { describe, expect, it } from "vitest";
import {
  announcements,
  latestAnnouncement,
  shouldShowAnnouncement,
} from "@/lib/announcements";

const RELEASE = latestAnnouncement!.releaseDate;
const BEFORE = new Date(new Date(RELEASE).getTime() - 1000).toISOString();
const AFTER = new Date(new Date(RELEASE).getTime() + 1000).toISOString();

describe("announcements registry", () => {
  it("has a latest announcement with an id and release date", () => {
    expect(latestAnnouncement).toBeDefined();
    expect(latestAnnouncement!.id).toBeTruthy();
    expect(announcements).toContain(latestAnnouncement);
  });
});

describe("shouldShowAnnouncement", () => {
  it("shows to a pre-release user who hasn't seen it", () => {
    expect(
      shouldShowAnnouncement({ createdAt: BEFORE, announcementsSeen: [] }),
    ).toBe(true);
  });

  it("hides once the user has dismissed the announcement", () => {
    expect(
      shouldShowAnnouncement({
        createdAt: BEFORE,
        announcementsSeen: [latestAnnouncement!.id],
      }),
    ).toBe(false);
  });

  it("hides for users who signed up after the release date", () => {
    expect(
      shouldShowAnnouncement({ createdAt: AFTER, announcementsSeen: [] }),
    ).toBe(false);
  });

  it("hides when the account creation date is unknown", () => {
    expect(
      shouldShowAnnouncement({ createdAt: null, announcementsSeen: [] }),
    ).toBe(false);
    expect(
      shouldShowAnnouncement({ announcementsSeen: [] }),
    ).toBe(false);
  });

  it("hides when there is no release date to gate on", () => {
    expect(
      shouldShowAnnouncement({
        createdAt: BEFORE,
        announcementsSeen: [],
        releaseDate: "",
      }),
    ).toBe(false);
  });

  it("treats missing seen state as not seen", () => {
    expect(shouldShowAnnouncement({ createdAt: BEFORE })).toBe(true);
  });
});