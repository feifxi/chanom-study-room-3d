import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Vitest transforms with esbuild, which can't emit decorator metadata; Nest's dependency injection
// needs it, so tests compile through SWC instead.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    root: './',
    // A fixed config for tests (these win over .env); the database is faked where a test needs it
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'postgresql://test:test@localhost:5433/test',
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
