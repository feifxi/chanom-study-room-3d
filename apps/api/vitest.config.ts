import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://connecta:connecta@localhost:5433/connecta_test';

// Vitest transforms with esbuild, which can't emit decorator metadata; Nest's dependency injection
// needs it, so tests compile through SWC instead.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    root: './',
    // Creates and migrates the test database (needs `docker compose up -d`)
    globalSetup: ['test/global-setup.ts'],
    // Test files share one database, so they run one at a time
    fileParallelism: false,
    // A fixed config for tests (these win over .env)
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: TEST_DATABASE_URL,
      TEST_DATABASE_URL,
      AUTH_SECRET: 'test-secret-that-is-at-least-32-characters',
      GAME_SECRET: 'test-game-secret-that-is-at-least-32-chars',
      WEB_ORIGIN: 'http://localhost:3000',
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
