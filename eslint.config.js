import { createConfig } from '@cran/config/eslint';

// Root-level files only; each workspace has its own eslint.config.js.
export default createConfig({
  tsconfigRootDir: import.meta.dirname,
  ignores: ['apps/**', 'packages/**'],
});
