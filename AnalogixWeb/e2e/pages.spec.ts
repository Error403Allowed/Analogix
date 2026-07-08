import { test, expect } from '@playwright/test';

test.describe('Timer Page', () => {
  test('renders timer with controls', async ({ page }) => {
    await page.goto('/timer', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await expect(page.getByText('Focus').or(page.getByText('Break')).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button').filter({ hasText: 'Start' }).or(page.locator('button').filter({ hasText: 'Pause' })).first()).toBeVisible({ timeout: 5000 });
  });

  test('timer shows clickable time display', async ({ page }) => {
    await page.goto('/timer', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const timeDisplay = page.locator('button[title="Click to edit time"]');
    await expect(timeDisplay).toBeVisible({ timeout: 10000 });
  });

  test('timer shows Start button initially', async ({ page }) => {
    await page.goto('/timer', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await expect(page.locator('button').filter({ hasText: 'Start' })).toBeVisible({ timeout: 10000 });
  });

  test('timer has back button that navigates back', async ({ page }) => {
    await page.goto('/timer', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const backBtn = page.locator('button').filter({ hasText: 'Back' });
    await expect(backBtn).toBeVisible();
  });

  test('timer has reset and skip controls', async ({ page }) => {
    await page.goto('/timer', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const resetBtn = page.locator('button[title="Reset"]');
    await expect(resetBtn).toBeVisible();
    const skipBtn = page.locator('button[title="Skip to next"]');
    await expect(skipBtn).toBeVisible();
  });
});

test.describe('404 Page', () => {
  test('returns 404 status', async ({ page }) => {
    const response = await page.goto('/this-path-does-not-exist-12345', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    expect(response?.status()).toBe(404);
  });
});
