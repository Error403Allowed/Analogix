import { test, expect } from "./fixtures/auth-stub";

test.describe("PWA manifest", () => {
  test("serves a valid web app manifest", async ({ request }) => {
    const response = await request.get("/manifest.json");
    expect(response.status()).toBe(200);
    const manifest = await response.json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("links the manifest and exposes theme-color metadata", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[rel="manifest"][href="/manifest.json"]')).toBeAttached();
    const themeColors = await page.locator('meta[name="theme-color"]').count();
    expect(themeColors).toBeGreaterThan(0);
  });
});
