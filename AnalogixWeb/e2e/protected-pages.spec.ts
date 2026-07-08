import { test, expect } from '@playwright/test';

const TIMEOUT = 20000;

// Pages that wrap content in <ProtectedRoute> — redirect to /login → /onboarding
const protectedRoutes = [
  { path: '/achievements', name: 'Achievements' },
  { path: '/calendar', name: 'Calendar' },
  { path: '/chat', name: 'Chat' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/study-map', name: 'Study Map' },
  { path: '/subjects', name: 'Subjects' },
  { path: '/study-map/subj-1', name: 'Study Map Subject (dynamic)' },
];

const protectedDynamicRoutes = [
  { path: '/subjects/maths', name: 'Subject Detail (dynamic)' },
  { path: '/subjects/maths/document', name: 'Subject Document Index (dynamic)' },
  { path: '/subjects/maths/document/doc-1', name: 'Subject Document Detail (dynamic)' },
];

// Pages without ProtectedRoute — should render content even when not authenticated
const unprotectedRoutes = [
  { path: '/flashcards', name: 'Flashcards' },
  { path: '/formulas', name: 'Formulas' },
  { path: '/quiz', name: 'Quiz' },
  { path: '/resources', name: 'Resources' },
  { path: '/rooms', name: 'Rooms' },
];

// Views that export directly as page exports (no ProtectedRoute)
const viewExportRoutes = [
  { path: '/rooms/room-1', name: 'Study Room Workspace (dynamic)', view: 'StudyRoomWorkspace' },
];

test.describe('Protected Pages — Redirect to Onboarding', () => {
  for (const { path, name } of protectedRoutes) {
    test(`redirects ${name} to onboarding`, async ({ page }) => {
      const response = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUT,
      });
      expect(response?.ok()).toBeTruthy();
      await page.waitForURL(/\/onboarding$/, { timeout: TIMEOUT });
      await expect(page.getByPlaceholder('name@email.com')).toBeVisible({ timeout: 10000 });
    });
  }
});

test.describe('Unprotected Pages — Render Content Without Auth', () => {
  for (const { path, name } of unprotectedRoutes) {
    test(`${name} renders without crashing`, async ({ page }) => {
      const response = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUT,
      });
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator('body')).toBeAttached({ timeout: 10000 });
    });
  }
});

test.describe('Rooms Page', () => {
  test('renders room list page', async ({ page }) => {
    await page.goto('/rooms', { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.evaluate(() => localStorage.setItem('hasSeenImmersiveIntro', 'true'));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await expect(page.locator('body')).toBeAttached();
  });
});

test.describe('Protected Dynamic Routes — Render Without Crashing', () => {
  for (const { path, name } of protectedDynamicRoutes) {
    test(`${name} does not crash`, async ({ page }) => {
      const response = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUT,
      });
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator('body')).toBeAttached({ timeout: 5000 });
    });
  }
});

test.describe('Protected Pages — Do Not Crash on Dynamic Routes', () => {
  test('handles missing subject gracefully', async ({ page }) => {
    const response = await page.goto('/subjects/nonexistent-subject', {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT,
    });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toBeAttached({ timeout: 5000 });
  });

  test('handles missing room gracefully', async ({ page }) => {
    const response = await page.goto('/rooms/room-1', {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUT,
    });
    expect(response?.ok()).toBeTruthy();
    await page.evaluate(() => localStorage.setItem('hasSeenImmersiveIntro', 'true'));
    await page.reload({ waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await expect(page.locator('body')).toBeAttached({ timeout: 10000 });
  });
});
