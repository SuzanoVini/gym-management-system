# Undo Last Import & Intros Date Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the intros CSV date import bug and add a per-tab "Undo Last Import" button backed by localStorage.

**Architecture:** A shared `useImportUndo` hook encapsulates all localStorage read/write logic with a 24-hour TTL. Each tab's bulk insert is updated to capture returned IDs via `.select('id')` and hand them to the hook. A conditional button in each tab's header renders only when a live batch exists.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, Supabase JS client, lucide-react, localStorage API.

**Spec:** `docs/superpowers/specs/2026-04-30-undo-import-intros-date-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/lib/supabase/types.ts` | Modify | Fix `intros.date` from `number` to `string \| null` only — `intro_class_history.date` stays `number` |
| `app/hooks/useImportUndo.ts` | Create | localStorage hook — save/get/clear import batches with TTL. Client-side only; safe because all tab files have `'use client'` |
| `app/components/tabs/IntrosTab.tsx` | Modify | `.select('id')`, `date ?? null` coercion, hook wiring, undo button |
| `app/components/tabs/SignupsTab.tsx` | Modify | `.select('id')`, hook wiring, undo button. `confirmCSVImport` is defined here and prop-drilled into `<IntroModals>` — modify the function in this file |
| `app/components/tabs/CancellationsTab.tsx` | Modify | Same pattern; `confirmCSVImport` prop-drilled into `<CancellationModals>` |
| `app/components/tabs/HoldsTab.tsx` | Modify | Same pattern; `confirmCSVImport` prop-drilled into `<HoldModals>` |

---

## Task 1: Fix intros.date type in types.ts

**Files:**
- Modify: `app/lib/supabase/types.ts` (lines ~8–65, the `intros` table block only)

The database column was changed from `INTEGER` to `TEXT` by migration `20260423000001_intros_date_to_text.sql`, but `types.ts` still says `number`. This causes Supabase to reject string dates from the CSV parser.

> **Important:** The neighbouring `intro_class_history` table also has `date: number` in `types.ts`. That column was **not** changed by the migration — leave it as `number`. Only touch the `intros` block.

- [ ] **Step 1.1 — Update Row type**

In `app/lib/supabase/types.ts`, find the `intros.Row` block and change:
```ts
// Before
date: number;

// After
date: string | null;
```

- [ ] **Step 1.2 — Update Insert type**

In the same file, find `intros.Insert` and change:
```ts
// Before
date: number;

// After
date?: string | null;
```
(Made optional with `?` so `string | undefined` from the CSV parser is assignable without a type error.)

- [ ] **Step 1.3 — Update Update type**

In `intros.Update`:
```ts
// Before
date?: number;

// After
date?: string | null;
```

- [ ] **Step 1.4 — Verify typecheck passes**

```bash
npm run typecheck
```
Expected: no errors related to `intros.date`. If other files reference `intro.date` as a number, they'll surface here — fix them. Do not change `intro_class_history.date`.

- [ ] **Step 1.5 — Commit**

```bash
git add app/lib/supabase/types.ts
git commit -m "fix: change intros.date type from number to string to match DB schema"
```

---

## Task 2: Create useImportUndo hook

**Files:**
- Create: `app/hooks/useImportUndo.ts`

This hook is the single source of truth for import undo state. It only manages localStorage — never touches Supabase. It is safe to use in client components (all four tab files already have `'use client'` at the top). Do not use this hook in server components or server actions.

- [ ] **Step 2.1 — Create the hook file**

Create `app/hooks/useImportUndo.ts` with this exact content:

```ts
const TTL_MS = 86_400_000; // 24 hours in milliseconds

type TabKey = 'intros' | 'signups' | 'cancellations' | 'holds';

interface ImportBatch {
  ids: string[];
  count: number;
  savedAt: number; // Date.now() in milliseconds
}

const storageKey = (tab: TabKey) => `lastImport_${tab}`;

export function useImportUndo() {
  const saveImportBatch = (tab: TabKey, ids: string[]) => {
    const batch: ImportBatch = {
      ids,
      count: ids.length, // derived from ids — equals newRecords.length because .select('id') returns exactly inserted rows
      savedAt: Date.now(),
    };
    localStorage.setItem(storageKey(tab), JSON.stringify(batch));
  };

  const getImportBatch = (tab: TabKey): ImportBatch | null => {
    try {
      const raw = localStorage.getItem(storageKey(tab));
      if (!raw) return null;
      const batch: ImportBatch = JSON.parse(raw);
      if (Date.now() - batch.savedAt > TTL_MS) {
        localStorage.removeItem(storageKey(tab));
        return null;
      }
      return batch;
    } catch {
      return null;
    }
  };

  const clearImportBatch = (tab: TabKey) => {
    localStorage.removeItem(storageKey(tab));
  };

  return { saveImportBatch, getImportBatch, clearImportBatch };
}
```

