// Characterization tests pinning current behavior of T02 modules before the
// ESLint burndown refactor. Outputs are compared as JSON strings.

jest.mock('@/lib/supabase/client', () => ({ supabase: {} }));

const mockLog: string[] = [];
jest.mock('@/lib/services/period.service', () => ({
  getAllPeriods: () => {
    mockLog.push('getAllPeriods');
    return Promise.resolve([
      { id: 'p-existing', start_date: '2026-01-01', end_date: '2026-01-15' },
    ]);
  },
  createPeriod: (start: string, end: string) => {
    mockLog.push(`createPeriod ${start} ${end}`);
    if (start === 'bad') {
      return Promise.reject(new Error('period boom'));
    }
    return Promise.resolve({ id: `p-new-${start}` });
  },
}));
jest.mock('@/lib/services/staff.service', () => ({
  getStaffByEmployeeId: (employeeId: string) => {
    mockLog.push(`getStaffByEmployeeId ${employeeId}`);
    if (employeeId === 'E1') {
      return Promise.resolve({ data: [{ id: 's-existing' }], error: null });
    }
    if (employeeId === 'ERR') {
      return Promise.resolve({ data: null, error: new Error('lookup boom') });
    }
    return Promise.resolve({ data: [], error: null });
  },
  createStaff: (staffData: { employee_id: string }) => {
    mockLog.push(`createStaff ${JSON.stringify(staffData)}`);
    if (staffData.employee_id === 'NOCREATE') {
      return Promise.resolve({ data: null, error: null });
    }
    return Promise.resolve({ data: { id: `s-new-${staffData.employee_id}` }, error: null });
  },
}));
jest.mock('@/lib/services/hours.service', () => ({
  setManualHours: (periodId: string, staffId: string, hours: unknown) => {
    mockLog.push(`setManualHours ${periodId} ${staffId} ${JSON.stringify(hours)}`);
    if (staffId === 's-existing' && periodId === 'p-existing') {
      return Promise.reject(new Error('hours boom'));
    }
    return Promise.resolve({});
  },
}));

import {
  buildMemberRoster,
  type DisplayMember,
  summarizeMemberPlans,
} from '@/lib/members/memberRoster';
import {
  migrateLegacyData,
  type ParsedLegacyData,
  parseLegacyData,
} from '@/lib/migration/payroll-migration';
import { parseQuickImport } from '@/lib/quick-import';
import { parseBookingEmail } from '@/lib/services/booking-parser';
import { parseCancellationEmail } from '@/lib/services/cancellation-parser';
import { mapMemberCsvRows } from '@/lib/services/member-import-parser';
import type { Cancellation, Hold, Member, Signup } from '@/types';

describe('memberRoster', () => {
  it('builds the roster with derived statuses', () => {
    const members = [
      { name: 'Ann', status: 'Active' },
      { name: 'Bo', name_normalized: 'BO ', status: 'Active' },
      { name: 'Cy', status: 'Inactive' },
      { name: 'Di', status: 'Active', last_sync_at: '2026-05-01T00:00:00Z' },
    ] as unknown as Member[];
    const signups = [
      { name: 'ann', membership_date: '2026-01-01T12:00:00Z' },
      { name: 'Ann', membership_date: 'nope', created_at: '2026-02-01T12:00:00Z' },
      { name: 'Cy', membership_date: 'nope', created_at: 'nope' },
      { name: 'Di', membership_date: '2025-01-01T12:00:00Z' },
    ] as unknown as Signup[];
    const cancellations = [
      { name: 'Ann', date: '2026-01-15T12:00:00Z' },
      { name: 'Di', date: '2026-03-01T12:00:00Z' },
      { name: 'Di', date: '2026-02-01T12:00:00Z' },
      { name: 'Cy', created_at: '2026-01-01T12:00:00Z' },
    ] as unknown as Cancellation[];
    const holds = [
      { name: 'bo', start: '2026-01-01T00:00:00Z' },
      { name: 'Cy', start: '2027-01-01T00:00:00Z' },
    ] as unknown as Hold[];
    const roster = buildMemberRoster({
      members,
      signups,
      cancellations,
      holds,
      now: new Date('2026-06-01T00:00:00Z'),
    });
    expect(JSON.stringify(roster)).toMatchInlineSnapshot(
      `"[{"name":"Ann","status":"Active","derivedStatus":"Active"},{"name":"Bo","name_normalized":"BO ","status":"Active","derivedStatus":"On Hold"},{"name":"Cy","status":"Inactive","derivedStatus":"Alumni"},{"name":"Di","status":"Active","last_sync_at":"2026-05-01T00:00:00Z","derivedStatus":"Active"}]"`
    );
  });

  it('summarizes plans', () => {
    const plans = [
      'Legacy Adult Annual',
      'Integrity Kids Semi-Annual',
      'special youth semi annual',
      'Flex 10 Adult',
      'flex 20 legacy integrity',
      undefined,
      'Other',
    ];
    const members = plans.map((membership_type) => ({ membership_type }) as DisplayMember);
    expect(JSON.stringify(summarizeMemberPlans(members))).toMatchInlineSnapshot(
      `"{"program":[["Legacy",2],["Integrity",2],["Special",1]],"age":[["Adults",2],["Kids",2]],"duration":[["Annual",1],["Semi-Annual",2]],"classPacks":[["Flex 10",1],["Flex 20",1]]}"`
    );
    expect(JSON.stringify(summarizeMemberPlans([]))).toMatchInlineSnapshot(
      `"{"program":[],"age":[],"duration":[],"classPacks":[]}"`
    );
  });
});

