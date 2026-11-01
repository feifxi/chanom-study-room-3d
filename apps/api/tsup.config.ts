import { defineConfig } from 'tsup';

/**
 * Production bundle (same as the game server's): everything (workspace packages and npm dependencies) goes into
 * dist/index.js, so the container needs no node_modules. Only optional native add-ons
 * and dev-only packages stay external; the code never loads them in production.
 */
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node24',
  platform: 'node',
  sourcemap: true,
  clean: true,
  noExternal: [/.*/],
  external: ['uWebSockets.js', 'bufferutil', 'utf-8-validate', 'pino-pretty'],
  // Bundled CommonJS packages call require(); give the ESM bundle one
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
});
