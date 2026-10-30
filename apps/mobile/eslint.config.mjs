import { createConfig } from '@cran/config/eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  ...createConfig({
    tsconfigRootDir: import.meta.dirname,
    ignores: ['.expo/**', 'expo-env.d.ts', 'ios/**', 'android/**'],
  }),
  reactHooks.configs.flat.recommended,
  {
    files: ['*.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];
