import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

const CORE_ROUTES = [
  "/dashboard",
  "/chat",
  "/study",
  "/subjects",
  "/rooms",
  "/profile",
  "/quiz",
  "/flashcards",
  "/formulas",
  "/resources",
  "/calendar",
  "/achievements",
];

test.describe("Mobile page smoke tests", () => {
  for (const route of CORE_ROUTES) {
    test(`${route} renders with the bottom nav and no overflow`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
      expect(response?.ok()).toBeTruthy();
      await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible({ timeout: 30000 });
      await expect(page.getByTestId("mobile-app-bar")).toBeVisible();
      await assertNoHorizontalOverflow(page);
    });
  }
});
