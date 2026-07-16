# Database Schema Reference

## GB Kitsilano Gym Operations & Management System

**Version:** 1.0
**Date:** 2026-07-15

---

## Overview

PostgreSQL on Supabase. All tables live in the `public` schema and have Row-Level Security enabled. Authentication is Supabase Auth; `user_profiles` extends `auth.users` with the application role. Migrations in `supabase/migrations/` are the source of truth for this document.

Conventions:

- Primary keys are `uuid` (`id`) with database-generated defaults.
- `created_at` / `updated_at` are timestamps; `updated_at` is maintained by the `set_updated_at()` trigger where present.
- Date-only values (intro dates, signup dates, hold ranges, cancellation dates) are stored as ISO `YYYY-MM-DD` text or `date` and never carry time-of-day meaning.
- `name_normalized` columns are **generated columns** — `lower(trim(name))` — used for cross-record identity and dedup keys.

## Enums

| Enum | Values |
|------|--------|
| `attendance_status` | `Yes`, `No`, `''` |
| `signup_status` | `Yes`, `No`, `''` |
| `intro_status` | `Active`, `Cancelled`, `Completed` |
| `membership_type` | `Integrity`, `Legacy`, `Special`, `ASP`, `Flex 10`, `Flex 20` |

`membership_type` values must stay in sync with the `membership_types` settings row (the UI dropdown source). Adding a membership type is therefore a two-step change: a migration (`ALTER TYPE membership_type ADD VALUE ...`) plus the settings update. Enum values cannot be removed in place.

## Member Lifecycle Tables

### intros

Trial-class bookings; the entry point of the member funnel.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| month | text | Month abbreviation, derived from `date` |
| date | text (ISO date) | Nullable — historical rows imported without dates |
| year | integer | Enforced by `derive_year_from_date()` trigger |
| time | text | Free-form class time |
| class | text | From the `class_types` settings vocabulary |
| name / email / phone | text | Contact details; email/phone nullable |
| staff | text | From the `staff_members` settings vocabulary |
| attended | attendance_status | |
| signed_up | signup_status | Set via quick-signup flow or the 14-day auto-marker |
| status | intro_status | |
| follow_up_status / last_follow_up | text / timestamp | Legacy note-tracking fields |
| followup_1_at / followup_2_at | timestamp | First/second contact timestamps |
| followup_reminder_at | timestamp | Snooze-until for the person group |
| followup_dismissed_at | timestamp | Group-wide dismissal marker |
| created_by | uuid | Set by `set_created_by()` trigger |

Children cascade on delete: `follow_up_notes`, `intro_class_history`.

### follow_up_notes

