import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

test.describe("Flashcards mobile", () => {
  test("library renders with no document overflow", async ({ page }) => {
    await page.goto("/flashcards", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("FAB opens create set and it is dismissible", async ({ page }) => {
    await page.goto("/flashcards", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    await expect(page.getByTestId("mobile-fab")).toBeVisible();
    await page.getByTestId("mobile-fab").click();
    await expect(page.getByPlaceholder("e.g. Quadratic equations, Chapter 3 vocab...")).toBeVisible();

    await page.getByRole("button", { name: "Back" }).first().click();
    await expect(page.getByPlaceholder("e.g. Quadratic equations, Chapter 3 vocab...")).not.toBeVisible();
  });
});
