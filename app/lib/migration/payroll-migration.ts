// app/lib/migration/payroll-migration.ts

import type { StaffHoursFormData, StaffMemberFormData } from '@/types';
import { createOrUpdateHours } from '../services/hours.service';
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
    console.error('Error checking for legacy data:', error);
    return false;
  }
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
    const staffData = localStorage.getItem('staffMembers');
    if (staffData) {
      const parsed = JSON.parse(staffData);
      result.staff = Array.isArray(parsed) ? parsed : [];
    }

    // Parse staff hours
    const hoursData = localStorage.getItem('staffHours');
    if (hoursData) {
      const parsed = JSON.parse(hoursData);
      result.hours = Array.isArray(parsed) ? parsed : [];
    }

    // Parse payroll periods
    const periodsData = localStorage.getItem('payrollPeriods');
    if (periodsData) {
      const parsed = JSON.parse(periodsData);
      result.periods = Array.isArray(parsed) ? parsed : [];
    }

    // Parse current period
    const currentPeriodData = localStorage.getItem('currentPeriod');
    if (currentPeriodData) {
      const parsed = JSON.parse(currentPeriodData);
      result.currentPeriod = parsed;
    }
  } catch (error) {
    console.error('Error parsing legacy data:', error);
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
    console.error('Error exporting legacy data:', error);
    throw new Error(
      `Failed to export legacy data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Migrate legacy data to Supabase with progress tracking
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Migration function requires sequential error handling for each data type
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
        const errorMsg = `Failed to migrate period ${legacyPeriod.label}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }

      onProgress?.(
        'Migrating payroll periods...',
        Math.round(((i + 1) / data.periods.length) * 25)
      );
    }

    // Step 2: Migrate staff members
    onProgress?.('Migrating staff members...', 25);
    const staffMapping = new Map<string, string>(); // old ID -> new ID

    for (let i = 0; i < data.staff.length; i++) {
      const legacyStaff = data.staff[i];
      if (!legacyStaff) {
        continue;
      }

      try {
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
        } else {
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
      } catch (error) {
        const errorMsg = `Failed to migrate staff member ${legacyStaff.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }

      onProgress?.(
        'Migrating staff members...',
        25 + Math.round(((i + 1) / data.staff.length) * 25)
      );
    }

    // Step 3: Migrate staff hours
    onProgress?.('Migrating staff hours...', 50);

    for (let i = 0; i < data.hours.length; i++) {
      const legacyHours = data.hours[i];
      if (!legacyHours) {
        continue;
      }

      try {
        // Map old IDs to new IDs
        const newStaffId = staffMapping.get(legacyHours.staffId);
        const newPeriodId = periodMapping.get(legacyHours.periodId);

        if (!newStaffId) {
          throw new Error(`Staff member not found for ID ${legacyHours.staffId}`);
        }

        if (!newPeriodId) {
          throw new Error(`Period not found for ID ${legacyHours.periodId}`);
        }

        // Create or update hours
        const hoursData: Partial<StaffHoursFormData> = {
          regular_hours: legacyHours.regularHours,
          overtime_hours: legacyHours.overtimeHours,
          vacation_hours: legacyHours.vacationHours,
          mat_cleaning_count: legacyHours.matCleaningCount,
          total_hours: legacyHours.totalHours,
          ...(legacyHours.notes && { notes: legacyHours.notes }),
        };

        await createOrUpdateHours(newPeriodId, newStaffId, hoursData);
        result.migrated.hours++;
      } catch (error) {
        const errorMsg = `Failed to migrate hours for staff ${legacyHours.staffId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }

      onProgress?.('Migrating staff hours...', 50 + Math.round(((i + 1) / data.hours.length) * 45));
    }

    // Step 4: Finalize
    onProgress?.('Migration complete', 100);
    result.success = result.errors.length === 0;

    return result;
  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    result.errors.push(errorMsg);
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
    console.error('Error cleaning up legacy data:', error);
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
    console.error('Error checking migration status:', error);
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
    console.error('Error setting migration skipped flag:', error);
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
    console.error('Error checking migration skipped status:', error);
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
