import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

test.describe("Subject document mobile", () => {
  test("document renders with no document overflow", async ({ page }) => {
    await page.goto("/subjects/maths/document/doc-1", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("AI Studio opens as a bottom sheet", async ({ page }) => {
    await page.goto("/subjects/maths/document/doc-1", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: "AI Studio" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Quick Actions")).toBeVisible();

    await page.getByRole("button", { name: "Close AI Studio" }).click();
    await expect(sheet.getByText("Quick Actions")).not.toBeVisible();
  });
});
