import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

test.describe("Tablet (md breakpoint boundary)", () => {
  test("shows the desktop tab bar instead of the mobile bottom nav", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("mobile-bottom-nav")).toBeHidden({ timeout: 15000 });
  });

  test("keeps the desktop sidebar visible", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-sidebar="sidebar"]')).toBeVisible({ timeout: 15000 });
  });

  test("has no horizontal overflow on tablet width", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-sidebar="sidebar"]')).toBeVisible({ timeout: 15000 });
    await assertNoHorizontalOverflow(page);
  });
});