describe('payroll migration', () => {
  beforeEach(() => {
    mockLog.length = 0;
    localStorage.clear();
  });

  it('parses legacy localStorage data', () => {
    expect(JSON.stringify(parseLegacyData())).toMatchInlineSnapshot(
      `"{"staff":[],"hours":[],"periods":[]}"`
    );
    localStorage.setItem('staffMembers', JSON.stringify([{ id: 'a' }]));
    localStorage.setItem('staffHours', JSON.stringify({ not: 'array' }));
    localStorage.setItem('payrollPeriods', JSON.stringify([{ id: 'p' }]));
    localStorage.setItem('currentPeriod', JSON.stringify({ periodId: 'p' }));
    expect(JSON.stringify(parseLegacyData())).toMatchInlineSnapshot(
      `"{"staff":[{"id":"a"}],"hours":[],"periods":[{"id":"p"}],"currentPeriod":{"periodId":"p"}}"`
    );
    localStorage.setItem('staffHours', '{bad');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => parseLegacyData()).toThrow(/^Failed to parse legacy data: /);
    errorSpy.mockRestore();
  });

  it('migrates periods, staff and hours in order with progress', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const progress: string[] = [];
    const data = {
      periods: [
        { id: 'o1', label: 'L1', startDate: '2026-01-01', endDate: '2026-01-15' },
        { id: 'o2', label: 'L2', startDate: '2026-01-16', endDate: '2026-01-31' },
        { id: 'o3', label: 'L3', startDate: 'bad', endDate: 'x' },
      ],
      staff: [
        { id: 'a', payrollId: 'E1', name: 'A', jobTitle: 'Coach', isActive: true },
        { id: 'b', payrollId: 'E2', name: 'B', jobTitle: 'Desk', isActive: false },
        { id: 'c', payrollId: 'ERR', name: 'C', jobTitle: 'X', isActive: true },
        { id: 'd', payrollId: 'NOCREATE', name: 'D', jobTitle: 'X', isActive: true },
      ],
      hours: [
        {
          id: 'h1',
          staffId: 'b',
          periodId: 'o2',
          regularHours: 1,
          overtimeHours: 2,
          vacationHours: 3,
          matCleaningCount: 4,
          totalHours: 10,
        },
        {
          id: 'h2',
          staffId: 'a',
          periodId: 'o1',
          regularHours: 1,
          overtimeHours: 0,
          vacationHours: 0,
          matCleaningCount: 0,
          totalHours: 1,
        },
        {
          id: 'h3',
          staffId: 'zz',
          periodId: 'o1',
          regularHours: 1,
          overtimeHours: 0,
          vacationHours: 0,
          matCleaningCount: 0,
          totalHours: 1,
        },
        {
          id: 'h4',
          staffId: 'a',
          periodId: 'o3',
          regularHours: 1,
          overtimeHours: 0,
          vacationHours: 0,
          matCleaningCount: 0,
          totalHours: 1,
        },
      ],
    } as ParsedLegacyData;
    const result = await migrateLegacyData(data, (step, pct) => {
      progress.push(`${step}:${pct}`);
    });
    expect(JSON.stringify(result)).toMatchInlineSnapshot(
      `"{"success":false,"migrated":{"staff":1,"hours":1,"periods":1},"errors":["Failed to migrate period L3: period boom","Failed to migrate staff member C: lookup boom","Failed to migrate staff member D: Failed to create staff member","Failed to migrate hours for staff a: hours boom","Failed to migrate hours for staff zz: Staff member not found for ID zz","Failed to migrate hours for staff a: Period not found for ID o3"],"skipped":{"staff":1,"hours":0,"periods":1}}"`
    );
    expect(JSON.stringify(mockLog)).toMatchInlineSnapshot(
      `"["getAllPeriods","getAllPeriods","createPeriod 2026-01-16 2026-01-31","getAllPeriods","createPeriod bad x","getStaffByEmployeeId E1","getStaffByEmployeeId E2","createStaff {\\"employee_id\\":\\"E2\\",\\"full_name\\":\\"B\\",\\"job_title\\":\\"Desk\\",\\"is_active\\":false}","getStaffByEmployeeId ERR","getStaffByEmployeeId NOCREATE","createStaff {\\"employee_id\\":\\"NOCREATE\\",\\"full_name\\":\\"D\\",\\"job_title\\":\\"X\\",\\"is_active\\":true}","setManualHours p-new-2026-01-16 s-new-E2 {\\"regular_hours\\":1,\\"overtime_hours\\":2,\\"vacation_hours\\":3,\\"mat_cleaning_count\\":4}","setManualHours p-existing s-existing {\\"regular_hours\\":1,\\"overtime_hours\\":0,\\"vacation_hours\\":0,\\"mat_cleaning_count\\":0}"]"`
    );
    expect(JSON.stringify(progress)).toMatchInlineSnapshot(
      `"["Migrating payroll periods...:0","Migrating payroll periods...:8","Migrating payroll periods...:17","Migrating payroll periods...:25","Migrating staff members...:25","Migrating staff members...:31","Migrating staff members...:38","Migrating staff members...:44","Migrating staff members...:50","Migrating staff hours...:50","Migrating staff hours...:61","Migrating staff hours...:73","Migrating staff hours...:84","Migrating staff hours...:95","Migration complete:100"]"`
    );
    expect(JSON.stringify(errorSpy.mock.calls)).toMatchInlineSnapshot(
      `"[["Failed to migrate period L3: period boom"],["Failed to migrate staff member C: lookup boom"],["Failed to migrate staff member D: Failed to create staff member"],["Failed to migrate hours for staff a: hours boom"],["Failed to migrate hours for staff zz: Staff member not found for ID zz"],["Failed to migrate hours for staff a: Period not found for ID o3"]]"`
    );

    const empty = await migrateLegacyData({ periods: [], staff: [], hours: [] });
    expect(JSON.stringify(empty)).toMatchInlineSnapshot(
      `"{"success":true,"migrated":{"staff":0,"hours":0,"periods":0},"errors":[],"skipped":{"staff":0,"hours":0,"periods":0}}"`
    );

    const failed = await migrateLegacyData({ periods: [], staff: [], hours: [] }, () => {
      throw new Error('progress boom');
    });
    expect(JSON.stringify(failed)).toMatchInlineSnapshot(
      `"{"success":false,"migrated":{"staff":0,"hours":0,"periods":0},"errors":["Migration failed: progress boom"],"skipped":{"staff":0,"hours":0,"periods":0}}"`
    );
    errorSpy.mockRestore();
  });
});

