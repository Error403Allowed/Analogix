import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Force a test NODE_ENV before anything else in this file runs. If the
// ambient shell (or a CI step that built the app first) already exported
// NODE_ENV=production, React resolves its production build, which strips
// React.act - @testing-library/react's act-compat shim then throws
// "React.act is not a function" on every test that renders a component.
// Vitest only defaults NODE_ENV when it is unset, so an inherited
// "production" value survives unless something here overrides it
// explicitly. This runs in the parent process before workers are spawned,
// so workers inherit the corrected value.
process.env.NODE_ENV = 'test';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react()],
  test: {
    include: ['src/tests/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
  },
});
