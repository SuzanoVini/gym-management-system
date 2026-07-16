# Software Design Document

## GB Kitsilano Gym Operations & Management System

**Version:** 1.0
**Date:** 2026-07-15

---

## 1. Architecture Overview

The system is a Next.js 15 (App Router) application backed by Supabase (PostgreSQL + Auth + Realtime), deployed on Vercel. It has four route surfaces:

| Route | Purpose |
|-------|---------|
| `/` | The operations dashboard: a tabbed single-page workspace (Overview, Insights, Intros, Follow Ups, Signups, Cancellations, Holds, Members) |
| `/payroll` | Payroll periods, staff, hours, and export (owner-only) |
| `/admin` | User and role management (owner-only) |
| `/profile`, `/login`, `/reset-password` | Account surfaces |
| `/api/cron/*`, `/api/members/import`, `/api/admin/*`, `/api/profile/*` | Server endpoints for scheduled imports and privileged operations |

### 1.1 Data Flow

Interactive reads and writes go directly from client components to Supabase via the browser client, authorized by Row-Level Security in the signed-in user's context. Each record type has:

- a query module in `app/lib/supabase/` (fetch, create, update, delete, realtime subscription),
- a hook in `app/hooks/` that owns loading/error state, Zod validation, cross-record side effects, and realtime refresh,
- a tab component in `app/components/tabs/` that renders the list, filters, metrics, and modals.

Scheduled imports run server-side in API routes with the service-role client (see §5.3).

### 1.2 Key Architectural Decisions

- **Tab workspace over route-per-page.** The dashboard is one page switching tabs in state (URL-synced via `?tab=`), because the workflows are cross-referential — a signup touches the intros list, a cancellation closes a hold — and staff move between them constantly. New major surfaces (payroll, admin, and the future `/asp` section) get real routes instead of new tabs.
- **Client-side filtering over server queries.** Each tab loads its record type fully (paged fetch up to 10k rows) and filters/sorts/paginates in memory. Dataset sizes (hundreds to low thousands of rows per type) make this simpler and faster than round-tripping filter state, and it keeps the year-pill/metrics logic purely derived.
- **Name-based identity.** There is no shared person ID across Zen Planner surfaces, so cross-record matching uses normalized names (`lower(trim(name))`, stored as generated `name_normalized` columns on cancellations/holds/members) and, where email is available, a name+email person key for follow-up grouping. ILIKE lookups escape SQL wildcards. This is a documented trade-off: homonyms are possible and surfaced rather than hidden (e.g., warnings instead of hard blocks on duplicates).
- **Database as the last line of defense.** Rules that must hold regardless of entry path live in the database: year derivation from dates (trigger on all four lifecycle tables), one current payroll period, one default export format, role-escalation prevention, dedup unique indexes, and RLS everywhere.
- **Settings-driven vocabularies.** Membership types, class types, staff names, and reason lists are rows in a `settings` table edited in the UI, so operational vocabulary changes never require a deploy. The one exception is `signups.membership`, which is additionally a Postgres enum; adding a membership type requires a migration (see database.md).

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Database | Supabase (PostgreSQL, RLS, Realtime) |
| Auth | Supabase Auth (owner/staff roles in `user_profiles`) |
| State | Zustand stores (filters, selection, UI, settings) |
| Validation | Zod schemas per record type |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| CSV | PapaParse |
| Email import | googleapis (Gmail API, OAuth refresh token) |
| Lint/Format | Biome (+ husky/lint-staged pre-commit) |
| Tests | Jest + Testing Library (unit), Playwright (e2e) |

## 3. Application Structure

```
app/
  page.tsx                 Tab workspace shell (auth-gated)
  payroll/ admin/ profile/ login/ reset-password/
  api/
    cron/                  Gmail importers, keep-alive, mark-unsigned-intros
    members/import/        Zen Planner roster CSV sync
    admin/users/           Role management endpoints
  components/
    tabs/                  One component per dashboard tab + forms/ + modals/
    layout/                Header, Sidebar, ProfileSection
    ui/                    Shared primitives (Table, Modal, FilterBar,
                           PaginationBar, YearFilter, toasts, ...)
    providers/             AuthProvider, SettingsProvider, ProtectedRoute
  hooks/                   One data hook per record type + analytics/insights
  lib/
    supabase/              Query modules, client, admin client, types
    services/              Email parsers, CSV import/export, payroll services
    utils/                 Date, business-day, person-key, validation helpers
    validations.ts         Zod schemas
  store/                   Zustand stores
supabase/migrations/       SQL migrations (schema, triggers, RLS, backfills)
e2e/                       Playwright specs
docs/                      SRS, SDD, database reference, test plan
```

