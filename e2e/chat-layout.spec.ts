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

  test("neural loader shows while the assistant response is streaming", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    // Hold the stream open with empty content chunks (never send [DONE]) so the
    // assistant message stays in the "thinking" state and the loader must render.
    await page.route("**/api/groq/chat-stream", (route) => {
      const encoder = new TextEncoder();
      let closed = false;
      let interval: ReturnType<typeof setInterval> | null = null;
      const stream = new ReadableStream({
        start(controller) {
          const tick = () => {
            if (closed) return;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "" } }] })}\n\n`));
          };
          tick();
          interval = setInterval(tick, 250);
        },
        cancel() {
          closed = true;
          if (interval) clearInterval(interval);
        },
      });
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        response: new Response(stream),
      });
    });

    const input = page.getByPlaceholder("Ask me anything...");
    await input.fill("Tell me about photosynthesis");
    await page.keyboard.press("Enter");

    const loader = page.getByText(/Thinking/).first();
    await expect(loader).toBeVisible({ timeout: 15000 });
    const loaderBox = loader.locator("xpath=..");
    await expect(loaderBox.locator("svg")).toBeVisible();
    await expect(loaderBox.locator("[data-node]")).toHaveCount(4);
    await expect(loaderBox.locator("[data-pulse]")).toHaveCount(2);
  });

  test("neural loader is animated, not a static image", async ({ page }) => {
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);

    await page.route("**/api/groq/chat-stream", (route) => {
      const encoder = new TextEncoder();
      let closed = false;
      let interval: ReturnType<typeof setInterval> | null = null;
      const stream = new ReadableStream({
        start(controller) {
          const tick = () => {
            if (closed) return;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "" } }] })}\n\n`));
          };
          tick();
          interval = setInterval(tick, 250);
        },
        cancel() {
          closed = true;
          if (interval) clearInterval(interval);
        },
      });
      route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        response: new Response(stream),
      });
    });

    const input = page.getByPlaceholder("Ask me anything...");
    await input.fill("Tell me about photosynthesis");
    await page.keyboard.press("Enter");

    const loader = page.getByText(/Thinking/).first();
    await expect(loader).toBeVisible({ timeout: 15000 });

    // Sample the SMIL-driven pulse position twice; it must move. getCTM() returns
    // the current transform of a circle inside [data-pulse] as it travels the path.
    const samplePulseX = async () => {
      const sample = await page.evaluate(() => {
        const circle = document.querySelector("[data-pulse] > circle");
        if (!circle) return null;
        const ctm = circle.getCTM;
        if (!ctm) return null;
        return (circle as SVGGraphicsElement).getCTM()?.e ?? null;
      });
      return sample;
    };

    const t0 = await samplePulseX();
    await page.waitForTimeout(450);
    const t1 = await samplePulseX();

    expect(t0).not.toBeNull();
    expect(t1).not.toBeNull();
    expect(Math.abs((t1 as number) - (t0 as number))).toBeGreaterThan(0.01);
  });
});
