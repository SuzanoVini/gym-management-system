# Intros UI & Tab Fixes — Design Spec

**Date:** 2026-05-15
**Scope:** Five targeted UI fixes across the Intros, Signups, and Holds tabs plus global tab/filter behaviour.

---

## 1. Intros Table: Add Time Column, Remove Status Column

### Problem
The Intros tab table does not show what time the intro class is scheduled for, even though `time` is stored on every intro record. The `status` column provides no actionable information in the table view.

### Change
**File:** `app/components/tabs/IntrosTab.tsx`

**Current column order** (from the `columns` array):
`Name · Email · Phone · Staff · Class · Date · Attended · Signed Up · Status · Year · Actions`

**Target column order after changes:**
`Name · Email · Phone · Staff · Class · Date · Time · Attended · Signed Up · Year · Actions`

Changes to the `columns` array:
- **Remove** the `status` column object.
- **Add** a `time` column immediately after `date`. Renders `intro.time` as-is (e.g. `"9:00 AM"`). If `null` or empty string, render `—`.

Additional cleanup in the same file:
- **Remove** the status filter `<select>` element from the filter bar (the element bound to `filters.status`).
- **Remove** the `matchesStatus` predicate from the `filteredIntros` `useMemo` block — the status filter logic that consumes `filters.status`.
- **Remove** any reference to `filters.status` in the `metrics` object.

> The `status` field remains in the data model, DB types, and Zustand store. No DB migration needed.

---

## 2. Dropdown Options Not Loading on First Open

### Problem
"Class", "Staff", "Membership Type", and "Reason" dropdowns are empty when the Add modal is opened for the first time after page load. Root cause: settings data is fetched only when specific modals open (not when the tab loads), so there is a race between the async fetch and the user opening the Add modal.

Specifically:
- `IntroForm` fetches `class_types` and `staff_members` in its own `useEffect([])` — fires on every form mount (i.e. every Add modal open), not on tab mount.
- `SignupModals` fetches `membership_types` only when `modals.settings` becomes true (i.e. the Settings panel is opened), not on tab mount.
- `HoldModals` fetches `hold_reasons` with the same `modals.settings`-gated pattern.

### Fix: lift fetch to tab level

Each tab fetches its settings data once on mount and passes the result down as props.

---

#### IntrosTab (`app/components/tabs/IntrosTab.tsx`)

`classTypes: string[]` and `staffMembers: string[]` state variables and their `useEffect([])` fetch **already exist** in this file. The remaining work is:
- Pass `classTypes` and `staffMembers` as props to every `IntroForm` instance (the Add modal and the Edit modal inside `IntrosTab`).
- Pass an `onSettingsChange` callback (see SettingsModal section below) to the `SettingsModal` so that after any mutation the tab re-fetches class types and staff members.

---

#### IntroForm (`app/components/tabs/forms/IntroForm.tsx`)

- **Add** `classTypes: string[]` and `staffMembers: string[]` to `IntroFormProps`.
- **Remove** the internal `classTypes` and `staffMembers` state declarations.
- **Remove** the internal `useEffect` that calls `fetchSettings('class_types')` and `fetchSettings('staff_members')`.
- Use the prop values directly where the internal state was previously used.
- While either prop array is empty (parent still loading), render a single disabled `<option>Loading…</option>` in the relevant `<select>`.

---

#### SettingsModal (`app/components/tabs/modals/SettingsModal.tsx`)

The `SettingsModal` component currently accepts `{ isOpen: boolean; onClose: () => void }`. It manages its own internal state for class types and staff members and does not notify the parent of mutations.

Changes:
- **Add** `onSettingsChange?: () => void` to the props interface.
- After every successful mutation handler (`handleAddClassType`, `handleAddStaffMember`, `handleRenameClass`, `handleRenameStaff`, `handleRemoveClassType`, `handleRemoveStaffMember`) — call `onSettingsChange?.()` following the successful DB write.
- `IntrosTab` passes its settings re-fetch function as `onSettingsChange` so the tab-level arrays stay current after mutations.

---

#### SignupsTab (`app/components/tabs/SignupsTab.tsx`)

- **Add** `membershipTypes: string[]` state, initialised as `[]`.
- **Add** `useEffect([])` that calls `fetchSettings('membership_types')` and stores in state.
- Pass `membershipTypes` as a prop to `SignupModals`.
- Pass a `refreshMembershipTypes` callback to `SignupModals` that re-fetches and updates `membershipTypes` state.

---

#### SignupModals (`app/components/tabs/modals/SignupModals.tsx`)

This component owns its own embedded Settings panel (the UI for managing membership types lives inside `SignupModals`, not in the shared `SettingsModal`). The `membershipTypes` data is currently fetched only when `modals.settings` becomes true.

Changes:
- **Accept** `membershipTypes: string[]` as a required prop.
- **Accept** `onMembershipTypesChange: () => void` as a required prop (called after any add/edit/delete of a membership type so the parent re-fetches).
- **Remove** the internal `membershipTypes` state and the `useEffect` that gates on `modals.settings`.
- Use the prop value wherever internal `membershipTypes` state was previously referenced.
- After every successful mutation to the membership types list (add, rename, delete), call `onMembershipTypesChange()`.
- Thread `membershipTypes` down to `SignupForm` as it already does via props.

---

#### HoldsTab (`app/components/tabs/HoldsTab.tsx`)

- **Add** `holdReasons: string[]` state, initialised as `[]`.
- **Add** `useEffect([])` that calls `fetchSettings('hold_reasons')` and stores in state.
- Pass `holdReasons` as a prop to `HoldModals`.
- Pass a `refreshHoldReasons` callback to `HoldModals`.

---

#### HoldModals (`app/components/tabs/modals/HoldModals.tsx`)

