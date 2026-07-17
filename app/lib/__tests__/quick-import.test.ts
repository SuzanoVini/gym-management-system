import { buildQuickImportTimeEntries, parseQuickImport } from '../quick-import';

describe('buildQuickImportTimeEntries', () => {
  it('maps a plain entry to one regular time entry dated in the period month', () => {
    const { entries } = parseQuickImport('15 6pm');
    const rows = buildQuickImportTimeEntries('sh-1', '2026-07-01', entries);
    expect(rows).toEqual([
      {
        staff_hours_id: 'sh-1',
        entry_date: '2026-07-15',
        entry_type: 'regular',
        hours: 1,
        is_after_school_program: false,
        notes: 'Quick import 6pm',
      },
    ]);
  });

  it('splits mat clean into a regular entry plus a mat_cleaning bonus entry', () => {
    const { entries } = parseQuickImport('3 7am mat clean');
    const rows = buildQuickImportTimeEntries('sh-1', '2026-07-16', entries);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ entry_type: 'regular', hours: 1, entry_date: '2026-07-03' });
    expect(rows[1]).toMatchObject({ entry_type: 'mat_cleaning', hours: 0.25 });
  });

  it('maps 1.5 lines to overtime and flags ASP lines', () => {
    const { entries } = parseQuickImport('6 11am 1.5\n8 3pm asp');
    const rows = buildQuickImportTimeEntries('sh-1', '2026-07-01', entries);
    expect(rows[0]).toMatchObject({ entry_type: 'overtime', hours: 1 });
    expect(rows[1]).toMatchObject({ entry_type: 'regular', is_after_school_program: true });
  });

  it('zero-pads single-digit days', () => {
    const { entries } = parseQuickImport('5 7am');
    const rows = buildQuickImportTimeEntries('sh-1', '2026-07-01', entries);
    expect(rows[0]?.entry_date).toBe('2026-07-05');
  });
});
