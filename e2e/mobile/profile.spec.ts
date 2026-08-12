import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

test.describe("Profile page", () => {
  test("renders the account menu", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("profile-menu-item")).toHaveCount(7, { timeout: 15000 });
    await expect(page.getByText("My Subjects")).toBeVisible();
    await expect(page.getByText("Achievements")).toBeVisible();
    await expect(page.getByText("Study Rooms")).toBeVisible();
    await expect(page.getByText("Sign out")).toBeVisible();
  });

  test("navigates to subjects from the menu", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.getByTestId("profile-menu-item").filter({ hasText: "My Subjects" }).tap();
    await expect(page).toHaveURL(/\/subjects$/, { timeout: 15000 });
  });

  test("signs out and returns to the auth flow", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.getByTestId("profile-menu-item").filter({ hasText: "Sign out" }).tap();
    await expect(page).toHaveURL(/\/(login|onboarding)(\?|$)/, { timeout: 15000 });
  });

  test("has no horizontal overflow", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("profile-menu-item").first()).toBeVisible({ timeout: 15000 });
    await assertNoHorizontalOverflow(page);
  });
});

test.describe("Profile appearance controls", () => {
  test("shows light/dark mode, paper toggle and colour themes", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    const section = page.getByTestId("appearance-section");
    await expect(section).toBeVisible({ timeout: 15000 });
    await expect(section.getByRole("group", { name: "Mode" })).toBeVisible();
    await expect(section.getByTestId("paper-mode-toggle")).toBeVisible();
    await expect(section.getByTestId("theme-option").first()).toBeVisible();
  });

  test("toggles between light and dark mode", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    const section = page.getByTestId("appearance-section");
    await expect(section).toBeVisible({ timeout: 15000 });

    const light = section.getByTestId("theme-mode-option").filter({ hasText: "Light" });
    const dark = section.getByTestId("theme-mode-option").filter({ hasText: "Dark" });

    await expect(dark).toHaveAttribute("aria-pressed", "true", { timeout: 15000 });

    await light.tap();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")), { timeout: 15000 })
      .toBe(false);

    await dark.tap();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")), { timeout: 15000 })
      .toBe(true);
  });

  test("selects a colour theme and persists it", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    const section = page.getByTestId("appearance-section");
    await expect(section).toBeVisible({ timeout: 15000 });

    await section.getByTestId("theme-option").filter({ hasText: "Oceanic Blue" }).tap();

    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("app-theme")), { timeout: 15000 })
      .toBe("Oceanic Blue");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.getAttribute("data-theme")), { timeout: 15000 })
      .toBe("oceanic-blue");
  });

  test("toggles paper mode", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    const section = page.getByTestId("appearance-section");
    await expect(section).toBeVisible({ timeout: 15000 });

    await section.getByTestId("paper-mode-toggle").tap();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("paper-mode")), { timeout: 15000 })
      .toBe("true");
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("app-theme")), { timeout: 15000 })
      .toBe("Paper");
  });
});
