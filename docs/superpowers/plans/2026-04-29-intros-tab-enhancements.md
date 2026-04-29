# Intros Tab Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Date column + sort toggle to the Intros table (matching other tabs), and a one-click follow-up toggle pill with green row tinting.

**Architecture:** Three targeted file changes — a new `toggleFollowUpDone` function in the Supabase helpers, a `getRowClassName` prop on the shared Table component, and Date column + sort + pill additions in IntrosTab. No schema migrations needed; all required DB columns already exist.

**Tech Stack:** Next.js 14, TypeScript, Supabase, Tailwind CSS, Jest + React Testing Library

---

## File Map

| File | Change |
|------|--------|
| `app/lib/supabase/intros.ts` | Add exported `toggleFollowUpDone(id, currentStatus)` |
| `app/lib/supabase/__tests__/intros.test.ts` | New file — unit tests for `toggleFollowUpDone` |
| `app/components/ui/Table.tsx` | Add `getRowClassName` prop; apply to `<tr>` className |
| `app/components/tabs/IntrosTab.tsx` | Date column, sort toggle, follow-up pill in actions |

---

## Task 1: Add `toggleFollowUpDone` to Supabase helpers

**Files:**
- Modify: `app/lib/supabase/intros.ts` (add at the end of the file)
- Create: `app/lib/supabase/__tests__/intros.test.ts`

### Step 1.1: Write the failing tests

Create `app/lib/supabase/__tests__/intros.test.ts`:

```typescript
import { toggleFollowUpDone } from '@/lib/supabase/intros';

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase/client';

const mockFrom = supabase.from as jest.Mock;

function mockChain(resolveWith: { error: unknown }) {
  const chain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue(resolveWith),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe('toggleFollowUpDone', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sets follow_up_status to Done when currentStatus is null', async () => {
    const chain = mockChain({ error: null });
    await toggleFollowUpDone('abc-123', null);
    expect(chain.update).toHaveBeenCalledWith({ follow_up_status: 'Done' });
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc-123');
  });

  it('sets follow_up_status to Done when currentStatus is undefined', async () => {
    const chain = mockChain({ error: null });
    await toggleFollowUpDone('abc-123', undefined);
    expect(chain.update).toHaveBeenCalledWith({ follow_up_status: 'Done' });
  });

  it('sets follow_up_status to Done when currentStatus is empty string', async () => {
    const chain = mockChain({ error: null });
    await toggleFollowUpDone('abc-123', '');
    expect(chain.update).toHaveBeenCalledWith({ follow_up_status: 'Done' });
  });

  it('sets follow_up_status to null when currentStatus is Done', async () => {
    const chain = mockChain({ error: null });
    await toggleFollowUpDone('abc-123', 'Done');
    expect(chain.update).toHaveBeenCalledWith({ follow_up_status: null });
  });

  it('sets follow_up_status to null when currentStatus is Contacted', async () => {
    const chain = mockChain({ error: null });
    await toggleFollowUpDone('abc-123', 'Contacted');
    expect(chain.update).toHaveBeenCalledWith({ follow_up_status: null });
  });

  it('throws when Supabase returns an error', async () => {
    const dbError = new Error('DB failure');
    mockChain({ error: dbError });
    await expect(toggleFollowUpDone('abc-123', null)).rejects.toThrow('DB failure');
  });
});
```

- [ ] Create the test file with the content above.

### Step 1.2: Run tests to confirm they fail

```bash
npx jest app/lib/supabase/__tests__/intros.test.ts --no-coverage
```

Expected: 6 failures with `toggleFollowUpDone is not a function` or similar.

- [ ] Run the command and confirm failures.

### Step 1.3: Implement `toggleFollowUpDone`

Add to the bottom of `app/lib/supabase/intros.ts`:

```typescript
export const toggleFollowUpDone = async (
  id: string,
  currentStatus: string | null | undefined
): Promise<void> => {
  const newStatus = currentStatus ? null : 'Done';
  const { error } = await supabase
    .from('intros')
    .update({ follow_up_status: newStatus })
    .eq('id', id);
  if (error) throw error;
};
```

- [ ] Add the function to `app/lib/supabase/intros.ts`.

### Step 1.4: Run tests to confirm they pass

```bash
npx jest app/lib/supabase/__tests__/intros.test.ts --no-coverage
```

