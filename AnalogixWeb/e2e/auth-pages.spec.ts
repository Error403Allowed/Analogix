import { test, expect } from '@playwright/test';

test.describe('Onboarding Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 15000 });
  });

  test('renders email input field', async ({ page }) => {
    await expect(page.getByPlaceholder('name@email.com')).toBeVisible({ timeout: 15000 });
  });

  test('renders Google SSO button', async ({ page }) => {
    await expect(page.getByText('Continue with Google')).toBeVisible({ timeout: 15000 });
  });

  test('shows password field after entering email', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await expect(page.getByPlaceholder('Create a password ')).toBeVisible({ timeout: 10000 });
  });

  test('toggles from Create Account to Sign In mode', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.getByPlaceholder('Create a password ').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('button').filter({ hasText: /^Sign In$/ }).click();
    await expect(page.getByPlaceholder('Your password')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('Confirm your password')).not.toBeVisible();
  });

  test('shows password mismatch when confirm does not match', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.getByPlaceholder('Create a password ').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder('Create a password ').fill('password123');
    await page.getByPlaceholder('Confirm your password').fill('different');
    await expect(page.getByText("Passwords don't match")).toBeVisible();
  });

  test('Create Account button disabled when password too short', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.getByPlaceholder('Create a password ').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder('Create a password ').fill('Ab1!');
    await page.getByPlaceholder('Confirm your password').fill('Ab1!');
    await expect(page.locator('button').filter({ hasText: 'Create Account' })).toBeDisabled();
  });

  test('Create Account button enabled when all fields valid', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.getByPlaceholder('Create a password ').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder('Create a password ').fill('Test123!');
    await page.getByPlaceholder('Confirm your password').fill('Test123!');
    await expect(page.locator('button').filter({ hasText: 'Create Account' })).toBeEnabled();
  });

  test('Google SSO button is clickable', async ({ page }) => {
    await expect(page.getByText('Continue with Google')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Continue with Google')).toBeEnabled();
  });
});

test.describe('Login Page', () => {
  test('redirects to onboarding', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10000 });
  });

  test('passes error parameter when present in login URL', async ({ page }) => {
    await page.goto('/login?error=access_denied', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await expect(page).toHaveURL(/\/onboarding\?error=access_denied/, { timeout: 10000 });
  });
});

test.describe('Auth Callback Page', () => {
  test('renders without crashing', async ({ page }) => {
    await page.goto('/auth/callback', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await expect(page.locator('body')).toBeAttached();
  });
});

test.describe('Reset Password Page', () => {
  test('renders without crashing', async ({ page }) => {
    await page.goto('/auth/reset-password', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await expect(page.locator('body')).toBeAttached();
  });
});
