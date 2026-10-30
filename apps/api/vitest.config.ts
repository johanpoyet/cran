import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    globalSetup: ['src/test/global-setup.ts'],
    // PGlite boots a full Postgres in WebAssembly for each test file.
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
