import { authTest as test, expect } from "./fixtures/auth";

const RETURNING_USER = {
  id: "returning-user",
  email: "returning@test.ai",
  name: "Sam Carter",
  profile: {
    name: "Sam Carter",
    grade: "10",
    state: "NSW",
    subjects: ["math", "english"],
    hobbies: ["Sports"],
    hobbyIds: ["sports"],
    hobbyDetails: { sports: "basketball" },
    onboardingComplete: true,
  },
};

const NEW_USER = {
  id: "new-user",
  email: "new@test.ai",
  name: "New User",
};

const STRONG_PASSWORD = "Password123!";

test.describe("Auth entry - /login", () => {
  test("renders the email/password + Google sign-in surface", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.getByPlaceholder("name@email.com")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Continue with Google")).toBeVisible();
    await expect(page.getByText(/Sign In/).first()).toBeVisible();
  });

  test("sign-up mode shows confirm password and creates the account", async ({ page, stubSignUp }) => {
    await stubSignUp(NEW_USER);
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    // Switch to Sign Up mode
    await page.locator("button").filter({ hasText: /^Sign Up$/ }).click();
    await page.getByPlaceholder("name@email.com").fill(NEW_USER.email);
    await page.getByPlaceholder("Create a password").waitFor({ state: "visible", timeout: 10000 });
    await page.getByPlaceholder("Create a password").fill(STRONG_PASSWORD);
    await page.getByPlaceholder("Confirm your password").fill(STRONG_PASSWORD);

    await page.locator("button").filter({ hasText: "Create Account" }).click();

    // Email confirmation required - no session, so we stay on the login page
    // and tell the user to confirm their inbox.
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe("Returning user - straight into the app", () => {
  test("existing session on a protected route lands directly on /dashboard", async ({ page, signInAsReturningUser }) => {
    await signInAsReturningUser(RETURNING_USER);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    // Not bounced through onboarding - the app renders immediately.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.getByPlaceholder("name@email.com")).toHaveCount(0);
    await expect(page.locator("body")).toContainText("Sam", { timeout: 15000 });
  });

  test("email sign-in drops a returning user onto /dashboard with settings intact", async ({ page, seedLocalPrefs, stubPasswordLogin }) => {
    await seedLocalPrefs(RETURNING_USER);
    await stubPasswordLogin({ success: RETURNING_USER });
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await page.getByPlaceholder("name@email.com").fill(RETURNING_USER.email);
    await page.getByPlaceholder("Your password").waitFor({ state: "visible", timeout: 10000 });
    await page.getByPlaceholder("Your password").fill(STRONG_PASSWORD);
    await page.locator("button").filter({ hasText: /^Sign In\s*$/ }).last().click();

    // Straight to the app, with the previously saved settings in place.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    const prefs = await page.evaluate(() => localStorage.getItem("userPreferences") || "{}");
    expect(JSON.parse(prefs).grade).toBe("10");
    expect(JSON.parse(prefs).state).toBe("NSW");
    expect(JSON.parse(prefs).subjects).toEqual(["math", "english"]);
  });
});

test.describe("New user - through onboarding", () => {
  test("email sign-in for a brand-new account routes to onboarding", async ({ page, stubPasswordLogin, stubAccountProvider }) => {
    // No profile exists, and the account isn't Google-only.
    await stubPasswordLogin({ success: NEW_USER });
    await stubAccountProvider("email");
    await page.route("**/rest/v1/profiles*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
    );
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await page.getByPlaceholder("name@email.com").fill(NEW_USER.email);
    await page.getByPlaceholder("Your password").waitFor({ state: "visible", timeout: 10000 });
    await page.getByPlaceholder("Your password").fill(STRONG_PASSWORD);
    await page.locator("button").filter({ hasText: /^Sign In\s*$/ }).last().click();

    // New accounts are taken through the setup flow (name, grade, state...).
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    await expect(page.getByText("What should I call you?")).toBeVisible({ timeout: 15000 });
  });

  test("completes onboarding and enters the app", async ({ page, signInAsNewUser }) => {
    await signInAsNewUser(NEW_USER);
    await page.goto("/onboarding?step=1", { waitUntil: "domcontentloaded" });

    // Name
    await page.getByPlaceholder("Your name").fill("New User");
    await page.locator("button").filter({ hasText: "Next" }).click();

    // Year
    await page.getByText("10", { exact: true }).click();
    await page.locator("button").filter({ hasText: "Next" }).click();

    // State
    await page.getByText("NSW", { exact: true }).click();
    await page.locator("button").filter({ hasText: "Next" }).click();

    // Subjects
    await page.locator("button").filter({ hasText: /Mathematics/ }).click();
    await page.locator("button").filter({ hasText: /English/ }).click();
    await page.locator("button").filter({ hasText: "Next" }).click();

    // Hobbies
    await page.locator("button").filter({ hasText: /Sports/ }).first().click();
    await page.locator("button").filter({ hasText: "Next" }).click();

    // Calendar - skip
    await page.locator("button").filter({ hasText: "Skip" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    const prefs = await page.evaluate(() => localStorage.getItem("userPreferences") || "{}");
    expect(JSON.parse(prefs).onboardingComplete).toBe(true);
    expect(JSON.parse(prefs).grade).toBe("10");
    expect(JSON.parse(prefs).state).toBe("NSW");
  });
});

test.describe("Account hints", () => {
  test("tells Google-only accounts to sign in with Google", async ({ page, stubPasswordLogin, stubAccountProvider }) => {
    await stubPasswordLogin({
      error: { code: "invalid_credentials", message: "Invalid login credentials" },
    });
    await stubAccountProvider("google");
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await page.getByPlaceholder("name@email.com").fill("googleonly@test.ai");
    await page.getByPlaceholder("Your password").waitFor({ state: "visible", timeout: 10000 });
    await page.getByPlaceholder("Your password").fill(STRONG_PASSWORD);
    await page.locator("button").filter({ hasText: /^Sign In\s*$/ }).last().click();

    await expect(
      page.getByText("This email uses Google sign-in. Please sign in with Google to continue."),
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows a friendly message for invalid credentials on a normal account", async ({ page, stubPasswordLogin, stubAccountProvider }) => {
    await stubPasswordLogin({
      error: { code: "invalid_credentials", message: "Invalid login credentials" },
    });
    await stubAccountProvider("email");
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    await page.getByPlaceholder("name@email.com").fill("someone@test.ai");
    await page.getByPlaceholder("Your password").waitFor({ state: "visible", timeout: 10000 });
    await page.getByPlaceholder("Your password").fill("WrongPassword1!");
    await page.locator("button").filter({ hasText: /^Sign In\s*$/ }).last().click();

    await expect(
      page.getByText("Invalid email or password. If you signed up with Google, use Continue with Google instead."),
    ).toBeVisible({ timeout: 10000 });
  });
});