import type { SignupCsvRecord } from '@/lib/csv';
import type { Signup } from '@/types';
import { filterNewSignupRecords } from '../signupImportRecords';

const signup = (overrides: Partial<Signup>): Signup => ({
  id: 'signup-id',
  created_at: '2025-01-01T00:00:00.000Z',
  month: 'Jan',
  name: 'Ava Example',
  membership: 'Integrity',
  ...overrides,
});

const record = (overrides: Partial<SignupCsvRecord>): SignupCsvRecord => ({
  month: 'Jan',
  name: 'Ava Example',
  membership: 'Integrity',
  membership_date: undefined,
  first_payment_date: undefined,
  signup_package: false,
  notes: '',
  year: 2025,
  ...overrides,
});

describe('filterNewSignupRecords', () => {
  it('keeps source order and applies the existing name, date, month, and year duplicate rules', () => {
    const records = [
      record({ name: ' Ava Example ', membership_date: '2025-01-03' }),
      record({ month: 'Feb', membership_date: '2025-02-03' }),
      record({ month: 'Jan' }),
      record({ month: 'Dec', year: 2024 }),
      record({ name: '', month: 'Mar' }),
    ];
    const signups = [
      signup({ name: 'ava example', membership_date: '2025-01-03' }),
      signup({ name: 'Ava Example', month: 'Jan', year: 2025 }),
    ];

    expect(filterNewSignupRecords(records, signups, 2025)).toEqual([records[1], records[3]]);
  });
});