- [ ] **Step 2.2 — Verify typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 2.3 — Commit**

```bash
git add app/hooks/useImportUndo.ts
git commit -m "feat: add useImportUndo hook with 24h localStorage TTL"
```

---

## Task 3: Wire IntrosTab

**Files:**
- Modify: `app/components/tabs/IntrosTab.tsx`

This tab has an extra step the others don't: the `date` field from `IntroCsvRecord` is `string | undefined`, but the DB Insert type is now `string | null`. Coerce with `?? null` at the insert callsite.

Note: `confirmCSVImport` is defined in this file and passed as a prop to `<IntroModals>`. Modify it here — the modal receives it automatically.

- [ ] **Step 3.1 — Add imports**

At the top of `IntrosTab.tsx`, add `RotateCcw` to the existing lucide-react import line:
```ts
// Before (exact current line)
import { Edit2, MessageSquare, Plus, Settings, Trash2, Upload } from 'lucide-react';

// After
import { Edit2, MessageSquare, Plus, RotateCcw, Settings, Trash2, Upload } from 'lucide-react';
```

Add the hook import with the other `@/hooks` imports:
```ts
import { useImportUndo } from '@/hooks/useImportUndo';
```

- [ ] **Step 3.2 — Initialise the hook and undo state**

Inside the component function, after the existing `useState` declarations, add:
```ts
const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
const [undoBatch, setUndoBatch] = useState(() => getImportBatch('intros'));
```

The lazy initialiser reads localStorage once on mount so the button appears immediately after a page refresh.

- [ ] **Step 3.3 — Update confirmCSVImport**

Find the insert call inside `confirmCSVImport`. Replace the entire insert + success/error block.

> **Pre-existing note:** The other three tabs call `setImportFile(null)` in their success branch; IntrosTab does not. This inconsistency pre-dates this plan — do not add `setImportFile(null)` here. The file input is already cleared via `event.target.value = ''` in `handleCSVImport`, so the omission is safe.
```ts
// Before
const { error } = await supabase.from('intros').insert(newRecords);

if (error) {
  console.error('Error bulk importing:', error);
  alert(`Error importing: ${error.message}`);
} else {
  await refresh();
  closeModal('importPreview');
  setImportPreviewData([]);
  alert(
    `✅ Successfully imported ${newRecords.length} records!\n${duplicateCount > 0 ? `Skipped ${duplicateCount} duplicates.` : ''}`
  );
}
```

```ts
// After
// Coerce date: string|undefined → string|null to satisfy DB Insert type
const recordsToInsert = newRecords.map((r) => ({ ...r, date: r.date ?? null }));
const { data, error } = await supabase.from('intros').insert(recordsToInsert).select('id');

if (error) {
  console.error('Error bulk importing:', error);
  alert(`Error importing: ${error.message}`);
} else {
  saveImportBatch('intros', (data ?? []).map((r) => r.id));
  setUndoBatch(getImportBatch('intros'));
  await refresh();
  closeModal('importPreview');
  setImportPreviewData([]);
  alert(
    `✅ Successfully imported ${newRecords.length} records!\n${duplicateCount > 0 ? `Skipped ${duplicateCount} duplicates.` : ''}`
  );
}
```

- [ ] **Step 3.4 — Add handleUndoImport**

Add this function directly after `confirmCSVImport`:
```ts
const handleUndoImport = async () => {
  const batch = getImportBatch('intros');
  if (!batch) return;
  if (!confirm(`Undo import of ${batch.count} records? This cannot be undone.`)) return;
  try {
    const { error } = await supabase.from('intros').delete().in('id', batch.ids);
    if (error) throw error;
    clearImportBatch('intros');
    setUndoBatch(null);
    await refresh();
  } catch {
    // Preserve localStorage so user can retry
    alert('Failed to undo import. Please try again.');
  }
};
```

- [ ] **Step 3.5 — Add undo button to header**

Find the existing header button row. The current order is:
```tsx
<button onClick={() => openModal('settings')} ...>Settings</button>
<input type="file" ... />
<button onClick={() => fileInputRef.current?.click()} ...>Import CSV</button>
<button onClick={() => openModal('addIntro')} ...>Add Intro</button>
```

