import { test, expect, assertNoHorizontalOverflow } from "./fixtures/auth-stub";

test.describe("Mobile overflow fixes", () => {
  test("/chat empty state does not scroll vertically", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/What are you studying/)).toBeVisible({ timeout: 30000 });

    const noScroll = await page.evaluate(() => {
      const scroller = document.querySelector<HTMLElement>(".chat-scroll");
      if (!scroller) return null;
      return scroller.scrollHeight <= scroller.clientHeight + 1;
    });

    expect(noScroll).toBe(true);
    await assertNoHorizontalOverflow(page);
  });

  test("/formulas renders KaTeX cards without document overflow", async ({ page }) => {
    await page.goto("/formulas", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const katexCards = page.locator(".katex-display");
    const count = await katexCards.count();
    expect(count).toBeGreaterThan(0);

    await assertNoHorizontalOverflow(page);
  });

  test("/timer fits within the viewport", async ({ page }) => {
    await page.goto("/timer", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Focus", { exact: true })).toBeVisible({ timeout: 30000 });

    const fits = await page.evaluate(() => {
      const de = document.documentElement;
      return {
        noHorizontalOverflow: de.scrollWidth <= de.clientWidth + 1,
        noVerticalOverflow: de.scrollHeight <= de.clientHeight + 1,
      };
    });

    expect(fits.noHorizontalOverflow).toBe(true);
    expect(fits.noVerticalOverflow).toBe(true);
  });

  test("/timer still fits after starting a session", async ({ page }) => {
    await page.goto("/timer", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Start" }).click();
    await page.waitForTimeout(300);

    const fits = await page.evaluate(() => {
      const de = document.documentElement;
      return {
        noHorizontalOverflow: de.scrollWidth <= de.clientWidth + 1,
        noVerticalOverflow: de.scrollHeight <= de.clientHeight + 1,
      };
    });

    expect(fits.noHorizontalOverflow).toBe(true);
    expect(fits.noVerticalOverflow).toBe(true);
  });
});
