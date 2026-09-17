import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

test.describe("Calendar mobile", () => {
  test("renders with no document overflow", async ({ page }) => {
    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });

  test("week view panes horizontally (scrollable grid, no document overflow)", async ({ page }) => {
    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Mobile opens on the day view by design — switch to week explicitly.
    await page.getByRole("button", { name: "week", exact: true }).click();
    await page.waitForTimeout(300);

    const widerThanViewport = await page.evaluate(() => {
      const inner = document.querySelector("[data-testid='calendar-week-grid']");
      if (!inner) return false;
      return inner.scrollWidth > window.innerWidth;
    });
    expect(widerThanViewport).toBe(true);
    await assertNoHorizontalOverflow(page);
  });

  test("FAB opens the new event bottom sheet", async ({ page }) => {
    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await expect(page.getByTestId("mobile-fab")).toBeVisible();
    await page.getByTestId("mobile-fab").click();
    await expect(page.getByText("New Event")).toBeVisible();
    await page.getByPlaceholder("Event title…").fill("Biology test review");
    // Submit via Enter: the modal Save button can be layout-unstable inside
    // the iOS bottom sheet while it animates; Enter triggers the same save.
    await page.getByPlaceholder("Event title…").press("Enter");
    await expect(page.getByText("New Event")).not.toBeVisible();
  });

  test("filters button opens the calendar filters sheet", async ({ page }) => {
    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.getByTestId("calendar-filters-button").click();
    await expect(page.getByText("Calendar filters")).toBeVisible();
    await expect(page.getByRole("button", { name: "All Events" }).last()).toBeVisible();
  });

  test("settings button opens calendar settings and persists density", async ({ page }) => {
    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.getByTestId("calendar-settings-button").click();
    await expect(page.getByText("Calendar settings")).toBeVisible();
    await expect(page.getByText("Default view")).toBeVisible();
    await page.getByTestId("cal-density-compact").click();
    const stored = await page.evaluate(() =>
      window.localStorage.getItem("analogix_calendar_settings"),
    );
    expect(stored).toContain('"density":"compact"');
  });

  test("work-hours toggle is visible on the day grid", async ({ page }) => {
    await page.goto("/calendar", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await expect(page.getByTestId("calendar-day-range-toggle")).toBeVisible();
  });
});
