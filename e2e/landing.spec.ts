import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => localStorage.setItem('hasSeenImmersiveIntro', 'true'));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  });

  test('renders with body attached', async ({ page }) => {
    await expect(page.locator('body')).toBeAttached();
  });

  test('has a visible page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('hero "Start for free" button navigates to login', async ({ page }) => {
    const cta = page.getByRole('button', { name: /Start for free/i });
    await expect(cta).toBeVisible({ timeout: 10000 });
    await cta.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('"Get Started - It\'s Free" button in footer navigates to login', async ({ page }) => {
    const bottomCta = page.getByRole('button', { name: /Get Started.*It.*Free/i });
    await bottomCta.scrollIntoViewIfNeeded();
    await expect(bottomCta).toBeVisible({ timeout: 10000 });
    await bottomCta.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
  });

  test('"See all features" button scrolls to features section', async ({ page }) => {
    const featuresBtn = page.getByRole('button', { name: /See all features/i });
    await expect(featuresBtn).toBeVisible({ timeout: 10000 });
    await featuresBtn.click();
  });

  test('renders hero heading with main tagline', async ({ page }) => {
    await expect(page.locator('text=understand what you study')).toBeVisible({ timeout: 10000 });
  });

  test('renders feature cards section', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByRole('heading', { name: 'AI Tutor' })).toBeVisible({ timeout: 10000 });
  });

  test('cycles the landing page main colour on each refresh', async ({ page }) => {
    const landingColors = () =>
      page.evaluate(() => {
        const root = document.querySelector('[data-landing-root]');
        return {
          // The internal cycle counter advances on every visit...
          hue: getComputedStyle(root).getPropertyValue('--p-h').trim(),
          // ...and the RENDERED colour must follow it, otherwise the page
          // never visually changes (a regression this assertion catches).
          rendered: getComputedStyle(root).getPropertyValue('--color-primary').trim(),
        };
      });

    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    // Give the colour-cycle effect time to run.
    await page.waitForTimeout(1200);
    const first = await landingColors();

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1200);
    const second = await landingColors();

    expect(first.hue).toBeTruthy();
    expect(second.hue).toBeTruthy();
    expect(second.hue).not.toBe(first.hue);
    expect(first.rendered).toBeTruthy();
    expect(second.rendered).not.toBe(first.rendered);
  });

  test('does not touch the saved app theme when cycling the landing colour', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('app-theme', 'Oceanic Blue');
      localStorage.removeItem('landing-color-cycle');
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1200);

    const savedTheme = await page.evaluate(() => localStorage.getItem('app-theme'));
    const docHue = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--p-h').trim()
    );

    expect(savedTheme).toBe('Oceanic Blue');
    expect(docHue).toBeTruthy();
  });
});
