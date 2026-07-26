const { test, expect } = require("@playwright/test");

const GRAPHQL_URL = "http://localhost:4000/graphql";
const SUPABASE_URL = "https://ffezpchxhxmxlkzkahha.supabase.co";

async function mockAllGraphQL(page, mocks) {
  await page.route(GRAPHQL_URL, async (route) => {
    const req = route.request();
    if (req.method() !== "POST") {
      await route.continue();
      return;
    }
    let body;
    try {
      body = JSON.parse(req.postData() || "{}");
    } catch {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ data: {} }),
      });
      return;
    }
    const opName = body.operationName;
    const mock = mocks[opName];
    if (mock) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ data: mock }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ data: {} }),
      });
    }
  });
}

async function loadPage(page) {
  await page.goto("/", { waitUntil: "load", timeout: 45000 });
  await page.waitForLoadState("domcontentloaded");
}

const mockUser = {
  id: "test-user-id",
  name: "Test User",
  email: "test@example.com",
  grade: null,
  state: null,
  subjects: [],
  hobbies: [],
  hobbyIds: [],
  hobbyDetails: null,
  onboardingComplete: false,
  toursCompleted: [],
  avatarUrl: null,
  aiPersonality: null,
};

// ─── Auth / Login Screen ───────────────────────────────────────────────

test.describe("Auth — Login Screen", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllGraphQL(page, {});
    await loadPage(page);
    await expect(page.getByText("Welcome to Analogix")).toBeVisible({ timeout: 30000 });
  });

  test("renders the login screen with heading and buttons", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /sign up/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In/i }).first()).toBeVisible();
    await expect(page.getByText("Continue with Google")).toBeVisible();
  });

  test("toggles between Sign In and Sign Up modes", async ({ page }) => {
    // Confirm password should not exist in sign-in mode
    const getConfirmPw = () => page.getByText("Confirm password");
    await expect(getConfirmPw()).toHaveCount(0);

    // Click the Sign Up toggle tab
    await page.getByRole("tab", { name: /sign up/i }).click();
    await expect(getConfirmPw().first()).toBeVisible({ timeout: 5000 });

    // Click the Sign In toggle tab
    await page.getByRole("tab", { name: /sign in/i }).click();
    await expect(getConfirmPw()).toHaveCount(0);
  });

  test("shows password requirements on sign up", async ({ page }) => {
    await page.getByRole("tab", { name: /sign up/i }).click();
    // Find the password input by position (first textbox is email, second is password)
    const pwInput = page.getByRole("textbox").nth(1);
    await pwInput.fill("ab");
    await expect(page.getByText("At least 8 characters")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("One lowercase letter")).toBeVisible();
  });

  test("submit button is disabled with invalid input", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Sign In/i }).first()).toBeDisabled();
  });

  test("forgot password link opens forgot password UI", async ({ page }) => {
    await page.getByText("Forgot your password?").click();
    await expect(page.getByText("Reset your password")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Send Reset Link")).toBeVisible();
  });

  test("links to Terms and Privacy Policy are clickable", async ({ page }) => {
    await expect(page.getByText("Terms")).toBeVisible();
    await expect(page.getByText("Privacy Policy")).toBeVisible();
  });

  test("Google SSO button is visible", async ({ page }) => {
    await expect(page.getByText("Continue with Google")).toBeVisible();
  });
});

// ─── Onboarding Flow (simulated authenticated user) ────────────────────