## 4. Member Lifecycle Model

Four record types, deliberately kept as independent event logs rather than a normalized person graph:

- **intros** — trial-class bookings; carry follow-up state (`followup_1_at`, `followup_2_at`, reminder, dismissal) and child tables for notes and repeat class visits.
- **signups** — membership starts; membership type is an enum; `signup_package` is a gear-package flag that never applies to ASP.
- **cancellations** — membership ends, with reason and age group.
- **holds** — temporary pauses with start/end; status (active/upcoming/ended) is derived from dates at read time.

A person's current status is **derived, never stored**: the Members tab computes Active / On Hold / Alumni by comparing the person's latest signup date against their latest cancellation date and checking for a currently-active hold. This keeps the event logs append-only and makes status self-healing when history is corrected.

Cross-record consistency is maintained by targeted side effects, all name-matched:

- creating a signup marks the person's latest intro as signed up;
- recording a cancellation closes the person's active hold;
- creating an intro is blocked for current members;
- the intros list flags prospects who are former members.

## 5. Security Design

### 5.1 Role Model

`user_profiles.role ∈ {owner, staff}`, created automatically on signup via trigger. `is_owner()` / `is_authenticated()` helper functions back the RLS policies. A `prevent_client_role_escalation` trigger rejects role changes not made by an owner, so the role column is safe even against direct API writes.

### 5.2 RLS Implementation

Every public table has RLS enabled. Lifecycle tables are readable/writable by any authenticated user (all staff share operational data); payroll, settings management, class mappings, export formats, and app configuration are write-restricted to owners; profiles are self-scoped. Legacy tables that are no longer queried keep RLS enabled as a safety net.

### 5.3 Service-Role Boundary

The service-role key appears in exactly one construction site (`lib/supabase/admin.ts`) and is used only by endpoints that have no user context:

- the three Gmail importers, keep-alive, and mark-unsigned-intros (`/api/cron/*`), each requiring `Authorization: Bearer CRON_SECRET`;
- the members CSV sync and admin user endpoints, which run server-side after verifying the caller's session and role.

