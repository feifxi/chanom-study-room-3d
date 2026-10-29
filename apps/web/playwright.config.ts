import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests against the real app: Next dev server + Colyseus game server.
 *   pnpm e2e            (starts both servers if they aren't running)
 * The room is WebGL, so Chrome uses SwiftShader; audio is always muted.
 */
export default defineConfig({
  testDir: './e2e',
  // Every test joins the same public room, so run them one at a time
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1440, height: 900 },
    // Locally use the installed Chrome; CI installs Playwright's Chromium
    channel: process.env.CI ? undefined : 'chrome',
    launchOptions: { args: ['--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @study/game dev',
      url: 'http://localhost:2567/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @study/web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
