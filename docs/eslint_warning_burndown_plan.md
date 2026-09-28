# ESLint Warning Burndown Plan

Status: **Decision A selected by user.** Full burndown authorized. No application source changes for this burndown have started; existing uncommitted ESLint installation files are preserved.

## 0. Ground truth (fresh baseline, 2026-09-26)

- `npm run lint`: 235 analyzed files, 305 warnings, 0 errors.
- `npm run lint:types`: 235 analyzed files, 659 warnings, 0 errors (typed tier includes fast tier; 354 additional type-aware warnings).
- 125 files have warnings: 49 files have one warning-rule; 76 have multiple.
- Baseline tests: `npm.cmd test -- --runInBand` passed, 36 suites and 409 tests. The shell's `npm` PowerShell shim was blocked by execution policy; `npm.cmd` runs the same package script.
- `quality/max-lines` is the riskiest part: 25 warnings in 25 files, 12,573 total lines, and 3,823 lines above 350. A purely arithmetic lower bound is about 30 supporting files (several files need at least three pieces); likely more depending on cohesive extraction seams. This is an estimate, not a target. This is nontrivial because it touches pages, payroll, member workflows, imports, services, and tests.

## 1. Decision gate

Decision A: **fix all warnings**, including all 25 `quality/max-lines` violations. The user confirmed A. Preserve behavior and exports. Do not suppress or relax rules. Any non-mechanical runtime change is pulled out as a separate human-review item rather than included silently.

## 2. Success criteria — commands and expected output

- `npm run lint`: 0 warnings, 0 errors.
- `npm run lint:types`: 0 warnings, 0 errors.
- `npm run typecheck -- --incremental false`: clean.
- `npm.cmd test -- --runInBand`: all suites/tests green.
- `npm run build`: succeeds.
- Zero behavior change. Only mechanical lint corrections and cohesive extraction/rename/move are in scope; any non-mechanical change is reported separately, not folded into this burn-down.
- Final report lists all new suppressions (expected: none), all non-mechanical fixes (expected: none in scope), and reviewer approvals. Run `git diff --check`; ensure only task files were committed and preserve pre-existing setup changes.

## 3. Ordered execution waves

Wave 1: T03.
Wave 2 (file-disjoint after Wave 1): T01, T04. Both depend on T03, whose console passthrough must be reviewed before they consume it.
Wave 3 (file-disjoint after Wave 2): T02, T08. T02 depends on T01; T08 depends on T04.
Wave 4 (file-disjoint after Wave 3): T05, T06. T05 depends on T01/T02; T06 depends on T02/T04.
Wave 5 (file-disjoint after Wave 4): T07, T09. T07 depends on T02/T04; T09 depends on T01/T04.

For each wave, dispatch all implementers together; implementers do not commit. The orchestrator commits only each task's exact files in fixed order after capturing the current HEAD freshly immediately before each commit. Dispatch the wave's spec reviewers together only after all wave commits exist; then dispatch code-quality reviewers after spec approval. Do not begin a dependent wave until every review in the prior wave is approved. Any scope collision or unknown dependency moves the task to a later serial wave.

### T01 — Supabase adapters and tests

- Description: Resolve only baseline warnings in this scope. For `quality/max-lines`, make cohesive extractions/moves, preserve exports and runtime behavior, and keep resulting modules within 350 lines. Other changes must be mechanical and behavior-preserving; if not, record separately for human review and do not fold into this burn-down.
- Files: `app/lib/supabase/__tests__/classMappings.test.ts`, `app/lib/supabase/__tests__/intros.test.ts`, `app/lib/supabase/__tests__/profiles.test.ts`, `app/lib/supabase/cancellations.ts`, `app/lib/supabase/classMappings.ts`, `app/lib/supabase/dismissedInsights.ts`, `app/lib/supabase/holds.ts`, `app/lib/supabase/intros.ts`, `app/lib/supabase/memberStatus.ts`, `app/lib/supabase/members.ts`, `app/lib/supabase/preferences.ts`, `app/lib/supabase/profiles.ts`, `app/lib/supabase/settings.ts`, `app/lib/supabase/signups.ts`; extraction files may be created only in these exact source-specific paths: `app/lib/supabase/__tests__/profiles.test/**`, `app/lib/supabase/intros/**`.
- Additional file allowed only if test-first characterization is needed for an extraction: `app/lib/supabase/__tests__/burndown-T01.test.ts`.
- Depends-on: T03 (uses its side-effect-free console passthrough).
- Owner: database/Supabase specialist.
- Pitfalls (copy verbatim into each implementer/reviewer brief): Accidental changes to authorization or tenant boundaries; changed database query filters, error handling, or write ordering; unhandled/reordered async effects and UI event promises; changed CSV parsing, import rollback, or payroll calculations; changed date/time-zone behavior; changed default exports, route response shapes, or component props; tests weakened to accommodate implementation; adding `any`, non-null assertions, or ESLint suppressions instead of fixing causes. Any extraction must also preserve inferred exported types and test fixture semantics.
- Reviewers: Supabase/database security, TypeScript, and test reviewer.

### T02 — Services, parsers, imports, and CSV

