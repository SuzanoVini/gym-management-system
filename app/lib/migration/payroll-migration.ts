// app/lib/migration/payroll-migration.ts

import { reportConsoleError } from '@/lib/logger';
import type { StaffHoursFormData, StaffMemberFormData } from '@/types';
import { setManualHours } from '../services/hours.service';
import { createPeriod, getAllPeriods } from '../services/period.service';
import { createStaff, getStaffByEmployeeId } from '../services/staff.service';

/**
 * Legacy localStorage data structure (from old payroll system)
 */
interface LegacyStaffMember {
  id: string;
  payrollId: string;
  name: string;
  jobTitle: string;
  isActive: boolean;
}

interface LegacyStaffHours {
  id: string;
  staffId: string;
  periodId: string;
  regularHours: number;
  overtimeHours: number;
  vacationHours: number;
  matCleaningCount: number;
  totalHours: number;
  notes?: string;
}

interface LegacyPayrollPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isClosed: boolean;
}

interface LegacyCurrentPeriod {
  periodId: string;
}

/**
 * Parsed legacy data structure
 */
export interface ParsedLegacyData {
  staff: LegacyStaffMember[];
  hours: LegacyStaffHours[];
  periods: LegacyPayrollPeriod[];
  currentPeriod?: LegacyCurrentPeriod | undefined;
}

/**
 * Migration result structure
 */
export interface MigrationResult {
  success: boolean;
  migrated: {
    staff: number;
    hours: number;
    periods: number;
  };
  errors: string[];
  skipped: {
    staff: number;
    hours: number;
    periods: number;
  };
}

/**
 * Migration progress callback
 */
export type MigrationProgressCallback = (step: string, progress: number) => void;

/**
 * Check if localStorage has payroll data from the old system
 */
export function hasLegacyData(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  try {
    const hasStaff = localStorage.getItem('staffMembers') !== null;
    const hasHours = localStorage.getItem('staffHours') !== null;
    const hasPeriods = localStorage.getItem('payrollPeriods') !== null;
    const hasCurrentPeriod = localStorage.getItem('currentPeriod') !== null;

    return hasStaff || hasHours || hasPeriods || hasCurrentPeriod;
  } catch (error) {
    reportConsoleError('Error checking for legacy data:', error);
    return false;
  }
}

// Read a JSON array from localStorage; a missing key or a non-array value yields [].
function readLegacyArray<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return [];
  }
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

/**
 * Parse localStorage data and transform to match new schema
 */
