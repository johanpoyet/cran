import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts', 'src/calc/types.ts'],
      reporter: ['text', 'json-summary'],
      // Spec section 9: 100 % on calculations, 80 % on the package.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        'src/calc/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  },
});
