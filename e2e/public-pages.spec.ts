import { test, expect } from '@playwright/test';

test.describe('Support Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/support', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => localStorage.setItem('hasSeenImmersiveIntro', 'true'));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  });

  test('renders the support page with heading', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Support');
  });

  test('renders all 8 FAQ items', async ({ page }) => {
    const faqButtons = page.locator('main button');
    await expect(faqButtons).toHaveCount(8);
  });

  test('FAQ accordion opens and shows answer on click', async ({ page }) => {
    const firstQuestion = page.locator('main button').first();
    await firstQuestion.click();
    await expect(page.locator('text=Sign in with Google')).toBeVisible({ timeout: 5000 });
  });

  test('FAQ accordion closes on second click', async ({ page }) => {
    const firstQuestion = page.locator('main button').first();
    await firstQuestion.click();
    await expect(page.locator('text=Sign in with Google')).toBeVisible({ timeout: 5000 });
    await firstQuestion.click();
    await expect(page.locator('text=Sign in with Google')).not.toBeVisible({ timeout: 5000 });
  });

  test('renders three quick-link cards', async ({ page }) => {
    await expect(page.locator('text=Report a Bug').first()).toBeVisible();
    await expect(page.locator('text=Request a Feature').first()).toBeVisible();
    await expect(page.locator('text=Repository').first()).toBeVisible();
  });

  test('quick-link cards link to GitHub', async ({ page }) => {
    const bugLink = page.locator('a[href*="github.com"]').first();
    await expect(bugLink).toBeVisible();
  });

  test('back-to-home link navigates to /', async ({ page }) => {
    await page.locator('text=Back to Analogix').click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('footer contains privacy policy link', async ({ page }) => {
    await expect(page.locator('footer a').filter({ hasText: 'Privacy' })).toBeVisible();
  });
});

test.describe('Privacy Policy Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => localStorage.setItem('hasSeenImmersiveIntro', 'true'));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  });

  test('renders privacy page with heading', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Privacy Policy');
  });

  test('renders all 12 policy sections', async ({ page }) => {
    const sectionButtons = page.locator('main button');
    await expect(sectionButtons).toHaveCount(12);
  });

  test('section accordion shows content on click', async ({ page }) => {
    const firstSection = page.locator('main button').first();
    await firstSection.click();
    await expect(page.locator('text=name, email address, and profile picture')).toBeVisible({ timeout: 5000 });
  });

  test('renders third-party services list', async ({ page }) => {
    await page.locator('main button').filter({ hasText: 'Third-Party' }).click();
    await expect(page.locator('text=Supabase')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Groq')).toBeVisible();
    await expect(page.locator('text=Vercel')).toBeVisible();
  });

  test('back-to-home link navigates to /', async ({ page }) => {
    await page.locator('text=Back to Analogix').click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('contact support button links to /support', async ({ page }) => {
    const supportLink = page.locator('a[href="/support"]').first();
    await expect(supportLink).toBeVisible();
  });

  test('footer contains support link', async ({ page }) => {
    await expect(page.locator('footer a').filter({ hasText: 'Support' })).toBeVisible();
  });
});
