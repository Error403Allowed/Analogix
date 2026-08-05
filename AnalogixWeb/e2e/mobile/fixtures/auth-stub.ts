import { test as base, type Page } from "@playwright/test";

/**
 * Seeds a fake Supabase session into the `sb-auth-token` cookie so protected
 * routes render instead of redirecting to /login. The cookie format matches
 * @supabase/ssr's browser storage adapter (BASE64_PREFIX + base64url(JSON)).
 * Also seeds onboarding-complete preferences so content renders.
 */

const base64url = (value: string) =>
  Buffer.from(value, "utf-8").toString("base64url");

export const buildFakeSession = () => ({
  access_token: "fake-access-token",
  refresh_token: "fake-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: {
    id: "e2e-test-user",
    aud: "authenticated",
    role: "authenticated",
    email: "student@example.com",
    email_confirmed_at: "2024-01-01T00:00:00.000Z",
    confirmed_at: "2024-01-01T00:00:00.000Z",
    last_sign_in_at: "2024-01-01T00:00:00.000Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { name: "Test Student" },
    identities: [
      {
        id: "e2e-test-user",
        user_id: "e2e-test-user",
        identity_data: {},
        provider: "email",
        last_sign_in_at: "2024-01-01T00:00:00.000Z",
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z",
      },
    ],
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  },
});

export const authStubScript = (): string => {
  const sessionJson = JSON.stringify(buildFakeSession());
  const cookieValue = `base64-${base64url(sessionJson)}`;
  return `
    (() => {
      try {
        document.cookie = "sb-auth-token=${cookieValue}; path=/; max-age=3600; samesite=lax";
      } catch (e) { console.error("auth stub cookie failed", e); }
      try {
        localStorage.setItem("userPreferences", JSON.stringify({
          name: "Test Student", grade: "11", state: "NSW", onboardingComplete: true,
        }));
        localStorage.setItem("hasSeenImmersiveIntro", "true");
        ["dashboard", "chat", "calendar", "flashcards", "quiz", "resources"].forEach((k) => {
          localStorage.setItem("tour_" + k + "_seen", "true");
        });
      } catch (e) { /* ignore */ }
    })();
  `;
};

type MobileFixture = Record<string, never>;

export const test = base.extend<MobileFixture>({
  page: async ({ page }, use) => {
    await page.addInitScript(authStubScript());
    await use(page);
  },
});

export const expect = test.expect;

export async function assertNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(hasOverflow).toBe(false);
}
