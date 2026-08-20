import { test as base, expect, type Page } from "@playwright/test";

/**
 * Auth fixture for deterministic end-to-end auth flows WITHOUT a live Supabase
 * backend. The Supabase auth/session machinery is exercised in-browser by
 * injecting a real-format session cookie (the same one @supabase/ssr writes)
 * and, where needed, stubbing the GoTrue + PostgREST network endpoints so
 * sign-in submits and profile lookups behave like the real backend would.
 *
 * - stubReturningUser: session + an onboarded local cache → resolves "app".
 * - stubNewUser:        session only, empty profiles row → resolves "onboarding".
 * - stubPasswordLogin:  mocks the GoTrue token endpoint for email sign-in.
 * - stubSignUp:         mocks the GoTrue signup endpoint for account creation.
 */

export { expect };

export type StubProfile = {
  name?: string;
  grade?: string;
  state?: string;
  subjects?: string[];
  hobbies?: string[];
  hobbyIds?: string[];
  hobbyDetails?: Record<string, unknown>;
  avatarUrl?: string;
  onboardingComplete?: boolean;
  /** Profile created_at. Defaults to far in the future so "What's New" notices
   *  are hidden from existing tests; opt into a past date to exercise them. */
  createdAt?: string;
  announcementsSeen?: string[];
};

export type StubUser = {
  id: string;
  email: string;
  name?: string;
  profile?: StubProfile;
};

const FAKE_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTgwMDAwMDAwMH0.fake";

function buildSessionCookie(user: StubUser): string {
  const now = Math.floor(Date.now() / 1000);
  const session = {
    access_token: FAKE_ACCESS_TOKEN,
    refresh_token: "test-refresh-token",
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
    user: {
      id: user.id,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { name: user.name ?? "E2E Test User" },
    },
  };
  return "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
}

function gotrueUser(user: StubUser) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { name: user.name ?? "E2E Test User" },
  };
}

/** Inject a valid-format session cookie at the context level so it is present
 * on the very first navigation (middleware reads it server-side). */
async function stubSession(page: Page, user: StubUser) {
  const cookie = buildSessionCookie(user);
  await page.context().addCookies([
    {
      name: "sb-auth-token",
      value: cookie,
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 3600,
      sameSite: "Lax",
    },
  ]);
}

/**
 * Returning user: an onboarded local cache means resolveAuthDestination
 * returns "app" without any network call, so protected pages render and the
 * user is dropped straight into the app. The profiles REST endpoint is also
 * stubbed so ProtectedRoute's deferred DB sync never touches a live backend.
 */
async function stubReturningUser(page: Page, user: StubUser) {
  await stubSession(page, user);
  await stubLocalPrefs(page, user);
  await page.route("**/rest/v1/profiles*", (route) => {
    const p = user.profile ?? {};
    const profile = {
      id: user.id,
      name: p.name ?? "E2E Test User",
      grade: p.grade ?? "10",
      state: p.state ?? "NSW",
      subjects: p.subjects ?? ["math", "english"],
      hobbies: p.hobbies ?? ["Sports"],
      hobby_ids: p.hobbyIds ?? ["sports"],
      hobby_details: p.hobbyDetails ?? { sports: "basketball" },
      avatar_url: p.avatarUrl ?? "",
      tours_completed: [],
      created_at: p.createdAt ?? "2099-01-01T00:00:00.000Z",
      announcements_seen: p.announcementsSeen ?? [],
      onboarding_complete: p.onboardingComplete ?? true,
    };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([profile]) });
  });
}

/** Seed the local preferences cache only (no session) - used to exercise the
 * destination decision after a real sign-in submit. */
