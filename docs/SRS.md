# Software Requirements Specification

## GB Kitsilano Gym Operations & Management System

**Version:** 1.0
**Date:** 2026-07-15

---

## 1. Purpose

This document specifies the software requirements for the GB Kitsilano Gym Operations & Management System. The system replaces a collection of disconnected Excel and Google Sheets files with a single web application that tracks the full member lifecycle (trial classes through cancellation), automates intro-class follow-up, manages staff payroll hours, and surfaces operational insights from the underlying data.

## 2. Scope

The system is an internal operations tool for a martial arts gym. It covers:

1. Member lifecycle records: intro classes, signups, cancellations, and membership holds
2. Intro-class follow-up workflow with due dates, reminders, and per-contact notes
3. Member roster synced from Zen Planner CSV exports, with lifecycle status derived from internal records
4. Automated import of Zen Planner booking, hold, and cancellation notification emails
5. Staff payroll hours by bi-weekly period, with accountant-format CSV export
6. Auto-generated operational insights with dismiss/snooze workflow
7. Analytics overview (trends, conversion funnel, membership breakdown)
8. CSV import/export for all lifecycle record types
9. Role-based access control (owner and staff roles)

### 2.1 Out of Scope

- Payment processing or billing (handled by Zen Planner)
- Class scheduling and booking (handled by Zen Planner)
- Parent- or member-facing portal
- Marketing or public-facing website
- Mobile native application (the web app is desktop-first)
- Two-way synchronization back into Zen Planner (Zen Planner's Engage plan exposes no public API; see 3.1)
- After-school program pickup logistics (handled by the ASP Pick-Up Management System, planned for later integration)

## 3. Product Overview

The gym runs its membership operations on Zen Planner, which handles billing and class bookings but provides limited reporting and no follow-up tooling. Staff previously bridged the gap with spreadsheets. This system is that bridge, built as software: it holds the operational record types Zen Planner does not model well, derives the answers the spreadsheets could not (conversion rates, churn, net growth, follow-up status), and automates data entry where Zen Planner offers any machine-readable surface.

### 3.1 Zen Planner Boundary

Zen Planner's Engage plan has no public API. The system therefore integrates through the two surfaces that exist:

1. **Notification emails.** Zen Planner sends booking, hold, and cancellation notification emails to the gym's Gmail account. Scheduled importers read these via the Gmail API, parse them, and create or enrich records. Imports must be idempotent: re-processing the same email must not create duplicates.
2. **CSV exports.** The member roster is synced by uploading Zen Planner's member CSV export. The sync upserts by normalized name and marks members absent from the file as inactive.

All other records are entered manually by staff. This constraint is a permanent design assumption, not a temporary workaround.

## 4. User Roles

| Role | Access |
|------|--------|
| `owner` | Everything: all tabs, payroll, admin user management, settings management |
| `staff` | Member lifecycle data (intros, signups, cancellations, holds, members, follow-ups, insights, overview) |

Roles live in `user_profiles` and are enforced by Row-Level Security policies in the database, not only in the UI. Clients cannot escalate their own role (database trigger).

## 5. Functional Requirements

### 5.1 Intros (Trial Classes)

- FR-1.1: Staff can create, edit, and delete intro records with name, contact details, date, time, class, staff member, attendance, signed-up status, and lifecycle status (Active / Cancelled / Completed).
- FR-1.2: The class and staff dropdowns are populated from database-backed settings lists, editable in the UI by owners.
- FR-1.3: Creating an intro for a name that matches a current member (signed up, not since cancelled) is blocked, with the match shown while typing.
- FR-1.4: Marking an intro "Signed Up = Yes" (inline, on create, or on edit) opens a quick-signup dialog that creates the corresponding signup record, so an intro can never be marked converted without a signup existing.
- FR-1.5: Additional class visits by the same prospect are recorded as class history entries under one intro record.
- FR-1.6: Intros not marked signed up within 14 days are automatically marked "No" by a scheduled job.
- FR-1.7: CSV import supports the gym's historical spreadsheet format, previews before writing, skips duplicates, requires explicit year confirmation (source dates carry no year), and supports one-click undo of the last import batch.

### 5.2 Follow-Ups

- FR-2.1: Every attended intro without a signed-up decision enters the follow-up queue.
- FR-2.2: The first follow-up is due 2 business days after the intro; the second is due 5 business days after the first contact.
- FR-2.3: Rows are tiered by urgency (overdue first contact, due today, overdue second contact, waiting, done) and sorted accordingly.
- FR-2.4: Staff record contact attempts as timestamped notes attributed to the signed-in user's profile name.
- FR-2.5: Staff can set a snooze reminder or dismiss a prospect; both apply to the whole person (all bookings sharing the same normalized name + email), and dismissals can be undone.
- FR-2.6: The sidebar shows a live badge with the count of overdue follow-ups and due reminders.
- FR-2.7: The day boundary for due-date math rolls over at midnight without a page reload.

### 5.3 Signups

- FR-3.1: Staff can create, edit, and delete signup records with name, membership type, signup date, first payment date, sign-up package flag, and notes.
- FR-3.2: Membership types are a database-backed list (seeded: Integrity, Legacy, Special, ASP, Flex 10, Flex 20) manageable in the UI.
- FR-3.3: The sign-up package option does not apply to the ASP membership type and is hidden and forced off when ASP is selected.
- FR-3.4: Creating a signup marks the person's most recent intro as signed up.
- FR-3.5: Month and year are derived from the signup date; a database trigger enforces year consistency regardless of entry path.
- FR-3.6: Duplicate signups (same name, same date) warn before saving.

### 5.4 Cancellations and Holds

- FR-4.1: Staff can create, edit, and delete cancellation records (date, reason, age group, notes) and hold records (start, end, reason, fee).
- FR-4.2: Reason lists are database-backed settings manageable in the UI.
- FR-4.3: Recording a cancellation for a member with an active hold closes that hold.
- FR-4.4: Hold status (active / upcoming / ended) is derived from the start and end dates.
- FR-4.5: Both types support filtered CSV export and duplicate-safe CSV import with undo.
- FR-4.6: Cancelling a former intro prospect is reflected in the Intros tab (former-member indicator).

### 5.5 Members Roster

- FR-5.1: Owners can sync the roster by uploading Zen Planner's member CSV; the sync upserts by normalized name, marks missing members inactive, and records the sync time.
- FR-5.2: Each member's displayed status (Active / On Hold / Alumni) is derived from internal lifecycle records — latest signup vs. latest cancellation, and any currently active hold — not from the static CSV value.
- FR-5.3: A member detail view shows the person's full journey timeline (intros, signups, holds, cancellations) assembled by name matching.
- FR-5.4: The tab shows plan-breakdown summaries (program, age group, duration, class packs) and headline metrics (active count, net growth this month, on-hold count, retention rate).

### 5.6 Email Import Automation

- FR-6.1: Scheduled importers process Zen Planner booking, hold, and cancellation emails from Gmail into intro, hold, and cancellation records.
- FR-6.2: Booking import maps Zen Planner class names to the system's class list via a database mapping table; unmapped names surface in the UI for one-click resolution.
- FR-6.3: Imports deduplicate on natural keys (normalized name + date and, for intros, time), enrich existing records with newly available contact details rather than duplicating them, and tag records with their source (`manual` / `cron`).
- FR-6.4: Import endpoints require a bearer secret and are triggered by an external scheduler (cron-job.org); two housekeeping jobs (keep-alive, mark-unsigned-intros) run on Vercel cron.

### 5.7 Payroll

- FR-7.1: Owners manage staff records and per-period hours across bi-weekly payroll periods (1st–15th, 16th–end of month).
- FR-7.2: Hours are itemized as time entries (regular, overtime, vacation, sick, mat cleaning) and aggregated per staff member per period; mat cleaning adds a fixed 15-minute bonus.
- FR-7.3: A quick-import text format (`day time [mat clean] [1.5]`) lets owners paste a period's entries at once, with After-School-Program entries auto-categorized by keyword.
- FR-7.4: CSV export matches the accountant's expected column layout and staff ordering, configurable through a saved format editor with a template analyzer for new layouts.
- FR-7.5: Exactly one payroll period is current at a time and exactly one export format is default (database-enforced).

### 5.8 Insights

- FR-8.1: The system generates insight cards from live data (e.g., cancellation-reason spikes, conversion below trailing average, follow-up backlog).
- FR-8.2: Each insight can be marked done, snoozed, or dismissed; state is persisted per insight and the insight resurfaces if the underlying signal recurs after dismissal.

### 5.9 Overview Analytics

- FR-9.1: The overview shows monthly intros, signups, cancellations, and net growth; intro-to-signup conversion funnel; membership type breakdown; and cancellation reason distribution.
- FR-9.2: Views are filterable by preset ranges (1/3/6 months, year, YTD) or a custom date range.

### 5.10 Filtering, Search, and Pagination (all list tabs)

- FR-10.1: Each list tab has a search box, labeled filter dropdowns, a year pill selector limited to years with data, and a sort order control, presented by one shared filter bar component.
- FR-10.2: Filter state is scoped per tab; setting a filter on one tab never affects another.
- FR-10.3: Changing any filter resets pagination to the first page; a clear-filters control appears whenever any filter differs from its default.
- FR-10.4: Tables paginate with configurable page size and support multi-select with bulk delete (capped per operation).

### 5.11 Administration

- FR-11.1: Owners can view registered users and change user roles; role changes are blocked at the database for non-owners.
- FR-11.2: Users manage their own profile (display name, avatar) and can delete their own account.
- FR-11.3: Authentication is Supabase email/password with a password-reset flow; all application routes require a session.

## 6. Non-Functional Requirements

- NFR-1: **Data integrity.** Year derivation, single-current-period, single-default-format, role protection, and name-based dedup keys are enforced by database triggers, constraints, and generated columns — never only in the client.
- NFR-2: **Authorization.** Every table carries Row-Level Security. The Supabase service-role key is used only by scheduled import endpoints (which have no user context) behind a bearer secret; interactive requests always run in the signed-in user's RLS context.
- NFR-3: **Idempotent automation.** All scheduled imports and the member CSV sync are safe to re-run.
- NFR-4: **Timezone correctness.** Date-only values (`YYYY-MM-DD`) are parsed without UTC conversion so month/year derivation is stable in the gym's timezone (Pacific).
- NFR-5: **Responsiveness.** Client-side filtering, sorting, and pagination over the full dataset (thousands of rows) without perceptible lag; realtime subscriptions refresh lists when records change elsewhere.
- NFR-6: **Quality gates.** Lint, typecheck, and the unit test suite (with a 70% coverage floor) pass before any release; critical flows are covered by end-to-end browser tests.

## 7. Assumptions and Dependencies

- Zen Planner remains the billing/booking system of record and continues sending notification emails in the current formats; parser changes are expected maintenance when those formats change.
- Person identity across record types is name-based (normalized lowercase, wildcard-escaped). There is no shared person ID with Zen Planner; the roster's `members.id` is the anchor for future integrations.
- Hosting is Vercel (application, two cron jobs) plus Supabase (PostgreSQL, auth, realtime); email import scheduling is external (cron-job.org).
- The planned ASP Pick-Up System integration will share this Supabase project, prefix its tables with `asp_`, reuse `user_profiles` roles, and link its students to `members.id`.
