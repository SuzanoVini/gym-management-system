import type * as FakeQueryTableModule from '@/lib/supabase/__mocks__/fakeQueryTable';
import type { PayrollPeriod } from '@/types';
import type { HoursCsvRow } from '../import.service/schemas';

type FakeTables = Record<
  'staff_members' | 'staff_hours' | 'time_entries',
  Record<string, unknown>[]
>;

jest.mock('@/lib/supabase/client', () => {
  const { makeFakeSupabase } = jest.requireActual<typeof FakeQueryTableModule>(
    '@/lib/supabase/__mocks__/fakeQueryTable'
  );
  const shared: FakeTables = { staff_members: [], staff_hours: [], time_entries: [] };
  (globalThis as Record<string, unknown>).__fakeTables = shared;
  return { supabase: makeFakeSupabase(shared) };
});

import { saveHoursRows } from '../import.service/persist';

const period = {
  id: 'p1',
  start_date: '2026-10-01',
  end_date: '2026-10-15',
  is_closed: false,
} as PayrollPeriod;

const row = (over: Partial<HoursCsvRow>): HoursCsvRow => ({
  employee_id: 'EMP-101',
  date: '2026-10-02',
  hours: 4,
  type: 'regular',
  notes: '',
  is_after_school_program: false,
  ...over,
});

let tables: FakeTables;
beforeEach(() => {
  tables = (globalThis as Record<string, unknown>).__fakeTables as FakeTables;
  for (const t of Object.values(tables)) {
    t.length = 0;
  }
  tables.staff_members.push({ id: 's1', employee_id: 'EMP-101' });
});

describe('saveHoursRows', () => {
  it('saves rows as csv time entries and skips them on re-import', async () => {
    const rows = [row({}), row({ date: '2026-10-03', type: 'mat_clean', hours: 1 })];

    expect(await saveHoursRows(period, rows)).toMatchObject({
      success: true,
      imported: 2,
      skipped: 0,
    });
    expect(tables.time_entries).toEqual([
      expect.objectContaining({ entry_type: 'regular', hours: 4, source: 'csv' }),
      expect.objectContaining({ entry_type: 'mat_cleaning', hours: 0.25, source: 'csv' }),
    ]);

    expect(await saveHoursRows(period, rows)).toMatchObject({
      success: true,
      imported: 0,
      skipped: 2,
    });
    expect(tables.time_entries).toHaveLength(2);
  });

  it('writes nothing when a Payroll ID is unknown or a date is outside the period', async () => {
    const result = await saveHoursRows(period, [
      row({ employee_id: 'EMP-999' }),
      row({ date: '2026-10-20' }),
    ]);

    expect(result.success).toBe(false);
    expect(result.errors.join(' ')).toMatch(/EMP-999/);
    expect(result.errors.join(' ')).toMatch(/outside this period/);
    expect(tables.time_entries).toHaveLength(0);
  });

  it('refuses a closed period', async () => {
    const result = await saveHoursRows({ ...period, is_closed: true }, [row({})]);
    expect(result).toMatchObject({ success: false, imported: 0 });
    expect(tables.staff_hours).toHaveLength(0);
  });
});
