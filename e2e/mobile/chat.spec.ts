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

    // Regression: the empty state used to be bottom-aligned, pushing the
    // greeting far down the screen. It must sit in the upper half.
    const greetingBox = await greeting.boundingBox();
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(greetingBox).not.toBeNull();
    expect(greetingBox!.y).toBeLessThan(viewportHeight / 2);
  });

  test("chat input stays fully visible on a short viewport", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const input = page.locator('[data-tour="chat-input"]');
    await expect(input).toBeVisible();

    const box = await input.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight));
  });
});
