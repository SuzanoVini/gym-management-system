# ESLint quality gate baseline

Measured 2026-09-25 across 211 files. MAX_LINES=350.

Installed from [the toolkit prompt](https://github.com/soumatheusgomes/vibe-coding-toolkit/blob/main/docs/prompts/08-eslint-quality-gates-install.md). The three CommonJS rule files match upstream Git blob hashes byte for byte. All three upstream RuleTester checks pass; `verify.mjs` is retained in `npm test` and `npm run test:lint-rules`.

## Scope and configuration

- npm; ESLint 9 and @eslint/js 9; TypeScript strict syntax rules and a separate type-aware tier.
- Source: app/, middleware.ts; tests: app/**/__tests__, __tests__/, e2e/. Alias: @/* maps to app/*.
- Presentation: components, UI pages/layouts and API routes. Data modules: app/lib/supabase/client.ts (supabase), app/lib/supabase/admin.ts (createAdminClient). Hooks and data services may access clients.
- Import boundaries resolve aliases and relative paths. Both the custom import rule and import-x report the same 14 existing boundary violations; these are not 28 distinct imports.
- The console adapter exemption is app/lib/logger.ts and comes after the enabling rule.
- Generated database types, Next output, dependencies, worktrees, agent tooling, coverage and browser test output are ignored. Upstream file-size exemptions for declarations, type/barrel filenames and config files remain intact. Test file sizes are explicitly included.
- No quality rule was skipped. Additional framework presets were not added; existing Biome Next/React checks remain in CI, the quality script and the existing pre-commit hook.
- No application violations were fixed. Rules with existing debt are warnings with counts beside their settings. All other enabled rules are errors. These are documented baselines, not warning-count ratchets.
- The 28 oversized files comprise 24 production files and 4 test files. This is more than a handful, so the rule remains a warning with no offender ignore list.
- Typed lint needed more than Node's default 2 GB heap. Its npm command allows 6 GB and stays out of CI and pre-commit.
- Biome excludes the vendored eslint-rules directory to preserve the required bytes.

## Fast tier counts

| Rule | Violations | Severity |
| --- | ---: | --- |
| @typescript-eslint/no-explicit-any | 11 | warn |
| @typescript-eslint/no-extraneous-class | 1 | warn |
| @typescript-eslint/no-non-null-assertion | 21 | warn |
| @typescript-eslint/no-require-imports | 2 | warn |
| @typescript-eslint/no-unused-vars | 2 | warn |
| complexity | 39 | warn |
| import-x/no-restricted-paths | 14 | warn |
| max-depth | 11 | warn |
| max-lines-per-function | 36 | warn |
| max-nested-callbacks | 4 | warn |
| max-statements | 51 | warn |
| quality/max-lines | 28 | warn |
| quality/no-direct-console | 81 | warn |
| quality/no-direct-data-access | 14 | warn |
| max-params | 0 | error |
| import-x/no-unresolved | 0 | error |
| import-x/no-duplicates | 0 | error |

Total: 315 warnings. All other enabled rules: zero violations, error severity.

## Additional type-aware counts

| Rule | Violations | Severity |
| --- | ---: | --- |
| @typescript-eslint/no-floating-promises | 37 | warn |
| @typescript-eslint/no-misused-promises | 106 | warn |
| @typescript-eslint/no-unsafe-argument | 19 | warn |
| @typescript-eslint/no-unsafe-assignment | 95 | warn |
| @typescript-eslint/no-unsafe-call | 7 | warn |
| @typescript-eslint/no-unsafe-member-access | 19 | warn |
| @typescript-eslint/no-unsafe-return | 57 | warn |
| @typescript-eslint/require-await | 3 | warn |
| @typescript-eslint/restrict-template-expressions | 1 | warn |
| @typescript-eslint/return-await | 2 | warn |
| @typescript-eslint/unbound-method | 8 | warn |
| @typescript-eslint/only-throw-error | 0 | error |
| @typescript-eslint/await-thenable | 0 | error |
| @typescript-eslint/restrict-plus-operands | 0 | error |

The typed command also runs the fast rules. Total: 669 warnings.

## Files exceeding 350 lines

Physical lines, including comments and blanks, as counted by the copied rule.

| Lines | File |
| ---: | --- |
| 926 | `app/components/tabs/OverviewTab.tsx` |
| 894 | `app/components/tabs/IntrosTab.tsx` |
| 709 | `app/components/tabs/MembersTab.tsx` |
| 707 | `app/payroll/page.tsx` |
| 697 | `app/profile/page.tsx` |
| 680 | `app/components/payroll/TemplateImportModal.tsx` |
| 678 | `app/profile/__tests__/page.test.tsx` |
| 669 | `app/lib/services/import.service.ts` |
| 654 | `app/components/tabs/CancellationsTab.tsx` |
| 611 | `app/components/tabs/SignupsTab.tsx` |
| 599 | `app/components/tabs/HoldsTab.tsx` |
| 567 | `app/lib/insights/rules.ts` |
| 523 | `app/admin/page.tsx` |
| 513 | `app/components/tabs/modals/SettingsModal.tsx` |
| 479 | `app/lib/supabase/__tests__/profiles.test.ts` |
| 471 | `app/components/payroll/FormatConfigurationModal.tsx` |
| 466 | `app/lib/supabase/intros.ts` |
| 431 | `app/components/payroll/ImportTab.tsx` |
| 424 | `__tests__/lib/services/import.service.test.ts` |
| 421 | `app/lib/services/staff.service.ts` |
| 416 | `app/components/tabs/modals/NotesManagerModal.tsx` |
| 399 | `app/lib/csv.ts` |
| 367 | `app/components/tabs/InsightsTab.tsx` |
| 365 | `app/components/payroll/MigrationDialog.tsx` |
| 364 | `app/lib/services/hours.service.ts` |
| 360 | `app/components/tabs/FollowUpsTab.tsx` |
| 360 | `app/components/tabs/forms/IntroForm.tsx` |
| 352 | `app/lib/insights/__tests__/rules.test.ts` |

## Commands

```sh
npm run lint
npm run lint:fix
npm run lint:types
npm run lint:biome
npm run test:lint-rules
npm test
```

`lint:fix` is available but was not run against application code during installation.

## Verification

- Final fast lint: exit 0, 315 warnings, zero errors.
- Final typed lint: exit 0, 669 warnings, zero errors.
- Rule self-checks: three `ok` results; upstream Git blob hashes match.
- Application tests: 36 suites, 409 tests passed.
- Existing Biome check: one formatting error in pre-existing untracked `openapi.json`, left untouched; 27 warnings.
- No application code was changed, committed, pushed, or deployed.