Interactive browser requests never touch the service role; they are always RLS-scoped. This boundary is intentional and should not widen: new features default to the user-context client (or, converging with the ASP system's architecture, server actions over `SECURITY DEFINER` RPCs).

## 6. Follow-Up Engine

Follow-up state lives on the intro row; the queue is computed client-side in `useFollowUps`:

1. Eligible rows: attended intros with no signed-up decision, not yet second-contacted, not dismissed for the person group.
2. Due dates: first contact due 2 business days after the intro date; second due 5 business days after the first contact (`addBusinessDays`, weekend-aware).
3. Tiering: overdue first → due today → overdue second → waiting → done; sorted by tier then date.
4. **Person grouping:** rows are grouped by a normalized name+email key. Dismissals and reminders are written best-effort to every intro in the group and interpreted group-wide on read, so a prospect with three bookings is one follow-up obligation, one reminder, one badge count.
5. The "today" boundary is state that re-arms itself with a timer at each UTC midnight, so an open browser tab rolls over without reload.

One `useFollowUps` instance is shared by the tab and the sidebar badge so actions update the badge immediately.

## 7. Import Pipeline Design

### 7.1 Gmail Importers

Each importer (bookings→intros, holds, cancellations) follows the same shape:

```
fetch matching Gmail messages → parse text body → resolve/normalize fields
→ dedupe against natural key → insert, or enrich existing row with missing
  contact fields → report {imported, enriched, skipped, errors}
```

Idempotency mechanisms, in order of preference: database unique indexes on `(name_normalized, date)` natural keys with `ignoreDuplicates` upserts (holds, cancellations); query-first dedupe plus a post-pass that collapses same-person/date/time intros keeping the richest record (bookings). Class names are translated through the `class_mappings` table; unmapped names pass through raw and surface in the UI for one-click mapping, which the importer then retroactively normalizes.

### 7.2 Scheduling

Vercel's cron (Hobby tier: two jobs) runs keep-alive and mark-unsigned-intros. The three Gmail importers are triggered by an external scheduler (cron-job.org) calling the endpoints with the bearer secret. All five endpoints reject requests without `Authorization: Bearer CRON_SECRET`.

### 7.3 Roster CSV Sync

`/api/members/import` parses Zen Planner's member export, upserts on the `name_normalized` unique key, stamps `last_sync_at`, and marks members missing from the file as `Inactive`. The UI shows the last sync time; displayed status still comes from the derived lifecycle model (§4), with the CSV status only as fallback.

## 8. Payroll Design

Bi-weekly periods (1st–15th, 16th–end) with exactly one `is_current` row (trigger-enforced). Hours are stored as itemized `time_entries` (regular / overtime / vacation / sick / mat cleaning, with an ASP flag) and aggregated into `staff_hours` per staff member per period by a database function. Mat cleaning entries add a fixed 0.25h bonus. A paste-in quick-import format (`day time [mat clean] [1.5]`) parses a period's worth of entries at once. Export renders any saved `csv_export_formats` row — column set, labels, and staff ordering are data, not code — with exactly one format flagged default (trigger-enforced); a template analyzer maps a new accountant template's headers onto known fields to bootstrap a format. Legacy localStorage payroll data from the pre-Supabase version migrates through a one-time dialog.

## 9. Insights Engine

`useInsights` computes insight cards from the already-loaded datasets each render: threshold checks (e.g., overdue follow-up backlog), trailing-average comparisons (conversion rate vs. prior months), and distribution spikes (cancellation reasons). Each card carries a stable ID; `dismissed_insights` persists per-user done/snooze/dismiss state keyed by that ID with a snooze-until timestamp. A dismissed insight whose signal recurs later re-qualifies and reappears. Insights are intentionally derived-only — no insight state feeds back into operational data.

## 10. Client State Design

Four Zustand stores, all intentionally small:

- **useFilterStore** — filter state per tab (`filtersByTab`), so filters never leak across tabs; defaults to current month/year; `clearFilters(tab)` resets one tab only.
- **useSelectionStore** — multi-select sets per tab plus the record currently being edited.
- **useUIStore** — modal open flags.
- **useSettingsStore** — the five settings vocabularies, loaded once with DB-error fallback defaults and explicit refresh after edits.

Server data stays in per-hook `useState` with realtime-subscription refresh (`useRealtimeRefresh` wraps subscribe/unsubscribe). There is no client cache layer; hooks refetch on mutation, which is acceptable at this data scale.

## 11. Date and Timezone Handling

Date-only values are ISO `YYYY-MM-DD` strings end to end. Derivations (month abbreviation, year) parse the string directly (`app/lib/utils/date.utils.ts`) instead of constructing `Date` objects, because `new Date('YYYY-MM-DD')` is UTC midnight and shifts a day in Pacific time. The database trigger `derive_year_from_date()` re-derives `year` on write for all four lifecycle tables, so client-side derivation is display-only. Business-day math and the follow-up day boundary use UTC-normalized dates. When the ASP system integrates, its DB-stored operational timezone setting becomes the shared source of truth.

## 12. Error Handling and Feedback

A singleton `errorHandler` wraps logging and user-facing toasts; hooks call `errorHandler.handle(err, context)` on failures and `notify` for outcomes. Multi-step flows that can partially fail (e.g., quick-signup: mark intro, then create signup) surface the partial state explicitly and tell the operator what to do rather than pretending atomicity. Destructive operations confirm first, and CSV imports write an undo batch (record IDs in localStorage) so the last import can be reversed in one click.

## 13. Known Trade-offs and Evolution Path

- **Client-heavy data access** predates the ASP system's server-action/RPC architecture. Existing tabs are not being retrofitted; new features and all ASP integration surfaces use the server-side pattern so the codebase converges.
- **Name-based matching** is the correct cost given no upstream person ID, but every matching site funnels through the shared normalization utilities so a future `members.id` foreign-key model can replace it in one layer.
- **Hand-edited DB types** (`lib/supabase/types.ts`) drifted from the schema once (enum values); the types file is now regenerated from the live schema (`npm run types:gen`) rather than edited.
- **The signups membership enum** duplicates the settings vocabulary in the schema. Retiring the enum in favor of the settings list (with a CHECK or FK) is a candidate migration; until then, adding a membership type is a two-step change (settings row + enum value).