- Description: Resolve only baseline warnings in this scope. For `quality/max-lines`, make cohesive extractions/moves, preserve exports and runtime behavior, and keep resulting modules within 350 lines. Other changes must be mechanical and behavior-preserving; if not, record separately for human review and do not fold into this burn-down.
- Files: `__tests__/lib/services/import.service.test.ts`, `app/lib/csv.ts`, `app/lib/members/memberRoster.ts`, `app/lib/migration/payroll-migration.ts`, `app/lib/quick-import.ts`, `app/lib/services/__tests__/hours.service.test.ts`, `app/lib/services/booking-parser.ts`, `app/lib/services/cancellation-parser.ts`, `app/lib/services/csv-format.service.ts`, `app/lib/services/csv-template-analyzer.ts`, `app/lib/services/hours.service.ts`, `app/lib/services/import.service.ts`, `app/lib/services/member-import-parser.ts`, `app/lib/services/period.service.ts`, `app/lib/services/staff.service.ts`; extraction files may be created only in these exact source-specific paths: `__tests__/lib/services/import.service.test/**`, `app/lib/csv/**`, `app/lib/services/hours.service/**`, `app/lib/services/import.service/**`, `app/lib/services/staff.service/**`.
- Depends-on: T01.
- Owner: backend/TypeScript specialist.
- Pitfalls (copy verbatim into each implementer/reviewer brief): Accidental changes to authorization or tenant boundaries; changed database query filters, error handling, or write ordering; unhandled/reordered async effects and UI event promises; changed CSV parsing, import rollback, or payroll calculations; changed date/time-zone behavior; changed default exports, route response shapes, or component props; tests weakened to accommodate implementation; adding `any`, non-null assertions, or ESLint suppressions instead of fixing causes. Any extraction must also preserve inferred exported types and test fixture semantics.
- Reviewers: backend/CSV-import domain, TypeScript, and test reviewer.

### T03 — General library logic, rules, and test utilities

- Description: Resolve only baseline warnings in this scope. For `quality/max-lines`, make cohesive extractions/moves, preserve exports and runtime behavior, and keep resulting modules within 350 lines. Other changes must be mechanical and behavior-preserving; if not, record separately for human review and do not fold into this burn-down.
- Files: `app/lib/config.ts`, `app/lib/errorHandler.ts`, `app/lib/insights/__tests__/rules.test.ts`, `app/lib/insights/rules.ts`, `app/lib/logger.ts`, `app/lib/utils/__tests__/normalizePersonKey.test.ts`, `app/lib/utils/__tests__/reminderUtils.test.ts`, `app/lib/utils/csv-template-validator.ts`, `app/lib/utils/date.utils.ts`, `app/lib/utils/export.utils.ts`, `app/lib/utils/reminderUtils.ts`, `app/lib/utils/search.ts`, `app/lib/utils/validation.utils.ts`, `app/lib/validations.ts`, `app/store/__tests__/useSettingsStore.test.ts`, `app/types/index.ts`, `jest.config.js`, `scripts/retroactive-sync.ts`; extraction files may be created only in these exact source-specific paths: `app/lib/insights/__tests__/rules.test/**`, `app/lib/insights/rules/**`.
- Additional focused test files allowed only if test-first characterization is needed for an extraction: `app/lib/insights/__tests__/burndown-T03.test.ts`, `app/lib/utils/__tests__/burndown-T03.test.ts`.
- Additional focused test files allowed only if test-first characterization is needed for an extraction or pass-through: `app/lib/insights/__tests__/burndown-T03.test.ts`, `app/lib/utils/__tests__/burndown-T03.test.ts`, `app/lib/__tests__/logger.test.ts`.
- Depends-on: none.
- Owner: TypeScript/test specialist.
- Pitfalls (copy verbatim into each implementer/reviewer brief): Accidental changes to authorization or tenant boundaries; changed database query filters, error handling, or write ordering; unhandled/reordered async effects and UI event promises; changed CSV parsing, import rollback, or payroll calculations; changed date/time-zone behavior; changed default exports, route response shapes, or component props; tests weakened to accommodate implementation; adding `any`, non-null assertions, or ESLint suppressions instead of fixing causes. Any extraction must also preserve inferred exported types and test fixture semantics.
- Reviewers: TypeScript and test reviewer.

### T04 — Hooks

- Description: Resolve only baseline warnings in this scope. For `quality/max-lines`, make cohesive extractions/moves, preserve exports and runtime behavior, and keep resulting modules within 350 lines. Other changes must be mechanical and behavior-preserving; if not, record separately for human review and do not fold into this burn-down.
- Files: `app/hooks/useAnalyticsData.ts`, `app/hooks/useCancellations.ts`, `app/hooks/useDefaultFilters.ts`, `app/hooks/useDismissedInsights.ts`, `app/hooks/useFollowUps.ts`, `app/hooks/useFormerMembers.ts`, `app/hooks/useHolds.ts`, `app/hooks/useImportUndo.ts`, `app/hooks/useIntroCsvImport.ts`, `app/hooks/useIntroListView.ts`, `app/hooks/useIntros.ts`, `app/hooks/useMembers.ts`, `app/hooks/usePayrollPeriod.ts`, `app/hooks/usePayrollStaff.ts`, `app/hooks/usePerformance.ts`, `app/hooks/useRevenueSetting.ts`, `app/hooks/useSignups.ts`, `app/hooks/useStaffHours.ts`.
- Additional file allowed only if test-first characterization is needed for an extraction: `app/hooks/__tests__/burndown-T04.test.ts`.
- Depends-on: T03 (uses its side-effect-free console passthrough).
- Owner: React hooks specialist.
- Pitfalls (copy verbatim into each implementer/reviewer brief): Accidental changes to authorization or tenant boundaries; changed database query filters, error handling, or write ordering; unhandled/reordered async effects and UI event promises; changed CSV parsing, import rollback, or payroll calculations; changed date/time-zone behavior; changed default exports, route response shapes, or component props; tests weakened to accommodate implementation; adding `any`, non-null assertions, or ESLint suppressions instead of fixing causes. Any extraction must also preserve inferred exported types and test fixture semantics.
- Reviewers: React hooks, TypeScript, and test reviewer.

### T05 — API routes and administration page