Insert the undo button between Import CSV and Add Intro:
```tsx
<button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary-blue">
  <Upload className="w-4 h-4" />
  <span>Import CSV</span>
</button>
{undoBatch && (
  <button type="button" onClick={handleUndoImport} className="btn btn-secondary">
    <RotateCcw className="w-4 h-4" />
    <span>Undo Import ({undoBatch.count})</span>
  </button>
)}
<button type="button" onClick={() => openModal('addIntro')} className="btn btn-primary">
  <Plus className="w-4 h-4" />
  <span>Add Intro</span>
</button>
```

- [ ] **Step 3.6 — Verify typecheck**

```bash
npm run typecheck
```
Expected: no errors.

- [ ] **Step 3.7 — Commit**

```bash
git add app/components/tabs/IntrosTab.tsx
git commit -m "feat: fix date import and add undo last import to IntrosTab"
```

---

## Task 4: Wire SignupsTab

**Files:**
- Modify: `app/components/tabs/SignupsTab.tsx`

No date coercion needed — `SignupCsvRecord` has no `date` field with a type mismatch. `confirmCSVImport` is defined in this file and prop-drilled to `<SignupModals>`.

- [ ] **Step 4.1 — Add imports**

Add `RotateCcw` to the lucide-react import and add the hook:
```ts
import { RotateCcw, ... } from 'lucide-react';
import { useImportUndo } from '@/hooks/useImportUndo';
```

- [ ] **Step 4.2 — Initialise hook and state**

```ts
const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
const [undoBatch, setUndoBatch] = useState(() => getImportBatch('signups'));
```

- [ ] **Step 4.3 — Update confirmCSVImport insert call**

```ts
// Before
const { error } = await supabase.from('signups').insert(newRecords);

if (error) { ... } else {
  await refresh();
  ...
}

// After
const { data, error } = await supabase.from('signups').insert(newRecords).select('id');

if (error) { ... } else {
  saveImportBatch('signups', (data ?? []).map((r) => r.id));
  setUndoBatch(getImportBatch('signups'));
  await refresh();
  ...
}
```

- [ ] **Step 4.4 — Add handleUndoImport**

```ts
const handleUndoImport = async () => {
  const batch = getImportBatch('signups');
  if (!batch) return;
  if (!confirm(`Undo import of ${batch.count} records? This cannot be undone.`)) return;
  try {
    const { error } = await supabase.from('signups').delete().in('id', batch.ids);
    if (error) throw error;
    clearImportBatch('signups');
    setUndoBatch(null);
    await refresh();
  } catch {
    alert('Failed to undo import. Please try again.');
  }
};
```

- [ ] **Step 4.5 — Add undo button**

Current button order: `[Settings] [Import CSV] [Add Signup]`
Insert undo between Import CSV and Add Signup:
```tsx
<button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary-blue">
  <Upload className="w-4 h-4" />
  <span>Import CSV</span>
</button>
{undoBatch && (
  <button type="button" onClick={handleUndoImport} className="btn btn-secondary">
    <RotateCcw className="w-4 h-4" />
    <span>Undo Import ({undoBatch.count})</span>
  </button>
)}
<button type="button" onClick={() => openModal('addSignup')} className="btn btn-primary">
  <Plus className="w-4 h-4" />
  <span>Add Signup</span>
</button>
```

- [ ] **Step 4.6 — Verify typecheck and commit**

```bash
npm run typecheck
git add app/components/tabs/SignupsTab.tsx
git commit -m "feat: add undo last import to SignupsTab"
```

---

## Task 5: Wire CancellationsTab

**Files:**
- Modify: `app/components/tabs/CancellationsTab.tsx`

This tab has an Export button. The undo button goes between Import CSV and Export. `confirmCSVImport` is prop-drilled into `<CancellationModals>` — modify it here in the tab file.

- [ ] **Step 5.1 — Add imports**

```ts
import { RotateCcw, ... } from 'lucide-react';
import { useImportUndo } from '@/hooks/useImportUndo';
```

- [ ] **Step 5.2 — Initialise hook and state**

```ts
const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
const [undoBatch, setUndoBatch] = useState(() => getImportBatch('cancellations'));
```

- [ ] **Step 5.3 — Update confirmCSVImport insert call**

```ts
// Before
const { error } = await supabase.from('cancellations').insert(newRecords);

// After
const { data, error } = await supabase.from('cancellations').insert(newRecords).select('id');
// In the success branch, add before `await refresh()`:
saveImportBatch('cancellations', (data ?? []).map((r) => r.id));
setUndoBatch(getImportBatch('cancellations'));
```

- [ ] **Step 5.4 — Add handleUndoImport**

