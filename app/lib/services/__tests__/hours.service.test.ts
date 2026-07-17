interface FakeTables {
  staff_hours: Record<string, unknown>[];
  time_entries: Record<string, unknown>[];
}

let tables: FakeTables;

jest.mock('@/lib/supabase/client', () => {
  const { makeFakeSupabase } = require('@/lib/supabase/__mocks__/fakeQueryTable');
  const sharedTables: FakeTables = {
    staff_hours: [],
    time_entries: [],
  };
  (globalThis as Record<string, unknown>).__fakeTables = sharedTables;
  return { supabase: makeFakeSupabase(sharedTables) };
});

import {
  ensureStaffHoursRow,
  getTimeEntries,
  setManualHours,
  updateStaffHoursField,
} from '../hours.service';

beforeEach(() => {
  tables = (globalThis as Record<string, unknown>).__fakeTables as FakeTables;
  tables.staff_hours.length = 0;
  tables.time_entries.length = 0;
});

describe('ensureStaffHoursRow', () => {
  it('creates a zeroed row when none exists, and reuses it on a second call', async () => {
    const first = await ensureStaffHoursRow('period-1', 'staff-1');
    expect(first.regular_hours).toBe(0);
    expect(tables.staff_hours).toHaveLength(1);

    const second = await ensureStaffHoursRow('period-1', 'staff-1');
    expect(second.id).toBe(first.id);
    expect(tables.staff_hours).toHaveLength(1);
  });
});

describe('updateStaffHoursField (single-owner adjustment)', () => {
  it('creates one adjustment entry for a first-time increase', async () => {
    const row = await ensureStaffHoursRow('period-1', 'staff-1');
    await updateStaffHoursField(row.id, 'regular_hours', 5);

    const entries = await getTimeEntries(row.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      entry_type: 'regular',
      hours: 5,
      notes: 'Manual adjustment',
    });
  });

  it('replaces the adjustment entry (not accumulates) on a second edit', async () => {
    const row = await ensureStaffHoursRow('period-1', 'staff-1');
    await updateStaffHoursField(row.id, 'regular_hours', 5);
    const updated = await updateStaffHoursField(row.id, 'regular_hours', 8);

    const entries = await getTimeEntries(row.id);
    const regularEntries = entries.filter((e) => e.entry_type === 'regular');
    expect(regularEntries).toHaveLength(1);
    expect(regularEntries[0]?.hours).toBe(8);
    expect(updated.regular_hours).toBe(8);
  });

  it('clamps to the real logged total when target is below already-logged hours', async () => {
    const row = await ensureStaffHoursRow('period-1', 'staff-1');
    // Simulate a real (non-adjustment) entry, e.g. from CSV/quick-import
    tables.time_entries.push({
      id: 'real-1',
      staff_hours_id: row.id,
      entry_date: '2026-07-01',
      entry_type: 'regular',
      hours: 6,
      notes: 'Quick import 7am',
      is_after_school_program: false,
      created_at: new Date().toISOString(),
    });

    // Trying to set target below the real 6 hours should not insert a
    // negative-hours entry; the adjustment mechanism can only add on top
    await updateStaffHoursField(row.id, 'regular_hours', 2);

    const entries = await getTimeEntries(row.id);
    const regularEntries = entries.filter((e) => e.entry_type === 'regular');
    // No new adjustment entry created (2 - 6 <= 0), real entry untouched
    expect(regularEntries).toHaveLength(1);
    expect(regularEntries[0]?.notes).toBe('Quick import 7am');
  });

  it('is additive on top of real entries when the target exceeds them', async () => {
    const row = await ensureStaffHoursRow('period-1', 'staff-1');
    tables.time_entries.push({
      id: 'real-1',
      staff_hours_id: row.id,
      entry_date: '2026-07-01',
      entry_type: 'overtime',
      hours: 1,
      notes: 'Quick import 6pm',
      is_after_school_program: false,
      created_at: new Date().toISOString(),
    });

    await updateStaffHoursField(row.id, 'overtime_hours', 3);

    const entries = await getTimeEntries(row.id);
    const overtimeEntries = entries.filter((e) => e.entry_type === 'overtime');
    expect(overtimeEntries).toHaveLength(2);
    const adjustment = overtimeEntries.find((e) => e.notes === 'Manual adjustment');
    expect(adjustment?.hours).toBe(2); // 3 target - 1 real = 2
  });
});

describe('setManualHours', () => {
  it('sets multiple fields including mat_cleaning_count via row-count adjustment', async () => {
    const result = await setManualHours('period-1', 'staff-1', {
      regular_hours: 10,
      sick_hours: 4,
      mat_cleaning_count: 3,
    });

    expect(result.regular_hours).toBe(10);
    expect(result.sick_hours).toBe(4);
    expect(result.mat_cleaning_count).toBe(3);

    const entries = await getTimeEntries(result.id);
    expect(entries.filter((e) => e.entry_type === 'mat_cleaning')).toHaveLength(3);
  });

  it('reduces mat_cleaning_count by removing adjustment rows down to the target', async () => {
    const first = await setManualHours('period-1', 'staff-1', { mat_cleaning_count: 4 });
    const reduced = await setManualHours('period-1', 'staff-1', { mat_cleaning_count: 2 });

    expect(first.mat_cleaning_count).toBe(4);
    expect(reduced.mat_cleaning_count).toBe(2);
  });
});