describe('parsers', () => {
  it('parses booking emails', () => {
    const email =
      'Type: Adult BJJ Intro\r\nDate: September 4, 2026\r\nTime: 6:30 pm\r\nStaff: Coach A\r\nName: Jo Doe\r\nPhone: 555\r\nEmail: jo@x.com\r\n';
    expect(JSON.stringify(parseBookingEmail(email))).toMatchInlineSnapshot(
      `"{"className":"Adult BJJ Intro","month":"Sep","date":4,"year":2026,"time":"6:30 pm","staff":"Coach A","name":"Jo Doe","phone":"555","email":"jo@x.com"}"`
    );
    expect(
      JSON.stringify(parseBookingEmail(email.replace('September', 'Sept')))
    ).toMatchInlineSnapshot(
      `"{"className":"Adult BJJ Intro","month":"Sep","date":4,"year":2026,"time":"6:30 pm","staff":"Coach A","name":"Jo Doe","phone":"555","email":"jo@x.com"}"`
    );
    expect(
      JSON.stringify(parseBookingEmail(email.replace('Phone: 555', 'Phone: ')))
    ).toMatchInlineSnapshot(
      `"{"className":"Adult BJJ Intro","month":"Sep","date":4,"year":2026,"time":"6:30 pm","staff":"Coach A","name":"Jo Doe","phone":null,"email":"jo@x.com"}"`
    );
    // A blank field must not swallow the next line
    expect(parseBookingEmail(email.replace('Staff: Coach A', 'Staff:'))).toMatchObject({
      staff: '',
      name: 'Jo Doe',
    });
    expect(parseBookingEmail(email.replace('Name: Jo Doe', 'Name:'))).toBeNull();
    expect(parseBookingEmail(email.replace('Type: Adult BJJ Intro', 'Type:'))).toBeNull();
    for (const label of ['Type:', 'Date:', 'Time:', 'Staff:', 'Name:']) {
      expect(parseBookingEmail(email.replace(label, 'Nope:'))).toBeNull();
    }
    expect(parseBookingEmail(email.replace(', 2026', ' 2026'))).toBeNull();
  });

  it('parses cancellation email dates', () => {
    const make = (d: string) => `Name: X\nEffective date: ${d}`;
    const cases = [
      'Smarch 5, 2026 or 1/2/2026',
      'Smarch 5, 2026',
      'Sep 9 2026',
      '13/40/2026',
      'soon',
    ];
    expect(JSON.stringify(cases.map((d) => parseCancellationEmail(make(d))))).toMatchInlineSnapshot(
      `"[{"name":"X","date":"2026-01-02","reason":null,"month":"Jan","year":2026},{"name":"X","date":null,"reason":null,"month":"","year":null},{"name":"X","date":"2026-09-09","reason":null,"month":"Sep","year":2026},{"name":"X","date":"2026-13-40","reason":null,"month":"","year":2026},{"name":"X","date":null,"reason":null,"month":"","year":null}]"`
    );
  });

  it('totals quick import hours', () => {
    const text = '6 11am 1.5\n8 3pm asp\n3 7am mat clean\n\nbad line\n9 4pm asp 1.5\n10 5pm';
    expect(JSON.stringify(parseQuickImport(text))).toMatchInlineSnapshot(
      `"{"totalRegularHours":2.25,"totalOvertimeHours":1,"totalAfterSchoolHours":1,"totalAfterSchoolOvertimeHours":1,"entries":[{"day":6,"time":"11am","regularHours":0,"overtimeHours":1,"isAfterSchool":false,"hasMatClean":false},{"day":8,"time":"3pm","regularHours":1,"overtimeHours":0,"isAfterSchool":true,"hasMatClean":false},{"day":3,"time":"7am","regularHours":1.25,"overtimeHours":0,"isAfterSchool":false,"hasMatClean":true},{"day":9,"time":"4pm","regularHours":0,"overtimeHours":1,"isAfterSchool":true,"hasMatClean":false},{"day":10,"time":"5pm","regularHours":1,"overtimeHours":0,"isAfterSchool":false,"hasMatClean":false}],"errors":["Line 5: Invalid day \\"bad\\" - must be 1-31"]}"`
    );
  });

  it('maps member csv statuses', () => {
    const rows = ['CURRENT', 'NOT STARTED', 'HOLD', 'EXPIRED', ''].map((s, i) => ({
      'First Name': `N${i}`,
      'Last Name': 'L',
      'Mbr. Status': s,
      Email: i === 0 ? 'e@x' : '',
      Phone: i === 1 ? '1' : undefined,
      'Membership Label': i === 2 ? 'Plan' : ' ',
      'Signup Date': i === 3 ? '2026-01-01' : '',
    }));
    rows.push({ 'First Name': '', 'Last Name': '' } as (typeof rows)[number]);
    expect(JSON.stringify(mapMemberCsvRows(rows))).toMatchInlineSnapshot(
      `"{"rows":[{"name":"N0 L","status":"Active","email":"e@x"},{"name":"N1 L","status":"Active","phone":"1"},{"name":"N2 L","status":"On Hold","membership_type":"Plan"},{"name":"N3 L","status":"Inactive","join_date":"2026-01-01"},{"name":"N4 L","status":"Inactive"}],"skipped":1}"`
    );
  });
});
