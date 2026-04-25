# GB Kitsilano Gym - Operations & Management System

![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/Deployed_on_Vercel-000?style=flat&logo=vercel)

A full-stack operations platform built for **Gracie Barra Kitsilano**, a Brazilian jiu-jitsu gym in Vancouver, BC. The gym was managing members, payroll, and class attendance across scattered spreadsheets. This replaced all of that with one system.

**Live demo:** *(custom domain coming soon)*

---

## Background

As program director at the gym, I was responsible for tracking member signups, intro classes, cancellations, holds, and payroll across a mix of Excel and Google Sheets files with no connection between them. Answering a simple question like "how many members signed up in March vs cancelled in April?" meant opening three files and doing mental math. Tracking which intro class leads had been followed up on was basically impossible.

I built this to fix that: one platform where the whole operation lives, from a prospect's first trial class through to payroll export at the end of the month.

---

## What it does

**Member lifecycle tracking**

Four record types cover the full member journey: Intros (trial classes), Signups, Cancellations, and Holds. Each has its own tab with filters, CSV import, bulk operations, and a year selector that only shows years where data actually exists.

**Intro class follow-up system**

When a prospect comes in for a free trial class, staff log the intro and can add timestamped follow-up notes at each contact attempt. The system tracks follow-up status so no lead falls through the cracks. Staff can also log multiple class visits for the same prospect before they decide to sign up.

**Payroll hours tracking**

Staff hours are entered and tracked by bi-weekly payroll period. The system handles regular hours, overtime, and mat cleaning bonuses. Export generates a file that matches the exact column format and staff ordering the gym's accountant expects, configurable through a format editor so it can adapt if the accountant's template changes.

**Actionable insights**

The Insights tab auto-generates observations from the underlying data: things like a drop in hold return rate, a spike in cancellations from a specific reason, or intro-to-signup conversion falling below average. Each insight can be marked as done, snoozed, or dismissed, and resurfaces automatically if the numbers shift again.

**Analytics overview**

Monthly signup and cancellation trends, membership type breakdown, churn rate, and revenue estimates, all rendered with Recharts. Filters for date range and year keep the view focused on the period you care about.

**CSV import with year resolution**

The gym's existing spreadsheets had dates formatted as `MM/DD` with no year. The import flow asks you to confirm the year before writing anything, which prevents old records from getting the wrong year stamped on them. The year picker also lives inside each tab's filter row for quick viewing by period.

**Access control**

Two roles: `owner` and `staff`. Owners get access to payroll, configuration, and admin settings. Staff see member data only. Row Level Security on every Supabase table enforces this at the database level, not just the UI.

---

## Tech stack

**Next.js 15** (App Router) for the full-stack framework. Server and client components in the same project, file-based routing across dashboard, payroll, profile, and admin pages.

**TypeScript** throughout. Strict mode caught a fair number of bugs before runtime, especially in the CSV parsing and date handling logic.

**Supabase** for the database and auth. PostgreSQL with Row Level Security policies on every table. All schema changes are versioned SQL migrations applied through the Supabase CLI, so nothing gets modified directly in the dashboard.

**Tailwind CSS v4** for styling. No external component library; all UI components (Table, Modal, YearFilter, etc.) are custom-built.

**Zustand** for state management. Four stores cover filter state, UI state (modals open/closed), multi-tab record selection, and sidebar state.

**Zod** for validation on both form inputs and CSV rows during import, catching malformed data before it reaches the database.

**Recharts** for data visualisation across the Overview and Insights tabs.

**Biome** as linter and formatter, enforced through a pre-commit hook via lint-staged and Husky.

---

## Project structure

```
app/
├── components/
│   ├── layout/          # Header, sidebar, navigation
│   ├── tabs/            # One component per major feature tab
│   │   ├── forms/       # IntroForm, SignupForm, CancellationForm, HoldForm
│   │   └── modals/      # Follow-up notes, settings, and import preview modals
│   ├── payroll/         # Hours entry, period selector, export, import, staff management
│   └── ui/              # Shared: Table, Modal, YearFilter, etc.
├── hooks/               # Data hooks: useIntros, useSignups, useInsights, useStaffHours, etc.
├── lib/
│   ├── supabase/        # DB queries, one file per table
│   ├── services/        # Payroll calculations, CSV format logic, template analysis
│   └── csv.ts           # CSV parsing for all record types
├── store/               # Zustand stores
└── types/               # Shared TypeScript types

supabase/
└── migrations/          # 16 versioned migrations, applied via Supabase CLI
```

Each tab follows the same pattern: a hook fetches and caches data, the tab component handles filtering and selection, and forms and modals live in subdirectories. That consistency made it straightforward to add new tabs without rethinking the structure each time.

---

## Getting started

### What you need

- Node.js 18+
- A Supabase project (free tier works)
- Supabase CLI: `npm install -g supabase`

### Setup

```bash
git clone https://github.com/SuzanoVini/gb-kitsilano-gym.git
cd gb-kitsilano-gym
npm install
```

Copy the environment file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=any_random_string
```

Apply the migrations to your Supabase project:

```bash
supabase link --project-ref your_project_ref
supabase db push
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create a user in your Supabase dashboard under Authentication, then log in.

---

## What's next

- Replace Supabase Auth with a custom authentication implementation
- Add screenshots to this README
- Mobile layout improvements
- Email reminders for intro class follow-ups

---

## About

Built by **Vinicius Suzano** - Computer Information Systems, Vancouver, BC.

I built this while working as program director at Gracie Barra Kitsilano. The spreadsheet situation was genuinely bad, so I decided to fix it myself. It grew into a full platform the gym now runs on day to day, which meant real data, real edge cases, and the kind of constraints that don't show up in tutorial projects.

[GitHub](https://github.com/SuzanoVini)
