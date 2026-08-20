import { authTest as test, expect } from "./fixtures/auth";
import type { Page } from "@playwright/test";

/**
 * "What's New" notice: shown once, only to pre-release accounts that haven't
 * dismissed it. The profiles REST endpoint is stubbed so created_at and
 * announcements_seen are fully under test control.
 */

const OLD_ACCOUNT = "2020-01-01T00:00:00.000Z";
const NEW_ACCOUNT = "2099-01-01T00:00:00.000Z";

const baseUser = {
  id: "u1",
  email: "e2e@test.ai",
  name: "Sam Carter",
  profile: { grade: "10", state: "NSW", subjects: ["math"] },
};

/** Returning users have finished the guided tour, so it must not overlay the
 *  dashboard and intercept clicks. Runs on every navigation (incl. reloads). */
const skipTutorial = (page: Page) =>
  page.addInitScript(() => localStorage.setItem("tutorialComplete", "1"));

test.describe("What's New notice", () => {
  test("shows the card once to a pre-release user who hasn't seen it", async ({ page, signInAsReturningUser }) => {
    await signInAsReturningUser({
      ...baseUser,
      profile: { ...baseUser.profile, createdAt: OLD_ACCOUNT, announcementsSeen: [] },
    });
    await skipTutorial(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("whats-new")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Meet the new AI tutor")).toBeVisible();
  });

  test("hides the card for a user who signed up after the release", async ({ page, signInAsReturningUser }) => {
    await signInAsReturningUser({
      ...baseUser,
      profile: { ...baseUser.profile, createdAt: NEW_ACCOUNT },
    });
    await skipTutorial(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("whats-new")).toHaveCount(0, { timeout: 15000 });
  });

  test("dismisses once and stays dismissed after a reload", async ({ page, signInAsReturningUser }) => {
    await signInAsReturningUser({
      ...baseUser,
      profile: { ...baseUser.profile, createdAt: OLD_ACCOUNT, announcementsSeen: [] },
    });

    // Track the dismiss PATCH so a reload serves announcements_seen back.
    let seen: string[] = [];
    await page.route("**/rest/v1/profiles*", async (route) => {
      if (route.request().method() === "PATCH") {
        seen = ["ai-v2"];
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: baseUser.id,
            name: baseUser.name,
            grade: "10",
            state: "NSW",
            subjects: ["math"],
            hobbies: ["Sports"],
            hobby_ids: ["sports"],
            hobby_details: { sports: "basketball" },
            avatar_url: "",
            tours_completed: [],
            created_at: OLD_ACCOUNT,
            announcements_seen: seen,
            onboarding_complete: true,
          },
        ]),
      });
    });

    await skipTutorial(page);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("whats-new")).toBeVisible({ timeout: 15000 });

    await page.getByTestId("whats-new-dismiss").click();
    await expect(page.getByTestId("whats-new")).toHaveCount(0, { timeout: 15000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("whats-new")).toHaveCount(0, { timeout: 15000 });
  });
});