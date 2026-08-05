import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

test.describe("Chat mobile", () => {
  test("renders with no document overflow", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("hamburger opens the thread list as a bottom sheet", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const toggle = page.getByTitle("Toggle chat history");
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(page.getByText("New chat")).toBeVisible();
    await page.getByRole("button", { name: "New chat" }).last().click();
    await expect(page.getByText("New chat")).not.toBeVisible();
  });

  test("empty state greeting and prompt suggestions fit on short viewports", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const greeting = page.getByText(/What are you studying/);
    await expect(greeting).toBeInViewport();
    await assertNoHorizontalOverflow(page);
  });
});