async function stubLocalPrefs(page: Page, user: StubUser) {
  await page.addInitScript(
    ([userId, profile]) => {
      const prefs = {
        name: profile?.name ?? "E2E Test User",
        grade: profile?.grade ?? "10",
        state: profile?.state ?? "NSW",
        subjects: profile?.subjects ?? ["math", "english"],
        hobbies: profile?.hobbies ?? ["Sports"],
        hobbyIds: profile?.hobbyIds ?? ["sports"],
        hobbyDetails: profile?.hobbyDetails ?? { sports: "basketball" },
        avatarUrl: profile?.avatarUrl ?? "",
        onboardingComplete: profile?.onboardingComplete ?? true,
        toursCompleted: ["dashboard", "chat", "calendar", "flashcards", "quiz", "resources"],
        userId,
      };
      localStorage.setItem("userPreferences", JSON.stringify(prefs));
    },
    [user.id, user.profile ?? {}] as const,
  );
}

/**
 * New user: session only, and the profiles REST endpoint returns no rows so
 * the destination resolver routes them through onboarding. The user endpoint
 * is also stubbed so getUser() (used when saving onboarding prefs) resolves.
 */
async function stubNewUser(page: Page, user: StubUser) {
  await stubSession(page, user);
  await page.route("**/rest/v1/profiles*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.route("**/auth/v1/user*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: user.id, aud: "authenticated", role: "authenticated", email: user.email }),
    }),
  );
}

type LoginStub =
  | { success: StubUser }
  | { error: { code?: string; message?: string } };

/** Mock the GoTrue token endpoint used by email/password sign-in. */
async function stubPasswordLogin(page: Page, stub: LoginStub) {
  await page.route("**/auth/v1/token*", async (route) => {
    if ("error" in stub) {
      const e = stub.error;
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          code: e.code ?? "invalid_credentials",
          error: e.code ?? "invalid_credentials",
          error_code: e.code ?? "invalid_credentials",
          msg: e.message ?? "Invalid login credentials",
          error_description: e.message ?? "Invalid login credentials",
        }),
      });
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: FAKE_ACCESS_TOKEN,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: "test-refresh-token",
        user: gotrueUser(stub.success),
      }),
    });
  });
}

/** Mock the GoTrue signup endpoint (email confirmation required). */
async function stubSignUp(page: Page, user: StubUser) {
  await page.route("**/auth/v1/signup*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: null,
        token_type: null,
        expires_in: null,
        expires_at: null,
        refresh_token: null,
        user: gotrueUser(user),
      }),
    });
  });
}

/** Stub the GoTrue endpoints used when exchanging an auth code for a session
 * (the /auth/callback route or the OAuthCodeCatcher fallback). */
async function stubCodeExchange(page: Page, user: StubUser) {
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
        user: gotrueUser(user),
      }),
    })
  );
  await page.route("**/auth/v1/user*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(gotrueUser(user)),
    })
  );
}

/** Stub /api/auth/account-provider so the Google-only hint can be tested. */
async function stubAccountProvider(page: Page, provider: "google" | "email" | "both" | null) {
  await page.route("**/api/auth/account-provider*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ provider }),
    }),
  );
}

export const authTest = base.extend<{
  signInAsReturningUser: (user: StubUser) => Promise<void>;
  signInAsNewUser: (user: StubUser) => Promise<void>;
  seedLocalPrefs: (user: StubUser) => Promise<void>;
  stubPasswordLogin: (stub: LoginStub) => Promise<void>;
  stubSignUp: (user: StubUser) => Promise<void>;
  stubAccountProvider: (provider: "google" | "email" | "both" | null) => Promise<void>;
  stubCodeExchange: (user: StubUser) => Promise<void>;
}>({
  signInAsReturningUser: async ({ page }, use) => {
    await use((user) => stubReturningUser(page, user));
  },
  signInAsNewUser: async ({ page }, use) => {
    await use((user) => stubNewUser(page, user));
  },
  seedLocalPrefs: async ({ page }, use) => {
    await use((user) => stubLocalPrefs(page, user));
  },
  stubPasswordLogin: async ({ page }, use) => {
    await use((stub) => stubPasswordLogin(page, stub));
  },
  stubSignUp: async ({ page }, use) => {
    await use((user) => stubSignUp(page, user));
  },
  stubAccountProvider: async ({ page }, use) => {
    await use((provider) => stubAccountProvider(page, provider));
  },
  stubCodeExchange: async ({ page }, use) => {
    await use((user) => stubCodeExchange(page, user));
  },
});