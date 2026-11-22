import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    // Game server tests share Redis channels, so they run one at a time
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      GAME_SECRET: 'test-game-secret-that-is-at-least-32-chars',
    },
  },
});
