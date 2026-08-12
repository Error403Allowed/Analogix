import { test, expect } from '@playwright/test';

test.describe('Onboarding Auth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 15000 });
  });

  test('renders the onboarding page with email field and Google SSO', async ({ page }) => {
    await expect(page.getByPlaceholder('name@email.com')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Continue with Google')).toBeVisible();
  });

  test('shows password field after entering email', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    const pwField = page.getByPlaceholder('Create a password ');
    await expect(pwField).toBeVisible({ timeout: 10000 });
  });

  test('shows Create Account button in sign-up mode', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.getByPlaceholder('Create a password ').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder('Create a password ').fill('123456');
    await page.getByPlaceholder('Confirm your password').fill('123456');
    const createBtn = page.locator('button').filter({ hasText: 'Create Account' });
    await expect(createBtn).toBeVisible();
  });

  test('shows password mismatch when confirm does not match', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.getByPlaceholder('Create a password ').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder('Create a password ').fill('password123');
    await page.getByPlaceholder('Confirm your password').fill('different');
    await expect(page.getByText("Passwords don't match")).toBeVisible();
  });

  test('Create Account button is disabled when password too short', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    const pwField = page.getByPlaceholder('Create a password ');
    await pwField.waitFor({ state: 'visible', timeout: 10000 });
    await pwField.fill('Ab1!');
    await page.getByPlaceholder('Confirm your password').fill('Ab1!');
    const createBtn = page.locator('button').filter({ hasText: 'Create Account' });
    await expect(createBtn).toBeDisabled();
  });

  test('Create Account button is enabled when all fields valid', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.getByPlaceholder('Create a password ').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder('Create a password ').fill('Test123!');
    await page.getByPlaceholder('Confirm your password').fill('Test123!');
    const createBtn = page.locator('button').filter({ hasText: 'Create Account' });
    await expect(createBtn).toBeEnabled();
  });

  test('Google SSO button is present and clickable', async ({ page }) => {
    await expect(page.getByText('Continue with Google')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Continue with Google')).toBeEnabled();
  });

  test('switching to Sign In changes password placeholder to Your password', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.getByPlaceholder('Create a password ').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('button').filter({ hasText: /^Sign In$/ }).click();
    await expect(page.getByPlaceholder('Your password')).toBeVisible();
  });

  test('switching to Sign In hides confirm password field', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.getByPlaceholder('Create a password ').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.getByPlaceholder('Confirm your password')).toBeVisible();
    await page.locator('button').filter({ hasText: /^Sign In$/ }).click();
    await expect(page.getByPlaceholder('Your password')).toBeVisible();
    await expect(page.getByPlaceholder('Confirm your password')).not.toBeVisible();
  });
});