Expected: 6 passing tests.

- [ ] Run the command and confirm all pass.

### Step 1.5: Commit

```bash
git add app/lib/supabase/intros.ts app/lib/supabase/__tests__/intros.test.ts
git commit -m "feat: add toggleFollowUpDone to intros supabase helpers"
```

- [ ] Commit.

---

## Task 2: Add `getRowClassName` prop to Table component

**Files:**
- Modify: `app/components/ui/Table.tsx`

The Table component currently applies `hover:bg-gray-50` unconditionally on every `<tr>` (line 109). We need a `getRowClassName` prop that, when provided, replaces that default.

### Step 2.1: Update `TableProps` interface

In `app/components/ui/Table.tsx`, add the prop to the `TableProps` interface (around line 6):

```typescript
interface TableProps<T extends { id: string }> {
  // ... existing props ...
  getRowClassName?: (item: T) => string;
}
```

- [ ] Add `getRowClassName?: (item: T) => string;` to the `TableProps` interface.

### Step 2.2: Destructure the new prop

In the function signature (around line 24), add `getRowClassName` to the destructured props:

```typescript
export default function Table<T extends { id: string }>({
  data,
  columns,
  loading = false,
  onSort,
  onRowClick,
  selectedIds,
  onSelectId,
  onSelectAll,
  onClearSelection,
  emptyMessage = 'No data available',
  getRowClassName,   // ← add this
}: TableProps<T>) {
```

- [ ] Add `getRowClassName` to the destructured props.

### Step 2.3: Apply `getRowClassName` to the `<tr>` element

Find the `<tr>` in the `tbody` (around line 107–110):

```tsx
// Before:
<tr
  key={item.id || index}
  className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
  onClick={() => onRowClick?.(item)}
>

// After:
<tr
  key={item.id || index}
  className={`${getRowClassName ? getRowClassName(item) : 'hover:bg-gray-50'} ${onRowClick ? 'cursor-pointer' : ''}`}
  onClick={() => onRowClick?.(item)}
>
```

- [ ] Apply the change to the `<tr>` className.

### Step 2.4: Verify no regressions — run full test suite

```bash
npx jest --no-coverage
```

Expected: all existing tests still pass (no Table-specific tests exist currently, but confirm nothing new is broken).

- [ ] Run and confirm.

### Step 2.5: Commit

```bash
git add app/components/ui/Table.tsx
git commit -m "feat: add getRowClassName prop to Table component"
```

- [ ] Commit.

---

## Task 3: Update IntrosTab — Date column, sort toggle, follow-up pill

**Files:**
- Modify: `app/components/tabs/IntrosTab.tsx`

This is the largest change. Work through it in sub-steps to keep each change reviewable.

### Step 3.1: Import `toggleFollowUpDone`

At the top of `app/components/tabs/IntrosTab.tsx`, find the existing import from `@/lib/supabase/intros` (or wherever intros helpers are imported) and add `toggleFollowUpDone`:

```typescript
import { ..., toggleFollowUpDone } from '@/lib/supabase/intros';
```

- [ ] Add the import.

### Step 3.2: Add `sortOrder` state

Inside the component, near the other `useState` calls, add:

```typescript
const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
```

- [ ] Add the state declaration.

### Step 3.3: Add sorted intros computation

After `filteredIntros` is computed (find where the filtered list is derived), add the sort:

```typescript
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

- [ ] Add the `getSortTimestamp` helper and `sortedIntros` derivation.

### Step 3.4: Add the Date column to the `columns` array

In the `columns` array, insert a new entry **after** the `class` column and **before** the `attended` column:

```typescript
{
  key: 'date' as keyof Intro,
  label: 'Date',
  render: (value: unknown) => {
    if (!value) return '-';
    const d = new Date(value as string);
    return isNaN(d.getTime())
      ? '-'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
},
```

- [ ] Insert the Date column at the correct position in the `columns` array.

### Step 3.5: Add the follow-up pill inside the `actions` column render

Find the `actions` column's `render` function. It currently renders Edit, MessageSquare (Add Follow-up), and Trash2 buttons. Add the pill **before** those buttons:

```tsx
render: (_value: unknown, intro: Intro) => (
  <div className="flex items-center space-x-2">
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await toggleFollowUpDone(intro.id, intro.follow_up_status);
          await refresh();
        } catch (err) {
          console.error('Failed to toggle follow-up status', err);
        }
      }}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
        intro.follow_up_status
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
      }`}
      title={intro.follow_up_status ? 'Mark as not followed up' : 'Mark as followed up'}
    >
      {intro.follow_up_status ? '✓ Done' : 'Follow up'}
    </button>
    {/* existing Edit button */}
    <button type="button" onClick={() => handleEditClick(intro)} className="btn-icon hover:text-blue-600" title="Edit">
      <Edit2 className="w-4 h-4" />
    </button>
    {/* existing Add Follow-up note button */}
    <button type="button" onClick={() => handleFollowUpClick(intro)} className="btn-icon hover:text-green-600" title="Add Follow-up">
      <MessageSquare className="w-4 h-4" />
    </button>
    {/* existing Delete button */}
    <button type="button" onClick={() => removeIntro(intro.id, intro.name)} className="btn-icon hover:text-red-600" title="Delete">
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
),
```

- [ ] Replace the `actions` column render with the updated version above.

### Step 3.6: Pass `sortedIntros` and `getRowClassName` to `<Table>`

Find the `<Table>` usage in the JSX (currently passes `data={filteredIntros}`). Update it:

```tsx
<Table
  data={sortedIntros}   {/* was: filteredIntros */}
  columns={columns}
  loading={loading}
  selectedIds={selectedIds}
  onSelectId={(id) => toggleSelection(selectionTab, id)}
  onSelectAll={(ids) => selectAll(selectionTab, ids)}
  onClearSelection={(ids) => clearSelection(selectionTab, ids)}
  emptyMessage="No intros found matching your criteria"
  getRowClassName={(intro) =>
    intro.follow_up_status
      ? 'bg-green-50 hover:bg-green-100'
      : 'hover:bg-gray-50'
  }
/>
```

- [ ] Update `data={filteredIntros}` → `data={sortedIntros}` and add `getRowClassName`.

### Step 3.7: Add the sort order dropdown to the filters section

In the filters `<div>` (around the grid with search/month/staff/class/status selects), add a sort order selector. Match the pattern from `CancellationsTab.tsx` — a `<select>` that sets `sortOrder`:

```tsx
<select
  value={sortOrder}
  onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
  className="form-select"
>
  <option value="newest">Newest First</option>
  <option value="oldest">Oldest First</option>
</select>
```

Place it at the end of the filters grid (after the existing Status select). If the grid is currently `md:grid-cols-5`, update it to `md:grid-cols-6`.

- [ ] Add the sort dropdown to the filters grid.

### Step 3.8: Verify TypeScript compiles cleanly

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] Run and fix any type errors before proceeding.

### Step 3.9: Commit

```bash
git add app/components/tabs/IntrosTab.tsx
git commit -m "feat: add date column, sort toggle, and follow-up pill to IntrosTab"
```

- [ ] Commit.

---

## Task 4: Manual verification

Start the dev server and verify each feature visually:

```bash
npm run dev
```

Open `http://localhost:3000` and navigate to the Intros tab.

- [ ] **Date column:** Confirm a "Date" column appears between Class and Attended showing e.g. "Apr 15, 2025". Confirm `'-'` for any records without a date.
- [ ] **Sort toggle:** Confirm the "Newest First / Oldest First" dropdown appears. Confirm switching it reorders the rows correctly.
- [ ] **Follow-up pill (unmarked):** Confirm each row shows a gray "Follow up" pill in the Actions area. Confirm the row background is white.
- [ ] **Follow-up pill (mark done):** Click the gray pill on a row. Confirm it turns green "✓ Done" and the row turns green-tinted.
- [ ] **Follow-up pill (unmark):** Click the green "✓ Done" pill. Confirm it reverts to gray "Follow up" and the row returns to white.
- [ ] **Hover states:** Hover over a green row. Confirm it tints to a slightly darker green (not gray).
- [ ] **Existing FollowUpModal:** Click the MessageSquare icon on a row and add a note. Confirm the pill shows green "✓ Done" after the modal closes (because the modal sets `follow_up_status = 'Contacted'`).
- [ ] **Other tabs unaffected:** Navigate to Cancellations, Holds, Signups. Confirm rows still hover with the gray tint (Table fallback works).

- [ ] All checks pass. Done.
