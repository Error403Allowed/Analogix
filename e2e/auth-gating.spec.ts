import { authTest as test, expect } from "./fixtures/auth";

test.describe("Server-side gating (middleware)", () => {
  test("unauthenticated visit to a protected route is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await expect(page.getByPlaceholder("name@email.com")).toBeVisible({ timeout: 10000 });
  });

  test("unauthenticated visit to /chat is redirected to /login", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("public pages stay reachable without auth", async ({ page }) => {
    for (const path of ["/flashcards", "/formulas", "/quiz", "/resources", "/rooms"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator("body")).toBeAttached({ timeout: 10000 });
    }
  });
});

test.describe("Onboarding gate", () => {
  test("an unauthenticated visit to /onboarding is sent to /login", async ({ page }) => {
    await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test("an authenticated, already-onboarded user on /onboarding is sent to /dashboard", async ({ page, signInAsReturningUser }) => {
    await signInAsReturningUser({ id: "u1", email: "e2e@test.ai", name: "Sam Carter", profile: { grade: "10", state: "NSW", subjects: ["math"] } });
    await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test("a brand-new user with an existing session sees the setup steps", async ({ page, signInAsNewUser }) => {
    await signInAsNewUser({ id: "new-user", email: "new@test.ai" });
    await page.goto("/onboarding?step=1", { waitUntil: "domcontentloaded" });
    await expect(page.getByPlaceholder("Your name")).toBeVisible({ timeout: 15000 });
  });
});

test.describe("ProtectedRoute destination", () => {
  test("a new user hitting a protected page is routed to onboarding", async ({ page, signInAsNewUser }) => {
    await signInAsNewUser({ id: "new-user", email: "new@test.ai" });
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
  });

  test("a returning user hitting a protected page stays in the app", async ({ page, signInAsReturningUser }) => {
    await signInAsReturningUser({ id: "u1", email: "e2e@test.ai", name: "Sam Carter", profile: { grade: "10", state: "NSW", subjects: ["math"] } });
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/chat/, { timeout: 15000 });
  });
});