```ts
const handleUndoImport = async () => {
  const batch = getImportBatch('cancellations');
  if (!batch) return;
  if (!confirm(`Undo import of ${batch.count} records? This cannot be undone.`)) return;
  try {
    const { error } = await supabase.from('cancellations').delete().in('id', batch.ids);
    if (error) throw error;
    clearImportBatch('cancellations');
    setUndoBatch(null);
    await refresh();
  } catch {
    alert('Failed to undo import. Please try again.');
  }
};
```

- [ ] **Step 5.5 — Add undo button**

Current button order: `[Settings] [Import CSV] [Export] [Add Cancellation]`
Insert undo between Import CSV and Export:
```tsx
<button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary-blue">
  <Upload className="w-4 h-4" />
  <span>Import CSV</span>
</button>
{undoBatch && (
  <button type="button" onClick={handleUndoImport} className="btn btn-secondary">
    <RotateCcw className="w-4 h-4" />
    <span>Undo Import ({undoBatch.count})</span>
  </button>
)}
<button type="button" onClick={handleExportCancellations} className="btn btn-primary">
  <Download className="w-4 h-4" />
  <span>Export</span>
</button>
```

- [ ] **Step 5.6 — Verify typecheck and commit**

```bash
npm run typecheck
git add app/components/tabs/CancellationsTab.tsx
git commit -m "feat: add undo last import to CancellationsTab"
```

---

## Task 6: Wire HoldsTab

**Files:**
- Modify: `app/components/tabs/HoldsTab.tsx`

Same pattern as CancellationsTab — has Export, undo goes between Import CSV and Export. `confirmCSVImport` prop-drilled into `<HoldModals>`.

- [ ] **Step 6.1 — Add imports**

```ts
import { RotateCcw, ... } from 'lucide-react';
import { useImportUndo } from '@/hooks/useImportUndo';
```

- [ ] **Step 6.2 — Initialise hook and state**

```ts
const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
const [undoBatch, setUndoBatch] = useState(() => getImportBatch('holds'));
```

- [ ] **Step 6.3 — Update confirmCSVImport insert call**

```ts
// Before
const { error } = await supabase.from('holds').insert(newRecords);

// After
const { data, error } = await supabase.from('holds').insert(newRecords).select('id');
// In the success branch, add before `await refresh()`:
saveImportBatch('holds', (data ?? []).map((r) => r.id));
setUndoBatch(getImportBatch('holds'));
```

- [ ] **Step 6.4 — Add handleUndoImport**

```ts
const handleUndoImport = async () => {
  const batch = getImportBatch('holds');
  if (!batch) return;
  if (!confirm(`Undo import of ${batch.count} records? This cannot be undone.`)) return;
  try {
    const { error } = await supabase.from('holds').delete().in('id', batch.ids);
    if (error) throw error;
    clearImportBatch('holds');
    setUndoBatch(null);
    await refresh();
  } catch {
    alert('Failed to undo import. Please try again.');
  }
};
```

- [ ] **Step 6.5 — Add undo button**

Current button order: `[Settings] [Import CSV] [Export] [Add Hold]`
Insert undo between Import CSV and Export:
```tsx
<button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary-blue">
  <Upload className="w-4 h-4" />
  <span>Import CSV</span>
</button>
{undoBatch && (
  <button type="button" onClick={handleUndoImport} className="btn btn-secondary">
    <RotateCcw className="w-4 h-4" />
    <span>Undo Import ({undoBatch.count})</span>
  </button>
)}
<button type="button" onClick={handleExportHolds} className="btn btn-primary">
  <Download className="w-4 h-4" />
  <span>Export</span>
</button>
```

- [ ] **Step 6.6 — Final quality gate**

```bash
npm run quality
```
Expected: lint ✓, typecheck ✓, tests ✓. Fix any issues before proceeding.

- [ ] **Step 6.7 — Commit**

```bash
git add app/components/tabs/HoldsTab.tsx
git commit -m "feat: add undo last import to HoldsTab"
```

---

## Execution Order

```
Task 1 (types.ts fix)  ─────────────────────────┐
                                                  ├──► Task 3 (IntrosTab)
Task 2 (hook)          ──┬──────────────────────┘
                          ├──► Task 4 (SignupsTab)       ┐
                          ├──► Task 5 (CancellationsTab) ├─ parallel
                          └──► Task 6 (HoldsTab)         ┘
```

- Tasks 1 and 2 have no dependencies and can run in parallel with each other.
- Task 3 (IntrosTab) requires **both** Task 1 and Task 2 to be complete.
- Tasks 4, 5, and 6 require only Task 2. They can run in parallel with each other and with Task 3.
