// Type-aware lint tier, deliberately kept OUT of eslint.config.mjs. Turning
// on projectService means ESLint builds a full TypeScript program, which on
// a large codebase is slow enough to break a pre-commit hook and heavy
// enough to exhaust the heap on a small CI runner.
//
// Two config files and two npm scripts (`lint` and `lint:types`), rather
// than one config branching on process.env.CI: branching makes local and CI
// behavior diverge silently for identical code, and reading process.env
// inside a flat config file trips that config's own no-undef rule.
import defaultConfig from './eslint.config.mjs';

export default [
  ...defaultConfig,
  {
    files: ['app/**/*.{ts,tsx}', 'middleware.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Baselines measured 2026-09-25; zero-debt rules are errors.
      // Baseline: 37 violations.
      '@typescript-eslint/no-floating-promises': 'warn',
      // Baseline: 106 violations.
      '@typescript-eslint/no-misused-promises': 'warn',
      // Baseline: 95 violations.
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      // Baseline: 19 violations.
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      // Baseline: 7 violations.
      '@typescript-eslint/no-unsafe-call': 'warn',
      // Baseline: 57 violations.
      '@typescript-eslint/no-unsafe-return': 'warn',
      // Baseline: 19 violations.
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Baseline: 0 violations.
      '@typescript-eslint/only-throw-error': 'error',
      // Baseline: 2 violations.
      '@typescript-eslint/return-await': ['warn', 'in-try-catch'],
      // Baseline: 0 violations.
      '@typescript-eslint/await-thenable': 'error',
      // Baseline: 8 violations.
      '@typescript-eslint/unbound-method': 'warn',
      // Baseline: 1 violations.
      '@typescript-eslint/restrict-template-expressions': 'warn',
      // Baseline: 0 violations.
      '@typescript-eslint/restrict-plus-operands': 'error',
      // Baseline: 3 violations.
      '@typescript-eslint/require-await': 'warn',
    },
  },
];
