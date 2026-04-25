import { test, expect } from "@playwright/test";

test.describe("Public Pages", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Analogix/i);
  });

  test("onboarding page loads", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/onboarding/);
  });

  test("login redirects to onboarding", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/((login)|(onboarding))/);
  });
});

test.describe("Auth-Gated Pages", () => {
  const allProtectedPages = [
    "/dashboard",
    "/calendar",
    "/subjects",
    "/rooms",
    "/chat",
    "/flashcards",
    "/quiz",
    "/formulas",
    "/resources",
    "/timer",
    "/achievements",
    "/study-guide-loading",
  ];

  for (const path of allProtectedPages) {
    test(`${path} requires authentication`, async ({ page }) => {
      await page.goto(path, { timeout: 20000 });
      await page.waitForLoadState("domcontentloaded");
    });
  }
});

test.describe("Dynamic Routes", () => {
  test("subjects/:id requires authentication", async ({ page }) => {
    await page.goto("/subjects/math");
    await page.waitForLoadState("domcontentloaded");
  });

  test("subjects/:id/document/:docId requires authentication", async ({ page }) => {
    await page.goto("/subjects/math/document/test-doc");
    await page.waitForLoadState("domcontentloaded");
  });

  test("rooms/:roomId requires authentication", async ({ page }) => {
    await page.goto("/rooms/test-room", { timeout: 20000 });
    await page.waitForLoadState("domcontentloaded");
  });
});