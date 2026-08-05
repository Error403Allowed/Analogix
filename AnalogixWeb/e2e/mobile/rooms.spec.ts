import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

test.describe("Rooms mobile", () => {
  test("renders with no document overflow", async ({ page }) => {
    await page.goto("/rooms", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("FAB opens the create room bottom sheet and it is dismissible", async ({ page }) => {
    await page.goto("/rooms", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    await expect(page.getByTestId("mobile-fab")).toBeVisible();
    await page.getByTestId("mobile-fab").click();
    await expect(page.getByText("Create study room")).toBeVisible();
    await page.getByPlaceholder("e.g. Chemistry revision sprint").fill("Biology revision sprint");

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Create study room")).not.toBeVisible();
  });

  test("desktop create button is hidden on mobile", async ({ page }) => {
    await page.goto("/rooms", { waitUntil: "domcontentloaded" });
    const desktopCreate = page.getByRole("button", { name: "Create room" });
    await expect(desktopCreate).not.toBeVisible();
    await expect(page.getByTestId("mobile-fab")).toBeVisible();
  });
});