export function parseLegacyData(): ParsedLegacyData {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available');
  }

  const result: ParsedLegacyData = {
    staff: [],
    hours: [],
    periods: [],
    currentPeriod: undefined,
  };

  try {
    // Parse staff members
    result.staff = readLegacyArray<LegacyStaffMember>('staffMembers');

    // Parse staff hours
    result.hours = readLegacyArray<LegacyStaffHours>('staffHours');

    // Parse payroll periods
    result.periods = readLegacyArray<LegacyPayrollPeriod>('payrollPeriods');

    // Parse current period
    const currentPeriodData = localStorage.getItem('currentPeriod');
    if (currentPeriodData) {
      result.currentPeriod = JSON.parse(currentPeriodData) as LegacyCurrentPeriod;
    }
  } catch (error) {
    reportConsoleError('Error parsing legacy data:', error);
    throw new Error(
      `Failed to parse legacy data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
}

/**
 * Export legacy data to JSON file for backup
 */
export function exportLegacyDataToFile(): void {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  try {
    const legacyData = parseLegacyData();
    const dataStr = JSON.stringify(legacyData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    reportConsoleError('Error exporting legacy data:', error);
    throw new Error(
      `Failed to export legacy data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

// Record a failure on the result (and the console) without aborting the run.
function recordError(result: MigrationResult, errorMsg: string): void {
  reportConsoleError(errorMsg);
  result.errors.push(errorMsg);
}

/**
 * Step 1: migrate payroll periods, reusing any with the same date range.
 * Returns the legacy ID -> new ID mapping.
 */
async function migratePeriods(
  data: ParsedLegacyData,
  result: MigrationResult,
  onProgress?: MigrationProgressCallback
): Promise<Map<string, string>> {
  onProgress?.('Migrating payroll periods...', 0);
  const periodMapping = new Map<string, string>(); // old ID -> new ID

  for (let i = 0; i < data.periods.length; i++) {
    const legacyPeriod = data.periods[i];
    if (!legacyPeriod) {
      continue;
    }

    try {
      // Check if period already exists by date range
      const existingPeriods = await getAllPeriods();
      const existingPeriod = existingPeriods.find(
        (p) => p.start_date === legacyPeriod.startDate && p.end_date === legacyPeriod.endDate
      );

      if (existingPeriod) {
        // Period already exists, use its ID
        periodMapping.set(legacyPeriod.id, existingPeriod.id);
        result.skipped.periods++;
      } else {
        // Create new period
        const newPeriod = await createPeriod(legacyPeriod.startDate, legacyPeriod.endDate);
        periodMapping.set(legacyPeriod.id, newPeriod.id);
        result.migrated.periods++;
      }
    } catch (error) {
      recordError(result, `Failed to migrate period ${legacyPeriod.label}: ${errorMessage(error)}`);
    }

    onProgress?.('Migrating payroll periods...', Math.round(((i + 1) / data.periods.length) * 25));
  }

  return periodMapping;
}

/**
 * Migrate one staff member, reusing an existing one with the same payroll ID.
 */
async function migrateOneStaff(
  legacyStaff: LegacyStaffMember,
  staffMapping: Map<string, string>,
  result: MigrationResult
): Promise<void> {
  // Check if staff member already exists by payroll ID
  const existingStaffResult = await getStaffByEmployeeId(legacyStaff.payrollId);

  if (existingStaffResult.error) {
    throw existingStaffResult.error;
  }

  if (existingStaffResult.data && existingStaffResult.data.length > 0) {
    // Staff member already exists, use their ID
    const existingStaff = existingStaffResult.data[0];
    if (existingStaff) {
      staffMapping.set(legacyStaff.id, existingStaff.id);
      result.skipped.staff++;
    }
    return;
  }

  // Create new staff member
  const staffData: StaffMemberFormData = {
    employee_id: legacyStaff.payrollId,
    full_name: legacyStaff.name,
    job_title: legacyStaff.jobTitle,
    is_active: legacyStaff.isActive,
  };

  const createResult = await createStaff(staffData);

  if (createResult.error || !createResult.data) {
    throw createResult.error || new Error('Failed to create staff member');
  }

  staffMapping.set(legacyStaff.id, createResult.data.id);
  result.migrated.staff++;
}

/**
 * Step 2: migrate staff members. Returns the legacy ID -> new ID mapping.
 */
async function migrateStaffMembers(
  data: ParsedLegacyData,
  result: MigrationResult,
  onProgress?: MigrationProgressCallback
): Promise<Map<string, string>> {
  onProgress?.('Migrating staff members...', 25);
  const staffMapping = new Map<string, string>(); // old ID -> new ID

  for (let i = 0; i < data.staff.length; i++) {
    const legacyStaff = data.staff[i];
    if (!legacyStaff) {
      continue;
    }

    try {
      await migrateOneStaff(legacyStaff, staffMapping, result);
    } catch (error) {
      recordError(
        result,
        `Failed to migrate staff member ${legacyStaff.name}: ${errorMessage(error)}`
      );
    }

    onProgress?.('Migrating staff members...', 25 + Math.round(((i + 1) / data.staff.length) * 25));
  }

  return staffMapping;
}

/**
 * Migrate one legacy hours record through the manual-adjustment path.
 */
async function migrateOneHours(
  legacyHours: LegacyStaffHours,
  staffMapping: Map<string, string>,
  periodMapping: Map<string, string>
): Promise<void> {
  // Map old IDs to new IDs
  const newStaffId = staffMapping.get(legacyHours.staffId);
  const newPeriodId = periodMapping.get(legacyHours.periodId);

  if (!newStaffId) {
    throw new Error(`Staff member not found for ID ${legacyHours.staffId}`);
  }

  if (!newPeriodId) {
    throw new Error(`Period not found for ID ${legacyHours.periodId}`);
  }

  // total_hours and notes are derived/unsupported by the adjustment
  // mechanism — the trigger recomputes total_hours from the entries
  // this creates, and legacy notes aren't carried over
  const hoursData: Partial<StaffHoursFormData> = {
    regular_hours: legacyHours.regularHours,
    overtime_hours: legacyHours.overtimeHours,
    vacation_hours: legacyHours.vacationHours,
    mat_cleaning_count: legacyHours.matCleaningCount,
  };

  await setManualHours(newPeriodId, newStaffId, hoursData);
}

/**
 * Step 3: migrate staff hours using the staff and period ID mappings.
 */
async function migrateStaffHours(
  data: ParsedLegacyData,
  mappings: { staff: Map<string, string>; periods: Map<string, string> },
  result: MigrationResult,
  onProgress?: MigrationProgressCallback
): Promise<void> {
  onProgress?.('Migrating staff hours...', 50);

  for (let i = 0; i < data.hours.length; i++) {
    const legacyHours = data.hours[i];
    if (!legacyHours) {
      continue;
    }

    try {
      await migrateOneHours(legacyHours, mappings.staff, mappings.periods);
      result.migrated.hours++;
    } catch (error) {
      recordError(
        result,
        `Failed to migrate hours for staff ${legacyHours.staffId}: ${errorMessage(error)}`
      );
    }

    onProgress?.('Migrating staff hours...', 50 + Math.round(((i + 1) / data.hours.length) * 45));
  }
}

/**
 * Migrate legacy data to Supabase with progress tracking
 */
export async function migrateLegacyData(
  data: ParsedLegacyData,
  onProgress?: MigrationProgressCallback
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrated: {
      staff: 0,
      hours: 0,
      periods: 0,
    },
    errors: [],
    skipped: {
      staff: 0,
      hours: 0,
      periods: 0,
    },
  };

  try {
    // Step 1: Migrate payroll periods
    const periodMapping = await migratePeriods(data, result, onProgress);

    // Step 2: Migrate staff members
    const staffMapping = await migrateStaffMembers(data, result, onProgress);

    // Step 3: Migrate staff hours
    await migrateStaffHours(
      data,
      { staff: staffMapping, periods: periodMapping },
      result,
      onProgress
    );

    // Step 4: Finalize
    onProgress?.('Migration complete', 100);
    result.success = result.errors.length === 0;

    return result;
  } catch (error) {
    recordError(result, `Migration failed: ${errorMessage(error)}`);
    return result;
  }
}

/**
 * Clean up localStorage after successful migration
 */
export function cleanupLegacyData(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem('staffMembers');
    localStorage.removeItem('staffHours');
    localStorage.removeItem('payrollPeriods');
    localStorage.removeItem('currentPeriod');

    // Set flag to indicate migration has been completed
    localStorage.setItem('payroll_migration_completed', 'true');
    localStorage.setItem('payroll_migration_date', new Date().toISOString());
  } catch (error) {
    reportConsoleError('Error cleaning up legacy data:', error);
  }
}

/**
 * Check if migration has already been completed
 */
export function isMigrationCompleted(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem('payroll_migration_completed') === 'true';
  } catch (error) {
    reportConsoleError('Error checking migration status:', error);
    return false;
  }
}

/**
 * Set flag to skip migration (user chose to skip)
 */
export function setMigrationSkipped(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem('payroll_migration_skipped', 'true');
    localStorage.setItem('payroll_migration_skipped_date', new Date().toISOString());
  } catch (error) {
    reportConsoleError('Error setting migration skipped flag:', error);
  }
}

/**
 * Check if user has chosen to skip migration
 */
export function isMigrationSkipped(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return false;
  }

  try {
    return localStorage.getItem('payroll_migration_skipped') === 'true';
  } catch (error) {
    reportConsoleError('Error checking migration skipped status:', error);
    return false;
  }
}

/**
 * Check if migration dialog should be shown
 * Returns true if:
 * - Legacy data exists
 * - Migration has not been completed
 * - User has not chosen to skip
 */
export function shouldShowMigrationDialog(): boolean {
  return hasLegacyData() && !isMigrationCompleted() && !isMigrationSkipped();
}
