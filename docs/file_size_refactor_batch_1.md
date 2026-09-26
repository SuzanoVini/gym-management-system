# File-size refactor: batch 1

Completed 2026-09-25 with MAX_LINES=350, BATCH_SIZE=3, RULE_ID=quality/max-lines.

## Completed splits

| Original entrypoint | Before | After | Responsibility split |
| --- | ---: | ---: | --- |
| app/components/tabs/OverviewTab.tsx | 926 | 184 | Pure analytics calculations, CSV export, dashboard cards and charts |
| app/components/tabs/IntrosTab.tsx | 894 | 286 | CSV import/undo workflow, filtered list/pagination, table columns, dialogs, database mutation adapter |
| app/components/tabs/MembersTab.tsx | 709 | 304 | Member status and plan calculations, journey query adapter and event assembly, roster and summary components |

Counts use ESLint's physical source lines, including its trailing empty line. Every new module also stays below 350. Each original default export retains its name and signature. Import sites outside the three entrypoints were not changed.

Each file was completed, checked and committed before starting the next. Independent behavior reviews found no regressions. No file in this batch lacked a natural seam. All other oversized files were deliberately left untouched because this batch is limited to the three largest files.

## Verification

For each split, in order:

1. `npm run typecheck -- --incremental false`: passed. Disabling incremental output avoids changing the local compiler cache.
2. `npm test -- --runInBand`: passed, 36 suites / 409 tests, plus all three rule self-checks.
3. `npm run lint -- --format json --output-file <report>`: passed, zero errors. JSON output retains every diagnostic for comparison.
4. Targeted Biome checks and commit hooks: passed.

Final fast ESLint result: **305 warnings, zero errors**, down from 315 warnings. Files over budget: **25**, down from 28. No additional violations were introduced. Some existing console, complexity and statement warnings moved with unchanged logic into the extracted modules; they were not suppressed or erased.

| Rule improved | Before | After |
| --- | ---: | ---: |
| quality/max-lines | 28 | 25 |
| max-lines-per-function | 36 | 35 |
| complexity | 39 | 37 |
| quality/no-direct-data-access | 14 | 12 |
| import-x/no-restricted-paths | 14 | 12 |

Other rule counts are unchanged. The earlier quality-gate installation changes remain outside these refactor commits. The unrelated untracked openapi.json was untouched. No push or deployment was performed.

## Remaining oversized files

| Lines | File |
| ---: | --- |
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
| 360 | `app/components/tabs/forms/IntroForm.tsx` |
| 360 | `app/components/tabs/FollowUpsTab.tsx` |
| 352 | `app/lib/insights/__tests__/rules.test.ts` |

Stopped after this batch of three as requested.
