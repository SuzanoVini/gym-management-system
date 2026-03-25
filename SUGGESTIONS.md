# Insights Overhaul — Suggestions & Known Issues Report
Generated: 2026-03-25

## Summary

The `feature/insights-overhaul` branch implements:
- 4 bug fixes (BF-1 through BF-4)
- Removed 3 deprecated insights (staff-outperformer, staff-underperformer, class-performance-gap)
- Added `moving/relocation` cancellation reason case
- Added 6 new insights (NS-1 through NS-6)
- Full dismiss/snooze/done system with Supabase persistence, optimistic updates, toast+undo, and hash-based resurfacing
- `InsightCard` component, `useDismissedInsights` hook, `dismissedInsights` Supabase lib
- Supabase migration for `dismissed_insights` table with RLS

---

## Pre-Existing Jest Test Failures (not caused by this PR)

These 11 failures existed before this branch and are unrelated to the insights feature:

### Non-e2e Failures (3 test suites)

| Suite | Failures | Notes |
|-------|----------|-------|
| `__tests__/lib/validations.test.ts` | Multiple | Validation edge cases |
| `__tests__/lib/services/import.service.test.ts` | Multiple | Import service logic |
| `app/profile/__tests__/page.test.tsx` | Multiple | Profile page UI interactions |

**Recommendation:** Address these in a separate PR; they are unrelated to insights.

### e2e Specs Picked Up by Jest (10 suites)

Jest has no `testPathIgnorePatterns` for the `e2e/` directory, so all 10 Playwright spec files
are collected and fail because `@playwright/test` imports are not Jest-compatible.

**Fix:** Add to `jest.config.js`:
```js
testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/'],
```

---

## Playwright E2E Suite

The 10 baseline smoke tests (committed in `e2e/*.spec.ts`) require:
1. A running dev server (`npm run dev`)
2. Credentials in `.env.test.local` (`TEST_EMAIL`, `TEST_PASSWORD`)
3. `npm run e2e` (or `npx playwright test`)

**To run locally:**
```bash
cp .env.local .env.test.local  # add TEST_EMAIL and TEST_PASSWORD
npm run dev &
npm run e2e
```

---

## Suggestions for Follow-Up

### High Priority
1. **Apply the Jest e2e ignore fix** — one line in `jest.config.js` cleans up the test output significantly.

2. **Run dismissed_insights migration in Supabase** — the new table must be applied before the dismiss feature is usable in production. File: `supabase/migrations/20260325000000_dismissed_insights.sql`

3. **Expose `allData` hold context** — `useAnalyticsData` now returns `allData` and `InsightsTab` passes `allData.holds` as `rawHolds` to `useInsights`. The NS-3 (hold return rate) insight compares expired holds against the signup list by member name — name-matching is fuzzy. Consider adding a `member_id` foreign key to holds in a future migration for exact matching.

### Medium Priority
4. **Name-matching in NS-3** — hold return rate detection matches `hold.name.toLowerCase()` against `signup.name.toLowerCase()`. This will miss nicknames, name changes, or typos. A database-level member ID would be more reliable.

5. **NS-1 momentum insight requires 60+ days of data** — if the filtered date range is less than 60 days, the prior-period signals will be empty and NS-1 won't fire. Consider showing it only when the date range is ≥ 60 days, or switching to a different signal.

6. **Age group data completeness** — NS-2 only fires when `cancellation.age_group` is populated. If staff aren't recording age group, this insight won't appear. Consider making age group a required field on the cancellation form.

7. **`insightDataHash` is a simple DJB2-style hash** — collisions are theoretically possible but extremely unlikely for the insight content sizes involved. Acceptable for this use case.

### Low Priority
8. **Dismiss toast stacks** — if a user quickly dismisses multiple insights, toasts stack vertically. Consider limiting to 3 visible at once and queuing the rest.

9. **Snoozed insights aren't filtered from priority counts** — the priority summary cards (Critical/High/Medium) count all visible insights. Snoozed insights that are temporarily hidden still affect these counts since they're counted from `visibleInsights`. This is intentional (they're still active issues) but could be confusing.

10. **`useDismissedInsights` doesn't handle Supabase auth errors gracefully** — if the user is not authenticated (e.g., token expired), `fetchDismissedInsights` will return an empty array silently. The dismiss actions will also fail silently (console.error only). Consider showing a user-facing error or reconnecting.

---

## E2E Smoke Test Review — Verdict: PASS_WITH_CONCERNS

Reviewed by code-reviewer agent. Tests are well-structured overall — helpers are clean, no `waitForTimeout`, proper async/await, credentials guarded. Issues below.

### Critical

- **`navigation.spec.ts`**: `.app-shell` and `aside.app-sidebar` CSS class selectors are fragile — prefer `page.getByRole('complementary')` for the sidebar aside element.
- **`overview.spec.ts`**: `main .bg-white` may not match the actual DOM if `section-container` doesn't compile to a literal `bg-white` token. Test implementation detail rather than semantics.
- **`insights.spec.ts`**: Test named "shows either insights or empty state" only asserts the always-present priority cards. Misleading name; fix by renaming or expanding the assertion.

### Important

- **`helpers.ts`**: `waitForLoadState('networkidle')` is fragile when Supabase realtime subscriptions are active. Prefer `waitForLoadState('domcontentloaded')` + a specific visible element assertion.
- **`admin.spec.ts`**: No guard for non-admin test credentials. If `TEST_EMAIL` is not an admin, the page may redirect or show an empty state — the test will fail without a clear diagnostic. Document that the test credential must be an admin user.
- **`profile.spec.ts`**: Same `networkidle` concern as helpers.ts.

### Minor

- **`cancellations.spec.ts`, `holds.spec.ts`**: No heading assertion — only structural check. Add heading assertions for better diagnostics.
- **`intros.spec.ts`**: `getByRole('button', { name: /add intro/i })` — verify button label matches source exactly.
- **`playwright.config.ts`**: No `webServer` block. Tests silently fail if dev server is not running. Add `webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true }`.
- **`navigation.spec.ts`**: Eight separate `beforeEach` logins for eight tab-visibility tests. Could use shared `storageState` for a ~8x speedup.
