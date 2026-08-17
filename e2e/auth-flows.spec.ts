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

const RETURNING_GOOGLE = {
  id: "google-returning",
  email: "sam.carter@gmail.com",
  name: "Sam Carter",
  profile: {
    name: "Sam Carter",
    grade: "10",
    state: "NSW",
    subjects: ["math", "english"],
    hobbies: ["Sports (basketball)"],
    hobby_ids: ["sports"],
    hobby_details: { sports: "basketball" },
    onboarding_complete: true,
  },
  theme: "Oceanic Blue",
};

const FAKE_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTgwMDAwMDAwMH0.fake";

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

test.describe("Google OAuth round trip", () => {
  // Simulate the full Google sign-in: the authorize endpoint 302s back to the
  // app's callback with an auth code (as a real Google redirect would), the
  // GoTrue token exchange returns a session, and the callback routes the user
  // by destination. This guards the PKCE verifier round trip: the redirectTo
  // must stay on the SAME origin as where sign-in started, otherwise the code
  // verifier cookie is never found and the exchange fails.
  test("brand-new Google user lands on onboarding with a session", async ({ page }) => {
    await page.route("**/auth/v1/authorize*", (route) => {
      const redirectTo = new URL(route.request().url()).searchParams.get("redirect_to");
      if (!redirectTo) return route.continue();
      const callback = new URL(redirectTo);
      callback.searchParams.set("code", "FAKECODE");
      return route.fulfill({ status: 302, headers: { location: callback.toString() } });
    });

    const now = Math.floor(Date.now() / 1000);
    await page.route("**/auth/v1/token*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: FAKE_ACCESS_TOKEN,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: now + 3600,
          refresh_token: "test-refresh-token",
          user: {
            id: NEW_USER.id,
            aud: "authenticated",
            role: "authenticated",
            email: NEW_USER.email,
            email_confirmed_at: new Date().toISOString(),
            app_metadata: { provider: "google", providers: ["google"] },
            user_metadata: { name: NEW_USER.name },
          },
        }),
      })
    );
    await page.route("**/auth/v1/user*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: NEW_USER.id,
          aud: "authenticated",
          role: "authenticated",
          email: NEW_USER.email,
          app_metadata: { provider: "google", providers: ["google"] },
          user_metadata: { name: NEW_USER.name },
        }),
      })
    );
    await page.route("**/rest/v1/profiles*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    );

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByText("Continue with Google").click();

    // Session persisted and brand-new account routed through setup.
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    const sessionSet = await page
      .context()
      .cookies()
      .then((cookies) => cookies.some((c) => c.name === "sb-auth-token"));
    expect(sessionSet).toBe(true);
  });
});

test.describe("OAuth code landing on the site root", () => {
  // Regression test for the reported bug: Google sign-in bounced the user back
  // to the landing page (https://<origin>/?code=...) and never signed them in.
  // This happens when the Supabase project can't honour the requested redirect
  // target and falls back to its Site URL (the origin root). The app must
  // detect the code anywhere and complete the exchange (OAuthCodeCatcher).
  test("completes sign-in when Supabase drops the code on / instead of /auth/callback", async ({ page, stubCodeExchange }) => {
    await page.route("**/auth/v1/authorize*", (route) => {
      const redirectTo = new URL(route.request().url()).searchParams.get("redirect_to");
      if (!redirectTo) return route.continue();
      const callback = new URL(redirectTo);
      callback.pathname = "/";
      callback.search = "";
      callback.searchParams.set("code", "FAKECODE");
      return route.fulfill({ status: 302, headers: { location: callback.toString() } });
    });
    await page.route("**/rest/v1/profiles*", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    );
    await stubCodeExchange(NEW_USER);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByText("Continue with Google").click();

    // The code lands on the ROOT of the current origin (not /auth/callback) -
    // the exact symptom reported - and the catcher must complete sign-in.
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
    const sessionSet = await page
      .context()
      .cookies()
      .then((cookies) => cookies.some((c) => c.name === "sb-auth-token"));
    expect(sessionSet).toBe(true);
  });

  test("shows a clear login error when the code cannot be exchanged", async ({ page }) => {
    // A stale/foreign code (no matching PKCE verifier on this origin) must not
    // strand the user - they should be routed to /login with an actionable message.
    await page.goto("/?code=STALECODE&state=stale", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/error_code=pkce_code_verifier_not_found/, { timeout: 15000 });
  });
});

