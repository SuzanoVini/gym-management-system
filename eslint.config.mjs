// Fast lint tier. Everything here runs without type information, which is
// what keeps it quick enough for a pre-commit hook. The rules that need the
// type checker live in eslint.typed.config.mjs and run on their own script.
//
// Baselines measured 2026-09-25; promote each warning to error at zero.
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import quality from './eslint-rules/index.cjs';

export default defineConfig([
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
      // js.configs.recommended turns on no-undef, which knows nothing about
      // the runtime this project targets -- without this, every console or
      // process reference is reported as an undefined variable. Declare what
      // the code actually uses. When the list outgrows a handful, install the
      // `globals` package and spread globals.node or globals.browser instead.
      globals: { ...globals.browser, ...globals.node },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      // Baseline: 2 violations.
      '@typescript-eslint/no-require-imports': 'warn',
    },
  },
  {
    rules: {
      // Baseline: 21 violations.
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
  {
    rules: {
      // Baseline: 1 violations.
      '@typescript-eslint/no-extraneous-class': 'warn',
    },
  },
  {
    rules: {
      // Baseline: 11 violations.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  {
    // import-x resolves TypeScript path aliases so no-unresolved is accurate.
    // Resolved paths catch relative imports as well as the @/* alias.
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      'import-x/no-unresolved': 'error',
      'import-x/no-duplicates': 'error',
      // Baseline: 14 violations.
      'import-x/no-restricted-paths': [
        'warn',
        {
          basePath: import.meta.dirname,
          zones: [
            {
              target: [
                './app/components/**/*',
                './app/api/**/*',
                './app/**/page.tsx',
                './app/**/layout.tsx',
              ],
              from: ['./app/lib/supabase/client.ts', './app/lib/supabase/admin.ts'],
              message: 'Use a data hook, repository, or service from presentation code.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'app/**/*.{js,jsx,ts,tsx,mjs,cjs}',
      'middleware.ts',
      'e2e/**/*.{ts,tsx}',
      '__tests__/**/*.{ts,tsx}',
    ],
    plugins: { quality },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-var': 'error',
      'prefer-const': 'error',
      // Baseline: 2 violations.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Existing debt remains visible while zero-debt rules block regressions.
      // Baseline: 39 violations.
      complexity: ['warn', 12],
      // Baseline: 11 violations.
      'max-depth': ['warn', 4],
      // Baseline: 51 violations.
      'max-statements': ['warn', 20],
      'max-params': ['error', 4], // Baseline: 0 violations.
      // Baseline: 36 violations.
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      // Baseline: 4 violations.
      'max-nested-callbacks': ['warn', 3],
      // Baseline: 28 violations.
      'quality/max-lines': ['warn', { max: 350 }],
      // Baseline: 81 violations.
      'quality/no-direct-console': ['warn', { logger: 'logger from @/lib/logger' }],
      // Baseline: 14 violations.
      'quality/no-direct-data-access': [
        'warn',
        {
          modules: ['@/lib/supabase/client', '@/lib/supabase/admin'],
          bindings: ['supabase', 'createAdminClient'],
          layers: [
            '/app/components/',
            '/app/api/',
            '/app/admin/',
            '/app/login/',
            '/app/payroll/',
            '/app/profile/',
            '/app/reset-password/',
          ],
          extensions: ['.tsx'],
        },
      ],
    },
  },
  {
    // The log adapter itself, and anything that has to log before the rest of
    // the infrastructure is reachable. This block MUST come after the block
    // that turns the rule on: for a file matched by both, flat config applies
    // the later block's rules last, so an "off" placed earlier is silently
    // overridden by the "error" that follows it.
    files: ['app/lib/logger.ts'],
    rules: {
      'quality/no-direct-console': 'off',
    },
  },
  {
    // The same file budget for test files, at "warn". Also placed after the
    // "error" block for the same ordering reason. Two glob branches, because
    // a file counts as a test either by suffix or by directory -- and the
    // suffix branch alone misses test-support files that live in __tests__/
    // without being *.test.ts themselves.
    files: [
      '**/*.{test,spec}.{js,jsx,ts,tsx}',
      'e2e/**/*.{ts,tsx}',
      '**/{__tests__,__mocks__,fixtures,mocks}/**/*.{ts,tsx}',
    ],
    plugins: { quality },
    rules: {
      // Baseline: 28 violations.
      'quality/max-lines': ['warn', { max: 350, includeTests: true }],
    },
  },
  {
    files: [
      '**/*.{test,spec}.{js,jsx,ts,tsx}',
      '**/{__tests__,__mocks__,fixtures,mocks}/**/*.{js,jsx,ts,tsx}',
      'e2e/**/*.{ts,tsx}',
      'jest.setup.js',
    ],
    languageOptions: { globals: globals.jest },
    rules: {
      // These three fire heavily on describe/it nesting and on long arrange
      // sections without pointing at a real problem. complexity, max-depth
      // and max-params stay on for tests -- they were not part of the noise.
      'max-statements': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      // no-restricted-paths has no concept of a test file the way the
      // quality/* rules do, and fixtures legitimately import schema objects
      // directly.
      'import-x/no-restricted-paths': 'off',
    },
  },
  {
    files: ['eslint-rules/**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { module: 'readonly', require: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  globalIgnores([
    // Agent harness files, vendored automation and standalone tooling are not
    // the application this config polices. Without these, Node-runtime
    // scripts that never declared Node globals drown real findings in
    // no-undef noise.
    '.claude/**',
    '.github/agents/**',
    '.github/hooks/**',
    '.github/skills/**',
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '**/*.tsbuildinfo',
    'package-lock.json',
    'app/generated/**',
    'app/lib/supabase/types.ts', // Generated database schema, not hand-maintained source.
    '.next/**',
    'out/**',
    '.vercel/**',
    '.worktrees/**',
    '.features/**',
    '.superpowers/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    'verify.mjs',
  ]),
]);
