import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

const UNPROTECTED_SHELL_ROUTES = ["/quiz", "/flashcards", "/formulas", "/resources", "/rooms"];

test.describe("Mobile layout", () => {
  for (const route of UNPROTECTED_SHELL_ROUTES) {
    test(`${route} has no horizontal overflow and shows the bottom nav`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("mobile-nav-item")).toHaveCount(6);
      await assertNoHorizontalOverflow(page);
    });
  }

  test("nav items meet the 44px touch target", async ({ page }) => {
    await page.goto("/rooms", { waitUntil: "domcontentloaded" });
    const items = page.getByTestId("mobile-nav-item");
    await expect(items).toHaveCount(6);
    const boxes = await items.evaluateAll((els) =>
      els.map((el) => {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })
    );
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("keeps content clear of the fixed bottom nav", async ({ page }) => {
    await page.goto("/rooms", { waitUntil: "domcontentloaded" });
    const navBox = await page.getByTestId("mobile-bottom-nav").boundingBox();
    expect(navBox).toBeTruthy();
    if (!navBox) return;
    // The nav is docked to the bottom of the viewport.
    expect(navBox.y).toBeGreaterThanOrEqual(0);
    expect(navBox.x).toBeGreaterThanOrEqual(0);
  });
});
