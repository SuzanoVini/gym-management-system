# Undo Last Import & Intros Date Fix

**Date:** 2026-04-30  
**Status:** Approved

---

## Problem Statements

### 1. Intros date not importing
`types.ts` declares `intros.date` as `number`, but migration `20260423000001_intros_date_to_text.sql` already changed the column to `TEXT`. The CSV parser outputs `YYYY-MM-DD` strings (`string | undefined`) correctly, but the insert fails because the local type annotation still says `number`. No DB change needed — only the type file.

Note: `intro_class_history.date` was **not** changed by that migration and intentionally remains `number` in `types.ts`.

### 2. No way to undo a CSV import
All four tabs (Intros, Signups, Cancellations, Holds) perform permanent bulk inserts with no recovery path. A staff member who imports the wrong file must manually delete records one by one.

---

## Design

### Fix 1 — Update intros date type

In `app/lib/supabase/types.ts`, change only the `intros` table types:

```
Row:    date: number        →  date: string | null
Insert: date: number        →  date?: string | null
Update: date?: number       →  date?: string | null
```

The `Insert` field is made optional (`?`) so that `string | undefined` from `IntroCsvRecord.date` (CSV parser output) is assignable without type errors at the insert call site. `intro_class_history` is left unchanged.

---

### Fix 2 — Undo Last Import

#### Storage

localStorage keys per tab:

| Key | Tab |
|-----|-----|
| `lastImport_intros` | Intros |
| `lastImport_signups` | Signups |
| `lastImport_cancellations` | Cancellations |
| `lastImport_holds` | Holds |

Each entry shape:
```ts
{ ids: string[], count: number, savedAt: number }
// savedAt = Date.now() in milliseconds
```

The `savedAt` timestamp is used to suppress stale batches. `getImportBatch` returns `null` and clears the entry if:
```ts
Date.now() - savedAt > 86_400_000  // 24 hours in ms
``` A new import always overwrites the previous entry for that tab.

#### Hook — `useImportUndo`

New file: `app/hooks/useImportUndo.ts`

```ts
type TabKey = 'intros' | 'signups' | 'cancellations' | 'holds'
type ImportBatch = { ids: string[]; count: number; savedAt: number }

saveImportBatch(tab: TabKey, ids: string[]): void
// count is derived internally as ids.length — no third argument needed.
// Because .select('id') returns exactly the inserted rows, ids.length === newRecords.length.
getImportBatch(tab: TabKey): ImportBatch | null   // returns null if expired or missing
clearImportBatch(tab: TabKey): void
```

`getImportBatch` clears and returns `null` if the entry is older than 24 hours.

#### Data layer changes

Each tab's `confirmCSVImport` currently inserts without `.select()`:
```ts
const { error } = await supabase.from('intros').insert(newRecords)
```

Change to capture inserted IDs:
```ts
const { data, error } = await supabase.from('intros').insert(newRecords).select('id')
```

`data` is `Array<{ id: string }> | null`. After a successful insert, extract IDs and save:
```ts
saveImportBatch('intros', (data ?? []).map(r => r.id))
```

The `count` stored is `newRecords.length` — the number of records actually inserted (after duplicate filtering), not the total rows in the CSV preview.

Because `IntroCsvRecord.date` is typed `string | undefined` (from the CSV parser), coerce it to `null` at the insert callsite to satisfy the DB type `string | null`:
```ts
const recordsToInsert = newRecords.map(r => ({ ...r, date: r.date ?? null }))
const { data, error } = await supabase.from('intros').insert(recordsToInsert).select('id')
```
This coercion applies only to IntrosTab. The other three tabs do not have a `date` field with this mismatch.

#### Undo handler

```ts
const handleUndoImport = async () => {
  const batch = getImportBatch(tab)
  if (!batch) return
  if (!confirm(`Undo import of ${batch.count} records? This cannot be undone.`)) return
  try {
    const { error } = await supabase.from(table).delete().in('id', batch.ids)
    if (error) throw error
    clearImportBatch(tab)       // only clear on success
    await refresh()
  } catch {
    alert('Failed to undo import. Please try again.')
    // localStorage entry is preserved so the user can retry
  }
}
```

If the delete call fails, localStorage is **not** cleared so the user can retry. A simple `alert` surfaces the error, consistent with existing error handling in the tabs.

#### UI — button placement

Each tab's header button row:

- **Intros** (no Export button): `[Settings] [Import CSV] [Undo Import (N)] [Add Intro]`
- **Signups** (no Export button): `[Settings] [Import CSV] [Undo Import (N)] [Add Signup]`
- **Cancellations** (has Export): `[Settings] [Import CSV] [Undo Import (N)] [Export] [Add Cancellation]`
- **Holds** (has Export): `[Settings] [Import CSV] [Undo Import (N)] [Export] [Add Hold]`

The button only renders when `getImportBatch(tab)` returns a non-null batch. Label: `Undo Import (N records)` using the `RotateCcw` icon from lucide-react (already a dependency). Styled with `btn btn-secondary` to match the Settings button.

A `confirm()` dialog is shown before deleting, consistent with the existing per-row delete pattern already used in all tabs.

---

## Files Changed

| File | Change |
|------|--------|
| `app/lib/supabase/types.ts` | `intros.date`: `number` → `string \| null`, Insert made optional |
| `app/hooks/useImportUndo.ts` | New — localStorage hook with 24h TTL |
| `app/components/tabs/IntrosTab.tsx` | `.select('id')` on insert, `saveImportBatch`, undo button |
| `app/components/tabs/SignupsTab.tsx` | Same |
| `app/components/tabs/CancellationsTab.tsx` | Same |
| `app/components/tabs/HoldsTab.tsx` | Same |

No migrations. No new UI components beyond the hook.

---

## Out of Scope

- Undo history beyond the last import (one batch per tab only)
- Cross-device / cross-browser undo (localStorage is browser-local by design)
- Undo of manual record additions or edits
