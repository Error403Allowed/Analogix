import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\//,
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testMatch: /mobile\/.*\.spec\.ts/,
      testIgnore: /mobile\/tablet\.spec\.ts/,
    },
    {
      name: 'mobile-ios',
      use: { ...devices['iPhone 14'], browserName: 'chromium' },
      testMatch: /mobile\/.*\.spec\.ts/,
      testIgnore: /mobile\/tablet\.spec\.ts/,
    },
    {
      name: 'mobile-ipad',
      use: { ...devices['iPad (gen 7)'], browserName: 'chromium' },
      testMatch: /mobile\/tablet\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