Identical structural situation to `SignupModals`: the Settings panel for Hold Reasons is embedded inside `HoldModals`, not in the shared `SettingsModal`.

Changes:
- **Accept** `holdReasons: string[]` as a required prop.
- **Accept** `onHoldReasonsChange: () => void` as a required prop.
- **Remove** the internal `holdReasons` state and the `modals.settings`-gated `useEffect`.
- After every successful hold reason mutation, call `onHoldReasonsChange()`.
- Thread `holdReasons` down to `HoldForm` via props.

---

## 3. Modals Auto-Close After Successful Submit

### Problem
After clicking Save in any Add or Edit modal, the modal stays open regardless of whether the submission succeeded.

### Fix

The submit handlers for Intros use `useUIStore`'s `closeModal` function, not a local `setOpen` boolean. The pattern to follow for each modal:

```ts
// Instead of:
onSubmit={addIntro}

// Use:
onSubmit={async (data) => {
  await addIntro(data);     // throws on error — closeModal is skipped if it throws
  closeModal('addIntro');   // only reached on success
}}
```

The `await` + throw-on-error contract is what makes "close only on success" work: if the hook throws (DB error), the `closeModal` call is never reached and the modal stays open with the error toast visible.

**Affected locations and close calls** (exact modal key names to be confirmed by reading `useUIStore`):

| Tab | Operation | Close call |
|---|---|---|
| Intros | Add | `closeModal('addIntro')` |
| Intros | Edit | `closeModal('editIntro')` |
| Signups | Add | `closeModal('addSignup')` (or equivalent) |
| Signups | Edit | `closeModal('editSignup')` |
| Holds | Add | `closeModal('addHold')` |
| Holds | Edit | `closeModal('editHold')` |

> **Important:** The implementer must read `app/store/useUIStore.ts` to confirm the exact modal key strings used in `openModal`/`closeModal` calls across all three tab files, rather than using the indicative names above.

If a submit fails (the hook throws), the modal remains open and the existing error toast is shown — no change from current behaviour.

---

## 4. Tab Persistence on Page Refresh

### Problem
`setActiveTab` is passed directly as a prop to `<Sidebar>` and only updates React state when called. The URL `tab` param is read once on mount but never updated when the user clicks tabs. On refresh, `useSearchParams()` reads whatever was in the URL at page load time (or nothing), so the tab resets to Overview.

### Fix
**File:** `app/page.tsx`

**Step 1:** Add `useRouter` to the import from `'next/navigation'`:
```ts
import { useRouter, useSearchParams } from 'next/navigation';
```

**Step 2:** Inside `HomeContent`, declare the router:
```ts
const router = useRouter();
```

**Step 3:** Replace the direct `setActiveTab` prop on `<Sidebar>` with a named handler:
```ts
const handleTabChange = (tabId: string) => {
  setActiveTab(tabId);
  router.replace(`/?tab=${tabId}`, { scroll: false });
};
```

**Step 4:** Pass `handleTabChange` to `<Sidebar>` instead of `setActiveTab`:
```tsx
<Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
```

`router.replace` is used (not `push`) so tab navigation does not pollute the browser back-button history. With this change, the URL always reflects the current tab. On refresh, `useSearchParams()` reads the correct `tab` param and restores the tab as it already does today.

---

## 5. Default Filters to Current Month and Year

### Problem
The Zustand filter store initialises `year` and `month` to `'all'`, so every tab shows all-time data on first load.

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
// Produces 'Jan' … 'Dec' — matching the existing filter option values
```

All tabs read from this shared store, so all tabs default to the current month and year on every fresh page load.

> **Trade-off note:** `clearFilters()` resets to `initialState.filters`. Once the initial state is set to the current month/year at module load time, calling `clearFilters()` on a long-running session (e.g. the next day or month) will reset to the month when the page was first loaded, not to the current month. This is an acceptable trade-off for normal gym use, but implementers should be aware. If precise current-month reset is needed, `clearFilters()` can compute the month/year values dynamically rather than pulling from `initialState`.

---

## Files Changed Summary

| File | Change |
|---|---|
| `app/components/tabs/IntrosTab.tsx` | Remove status column, status filter UI, status filter logic, and metrics reference; add time column; thread classTypes + staffMembers as props to IntroForm; pass onSettingsChange to SettingsModal |
| `app/components/tabs/forms/IntroForm.tsx` | Remove internal settings fetch and state; accept classTypes + staffMembers as required props; add loading option |
| `app/components/tabs/modals/SettingsModal.tsx` | Add onSettingsChange? prop; call it after each successful mutation handler |
| `app/components/tabs/SignupsTab.tsx` | Fetch membershipTypes on mount; pass to SignupModals with refresh callback; auto-close on submit |
| `app/components/tabs/modals/SignupModals.tsx` | Remove internal settings fetch and state; accept membershipTypes + onMembershipTypesChange props; call callback after mutations; auto-close on submit |
| `app/components/tabs/HoldsTab.tsx` | Fetch holdReasons on mount; pass to HoldModals with refresh callback; auto-close on submit |
| `app/components/tabs/modals/HoldModals.tsx` | Remove internal settings fetch and state; accept holdReasons + onHoldReasonsChange props; call callback after mutations; auto-close on submit |
| `app/store/useFilterStore.ts` | Default year and month to current values |
| `app/page.tsx` | Import useRouter; create handleTabChange that calls setActiveTab + router.replace; pass handleTabChange to Sidebar |

---

## Out of Scope

- The `status` field is not removed from the database, types, or Zustand store — only from the table display and filter UI.
- No changes to the payroll, admin, or settings pages.
- The `errors` array in the cron import response still contains booking names; that is a separate security hardening item.