- Description: Resolve only baseline warnings in this scope. For `quality/max-lines`, make cohesive extractions/moves, preserve exports and runtime behavior, and keep resulting modules within 350 lines. Other changes must be mechanical and behavior-preserving; if not, record separately for human review and do not fold into this burn-down.
- Files: `app/admin/page.tsx`, `app/api/admin/users/[id]/route.ts`, `app/api/admin/users/route.ts`, `app/api/cron/import-cancellations/route.ts`, `app/api/cron/import-holds/route.ts`, `app/api/cron/import-intros/route.ts`, `app/api/cron/keep-alive/route.ts`, `app/api/cron/mark-unsigned-intros/route.ts`, `app/api/members/import/route.ts`, `app/api/profile/delete/route.ts`; extraction files may be created only in these exact source-specific paths: `app/admin/page/**`.
- Depends-on: T01, T02.
- Owner: security/server-route specialist.
- Pitfalls (copy verbatim into each implementer/reviewer brief): Accidental changes to authorization or tenant boundaries; changed database query filters, error handling, or write ordering; unhandled/reordered async effects and UI event promises; changed CSV parsing, import rollback, or payroll calculations; changed date/time-zone behavior; changed default exports, route response shapes, or component props; tests weakened to accommodate implementation; adding `any`, non-null assertions, or ESLint suppressions instead of fixing causes. Any extraction must also preserve inferred exported types and test fixture semantics.
- Reviewers: security/auth, server-route, database, and test reviewer.

### T06 — Payroll UI and page

- Description: Resolve only baseline warnings in this scope. For `quality/max-lines`, make cohesive extractions/moves, preserve exports and runtime behavior, and keep resulting modules within 350 lines. Other changes must be mechanical and behavior-preserving; if not, record separately for human review and do not fold into this burn-down.
- Files: `app/components/payroll/EditableHoursCell.tsx`, `app/components/payroll/ExportTab.tsx`, `app/components/payroll/FormatConfigurationModal.tsx`, `app/components/payroll/HoursForm.tsx`, `app/components/payroll/ImportTab.tsx`, `app/components/payroll/MigrationDialog.tsx`, `app/components/payroll/PayrollTable.tsx`, `app/components/payroll/PeriodCreateModal.tsx`, `app/components/payroll/PeriodHoursForm.tsx`, `app/components/payroll/StaffForm.tsx`, `app/components/payroll/TemplateImportModal.tsx`, `app/payroll/page.tsx`; extraction files may be created only in these exact source-specific paths: `app/components/payroll/FormatConfigurationModal/**`, `app/components/payroll/ImportTab/**`, `app/components/payroll/MigrationDialog/**`, `app/components/payroll/TemplateImportModal/**`, `app/payroll/page/**`.
- Depends-on: T02, T04.
- Owner: React/payroll specialist.
- Pitfalls (copy verbatim into each implementer/reviewer brief): Accidental changes to authorization or tenant boundaries; changed database query filters, error handling, or write ordering; unhandled/reordered async effects and UI event promises; changed CSV parsing, import rollback, or payroll calculations; changed date/time-zone behavior; changed default exports, route response shapes, or component props; tests weakened to accommodate implementation; adding `any`, non-null assertions, or ESLint suppressions instead of fixing causes. Any extraction must also preserve inferred exported types and test fixture semantics.
- Reviewers: payroll/business-calculation, React, TypeScript, and test reviewer.

### T07 — Gym tabs, forms, and dialogs

- Description: Resolve only baseline warnings in this scope. For `quality/max-lines`, make cohesive extractions/moves, preserve exports and runtime behavior, and keep resulting modules within 350 lines. Other changes must be mechanical and behavior-preserving; if not, record separately for human review and do not fold into this burn-down.
- Files: `app/components/tabs/CancellationsTab.tsx`, `app/components/tabs/ClassResolutionPopover.tsx`, `app/components/tabs/FollowUpsTab.tsx`, `app/components/tabs/HoldsTab.tsx`, `app/components/tabs/InsightCard.tsx`, `app/components/tabs/InsightsTab.tsx`, `app/components/tabs/IntrosTab.tsx`, `app/components/tabs/MembersTab.tsx`, `app/components/tabs/OverviewTab.tsx`, `app/components/tabs/QuickSignupModal.tsx`, `app/components/tabs/SignupsTab.tsx`, `app/components/tabs/forms/CancellationForm.tsx`, `app/components/tabs/forms/HoldForm.tsx`, `app/components/tabs/forms/IntroForm.tsx`, `app/components/tabs/forms/SignupForm.tsx`, `app/components/tabs/intros/IntroDialogs.tsx`, `app/components/tabs/intros/IntroImportPreview.tsx`, `app/components/tabs/intros/introStatusColumns.tsx`, `app/components/tabs/members/MemberJourneyPanel.tsx`, `app/components/tabs/modals/CancellationModals.tsx`, `app/components/tabs/modals/DefaultFiltersPanel.tsx`, `app/components/tabs/modals/FollowUpModal.tsx`, `app/components/tabs/modals/HoldModals.tsx`, `app/components/tabs/modals/NotesManagerModal.tsx`, `app/components/tabs/modals/SettingsModal.tsx`, `app/components/tabs/modals/SignupModals.tsx`, `app/components/tabs/modals/__tests__/NotesManagerModal.test.tsx`, `app/components/tabs/overview/OverviewStaffPerformance.tsx`; extraction files may be created only in these exact source-specific paths: `app/components/tabs/CancellationsTab/**`, `app/components/tabs/FollowUpsTab/**`, `app/components/tabs/HoldsTab/**`, `app/components/tabs/InsightsTab/**`, `app/components/tabs/SignupsTab/**`, `app/components/tabs/forms/IntroForm/**`, `app/components/tabs/modals/NotesManagerModal/**`, `app/components/tabs/modals/SettingsModal/**`.
- Depends-on: T02, T04.
- Owner: React/membership-domain specialist.
- Pitfalls (copy verbatim into each implementer/reviewer brief): Accidental changes to authorization or tenant boundaries; changed database query filters, error handling, or write ordering; unhandled/reordered async effects and UI event promises; changed CSV parsing, import rollback, or payroll calculations; changed date/time-zone behavior; changed default exports, route response shapes, or component props; tests weakened to accommodate implementation; adding `any`, non-null assertions, or ESLint suppressions instead of fixing causes. Any extraction must also preserve inferred exported types and test fixture semantics.
- Reviewers: membership-domain, React, accessibility, and test reviewer.

