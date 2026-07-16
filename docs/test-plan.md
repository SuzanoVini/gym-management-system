# Test Plan

## GB Kitsilano Gym Operations & Management System

**Version:** 1.0
**Date:** 2026-07-15

---

## Overview

Three layers, each targeting the failures it is best positioned to catch:

| Layer | Tooling | Runs | Catches |
|-------|---------|------|---------|
| Unit / component | Jest + Testing Library (jsdom) | `npm run test`, pre-release, every `npm run quality` | Parsing, date math, business rules, store logic, component contracts |
| Schema | Jest + embedded PostgreSQL (PGlite) | with the unit suite | Migration validity, enum/vocabulary drift, trigger behavior |
| End-to-end | Playwright against a real dev server | `npm run e2e` (requires `TEST_EMAIL` / `TEST_PASSWORD`) | Auth gating, navigation, full CRUD flows through the real UI and database |

A global coverage floor of 70% (branches, functions, lines, statements) is enforced in `jest.config.js`. Coverage is a tripwire, not a target: the priority order below determines where tests are actually written.

## 1. Business Logic Tests (highest priority)

Pure functions that encode gym rules — cheap to test exhaustively, expensive to get wrong silently.

### 1.1 Date Derivation
- Month/year derive from ISO date strings by string parsing, never via `new Date()` (UTC-shift regression tests: 1st-of-month, Jan 1, Dec 31).
- Business-day arithmetic skips weekends in both directions across month boundaries.

### 1.2 Follow-Up Scheduling
- First contact due 2 business days after the intro; second due 5 business days after first contact.
- Reminder active/expired boundaries at exact timestamps.

### 1.3 Person Identity
- Name normalization (trim, lowercase, whitespace collapse), name+email person keys, parent/child disambiguation (same email, different names).
- ILIKE wildcard escaping (`%`, `_`, `\`) so literal characters in names cannot broaden matches.

### 1.4 Validation Schemas
- Zod schemas per record type: required fields, date format enforcement, enum membership, length limits, empty-string/optional handling.

## 2. Import & Parsing Tests

Every parser is tested against realistic fixtures because upstream formats are third-party and undocumented:

- **Zen Planner email parsers** (bookings, holds, cancellations): field extraction, malformed-body rejection, date/time normalization.
- **CSV importers** (intros, signups, cancellations, holds, members): header variant tolerance, year-confirmation behavior, duplicate skipping.
- **Payroll quick-import**: line grammar (`day time [mat clean] [1.5]`), mat-clean bonus, overtime marker, ASP keyword categorization, per-line error reporting.
- **Members roster parser**: column mapping, normalization, inactive marking.

## 3. Schema Tests (embedded PostgreSQL)

`app/lib/supabase/__tests__/migrations-postgres.test.ts` applies every migration in order to an in-memory PostgreSQL (PGlite) with stubbed Supabase built-ins (`auth` schema, `auth.uid()`, roles), then asserts:

- all migrations apply cleanly in sequence (a migration that only ever ran against a hand-patched database fails here);
- `membership_type` enum values exactly match the `membership_types` settings vocabulary seeded in code — the drift that once broke production inserts;
- generated `name_normalized` columns and dedup unique indexes exist and reject duplicates;
- `derive_year_from_date` triggers populate `year` on all four lifecycle tables;
- single-current-period and single-default-format invariants hold under concurrent-style updates;
- RLS is enabled on every public table.

## 4. Component & Hook Tests

Rendered with mocked Supabase modules:

- Tab-level behavior contracts (e.g., Members View opens the journey panel; forms hide the package checkbox for ASP; settings store fallback/retry semantics).
- Modal flows: follow-up note creation attributes the signed-in profile name; notes manager CRUD.
- Store behavior: per-tab filter isolation, defaults, clear semantics.

## 5. End-to-End Tests (Playwright)

Specs in `e2e/` run against `npm run dev` with a real Supabase project and a dedicated test user (`TEST_EMAIL` / `TEST_PASSWORD` env vars):

- auth: login, logout, protected-route redirects, password reset entry
- navigation across all tabs and pages
- CRUD happy paths per record type (intros, signups, cancellations, holds)
- insights interactions, overview rendering, admin and profile flows

E2E is deliberately thin: happy paths and wiring, not rule permutations — those belong in layer 1 where they are three orders of magnitude cheaper.

## 6. What Is Not Automatically Tested

Known gaps, accepted and reviewed rather than hidden:

- **Gmail importer end-to-end** — requires live OAuth; parsers are unit-tested, the pipeline is verified by the importers' own `{imported, enriched, skipped, errors}` reports after deploys.
- **Payroll CSV byte-exactness** — the accountant's acceptance is the real oracle; the format editor's mapping logic is unit-tested.
- **Visual regressions** — no screenshot testing; UI changes are eyeballed on the staging deploy.

## 7. Running

```bash
npm run test            # unit + schema suites
npm run test:coverage   # with coverage report (70% floor enforced)
npm run e2e             # Playwright (needs dev server env + TEST_EMAIL/TEST_PASSWORD)
npm run quality         # lint + typecheck + unit tests, the pre-release gate
```
