import { test, expect } from "./mobile/fixtures/auth-stub";

test.describe("Chat layout (desktop)", () => {
  test("chat input and greeting are fully visible within the viewport", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const greeting = page.getByText(/What are you studying/);
    await expect(greeting).toBeVisible();

    const input = page.locator('[data-tour="chat-input"]');
    await expect(input).toBeVisible();

    const isFullyInViewport = await page.evaluate(() => {
      const input = document.querySelector('[data-tour="chat-input"]');
      const greeting = Array.from(document.querySelectorAll("h1")).find(
        (el) => el.textContent && /What are you studying/.test(el.textContent)
      );
      const check = (el: Element | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      };
      return {
        input: check(input),
        greeting: check(greeting || null),
        viewportHeight: window.innerHeight,
      };
    });

    expect(isFullyInViewport.input).toBe(true);
    expect(isFullyInViewport.greeting).toBe(true);

    // Regression: the empty state used to be bottom-aligned (my-auto + explicit mb),
    // pushing the greeting far down the page. It must be centered in the upper half.
    const greetingBox = await greeting.boundingBox();
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(greetingBox).not.toBeNull();
    expect(greetingBox!.y).toBeLessThan(viewportHeight / 2);
  });

  test("chat input is not cut off at the bottom of a short viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 640 });
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    const input = page.locator('[data-tour="chat-input"]');
    await expect(input).toBeVisible();

    const box = await input.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(await page.evaluate(() => window.innerHeight));
    expect(box!.y).toBeGreaterThanOrEqual(0);
  });
});