### T08 — Shared layout, providers, and UI

- Description: Resolve only baseline warnings in this scope. For `quality/max-lines`, make cohesive extractions/moves, preserve exports and runtime behavior, and keep resulting modules within 350 lines. Other changes must be mechanical and behavior-preserving; if not, record separately for human review and do not fold into this burn-down.
- Files: `app/components/layout/Header.tsx`, `app/components/layout/ProfileSection.tsx`, `app/components/layout/__tests__/ProfileSection.test.tsx`, `app/components/providers/AuthProvider.tsx`, `app/components/ui/CopyButton.tsx`, `app/components/ui/FollowUpCheckButton.tsx`.
- Depends-on: T04.
- Owner: React/accessibility specialist.
- Pitfalls (copy verbatim into each implementer/reviewer brief): Accidental changes to authorization or tenant boundaries; changed database query filters, error handling, or write ordering; unhandled/reordered async effects and UI event promises; changed CSV parsing, import rollback, or payroll calculations; changed date/time-zone behavior; changed default exports, route response shapes, or component props; tests weakened to accommodate implementation; adding `any`, non-null assertions, or ESLint suppressions instead of fixing causes. Any extraction must also preserve inferred exported types and test fixture semantics.
- Reviewers: React/accessibility and test reviewer.

### T09 — Profile and authentication pages

- Description: Resolve only baseline warnings in this scope. For `quality/max-lines`, make cohesive extractions/moves, preserve exports and runtime behavior, and keep resulting modules within 350 lines. Other changes must be mechanical and behavior-preserving; if not, record separately for human review and do not fold into this burn-down.
- Files: `app/login/page.tsx`, `app/profile/__tests__/page.test.tsx`, `app/profile/page.tsx`, `app/reset-password/page.tsx`; extraction files may be created only in these exact source-specific paths: `app/profile/__tests__/page.test/**`, `app/profile/page/**`.
- Depends-on: T01, T04.
- Owner: auth/security + React specialist.
- Pitfalls (copy verbatim into each implementer/reviewer brief): Accidental changes to authorization or tenant boundaries; changed database query filters, error handling, or write ordering; unhandled/reordered async effects and UI event promises; changed CSV parsing, import rollback, or payroll calculations; changed date/time-zone behavior; changed default exports, route response shapes, or component props; tests weakened to accommodate implementation; adding `any`, non-null assertions, or ESLint suppressions instead of fixing causes. Any extraction must also preserve inferred exported types and test fixture semantics.
- Reviewers: auth/security, React, and test reviewer.

## 4. Pitfalls copied verbatim into every task brief

Accidental changes to authorization or tenant boundaries; changed database query filters, error handling, or write ordering; unhandled/reordered async effects and UI event promises; changed CSV parsing, import rollback, or payroll calculations; changed date/time-zone behavior; changed default exports, route response shapes, or component props; tests weakened to accommodate implementation; adding `any`, non-null assertions, or ESLint suppressions instead of fixing causes. Any extraction must also preserve inferred exported types and test fixture semantics.

## 5. Warning counts by rule

| Rule | Warnings | Files |
|---|---:|---:|
| `@typescript-eslint/no-misused-promises` | 106 | 37 |
| `@typescript-eslint/no-unsafe-assignment` | 95 | 31 |
| `quality/no-direct-console` | 81 | 30 |
| `@typescript-eslint/no-unsafe-return` | 57 | 21 |
| `max-statements` | 51 | 33 |
| `complexity` | 37 | 29 |
| `@typescript-eslint/no-floating-promises` | 37 | 31 |
| `max-lines-per-function` | 35 | 35 |
| `quality/max-lines` | 25 | 25 |
| `@typescript-eslint/no-non-null-assertion` | 21 | 4 |
| `@typescript-eslint/no-unsafe-argument` | 19 | 15 |
| `@typescript-eslint/no-unsafe-member-access` | 19 | 6 |
| `quality/no-direct-data-access` | 12 | 12 |
| `import-x/no-restricted-paths` | 12 | 12 |
| `max-depth` | 11 | 3 |
| `@typescript-eslint/no-explicit-any` | 11 | 6 |
| `@typescript-eslint/unbound-method` | 8 | 4 |
| `@typescript-eslint/no-unsafe-call` | 7 | 4 |
| `max-nested-callbacks` | 4 | 2 |
| `@typescript-eslint/require-await` | 3 | 3 |
| `@typescript-eslint/no-unused-vars` | 2 | 2 |
| `@typescript-eslint/no-require-imports` | 2 | 2 |
| `@typescript-eslint/return-await` | 2 | 1 |
| `@typescript-eslint/no-extraneous-class` | 1 | 1 |
| `@typescript-eslint/restrict-template-expressions` | 1 | 1 |

## 6. Highest-risk files: `quality/max-lines`

