// What each account role can do. Kept in one place so the role picker, the
// permissions card and the API agree; the database RLS policies enforce it.
export type UserRole = 'owner' | 'staff';

export const USER_ROLES: UserRole[] = ['staff', 'owner'];

export const isUserRole = (value: unknown): value is UserRole =>
  value === 'owner' || value === 'staff';

export const ROLE_INFO: Record<
  UserRole,
  { label: string; summary: string; can: string[]; cannot: string[] }
> = {
  staff: {
    label: 'Staff',
    summary: 'Day-to-day front desk work.',
    can: [
      'View the dashboard, insights and member roster',
      'Add, edit and import intros, sign-ups, holds and cancellations',
      'Log follow-ups and notes, and mark spam bookings',
      'View settings lists (class types, reasons, membership types)',
    ],
    cannot: [
      'Open Payroll',
      'Open User Management',
      'Change settings lists or the revenue-per-member value',
    ],
  },
  owner: {
    label: 'Owner',
    summary: 'Full access, including money and accounts.',
    can: [
      'Everything staff can do',
      'Run payroll: staff, periods, hours, imports and exports',
      'Create accounts, reset passwords, change roles and delete accounts',
      'Edit settings lists, class mappings and the revenue-per-member value',
    ],
    cannot: [],
  },
};
