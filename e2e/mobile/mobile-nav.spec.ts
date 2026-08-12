import { test, expect } from "./fixtures/auth-stub";

const NAV_LABELS = ["Home", "Tutor", "Study", "Subjects", "Rooms", "Profile"];

test.describe("Mobile bottom nav", () => {
  test("shows the bottom nav with all six tabs on a phone viewport", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const nav = page.getByTestId("mobile-bottom-nav");
    await expect(nav).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("mobile-nav-item")).toHaveCount(6);
    for (const label of NAV_LABELS) {
      await expect(nav.getByText(label)).toBeVisible();
    }
  });

  test("hides the bottom nav on desktop-width viewports", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByTestId("mobile-bottom-nav")).toBeHidden({ timeout: 15000 });
  });

  test("shows the mobile app bar and hides the desktop sidebar on mobile", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("mobile-bottom-nav")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("mobile-app-bar")).toBeVisible();
    await expect(page.locator('[data-sidebar="sidebar"]')).toBeHidden();
  });

  test("marks the active tab for exact routes", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    const tutor = page.getByTestId("mobile-nav-item").filter({ hasText: "Tutor" });
    await expect(tutor).toHaveAttribute("aria-current", "page");
    await expect(tutor).toHaveAttribute("data-active", "true");
  });

  test("keeps Subjects active on nested subject routes", async ({ page }) => {
    await page.goto("/subjects/maths", { waitUntil: "domcontentloaded" });
    const subjects = page.getByTestId("mobile-nav-item").filter({ hasText: "Subjects" });
    await expect(subjects).toHaveAttribute("aria-current", "page", { timeout: 15000 });
  });

  test("keeps Rooms active on nested room routes", async ({ page }) => {
    await page.goto("/rooms/room-1", { waitUntil: "domcontentloaded" });
    const rooms = page.getByTestId("mobile-nav-item").filter({ hasText: "Rooms" });
    await expect(rooms).toHaveAttribute("aria-current", "page", { timeout: 15000 });
  });

  test("navigates when a tab is tapped", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.getByTestId("mobile-nav-item").filter({ hasText: "Study" }).tap();
    await expect(page).toHaveURL(/\/study$/, { timeout: 15000 });
    const study = page.getByTestId("mobile-nav-item").filter({ hasText: "Study" });
    await expect(study).toHaveAttribute("aria-current", "page");
  });

  test("shows the app bar and opens the sidebar sheet from it", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const appBar = page.getByTestId("mobile-app-bar");
    await expect(appBar).toBeVisible({ timeout: 15000 });
    await appBar.getByRole("button", { name: /toggle sidebar/i }).tap();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15000 });
  });

  test("opens the sidebar as a full-screen sheet", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const appBar = page.getByTestId("mobile-app-bar");
    await expect(appBar).toBeVisible({ timeout: 15000 });
    await appBar.getByRole("button", { name: /toggle sidebar/i }).tap();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });

    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    if (!viewport) return;
    const box = await dialog.boundingBox();
    expect(box).toBeTruthy();
    if (!box) return;
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 2);
  });

  test("closes the full-screen sidebar from its close button", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const appBar = page.getByTestId("mobile-app-bar");
    await expect(appBar).toBeVisible({ timeout: 15000 });
    await appBar.getByRole("button", { name: /toggle sidebar/i }).tap();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Close sidebar" }).tap();
    await expect(dialog).toBeHidden({ timeout: 15000 });
  });

  test("closes the sidebar after tapping a destination", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const appBar = page.getByTestId("mobile-app-bar");
    await expect(appBar).toBeVisible({ timeout: 15000 });
    await appBar.getByRole("button", { name: /toggle sidebar/i }).tap();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15000 });

    await dialog.getByText("Flashcards").tap();
    await expect(dialog).toBeHidden({ timeout: 15000 });
    await expect(page).toHaveURL(/\/flashcards$/, { timeout: 15000 });
  });
});
