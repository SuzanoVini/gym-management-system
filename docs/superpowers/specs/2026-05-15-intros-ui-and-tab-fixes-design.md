# Intros UI & Tab Fixes — Design Spec

**Date:** 2026-05-15
**Scope:** Five targeted UI fixes across the Intros, Signups, and Holds tabs plus global tab/filter behaviour.

---

## 1. Intros Table: Add Time Column, Remove Status Column

### Problem
The Intros tab table does not show what time the intro class is scheduled for, even though `time` is stored on every intro record. The `status` column (Active / Cancelled / Completed badge) provides no actionable information in the table view and wastes column space.

### Change
**File:** `app/components/tabs/IntrosTab.tsx`

- **Remove** the `status` column from the `columns` array definition.
- **Remove** the status filter dropdown from the filter bar (the `<select>` or similar UI element bound to `filters.status`).
- **Add** a `time` column immediately after the `date` column. Renders the `intro.time` string value as-is (e.g. `"9:00 AM"`). If the value is `null` or an empty string, render `—`.
- The `status` field remains in the data model and Zustand store — only the display is removed. No DB migration is needed.

### Column order after change
`Name · Date · Time · Class · Staff · Attended · Signed Up`

---

## 2. Dropdown Options Not Loading on First Open

### Problem
The "Class", "Staff", "Membership Type", and "Reason" dropdowns are empty when the Add modal is opened for the first time after page load. The user has to open the Settings modal and close it before the options appear. Root cause: each form component fetches its own settings data inside a `useEffect([])` that fires when the modal opens. If the Supabase client is not fully session-ready at that moment, the query returns empty results silently. Visiting the Settings modal happens to trigger a successful fetch that populates shared state.

### Fix: lift the fetch to tab level

Each tab component fetches its settings data once on mount — well before the user opens any modal — and passes the result down as props.

**IntrosTab (`app/components/tabs/IntrosTab.tsx`)**
- Add state: `classTypes: string[]` and `staffMembers: string[]`, both initialised as `[]`.
- Add `useEffect([])` that calls `fetchSettings('class_types')` and `fetchSettings('staff_members')` in parallel and stores results in state.
- Pass `classTypes` and `staffMembers` as props to every `IntroForm` instance (add modal and edit modal).

**IntroForm (`app/components/tabs/forms/IntroForm.tsx`)**
- Remove the internal `useEffect` that fetches `class_types` and `staff_members`.
- Remove the internal `classTypes` and `staffMembers` state.
- Accept `classTypes: string[]` and `staffMembers: string[]` as required props.
- While either array is empty (parent still loading), the corresponding `<select>` renders a single disabled `<option>Loading…</option>`.

**SignupsTab (`app/components/tabs/SignupsTab.tsx`)**
- Add state: `membershipTypes: string[]`, initialised as `[]`.
- Add `useEffect([])` that fetches `membership_types` and stores in state.
- Pass `membershipTypes` as a prop to `SignupModals`.

**SignupModals (`app/components/tabs/modals/SignupModals.tsx`)**
- Remove the internal `useEffect` that fetches `membership_types`.
- Remove the internal `membershipTypes` state.
- Accept `membershipTypes: string[]` as a required prop and thread it down to `SignupForm`.

**HoldsTab (`app/components/tabs/HoldsTab.tsx`)**
- Add state: `holdReasons: string[]`, initialised as `[]`.
- Add `useEffect([])` that fetches `hold_reasons` and stores in state.
- Pass `holdReasons` as a prop to `HoldModals`.

**HoldModals (`app/components/tabs/modals/HoldModals.tsx`)**
- Remove the internal `useEffect` that fetches `hold_reasons`.
- Remove the internal `holdReasons` state.
- Accept `holdReasons: string[]` as a required prop and thread it down to `HoldForm`.

### Settings mutation
When a user adds or removes an option via the Settings modal, the tab-level state must update so the dropdowns reflect the change without a page refresh. After any successful Settings save (add, edit, delete an option), the tab re-fetches its settings and updates state. This is already the natural result of the Settings modal calling the same `fetchSettings` utility and the parent re-rendering.

