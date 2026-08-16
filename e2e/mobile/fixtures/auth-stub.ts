import { test as base, expect, type Page } from "@playwright/test";

/**
 * Test fixture that stubs Supabase auth so protected pages render without a
 * real login. @supabase/ssr reads the session from the `sb-auth-token` cookie
 * (`base64-` + base64url(JSON)). A far-future `expires_at` means getSession()
 * returns the stored session without attempting a token refresh over the
 * network, and embedding a full `user` object avoids the user-proxy path that
 * would otherwise trigger a /auth/v1/user round trip.
 */

export { expect };

export const test = base.extend({
  page: async ({ page }, use) => {
    const now = Math.floor(Date.now() / 1000);
    const session = {
      access_token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmU0ZWRhZC0wMDAwLTAwMDAtMDAwMC1lMmU0ZWRhZDAwMDAiLCJlbWFpbCI6ImUyZUB0ZXN0LmFpbCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxODAwMDAwMDAwfQ.signature",
      refresh_token: "test-refresh-token",
      expires_in: 3600,
      expires_at: now + 3600,
      token_type: "bearer",
      user: {
        id: "e2e-test-user",
        aud: "authenticated",
        role: "authenticated",
        email: "e2e@test.ai",
        email_confirmed_at: new Date().toISOString(),
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: { name: "E2E Test User" },
      },
    };

    const encoded = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");

    // Set the session cookie at the context level so it's present on the very
    // first navigation (the middleware reads it server-side and must not
    // redirect the stub session back to /login).
    await page.context().addCookies([
      {
        name: "sb-auth-token",
        value: encoded,
        domain: "localhost",
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 3600,
        sameSite: "Lax",
      },
    ]);

    // Seed an onboarded local cache so ProtectedRoute's destination resolver
    // returns "app" without hitting the network (the profile is authoritative
    // in production; here the cache IS the fixture).
    await page.addInitScript(
      ([userId, name]) => {
        localStorage.setItem(
          "userPreferences",
          JSON.stringify({
            name,
            grade: "10",
            state: "NSW",
            subjects: ["math", "english"],
            hobbies: ["Sports"],
            hobbyIds: ["sports"],
            hobbyDetails: { sports: "basketball" },
            onboardingComplete: true,
            toursCompleted: ["dashboard", "chat", "calendar", "flashcards", "quiz", "resources"],
            userId,
          }),
        );
      },
      ["e2e-test-user", "E2E Test User"] as const,
    );

    await use(page);
  },
});

export const assertNoHorizontalOverflow = async (page: Page) => {
  const hasOverflow = await page.evaluate(() => {
    const de = document.documentElement;
    return de.scrollWidth > de.clientWidth + 1;
  });
  expect(hasOverflow, "document should not overflow horizontally").toBe(false);
};
