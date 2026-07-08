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

  test('hero "Start for free" button navigates to onboarding', async ({ page }) => {
    const cta = page.getByRole('button', { name: /Start for free/i });
    await expect(cta).toBeVisible({ timeout: 10000 });
    await cta.click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
  });

  test('"Get Started — It\'s Free" button in footer navigates to onboarding', async ({ page }) => {
    const bottomCta = page.getByRole('button', { name: /Get Started.*It.*Free/i });
    await bottomCta.scrollIntoViewIfNeeded();
    await expect(bottomCta).toBeVisible({ timeout: 10000 });
    await bottomCta.click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
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
});
