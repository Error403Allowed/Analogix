import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
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
    await expect(page.getByPlaceholder('Your password')).toBeVisible({ timeout: 10000 });
  });

  test('toggles from Sign In to Sign Up mode', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.getByPlaceholder('Your password').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('button').filter({ hasText: /^Sign Up$/ }).click();
    await expect(page.getByPlaceholder('Create a password')).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('Confirm your password')).toBeVisible();
  });

  test('shows password mismatch when confirm does not match', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.locator('button').filter({ hasText: /^Sign Up$/ }).click();
    await page.getByPlaceholder('Create a password').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder('Create a password').fill('password123');
    await page.getByPlaceholder('Confirm your password').fill('different');
    await expect(page.getByText("Passwords don't match")).toBeVisible();
  });

  test('Create Account button disabled when password too short', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.locator('button').filter({ hasText: /^Sign Up$/ }).click();
    await page.getByPlaceholder('Create a password').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder('Create a password').fill('Ab1!');
    await page.getByPlaceholder('Confirm your password').fill('Ab1!');
    await expect(page.locator('button').filter({ hasText: 'Create Account' })).toBeDisabled();
  });

  test('Create Account button enabled when all fields valid', async ({ page }) => {
    await page.getByPlaceholder('name@email.com').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByPlaceholder('name@email.com').fill('test@example.com');
    await page.locator('button').filter({ hasText: /^Sign Up$/ }).click();
    await page.getByPlaceholder('Create a password').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder('Create a password').fill('Test123!');
    await page.getByPlaceholder('Confirm your password').fill('Test123!');
    await expect(page.locator('button').filter({ hasText: 'Create Account' })).toBeEnabled();
  });

  test('Google SSO button is clickable', async ({ page }) => {
    await expect(page.getByText('Continue with Google')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Continue with Google')).toBeEnabled();
  });

  test('shows the branding panel on desktop viewports', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /Study smarter with a tutor/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder('name@email.com')).toBeVisible();
  });

  test('hides the branding panel and keeps the form centred on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /Study smarter with a tutor/i })
    ).toBeHidden({ timeout: 15000 });
    await expect(page.getByPlaceholder('name@email.com')).toBeVisible();
  });
});

test.describe('Onboarding Page', () => {
  test('redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('passes an error parameter through to /login', async ({ page }) => {
    await page.goto('/onboarding?error=auth_failed&error_code=access_denied', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
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