import type { SignupCsvRecord } from '@/lib/csv';
import type { Signup } from '@/types';

export function filterNewSignupRecords(
  records: SignupCsvRecord[],
  signups: Signup[],
  importYear: number
) {
  return records.filter((row) => {
    if (!row.name || !row.month) {
      return false;
    }
    const isDuplicate = signups.some((signup) => {
      if (signup.name.toLowerCase().trim() !== row.name.toLowerCase().trim()) {
        return false;
      }
      if (signup.membership_date && row.membership_date) {
        return signup.membership_date === row.membership_date;
      }
      return signup.month === row.month && String(signup.year) === String(importYear);
    });
    return !isDuplicate;
  });
}
