# Demo data

Fictional CSVs for every import in the app, so a fresh install can be explored end to end.
Every person is invented: emails use the reserved `example.com/.net/.org` domains and phones
use the reserved `555-01xx` block. The same people flow through the files (intro → sign-up →
hold → cancellation), so the member journey, follow-ups and insights all have something to show.

Regenerate with `node scripts/gen-demo-data.mjs demo-data` (seeded, so the output is stable).

## Import order

Keep the import year at **2026**.

| # | File | Where |
|---|------|-------|
| 1 | `intros-2026.csv` | Intros tab → Import |
| 2 | `signups-2026.csv` | Sign-Ups tab → Import (marks the matching intros as signed up) |
| 3 | `holds-2026.csv` | Holds tab → Import |
| 4 | `cancellations-2026.csv` | Cancellations tab → Import (closes any active hold) |
| 5 | `members.csv` | Members tab → Import (Zen Planner roster export format) |
| 6 | `payroll-staff.csv`, then `payroll-hours-2026-10-01.csv` | Payroll → Import (owner only; the type is detected from the columns) |

Import the hours into a payroll period that covers Oct 1–15, 2026. Staff must be imported first,
since hours are matched to staff by Payroll ID.

## What it shows off

- **Follow-ups:** recent intros with no outcome yet.
- **Spam flags:** four bookings with strong signals (foreign phone formats, long digit runs in
  the email), and two genuine bookings that get only the weak flag because the surname has
  two letters.
- **Unknown class:** two intros booked into `BJJ Fundamentals`, which opens the resolve-class flow.
- **Returning former members:** two people who cancelled and later booked a new intro (⚠ flag).
- **Holds:** a mix of past, active and upcoming holds.