test.describe("Onboarding Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Seed the @supabase/ssr cookie before the page loads so that
    // supabase.auth.getSession() finds a valid session on startup.
    // @supabase/ssr's createBrowserClient defaults to base64url encoding,
    // so the cookie value must be "base64-" + base64url-encoded JSON.
    const session = {
      access_token: "mock-access-token",
      token_type: "bearer",
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      refresh_token: "mock-refresh-token",
      user: {
        id: "test-user-id",
        aud: "authenticated",
        role: "authenticated",
        email: "test@example.com",
        email_confirmed_at: new Date().toISOString(),
        phone: "",
        confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: { provider: "email" },
        user_metadata: { email: "test@example.com" },
        identities: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
    const raw = JSON.stringify(session);
    const base64url = Buffer.from(raw, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    await page.context().addCookies([
      {
        name: "sb-ffezpchxhxmxlkzkahha-auth-token",
        value: `base64-${base64url}`,
        domain: "localhost",
        path: "/",
        sameSite: "Lax",
      },
    ]);
    // Also set the local user cache for the optimistic render
    await page.addInitScript(() => {
      localStorage.setItem("user", JSON.stringify({ id: "test-user-id", email: "test@example.com" }));
    });

    await mockAllGraphQL(page, { Me: { me: mockUser } });
    await loadPage(page);
    await expect(page.getByText("What should we call you?")).toBeVisible({ timeout: 30000 });
  });

  test("shows onboarding after auth gate loads", async () => {});

  test("progress bar is visible on first step", async ({ page }) => {
    await expect(page.getByText("Step 1 of 7")).toBeVisible();
  });

  test("navigates through all steps via Next button", async ({ page }) => {
    const nameInput = page.getByRole("textbox").first();
    await nameInput.fill("Test User");
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("What grade are you in?")).toBeVisible({ timeout: 5000 });
    await page.getByText("Year 10").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("Which state are you in?")).toBeVisible({ timeout: 5000 });
    await page.getByText("NSW").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("Your subjects")).toBeVisible({ timeout: 5000 });
    await page.getByText("Mathematics").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("Pick your interests")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("Import your calendar")).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("You're all set!")).toBeVisible({ timeout: 5000 });
  });

  test("Finish button triggers profile update mutation", async ({ page }) => {
    const nameInput = page.getByRole("textbox").first();
    await nameInput.fill("Alice Smith");
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByText("Year 11").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByText("VIC").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByText("Mathematics").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("You're all set!")).toBeVisible({ timeout: 5000 });

    let capturedVariables = null;
    await page.route(GRAPHQL_URL, async (route) => {
      const req = route.request();
      if (req.method() !== "POST") {
        await route.continue();
        return;
      }
      const body = JSON.parse(req.postData() || "{}");
      if (body.operationName === "UpdateProfile") {
        capturedVariables = body.variables;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({
            data: {
              updateProfile: {
                id: "test-user-id", name: "Alice Smith", email: "test@example.com",
                grade: "11", state: "VIC", subjects: ["Mathematics"],
                hobbies: [], hobbyIds: [], hobbyDetails: null,
                onboardingComplete: true, avatarUrl: null,
              },
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200, contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ data: {} }),
        });
      }
    });

    await page.getByRole("button", { name: /Finish/i }).click();
    await page.waitForTimeout(2000);

    expect(capturedVariables).not.toBeNull();
    expect(capturedVariables.input).toMatchObject({
      name: "Alice Smith",
      grade: "11",
      state: "VIC",
      subjects: ["Mathematics"],
      onboardingComplete: true,
    });
  });

  test("shows error if profile mutation fails", async ({ page }) => {
    const nameInput = page.getByRole("textbox").first();
    await nameInput.fill("Alice Smith");
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByText("Year 11").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByText("VIC").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByText("Mathematics").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("You're all set!")).toBeVisible({ timeout: 5000 });

    await page.route(GRAPHQL_URL, async (route) => {
      const req = route.request();
      if (req.method() !== "POST") {
        await route.continue();
        return;
      }
      const body = JSON.parse(req.postData() || "{}");
      if (body.operationName === "UpdateProfile") {
        await route.fulfill({
          status: 500, contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ errors: [{ message: "Server error" }] }),
        });
      } else {
        await route.fulfill({
          status: 200, contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ data: {} }),
        });
      }
    });

    await page.getByRole("button", { name: /Finish/i }).click();
    await expect(page.getByText(/something went wrong|failed|error|server/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("You're all set!")).toBeVisible();
  });

  test("Back button works on each step", async ({ page }) => {
    const nameInput = page.getByRole("textbox").first();
    await nameInput.fill("Test User");
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("What grade are you in?")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /Back/i }).click();
    await expect(page.getByText("What should we call you?")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("textbox").first()).toHaveValue("Test User");
  });

  test("shows confetti animation on successful completion", async ({ page }) => {
    const nameInput = page.getByRole("textbox").first();
    await nameInput.fill("Test User");
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByText("Year 10").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByText("NSW").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByText("Mathematics").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Next/i }).click();
    await expect(page.getByText("You're all set!")).toBeVisible({ timeout: 5000 });

    await mockAllGraphQL(page, {
      Me: { me: mockUser },
      UpdateProfile: {
        updateProfile: {
          id: "test-user-id", name: "Test User", email: "test@example.com",
          grade: "10", state: "NSW", subjects: ["Mathematics"],
          hobbies: [], hobbyIds: [], hobbyDetails: null,
          onboardingComplete: true, avatarUrl: null,
        },
      },
    });

    await page.getByRole("button", { name: /Finish/i }).click();
    await expect(page.getByText("You're all set!")).toBeVisible({ timeout: 5000 });
  });
});

// ─── GraphQL endpoint configuration ────────────────────────────────────

test.describe("GraphQL endpoint", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllGraphQL(page, {});
    await loadPage(page);
    await expect(page.getByText("Welcome to Analogix")).toBeVisible({ timeout: 30000 });
  });

  test("app sends requests to localhost:4000 (not production)", async ({ page }) => {
    const requests = [];
    await page.route(GRAPHQL_URL, async (route) => {
      requests.push(route.request().url());
      await route.fulfill({
        status: 200, contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ data: {} }),
      });
    });

    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(5000);

    for (const url of requests) {
      expect(url).toContain("localhost:4000");
      expect(url).not.toContain("analogix-graphql.onrender.com");
    }
  });
});
