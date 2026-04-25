# GB Kitsilano Gym — Member Management System

![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/Deployed_on_Vercel-000?style=flat&logo=vercel)

A full-stack management dashboard built for **Gracie Barra Kitsilano**, a Brazilian jiu-jitsu gym in Vancouver, BC. The gym was tracking members, payroll, and class attendance across a mix of spreadsheets. This replaced all of that.

**Live demo:** *(custom domain coming soon)*

---

## Background

The gym had years of member data scattered across Excel and Google Sheets — one file for signups, another for cancellations, another for payroll. Cross-referencing them to answer a simple question like "how many members signed up in March vs cancelled in April?" meant opening three files and doing mental math.

The goal was a single dashboard where staff could see everything in one place, import existing CSV data, and filter by year so old records didn't pollute current month views.

---

## What it does

**Member lifecycle tracking**

Four record types — Intros (trial classes), Signups, Cancellations, Holds — each with its own tab, filters, and CSV import. When a member comes in for a free intro class, staff log it. If they sign up, that's a separate record. If they pause their membership, that's a Hold.

**CSV import with year resolution**

The gym's existing spreadsheets had dates formatted as `MM/DD` with no year. The import flow asks you to confirm the year before the data goes in, which prevents old records from getting stamped with the wrong year. Each tab has a year filter (pills, data-driven — they only appear when records with that year actually exist).

**Analytics**

The Overview tab shows monthly signup and cancellation trends, membership type breakdown, and a few automatically generated insights — things like hold return rate dropping or a spike in a specific cancellation reason. Recharts handles the visualisation.

**Payroll**

Staff hours are tracked by payroll period. The export matches the exact column format the gym's accountant expects, which was one of the more tedious things to get right.

**Access control**

Two roles: `owner` and `staff`. Owners can access configuration, admin settings, and the payroll system. Staff see member data only. Row Level Security on every Supabase table means the database enforces this at the query level, not just in the UI.

---

## Tech stack

**Next.js 15** (App Router) for the full-stack framework. Server and client components in the same project, file-based routing for the different pages (login, dashboard, payroll, profile, admin).

**TypeScript** throughout. The codebase is strict — it caught a fair number of bugs before they became runtime errors, especially around the CSV parsing and date handling.

**Supabase** for the database and auth. PostgreSQL under the hood with Row Level Security policies on every table. Schema changes are tracked as versioned SQL migration files and applied through the Supabase CLI, so nothing gets changed directly in the dashboard.

**Tailwind CSS v4** for styling. No external component library — all UI components (Table, Modal, YearFilter, etc.) are custom-built.

**Zustand** for state management. Four stores handle filter state, UI state (which modals are open), multi-tab selection, and sidebar state. Kept component trees cleaner than passing everything as props.

**Zod** for validation. Used on form inputs and also on CSV rows during import to catch malformed data before it hits the database.

**Biome** as the linter and formatter, running as a pre-commit hook. Keeps the codebase consistent without much configuration.

---

## Project structure

```
app/
├── components/
│   ├── layout/          # Header, sidebar, navigation
│   ├── tabs/            # One component per major feature tab
│   │   ├── forms/       # IntroForm, SignupForm, CancellationForm, HoldForm
│   │   └── modals/      # Modal components per tab
│   ├── payroll/         # Payroll UI components
│   └── ui/              # Shared: Table, Modal, YearFilter, etc.
├── hooks/               # Data hooks — useIntros, useSignups, useCancellations, etc.
├── lib/
│   ├── supabase/        # DB queries, one file per table
│   ├── services/        # Payroll calculations, CSV format logic
│   └── csv.ts           # CSV parsing for all record types
├── store/               # Zustand stores
└── types/               # Shared TypeScript types

supabase/
└── migrations/          # 16 migrations, tracked in version control
```

Each tab follows the same pattern: a hook fetches data, the tab component handles filtering and selection state, and forms/modals live in subdirectories. Adding the Holds tab after Cancellations was mostly copy, adjust, done.

---

## Getting started

### What you need

- Node.js 18+
- A Supabase project (free tier is fine)
- Supabase CLI — `npm install -g supabase`

### Setup

```bash
git clone https://github.com/SuzanoVini/gb-kitsilano-gym.git
cd gb-kitsilano-gym
npm install
```

Copy the environment file and add your Supabase credentials:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=any_random_string
```

Run the migrations against your Supabase project:

```bash
supabase link --project-ref your_project_ref
supabase db push
```

Start the dev server:

```bash
npm run dev
```

Go to [http://localhost:3000](http://localhost:3000). You'll hit the login page — create a user through your Supabase dashboard under Authentication, then log in.

---

## What's next

- Replace Supabase Auth with a custom authentication system
- Add screenshots to this README
- Mobile layout improvements
- Email reminders for intro class follow-ups

---

## About

Built by **Vinicius Suzano** — Computer Information Systems, Vancouver, BC.

This started as a small freelance project for a gym that needed something better than spreadsheets. It grew into a full app with real users, real data, and constraints I wouldn't have run into building something for practice. That's probably the most honest summary of why it turned out the way it did.

[GitHub](https://github.com/SuzanoVini)