Timestamped contact notes under an intro. `intro_id` FK (cascade delete), `note`, `staff_name` (resolved from the author's profile), `created_by`.

### intro_class_history

Repeat class visits under one intro: `intro_id` FK (cascade delete), month, date, time, class, staff, attended, notes.

### signups

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| month / year | text / integer | Year trigger-derived from `membership_date` |
| name | text | |
| membership | membership_type enum | |
| membership_date | date | Signup date |
| first_payment_date | date | |
| signup_package | boolean | Gear package; always false for ASP |
| notes | text | |
| created_by | uuid | |

### cancellations

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| month / year | text / integer | Year trigger-derived from `date` |
| name | text | |
| name_normalized | text, generated | Dedup identity |
| date | date | Cancellation date (renamed from `cancellation_date`; legacy column retained) |
| reason | text | From `cancellation_reasons` settings vocabulary |
| age_group | text | (legacy `age_category` retained) |
| notes | text | |
| source | text | `manual` or `cron` |
| created_by | uuid | |

Unique index `idx_cancellations_dedup (name_normalized, date)` — the email importer's idempotency key.

### holds

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| month / year | text / integer | Year trigger-derived from `start` |
| name / name_normalized | text / generated | |
| start / end | date | `end` nullable = open-ended hold |
| reason | text | From `hold_reasons` settings vocabulary |
| fee | text | |
| hold_status | text | Set by importer; UI derives status from dates |
| source | text | `manual` or `cron` |
| created_by | uuid | |

Unique index `idx_holds_dedup (name_normalized, start)`.

### members

Roster synced from Zen Planner CSV exports.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Anchor ID for future ASP integration |
| name / name_normalized | text / generated | `name_normalized` is the upsert conflict key |
| birth_date / email / phone | | From the export |
| membership_type | text | Plan name as exported (free text, not the enum) |
| status | text | `Active` / `On Hold` / `Inactive` from the export; UI derives displayed status from lifecycle records |
| join_date | date | |
| last_sync_at | timestamp | Stamped by each sync |

## Automation & Configuration Tables

### class_mappings

Zen Planner class name → system class name (`zenplanner_name`, `system_name`). Read by the booking importer; managed in the UI when unmapped names appear.

### settings

Key/value JSON vocabulary store. Keys: `membership_types`, `class_types`, `staff_members`, `cancellation_reasons`, `hold_reasons` (values are JSON string arrays). Readable by all authenticated users; writable by owners.

### dismissed_insights

Per-user insight workflow state: `user_id`, `insight_id` (stable card ID), `action` (done/snoozed/dismissed), `snoozed_until`, `data_hash` (signal fingerprint so a recurring signal resurfaces).

### user_profiles

Extends `auth.users`: `full_name`, `avatar_url`, `role` (`owner` | `staff`). Created by the `create_user_profile()` trigger on signup. `prevent_client_role_escalation()` blocks role changes by non-owners at the database level.

## Payroll Tables

### payroll_periods

Bi-weekly periods: `period_label`, `start_date`, `end_date`, `is_current`, `is_closed`. `enforce_single_current_period()` trigger guarantees at most one current row.

### staff_members

Payroll staff registry: `employee_id`, `full_name`, `job_title`, `is_active`. (Distinct from the `staff_members` *settings vocabulary*, which feeds the intros dropdown.)

### staff_hours

Aggregated hours per staff member per period: `period_id` FK, `staff_id` FK, `regular_hours`, `overtime_hours`, `vacation_hours`, `sick_hours`, `mat_cleaning_count`, `total_hours`, `notes`. Unique on `(period_id, staff_id)`. Recomputed from time entries by `aggregate_time_entries()`.

### time_entries

Itemized entries: `staff_hours_id` FK, `entry_date`, `hours`, `entry_type` (`regular` | `overtime` | `vacation` | `mat_cleaning` | `sick`), `is_after_school_program`, `notes`, `source`.

### csv_export_formats

Saved accountant export layouts: `format_name`, `column_config` (JSON column list), `staff_order_config` (JSON ordering), `is_default`. `enforce_single_default_format()` trigger guarantees exactly one default.

### app_configuration

Owner-managed key/value JSON for payroll configuration (e.g., department/job mappings used by exports).

## Views

- **staff_hours_summary** — staff members joined with their hours for the current period.
- **department_mappings** — staff flattened with department/job mapping data from `app_configuration`, used by configurable exports.

## Legacy Tables

- **follow_ups** — superseded by the `followup_*` columns on `intros` plus `follow_up_notes`. Not queried by the application; retained with RLS enabled as a safety net.
- Legacy columns retained after renames: `cancellations.cancellation_date`, `cancellations.age_category`.

## Functions & Triggers

| Function | Kind | Purpose |
|----------|------|---------|
| `derive_year_from_date()` | trigger on intros/signups/cancellations/holds | Recomputes `year` from the row's date column on insert/update, regardless of entry path |
| `set_updated_at()` | trigger | Maintains `updated_at` |
| `set_created_by()` | trigger | Stamps the writing user |
| `create_user_profile()` | trigger on auth.users | Creates the profile row on signup |
| `prevent_client_role_escalation()` | trigger on user_profiles | Only owners may change roles |
| `enforce_single_current_period()` | trigger | One current payroll period |
| `enforce_single_default_format()` | trigger | One default export format |
| `aggregate_time_entries()` | function | Rolls time entries up into `staff_hours` |
| `mark_unsigned_intros()` | RPC (scheduled) | Marks intros older than 14 days with no decision as not signed up; returns affected count |
| `is_owner()` / `is_authenticated()` / `current_user_id()` | SQL helpers | Back the RLS policies |

## Row-Level Security Model

| Table group | authenticated (staff + owner) | owner only |
|-------------|-------------------------------|------------|
| intros, signups, cancellations, holds, follow_up_notes, intro_class_history, members | full CRUD | — |
| settings, class_mappings | read | write |
| payroll_periods, staff_members, staff_hours, time_entries, csv_export_formats, app_configuration | read | write |
| dismissed_insights | own rows | — |
| user_profiles | read all; write own (role changes owner-only via trigger) | role changes |
| storage (avatars) | public read; write own | — |

The Supabase service-role key bypasses RLS by design; the application confines it to scheduled import endpoints and session-verified admin endpoints (see SDD §5.3).

## Migration Practices

- Migrations are timestamped `YYYYMMDDHHMMSS_description.sql` and applied with `supabase db push`; dev and prod are kept at identical migration state.
- Migrations are written idempotently where possible (`IF NOT EXISTS`, `CREATE OR REPLACE`, guarded backfills) because both environments occasionally received manual fixes before this discipline existed.
- Enum changes ship in their own migration (`ALTER TYPE ... ADD VALUE` cannot run in a transaction with uses of the new value).
- Two pre-timestamp files (`add_indexes.sql`, `enable_rls.sql`) predate CLI-managed history; the CLI skips them and their objects exist in both environments from manual runs.