> **Implementation note:** if the Settings modal mutates options (e.g. adds a new class type), the tab-level state array will be stale until the tab re-fetches. The simplest fix is to pass a `refreshSettings` callback from the tab into the Settings modal; the modal calls it after any successful mutation. This replaces whatever internal re-fetch the Settings modal currently does.

---

## 3. Modals Auto-Close After Successful Submit

### Problem
After clicking Save / Add in any modal across all three tabs, the modal stays open. The user has to manually close it.

### Fix
Every submit handler — add and edit — across Intros, Signups, and Holds calls the modal's close function immediately after a confirmed successful write to the database (i.e. after the Supabase call returns without error and before or alongside the success toast).

**Affected handlers (indicative — exact function names to be confirmed by reading the files):**

| Tab | Handler | Close call |
|---|---|---|
| Intros | `handleAddIntro` | `setAddModalOpen(false)` |
| Intros | `handleEditIntro` | `setEditModalOpen(false)` |
| Signups | `handleAddSignup` | `setAddModalOpen(false)` |
| Signups | `handleEditSignup` | `setEditModalOpen(false)` |
| Holds | `handleAddHold` | `setAddModalOpen(false)` |
| Holds | `handleEditHold` | `setEditModalOpen(false)` |

If a submit fails (Supabase returns an error), the modal stays open and the error is shown — no change from current behaviour.

---

## 4. Tab Persistence on Page Refresh

### Problem
The active tab is stored only in React state. On page refresh, `useSearchParams()` reads the `tab` URL param to initialise state, but tab clicks never update the URL — so the param is always whatever was in the URL on load (or absent), and refresh always goes back to Overview.

### Fix
**File:** `app/page.tsx`

The tab change handler (currently only calling `setActiveTab(tabId)`) also calls:

```ts
router.replace(`/?tab=${tabId}`, { scroll: false });
```

`router.replace` is used instead of `router.push` so tab switches don't pollute the browser's back-button history. With this change, the URL always reflects the current tab. On refresh, `useSearchParams()` reads the correct `tab` param and restores the tab as it already does today.

No other files need to change.

---

## 5. Default Filters to Current Month and Year

### Problem
The Zustand filter store initialises `year` and `month` to `'all'`, so every tab shows all-time data on first load. The most useful default is the current month.

### Fix
**File:** `app/store/useFilterStore.ts`

Change the initial state:

```ts
// Before
year: 'all',
month: 'all',

// After
year: new Date().getFullYear().toString(),
month: new Date().toLocaleString('en-US', { month: 'short' }),
// produces 'Jan', 'Feb', … 'Dec' — matching the existing month filter values
```

All tabs read from this shared store, so all tabs default to the current month and year on every fresh page load. Switching tabs preserves whatever filter the user last set (shared store — no per-tab reset). Page refresh returns to current month/year, which is the correct "start fresh" behaviour.

---

## Files Changed Summary

| File | Change |
|---|---|
| `app/components/tabs/IntrosTab.tsx` | Remove status column + filter; add time column; fetch classTypes + staffMembers on mount; pass to IntroForm; pass refreshSettings to modals |
| `app/components/tabs/forms/IntroForm.tsx` | Remove internal settings fetch; accept classTypes + staffMembers as props; add loading state |
| `app/components/tabs/SignupsTab.tsx` | Fetch membershipTypes on mount; pass to SignupModals; auto-close on submit |
| `app/components/tabs/modals/SignupModals.tsx` | Remove internal settings fetch; accept membershipTypes prop; call refreshSettings after mutations; auto-close on submit |
| `app/components/tabs/HoldsTab.tsx` | Fetch holdReasons on mount; pass to HoldModals; auto-close on submit |
| `app/components/tabs/modals/HoldModals.tsx` | Remove internal settings fetch; accept holdReasons prop; call refreshSettings after mutations; auto-close on submit |
| `app/store/useFilterStore.ts` | Default year and month to current values |
| `app/page.tsx` | Call router.replace on tab change to keep URL in sync |

---

## Out of Scope

- The `status` field is not removed from the database, types, or Zustand store — only from the table display and filter UI.
- The `errors` array in the cron import response containing booking names is noted but addressed separately (security hardening round 3).
- No changes to the payroll or admin pages.