| File | Baseline warnings for this rule |
|---|---:|
| `__tests__/lib/services/import.service.test.ts` | 1 |
| `app/admin/page.tsx` | 1 |
| `app/components/payroll/FormatConfigurationModal.tsx` | 1 |
| `app/components/payroll/ImportTab.tsx` | 1 |
| `app/components/payroll/MigrationDialog.tsx` | 1 |
| `app/components/payroll/TemplateImportModal.tsx` | 1 |
| `app/components/tabs/CancellationsTab.tsx` | 1 |
| `app/components/tabs/FollowUpsTab.tsx` | 1 |
| `app/components/tabs/HoldsTab.tsx` | 1 |
| `app/components/tabs/InsightsTab.tsx` | 1 |
| `app/components/tabs/SignupsTab.tsx` | 1 |
| `app/components/tabs/forms/IntroForm.tsx` | 1 |
| `app/components/tabs/modals/NotesManagerModal.tsx` | 1 |
| `app/components/tabs/modals/SettingsModal.tsx` | 1 |
| `app/lib/csv.ts` | 1 |
| `app/lib/insights/__tests__/rules.test.ts` | 1 |
| `app/lib/insights/rules.ts` | 1 |
| `app/lib/services/hours.service.ts` | 1 |
| `app/lib/services/import.service.ts` | 1 |
| `app/lib/services/staff.service.ts` | 1 |
| `app/lib/supabase/__tests__/profiles.test.ts` | 1 |
| `app/lib/supabase/intros.ts` | 1 |
| `app/payroll/page.tsx` | 1 |
| `app/profile/__tests__/page.test.tsx` | 1 |
| `app/profile/page.tsx` | 1 |

## 7. Full file-by-file baseline

