import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

test.describe("Timer widget on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible({ timeout: 15000 });
  });

  test("keeps the time visible and does not overlap controls at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload({ waitUntil: "domcontentloaded" });

    const widget = page.locator('[data-tour="calendar-widget"]');
    await expect(widget).toBeVisible({ timeout: 15000 });

    const timeText = widget.locator("p.text-xl");
    await expect(timeText).toBeVisible();
    await expect(timeText).toHaveText(/^\d{2}:\d{2}$/);

    const timeBox = await timeText.boundingBox();
    expect(timeBox).toBeTruthy();
    if (timeBox) expect(timeBox.width).toBeGreaterThanOrEqual(40);

    await assertNoHorizontalOverflow(page);
  });

  test("wraps the controls below the timer on narrow screens", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload({ waitUntil: "domcontentloaded" });

    const widget = page.locator('[data-tour="calendar-widget"]');
    await expect(widget).toBeVisible({ timeout: 15000 });

    const startBtn = widget.getByRole("button", { name: /start|pause/i });
    const timeText = widget.locator("p.text-xl");
    await expect(startBtn).toBeVisible();

    const startBox = await startBtn.boundingBox();
    const timeBox = await timeText.boundingBox();
    expect(startBox).toBeTruthy();
    expect(timeBox).toBeTruthy();
    if (!startBox || !timeBox) return;

    // On a 320px viewport the controls drop to a second row (below the time).
    expect(startBox.y).toBeGreaterThanOrEqual(timeBox.y + timeBox.height / 2);
    expect(startBox.x).toBeGreaterThanOrEqual(0);
    expect(startBox.x + startBox.width).toBeLessThanOrEqual(320);
  });
});