test.describe("Profile & theme restore after OAuth sign-in", () => {
  // Regression test for: "it signs me in, but my name, grade and colour
  // scheme/theme aren't being saved properly and are using my default ones".
  // A returning user's profile (name/grade/state) must be hydrated from the
  // profiles row and their saved theme must be re-applied from user_preferences
  // AFTER sign-in completes - not just on app boot (ThemeSync re-runs on auth
  // user change).
  test("returning Google user restores name, grade and saved theme from the DB", async ({ page }) => {
    await page.route("**/auth/v1/authorize*", (route) => {
      const redirectTo = new URL(route.request().url()).searchParams.get("redirect_to");
      if (!redirectTo) return route.continue();
      const callback = new URL(redirectTo);
      callback.pathname = "/";
      callback.search = "";
      callback.searchParams.set("code", "FAKECODE");
      return route.fulfill({ status: 302, headers: { location: callback.toString() } });
    });

    const now = Math.floor(Date.now() / 1000);
    await page.route("**/auth/v1/token*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: FAKE_ACCESS_TOKEN,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: now + 3600,
          refresh_token: "test-refresh-token",
          user: {
            id: RETURNING_GOOGLE.id,
            aud: "authenticated",
            role: "authenticated",
            email: RETURNING_GOOGLE.email,
            email_confirmed_at: new Date().toISOString(),
            app_metadata: { provider: "google", providers: ["google"] },
            user_metadata: { name: RETURNING_GOOGLE.name },
          },
        }),
      })
    );
    await page.route("**/auth/v1/user*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: RETURNING_GOOGLE.id,
          aud: "authenticated",
          role: "authenticated",
          email: RETURNING_GOOGLE.email,
          app_metadata: { provider: "google", providers: ["google"] },
          user_metadata: { name: RETURNING_GOOGLE.name },
        }),
      })
    );
    // The existing profile row (name, grade, state, subjects...).
    await page.route("**/rest/v1/profiles*", (route) => {
      const method = route.request().method();
      if (method === "POST" || method === "PATCH") {
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: RETURNING_GOOGLE.id,
            name: RETURNING_GOOGLE.profile.name,
            grade: RETURNING_GOOGLE.profile.grade,
            state: RETURNING_GOOGLE.profile.state,
            subjects: RETURNING_GOOGLE.profile.subjects,
            hobbies: RETURNING_GOOGLE.profile.hobbies,
            hobby_ids: RETURNING_GOOGLE.profile.hobby_ids,
            hobby_details: RETURNING_GOOGLE.profile.hobby_details,
            avatar_url: "",
            tours_completed: [],
            onboarding_complete: RETURNING_GOOGLE.profile.onboarding_complete,
          },
        ]),
      });
    });
    // The theme previously saved in user_preferences.
    await page.route("**/rest/v1/user_preferences*", (route) => {
      const method = route.request().method();
      if (method === "POST" || method === "PATCH") {
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ user_id: RETURNING_GOOGLE.id, theme: RETURNING_GOOGLE.theme }]),
      });
    });

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByText("Continue with Google").click();

    // Straight into the app with the saved details restored.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await page.waitForTimeout(1500);

    const prefs = await page.evaluate(() => localStorage.getItem("userPreferences") || "{}");
    expect(JSON.parse(prefs).name).toBe("Sam Carter");
    expect(JSON.parse(prefs).grade).toBe("10");
    expect(JSON.parse(prefs).state).toBe("NSW");
    expect(JSON.parse(prefs).userId).toBe(RETURNING_GOOGLE.id);

    // Saved theme restored from the DB, not the default.
    const appTheme = await page.evaluate(() => localStorage.getItem("app-theme"));
    expect(appTheme).toBe("Oceanic Blue");
    const dataTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(dataTheme).toBe("oceanic-blue");
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--color-primary")
    );
    expect(primary).not.toBe("hsl(221.2 83.2% 53.3%)");
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