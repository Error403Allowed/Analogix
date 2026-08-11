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

    await page.addInitScript(
      ([cookieName, cookieValue]) => {
        document.cookie = `${cookieName}=${cookieValue}; path=/; max-age=3600; SameSite=Lax`;
      },
      ["sb-auth-token", encoded] as const,
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
