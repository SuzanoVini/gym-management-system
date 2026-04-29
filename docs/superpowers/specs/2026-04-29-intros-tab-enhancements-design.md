# Intros Tab Enhancements Design

**Date:** 2026-04-29
**Status:** Approved

## Overview

Three changes to the Intros tab, plus aligning its date display and sort logic with the existing pattern already used in Cancellations, Holds, and Signups tabs:

1. Add a Date column (matching other tabs)
2. Add a sort order toggle (matching other tabs)
3. Add a one-click follow-up toggle pill with row color change
4. Phone/email — already captured by the Gmail script, no change needed

---

## Feature 1: Date Column + Sort Toggle

### Context

Cancellations, Holds, and Signups already have:
- A formatted date column using `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` → e.g., "Jan 15, 2025"
- A sort toggle defaulting to "Newest First", with an "Oldest First" option

IntrosTab has neither. This feature brings it in line.

### Date Column

- **Data source:** `date` field already exists in the `intros` table as an ISO string (`YYYY-MM-DD`).
- **Display format:** `Jan 15, 2025` — using `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`.
- **Null fallback:** Render `'-'` when `date` is null or undefined (matches the null handling pattern used for other optional columns in IntrosTab).
- **Label:** `Date`
- **Placement:** After the `Class` column (before `Attended`). IntrosTab has significantly more columns than other tabs (Email, Phone, Staff, Attended, Signed Up), so placing Date adjacent to Class — the field it contextualizes — is more usable than anchoring it to the far left as other tabs do.

**No schema changes required.**

### Sort Toggle

- Add a `sortOrder` state (`'newest' | 'oldest'`) defaulting to `'newest'`.
- Sort `filteredIntros` before passing to `<Table>`, using this exact pattern (mirrors `CancellationsTab.tsx`):

```ts
const getSortTimestamp = (intro: Intro): number => {
  const dateValue = intro.date ? new Date(intro.date).getTime() : 0;
  if (dateValue) return dateValue;
  return intro.created_at ? new Date(intro.created_at).getTime() : 0;
};

const sortedIntros = [...filteredIntros].sort((a, b) => {
  const dateA = getSortTimestamp(a);
  const dateB = getSortTimestamp(b);
  if (dateA === dateB) return 0;
  return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
});
```

- Add a "Newest First / Oldest First" dropdown selector in the filters area, matching the UI pattern in CancellationsTab and SignupsTab.
- Pass `sortedIntros` (not `filteredIntros`) to `<Table>`.

---

## Feature 2: Phone & Email (No Change)

The `booking-parser.ts` already extracts `phone` and `email` via regex from ZenPlanner emails. Both are saved in the `import-intros` route and displayed as columns in the table. Empty values on some records reflect ZenPlanner not including those fields in certain booking confirmation emails — expected behavior.

---

## Feature 3: Follow-up Toggle Pill

**Goal:** One-click per row to mark an intro as "follow up done", with visual row feedback.

### Interaction

- The pill lives **inside the existing `actions` column render** — it augments the current Edit / Add Follow-up note / Delete buttons. No new column is added.
- Default state: gray pill labeled `Follow up`.
- Done state (`follow_up_status` is non-null/non-empty): green pill labeled `✓ Done`.
- Clicking either state calls `toggleFollowUpDone(intro.id, intro.follow_up_status)` then `await refresh()`.
- If a follow-up note was added via the existing `FollowUpModal` (which sets `follow_up_status = 'Contacted'`), the pill renders green — both paths converge on the done visual state.
- If the user un-marks a row that was originally marked via `FollowUpModal`, the child `follow_up_notes` rows remain in the database. This is acceptable — notes are an audit trail and should not be deleted by toggling the pill.

### Row Coloring

- Rows where `follow_up_status` is non-null/non-empty get `bg-green-50 hover:bg-green-100`.
- Default rows keep `hover:bg-gray-50`.
- Implemented via a new `getRowClassName` prop on the shared `Table` component. When the prop is not provided, `Table` falls back to the current default:

```tsx
className={getRowClassName ? getRowClassName(item) : 'hover:bg-gray-50'}
```

### Backend

New function in `app/lib/supabase/intros.ts`:

```ts
export async function toggleFollowUpDone(
  id: string,
  currentStatus: string | null | undefined
): Promise<void>
```

- If `currentStatus` is null/undefined/empty string: updates `follow_up_status = 'Done'`
- Otherwise: updates `follow_up_status = null`
- On Supabase error, throw the error (matches the existing pattern in `intros.ts` — callers are responsible for surfacing it).

**Caller pattern in IntrosTab:**
```ts
await toggleFollowUpDone(intro.id, intro.follow_up_status);
await refresh();
```

**No schema migration required** — `follow_up_status` column already exists.

---

## Files Changed

| File | Change |
|------|--------|
| `app/components/ui/Table.tsx` | Add `getRowClassName?: (item: T) => string` prop; replace hardcoded `hover:bg-gray-50` on `<tr>` with `getRowClassName ? getRowClassName(item) : 'hover:bg-gray-50'` |
| `app/components/tabs/IntrosTab.tsx` | Add Date column after Class with null fallback; add sortOrder state and sort toggle dropdown; sort filteredIntros before passing to Table; add follow-up pill inside existing actions render; pass `getRowClassName` to `<Table>` |
| `app/lib/supabase/intros.ts` | Add exported `toggleFollowUpDone(id, currentStatus)` function |

---

## Out of Scope

- Changing the phone/email Gmail parser (already works correctly)
- Changing date format or sort logic in Cancellations, Holds, or Signups (already consistent)
- Changing the FollowUpModal behavior
- Deleting `follow_up_notes` rows when the pill is toggled off
- Moving the Date column to the far left of IntrosTab (other tabs do this, but IntrosTab's column structure makes Class-adjacent placement more readable)
