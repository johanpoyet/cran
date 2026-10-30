import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Shared flat config for every workspace.
 * TypeScript files are linted with type information; plain JS config files are not.
 *
 * @param {{ tsconfigRootDir: string; ignores?: string[] }} options
 */
export function createConfig({ tsconfigRootDir, ignores = [] }) {
  return tseslint.config(
    { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.turbo/**', ...ignores] },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        globals: { ...globals.node },
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      plugins: { 'simple-import-sort': simpleImportSort },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
      },
    },
    {
      files: ['**/*.{js,mjs,cjs}'],
      ...tseslint.configs.disableTypeChecked,
    },
    prettier,
  );
}