| File | Total warnings | Rule breakdown |
|---|---:|---|
| `__tests__/lib/services/import.service.test.ts` | 1 | quality/max-lines=1 |
| `app/admin/page.tsx` | 11 | quality/max-lines=1, max-lines-per-function=1, max-statements=2, complexity=1, quality/no-direct-console=2, @typescript-eslint/no-floating-promises=1, @typescript-eslint/no-misused-promises=3 |
| `app/api/admin/users/[id]/route.ts` | 2 | quality/no-direct-console=2 |
| `app/api/admin/users/route.ts` | 2 | quality/no-direct-console=2 |
| `app/api/cron/import-cancellations/route.ts` | 9 | quality/no-direct-data-access=1, import-x/no-restricted-paths=1, complexity=2, max-statements=1, max-depth=3, @typescript-eslint/no-unsafe-argument=1 |
| `app/api/cron/import-holds/route.ts` | 3 | quality/no-direct-data-access=1, import-x/no-restricted-paths=1, max-statements=1 |
| `app/api/cron/import-intros/route.ts` | 16 | quality/no-direct-data-access=1, import-x/no-restricted-paths=1, max-lines-per-function=1, max-statements=1, complexity=1, @typescript-eslint/no-unsafe-assignment=2, max-depth=6, @typescript-eslint/no-unsafe-argument=2, @typescript-eslint/no-unused-vars=1 |
| `app/api/cron/keep-alive/route.ts` | 4 | quality/no-direct-data-access=1, import-x/no-restricted-paths=1, quality/no-direct-console=2 |
| `app/api/cron/mark-unsigned-intros/route.ts` | 6 | quality/no-direct-data-access=1, import-x/no-restricted-paths=1, @typescript-eslint/no-unsafe-assignment=2, quality/no-direct-console=2 |
| `app/api/members/import/route.ts` | 4 | max-statements=1, complexity=1, @typescript-eslint/no-unsafe-argument=2 |
| `app/api/profile/delete/route.ts` | 5 | quality/no-direct-data-access=1, import-x/no-restricted-paths=1, quality/no-direct-console=3 |
| `app/components/layout/Header.tsx` | 1 | @typescript-eslint/no-misused-promises=1 |
| `app/components/layout/ProfileSection.tsx` | 2 | quality/no-direct-console=1, @typescript-eslint/no-floating-promises=1 |
| `app/components/layout/__tests__/ProfileSection.test.tsx` | 2 | @typescript-eslint/no-unsafe-assignment=1, @typescript-eslint/no-explicit-any=1 |
| `app/components/payroll/EditableHoursCell.tsx` | 3 | @typescript-eslint/no-unused-vars=1, @typescript-eslint/no-floating-promises=2 |
| `app/components/payroll/ExportTab.tsx` | 5 | max-lines-per-function=1, complexity=1, @typescript-eslint/no-floating-promises=2, @typescript-eslint/no-misused-promises=1 |
| `app/components/payroll/FormatConfigurationModal.tsx` | 7 | quality/max-lines=1, max-lines-per-function=1, max-statements=2, @typescript-eslint/no-floating-promises=1, @typescript-eslint/no-misused-promises=2 |
| `app/components/payroll/HoursForm.tsx` | 2 | max-lines-per-function=1, complexity=1 |
| `app/components/payroll/ImportTab.tsx` | 5 | quality/max-lines=1, max-lines-per-function=1, complexity=1, @typescript-eslint/no-misused-promises=2 |
| `app/components/payroll/MigrationDialog.tsx` | 7 | quality/max-lines=1, max-lines-per-function=1, quality/no-direct-console=2, @typescript-eslint/no-floating-promises=1, @typescript-eslint/no-misused-promises=2 |
| `app/components/payroll/PayrollTable.tsx` | 1 | max-lines-per-function=1 |
| `app/components/payroll/PeriodCreateModal.tsx` | 1 | @typescript-eslint/no-misused-promises=1 |
| `app/components/payroll/PeriodHoursForm.tsx` | 1 | max-lines-per-function=1 |
| `app/components/payroll/StaffForm.tsx` | 1 | complexity=1 |
| `app/components/payroll/TemplateImportModal.tsx` | 6 | quality/max-lines=1, max-lines-per-function=1, max-statements=1, complexity=1, @typescript-eslint/no-misused-promises=2 |
| `app/components/providers/AuthProvider.tsx` | 4 | quality/no-direct-console=2, @typescript-eslint/no-floating-promises=2 |
| `app/components/tabs/CancellationsTab.tsx` | 18 | quality/max-lines=1, quality/no-direct-data-access=1, import-x/no-restricted-paths=1, max-lines-per-function=1, max-statements=3, quality/no-direct-console=3, @typescript-eslint/no-unsafe-return=1, @typescript-eslint/no-unsafe-argument=1, @typescript-eslint/no-unsafe-assignment=1, complexity=1, @typescript-eslint/no-misused-promises=4 |
| `app/components/tabs/ClassResolutionPopover.tsx` | 13 | quality/no-direct-data-access=1, import-x/no-restricted-paths=1, max-lines-per-function=1, @typescript-eslint/no-unsafe-return=1, @typescript-eslint/no-unsafe-assignment=2, @typescript-eslint/no-unsafe-call=1, @typescript-eslint/no-unsafe-member-access=1, max-statements=1, @typescript-eslint/no-misused-promises=4 |
| `app/components/tabs/FollowUpsTab.tsx` | 8 | quality/max-lines=1, max-lines-per-function=1, @typescript-eslint/no-floating-promises=2, @typescript-eslint/no-misused-promises=4 |
| `app/components/tabs/HoldsTab.tsx` | 16 | quality/max-lines=1, quality/no-direct-data-access=1, import-x/no-restricted-paths=1, max-lines-per-function=1, max-statements=2, quality/no-direct-console=3, @typescript-eslint/no-unsafe-return=1, @typescript-eslint/no-unsafe-argument=1, @typescript-eslint/no-unsafe-assignment=1, @typescript-eslint/no-misused-promises=4 |
| `app/components/tabs/InsightCard.tsx` | 1 | complexity=1 |
| `app/components/tabs/InsightsTab.tsx` | 6 | quality/max-lines=1, max-lines-per-function=1, max-statements=1, max-nested-callbacks=1, @typescript-eslint/no-misused-promises=2 |
| `app/components/tabs/IntrosTab.tsx` | 7 | max-lines-per-function=1, max-statements=2, quality/no-direct-console=1, @typescript-eslint/no-misused-promises=3 |
| `app/components/tabs/MembersTab.tsx` | 9 | max-lines-per-function=1, max-statements=1, @typescript-eslint/no-unsafe-assignment=1, @typescript-eslint/no-unsafe-argument=1, @typescript-eslint/no-unsafe-member-access=3, @typescript-eslint/no-misused-promises=2 |
| `app/components/tabs/OverviewTab.tsx` | 2 | max-statements=1, @typescript-eslint/no-misused-promises=1 |
| `app/components/tabs/QuickSignupModal.tsx` | 4 | quality/no-direct-data-access=1, import-x/no-restricted-paths=1, max-lines-per-function=1, @typescript-eslint/no-misused-promises=1 |
| `app/components/tabs/SignupsTab.tsx` | 18 | quality/max-lines=1, quality/no-direct-data-access=1, import-x/no-restricted-paths=1, max-lines-per-function=1, max-statements=3, quality/no-direct-console=3, @typescript-eslint/no-unsafe-return=1, @typescript-eslint/no-unsafe-argument=1, @typescript-eslint/no-unsafe-assignment=1, complexity=1, @typescript-eslint/no-misused-promises=4 |
| `app/components/tabs/forms/CancellationForm.tsx` | 5 | @typescript-eslint/no-unsafe-assignment=4, max-lines-per-function=1 |
| `app/components/tabs/forms/HoldForm.tsx` | 2 | max-lines-per-function=1, @typescript-eslint/no-misused-promises=1 |
| `app/components/tabs/forms/IntroForm.tsx` | 5 | quality/max-lines=1, max-lines-per-function=1, complexity=1, max-statements=1, @typescript-eslint/no-misused-promises=1 |
| `app/components/tabs/forms/SignupForm.tsx` | 2 | max-lines-per-function=1, @typescript-eslint/no-misused-promises=1 |
| `app/components/tabs/intros/IntroDialogs.tsx` | 4 | @typescript-eslint/no-floating-promises=1, @typescript-eslint/no-misused-promises=3 |
| `app/components/tabs/intros/IntroImportPreview.tsx` | 1 | @typescript-eslint/no-misused-promises=1 |
| `app/components/tabs/intros/introStatusColumns.tsx` | 4 | @typescript-eslint/no-misused-promises=4 |
| `app/components/tabs/members/MemberJourneyPanel.tsx` | 1 | @typescript-eslint/no-floating-promises=1 |
| `app/components/tabs/modals/CancellationModals.tsx` | 12 | max-lines-per-function=1, quality/no-direct-console=3, @typescript-eslint/no-misused-promises=7, @typescript-eslint/no-floating-promises=1 |
| `app/components/tabs/modals/DefaultFiltersPanel.tsx` | 1 | @typescript-eslint/no-misused-promises=1 |
| `app/components/tabs/modals/FollowUpModal.tsx` | 1 | @typescript-eslint/no-misused-promises=1 |
| `app/components/tabs/modals/HoldModals.tsx` | 10 | max-lines-per-function=1, quality/no-direct-console=3, @typescript-eslint/no-misused-promises=5, @typescript-eslint/no-floating-promises=1 |
| `app/components/tabs/modals/NotesManagerModal.tsx` | 11 | quality/max-lines=1, max-lines-per-function=1, max-statements=1, complexity=1, quality/no-direct-console=1, @typescript-eslint/no-misused-promises=6 |
| `app/components/tabs/modals/SettingsModal.tsx` | 24 | quality/max-lines=1, quality/no-direct-data-access=1, import-x/no-restricted-paths=1, max-lines-per-function=1, max-statements=3, complexity=1, @typescript-eslint/no-unsafe-assignment=2, @typescript-eslint/no-unsafe-argument=2, @typescript-eslint/no-floating-promises=1, @typescript-eslint/no-misused-promises=11 |
| `app/components/tabs/modals/SignupModals.tsx` | 10 | max-lines-per-function=1, quality/no-direct-console=3, @typescript-eslint/no-misused-promises=5, @typescript-eslint/no-floating-promises=1 |
| `app/components/tabs/modals/__tests__/NotesManagerModal.test.tsx` | 1 | @typescript-eslint/no-non-null-assertion=1 |
| `app/components/tabs/overview/OverviewStaffPerformance.tsx` | 2 | @typescript-eslint/no-unsafe-assignment=1, @typescript-eslint/no-unsafe-member-access=1 |
| `app/components/ui/CopyButton.tsx` | 1 | @typescript-eslint/no-misused-promises=1 |
| `app/components/ui/FollowUpCheckButton.tsx` | 11 | max-lines-per-function=1, max-statements=1, complexity=1, quality/no-direct-console=2, @typescript-eslint/no-floating-promises=2, @typescript-eslint/no-misused-promises=4 |
| `app/hooks/useAnalyticsData.ts` | 1 | @typescript-eslint/no-floating-promises=1 |
| `app/hooks/useCancellations.ts` | 1 | @typescript-eslint/no-floating-promises=1 |
| `app/hooks/useDefaultFilters.ts` | 2 | @typescript-eslint/no-floating-promises=2 |
| `app/hooks/useDismissedInsights.ts` | 9 | quality/no-direct-console=6, max-nested-callbacks=3 |
| `app/hooks/useFollowUps.ts` | 2 | max-lines-per-function=1, @typescript-eslint/no-floating-promises=1 |
| `app/hooks/useFormerMembers.ts` | 2 | quality/no-direct-console=1, @typescript-eslint/no-floating-promises=1 |
| `app/hooks/useHolds.ts` | 1 | @typescript-eslint/no-floating-promises=1 |
| `app/hooks/useImportUndo.ts` | 1 | @typescript-eslint/no-unsafe-assignment=1 |
| `app/hooks/useIntroCsvImport.ts` | 6 | max-statements=1, quality/no-direct-console=2, @typescript-eslint/no-unsafe-return=1, @typescript-eslint/no-unsafe-argument=1, @typescript-eslint/no-unsafe-assignment=1 |
| `app/hooks/useIntroListView.ts` | 1 | complexity=1 |
| `app/hooks/useIntros.ts` | 2 | @typescript-eslint/no-unsafe-assignment=1, @typescript-eslint/no-floating-promises=1 |
| `app/hooks/useMembers.ts` | 1 | @typescript-eslint/no-floating-promises=1 |
| `app/hooks/usePayrollPeriod.ts` | 1 | @typescript-eslint/no-floating-promises=1 |
| `app/hooks/usePayrollStaff.ts` | 1 | @typescript-eslint/no-floating-promises=1 |
| `app/hooks/usePerformance.ts` | 3 | @typescript-eslint/no-unsafe-return=1, quality/no-direct-console=2 |
| `app/hooks/useRevenueSetting.ts` | 1 | @typescript-eslint/no-floating-promises=1 |
| `app/hooks/useSignups.ts` | 2 | @typescript-eslint/no-unsafe-argument=1, @typescript-eslint/no-floating-promises=1 |
| `app/hooks/useStaffHours.ts` | 2 | max-lines-per-function=1, @typescript-eslint/no-floating-promises=1 |
| `app/lib/config.ts` | 3 | quality/no-direct-console=3 |
| `app/lib/csv.ts` | 15 | quality/max-lines=1, max-statements=1, quality/no-direct-console=9, complexity=4 |
| `app/lib/errorHandler.ts` | 1 | quality/no-direct-console=1 |
| `app/lib/insights/__tests__/rules.test.ts` | 1 | quality/max-lines=1 |
| `app/lib/insights/rules.ts` | 4 | quality/max-lines=1, max-statements=3 |
| `app/lib/logger.ts` | 11 | @typescript-eslint/no-floating-promises=1, @typescript-eslint/require-await=1, @typescript-eslint/no-unsafe-assignment=1, @typescript-eslint/no-unsafe-call=2, @typescript-eslint/no-unsafe-member-access=4, @typescript-eslint/no-unsafe-return=1, @typescript-eslint/no-extraneous-class=1 |
| `app/lib/members/memberRoster.ts` | 3 | max-statements=2, complexity=1 |
| `app/lib/migration/payroll-migration.ts` | 24 | quality/no-direct-console=11, max-statements=2, @typescript-eslint/no-unsafe-assignment=8, complexity=1, max-depth=2 |
| `app/lib/quick-import.ts` | 1 | max-statements=1 |
| `app/lib/services/__tests__/hours.service.test.ts` | 4 | @typescript-eslint/no-unsafe-assignment=2, @typescript-eslint/no-require-imports=1, @typescript-eslint/no-unsafe-call=1 |
| `app/lib/services/booking-parser.ts` | 1 | complexity=1 |
| `app/lib/services/cancellation-parser.ts` | 1 | complexity=1 |
| `app/lib/services/csv-format.service.ts` | 13 | @typescript-eslint/no-unsafe-assignment=13 |
| `app/lib/services/csv-template-analyzer.ts` | 1 | @typescript-eslint/restrict-template-expressions=1 |
| `app/lib/services/hours.service.ts` | 15 | quality/max-lines=1, @typescript-eslint/no-unsafe-return=8, @typescript-eslint/no-unsafe-assignment=6 |
| `app/lib/services/import.service.ts` | 7 | quality/max-lines=1, complexity=3, max-statements=2, @typescript-eslint/require-await=1 |
| `app/lib/services/member-import-parser.ts` | 1 | max-statements=1 |
| `app/lib/services/period.service.ts` | 18 | @typescript-eslint/no-unsafe-assignment=7, @typescript-eslint/no-unsafe-return=7, @typescript-eslint/return-await=2, @typescript-eslint/no-unsafe-argument=1, @typescript-eslint/no-unsafe-member-access=1 |
| `app/lib/services/staff.service.ts` | 25 | quality/max-lines=1, @typescript-eslint/no-unsafe-assignment=11, @typescript-eslint/no-unsafe-call=3, @typescript-eslint/no-unsafe-member-access=9, @typescript-eslint/no-unsafe-return=1 |
| `app/lib/supabase/__tests__/classMappings.test.ts` | 1 | @typescript-eslint/unbound-method=1 |
| `app/lib/supabase/__tests__/intros.test.ts` | 2 | @typescript-eslint/unbound-method=1, @typescript-eslint/no-unsafe-assignment=1 |
| `app/lib/supabase/__tests__/profiles.test.ts` | 8 | quality/max-lines=1, @typescript-eslint/unbound-method=5, @typescript-eslint/no-unsafe-argument=1, @typescript-eslint/no-explicit-any=1 |
| `app/lib/supabase/cancellations.ts` | 5 | @typescript-eslint/no-unsafe-return=3, @typescript-eslint/no-unsafe-assignment=2 |
| `app/lib/supabase/classMappings.ts` | 2 | quality/no-direct-console=1, @typescript-eslint/no-unsafe-return=1 |
| `app/lib/supabase/dismissedInsights.ts` | 3 | @typescript-eslint/no-unsafe-return=2, @typescript-eslint/no-unsafe-assignment=1 |
| `app/lib/supabase/holds.ts` | 5 | @typescript-eslint/no-unsafe-return=3, @typescript-eslint/no-unsafe-assignment=2 |
| `app/lib/supabase/intros.ts` | 26 | quality/max-lines=1, @typescript-eslint/no-unsafe-return=14, @typescript-eslint/no-unsafe-assignment=9, @typescript-eslint/no-unsafe-argument=2 |
| `app/lib/supabase/memberStatus.ts` | 5 | @typescript-eslint/no-unsafe-assignment=3, @typescript-eslint/no-unsafe-argument=1, @typescript-eslint/no-unsafe-return=1 |
| `app/lib/supabase/members.ts` | 2 | @typescript-eslint/no-unsafe-return=2 |
| `app/lib/supabase/preferences.ts` | 1 | quality/no-direct-console=1 |
| `app/lib/supabase/profiles.ts` | 8 | @typescript-eslint/no-unsafe-assignment=3, @typescript-eslint/no-unsafe-return=3, quality/no-direct-console=1, @typescript-eslint/no-explicit-any=1 |
| `app/lib/supabase/settings.ts` | 4 | quality/no-direct-console=3, @typescript-eslint/no-unsafe-return=1 |
| `app/lib/supabase/signups.ts` | 5 | @typescript-eslint/no-unsafe-return=3, @typescript-eslint/no-unsafe-assignment=2 |
| `app/lib/utils/__tests__/normalizePersonKey.test.ts` | 7 | @typescript-eslint/no-non-null-assertion=7 |
| `app/lib/utils/__tests__/reminderUtils.test.ts` | 11 | @typescript-eslint/no-non-null-assertion=11 |
| `app/lib/utils/csv-template-validator.ts` | 2 | max-statements=1, complexity=1 |
| `app/lib/utils/date.utils.ts` | 1 | max-statements=1 |
| `app/lib/utils/export.utils.ts` | 1 | complexity=1 |
| `app/lib/utils/reminderUtils.ts` | 2 | max-statements=1, complexity=1 |
| `app/lib/utils/search.ts` | 1 | max-statements=1 |
| `app/lib/utils/validation.utils.ts` | 1 | complexity=1 |
| `app/lib/validations.ts` | 1 | @typescript-eslint/no-explicit-any=1 |
| `app/login/page.tsx` | 2 | max-lines-per-function=1, @typescript-eslint/no-misused-promises=1 |
| `app/payroll/page.tsx` | 12 | quality/max-lines=1, max-lines-per-function=1, max-statements=2, complexity=2, @typescript-eslint/no-misused-promises=6 |
| `app/profile/__tests__/page.test.tsx` | 4 | quality/max-lines=1, @typescript-eslint/no-unsafe-assignment=1, @typescript-eslint/no-explicit-any=1, @typescript-eslint/require-await=1 |
| `app/profile/page.tsx` | 15 | quality/max-lines=1, max-lines-per-function=1, max-statements=3, complexity=2, @typescript-eslint/no-unsafe-assignment=2, @typescript-eslint/no-unsafe-argument=1, @typescript-eslint/unbound-method=1, @typescript-eslint/no-floating-promises=1, @typescript-eslint/no-misused-promises=3 |
| `app/reset-password/page.tsx` | 3 | max-lines-per-function=1, @typescript-eslint/no-floating-promises=1, @typescript-eslint/no-misused-promises=1 |
| `app/store/__tests__/useSettingsStore.test.ts` | 1 | @typescript-eslint/no-unsafe-return=1 |
| `app/types/index.ts` | 6 | @typescript-eslint/no-explicit-any=6 |
| `jest.config.js` | 1 | @typescript-eslint/no-require-imports=1 |
| `scripts/retroactive-sync.ts` | 2 | @typescript-eslint/no-non-null-assertion=2 |

## 8. Reviewer sign-off requirements

Each task receives its named domain reviewer(s), language/framework reviewer, and test reviewer. Security/auth/database reviewers sign off on T01, T05, and T09. Payroll-calculation reviewers sign off on T06. Membership-domain reviewers sign off on T07. Before final completion, a full-diff pass by TypeScript, React, database/security, payroll, and test reviewers is required at normal code-review rigor.
