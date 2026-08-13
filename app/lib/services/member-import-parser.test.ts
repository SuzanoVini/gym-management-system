import {
  getMissingMemberCsvHeaders,
  mapMemberCsvRows,
  type ZpMemberCsvRow,
} from './member-import-parser';

describe('member import parser', () => {
  it('maps the current Zen Planner member columns into member fields', () => {
    const { rows, skipped } = mapMemberCsvRows([
      {
        'First Name': 'Staff 4',
        'Last Name': 'One',
        Email: 'aaron@example.com',
        Phone: '6045550100',
        'Signup Date': '8-Nov-2019',
        'Membership Label': 'Legacy - Adults',
        'Mbr. Status': 'CURRENT',
      },
    ]);

    expect(skipped).toBe(0);
    expect(rows).toEqual([
      {
        name: 'Member One',
        email: 'aaron@example.com',
        phone: '6045550100',
        join_date: '8-Nov-2019',
        membership_type: 'Legacy - Adults',
        status: 'Active',
      },
    ]);
  });

  it('skips NOT STARTED renewal rows when a CURRENT row exists for the same member', () => {
    const { rows, skipped } = mapMemberCsvRows([
      {
        'First Name': 'Member',
        'Last Name': 'Two',
        'Signup Date': '5-May-2023',
        'Membership Label': 'Integrity - Kids/Youth',
        'Mbr. Status': 'NOT STARTED',
      },
      {
        'First Name': 'Member',
        'Last Name': 'Two',
        'Signup Date': '5-May-2023',
        'Membership Label': 'Integrity - Kids/Youth',
        'Mbr. Status': 'CURRENT',
      },
    ]);

    expect(skipped).toBe(1);
    expect(rows).toEqual([
      {
        name: 'Member Two',
        join_date: '5-May-2023',
        membership_type: 'Integrity - Kids/Youth',
        status: 'Active',
      },
    ]);
  });

  it('imports NOT STARTED rows without a CURRENT counterpart as active new members', () => {
    const { rows, skipped } = mapMemberCsvRows([
      {
        'First Name': 'Member',
        'Last Name': 'Three',
        'Signup Date': '19-Feb-2025',
        'Membership Label': 'Integrity - Kids/Youth',
        'Mbr. Status': 'NOT STARTED',
      },
    ]);

    expect(skipped).toBe(0);
    expect(rows).toEqual([
      {
        name: 'Member Three',
        join_date: '19-Feb-2025',
        membership_type: 'Integrity - Kids/Youth',
        status: 'Active',
      },
    ]);
  });

  it.each([
    ['EXPIRED', 'NOT STARTED'],
    ['NOT STARTED', 'EXPIRED'],
    ['CANCELLED', 'CURRENT'],
  ])('imports a rejoining member as active when rows are ordered %s then %s', (first, second) => {
    const base = {
      'First Name': 'Nina',
      'Last Name': 'Reyes',
      'Signup Date': '3-Mar-2022',
      'Membership Label': 'Integrity - Adults',
    };

    const { rows, skipped } = mapMemberCsvRows([
      { ...base, 'Mbr. Status': first },
      { ...base, 'Signup Date': '1-Aug-2026', 'Mbr. Status': second },
    ]);

    expect(skipped).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Nina Reyes', status: 'Active' });
  });

  it('keeps the current membership over an upcoming one for the same member', () => {
    const { rows } = mapMemberCsvRows([
      {
        'First Name': 'Member',
        'Last Name': 'Two',
        'Signup Date': '5-May-2023',
        'Membership Label': 'Integrity - Kids/Youth',
        'Mbr. Status': 'NOT STARTED',
      },
      {
        'First Name': 'Member',
        'Last Name': 'Two',
        'Signup Date': '5-May-2023',
        'Membership Label': 'Legacy - Kids/Youth',
        'Mbr. Status': 'CURRENT',
      },
    ]);

    expect(rows).toEqual([
      {
        name: 'Member Two',
        join_date: '5-May-2023',
        membership_type: 'Legacy - Kids/Youth',
        status: 'Active',
      },
    ]);
  });

  it('maps HOLD rows to On Hold and preserves plan and signup date', () => {
    const { rows } = mapMemberCsvRows([
      {
        'First Name': 'Member',
        'Last Name': 'Four',
        'Signup Date': '24-Oct-2025',
        'Membership Label': 'Special Membership - Kids/Youth',
        'Mbr. Status': 'HOLD',
      },
    ]);

    expect(rows).toEqual([
      {
        name: 'Member Four',
        join_date: '24-Oct-2025',
        membership_type: 'Special Membership - Kids/Youth',
        status: 'On Hold',
      },
    ]);
  });

  it('normalizes headers before reading fields', () => {
    const row: ZpMemberCsvRow = {
      ' First Name ': 'Member',
      'Last  Name': 'Five',
      'Signup Date': '24-Jul-2025',
      'Membership   Label': 'After School Program - 2 Days a Week',
      'Mbr.  Status': 'CURRENT',
    };

    expect(getMissingMemberCsvHeaders([row])).toEqual([]);
    expect(mapMemberCsvRows([row]).rows[0]).toMatchObject({
      name: 'Member Five',
      join_date: '24-Jul-2025',
      membership_type: 'After School Program - 2 Days a Week',
      status: 'Active',
    });
  });

  it('reports missing required headers instead of allowing a partial import', () => {
    expect(
      getMissingMemberCsvHeaders([
        {
          'First Name': 'Member',
          'Last Name': 'Four',
          Email: 'aarav@example.com',
          Phone: '6045551212',
        },
      ])
    ).toEqual(['Signup Date', 'Membership Label', 'Mbr. Status']);
  });
});
