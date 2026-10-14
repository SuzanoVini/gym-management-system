import { getHoursForPeriod } from '@/lib/services/hours.service';
import { parseDate } from '@/lib/utils/date.utils';
import { escapeCsvValue } from '@/lib/utils/export.utils';
import type {
  CSVColumnConfig,
  CSVExportFormat,
  CSVStaffOrderConfig,
  PayrollPeriod,
  StaffHours,
  StaffMember,
} from '@/types';

type RowBuilder = (h: StaffHours, s: StaffMember | undefined) => string[];

interface RowContext {
  h: StaffHours;
  staffMember: StaffMember | undefined;
  fullName: string;
  firstName: string;
  lastName: string;
}

// Default format matching accountant template
const DEFAULT_HEADERS = [
  'Employee name',
  'Employee payroll ID',
  'First name',
  'Last name',
  'job id',
  'Department name',
  'Overtime',
  'Regular Pay',
  'Sick Pay',
  'Vacation Pay',
  'External ID',
  'Job Title',
];

// Value per configurable column key; unknown keys export as ''.
// job_id, department_name, external_id and job_title are not stored in the database, so they stay empty.
const COLUMN_VALUES = new Map<string, (ctx: RowContext) => string>([
  ['staff_name', (ctx) => ctx.fullName],
  ['employee_id', (ctx) => ctx.staffMember?.employee_id || ''],
  ['first_name', (ctx) => ctx.firstName],
  ['last_name', (ctx) => ctx.lastName],
  ['job_id', () => ''],
  ['department_name', () => ''],
  ['overtime_hours', (ctx) => ctx.h.overtime_hours.toFixed(2)],
  ['regular_hours', (ctx) => ctx.h.regular_hours.toFixed(2)],
  ['sick_hours', (ctx) => ctx.h.sick_hours.toFixed(2)],
  ['vacation_hours', (ctx) => ctx.h.vacation_hours.toFixed(2)],
  ['external_id', () => ''],
  ['job_title', () => ''],
]);

function buildRowContext(h: StaffHours, staffMember: StaffMember | undefined): RowContext {
  // Split full name into first and last name
  const fullName = staffMember?.full_name || 'Unknown';
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  return { h, staffMember, fullName, firstName, lastName };
}

function sortHoursByStaffOrder(
  periodHours: StaffHours[],
  staff: StaffMember[],
  staffOrderConfig: CSVStaffOrderConfig
): StaffHours[] {
  const { type, direction } = staffOrderConfig;

  return [...periodHours].sort((a, b) => {
    const staffA = staff.find((s) => s.id === a.staff_id);
    const staffB = staff.find((s) => s.id === b.staff_id);

    const compareValue =
      type === 'name'
        ? (staffA?.full_name || '').localeCompare(staffB?.full_name || '')
        : (staffA?.employee_id || '').localeCompare(staffB?.employee_id || '');

    return direction === 'asc' ? compareValue : -compareValue;
  });
}

function buildConfiguredColumns(columnConfig: CSVColumnConfig[]): {
  headers: string[];
  rowBuilder: RowBuilder;
} {
  // Use format configuration
  const enabledColumns = columnConfig.filter((col) => col.enabled);
  const headers = enabledColumns.map((col) => col.label);

  const rowBuilder: RowBuilder = (h, staffMember) => {
    const ctx = buildRowContext(h, staffMember);
    return enabledColumns.map((col) => {
      const getValue = COLUMN_VALUES.get(col.key);
      return getValue ? getValue(ctx) : '';
    });
  };

  return { headers, rowBuilder };
}

const defaultRowBuilder: RowBuilder = (h, staffMember) => {
  const { fullName, firstName, lastName } = buildRowContext(h, staffMember);

  return [
    fullName,
    staffMember?.employee_id || '',
    firstName,
    lastName,
    '', // job id - not stored
    '', // Department name - not stored
    h.overtime_hours.toFixed(2),
    h.regular_hours.toFixed(2),
    h.sick_hours.toFixed(2),
    h.vacation_hours.toFixed(2),
    '', // External ID - not stored
    '', // Job Title - not stored
  ];
};

// Format dates for the header (mm/dd/yyyy); parseDate avoids the UTC
// day-shift of new Date('YYYY-MM-DD')
function formatHeaderDate(dateStr: string) {
  const date = parseDate(dateStr);
  if (!date) {
    return dateStr;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function buildCsvContent(period: PayrollPeriod, headers: string[], rows: string[][]): string {
  const dateRange = `${formatHeaderDate(period.start_date)}-${formatHeaderDate(period.end_date)}`;

  // Build CSV with exact accountant template structure:
  // Row 1: "Summary Report - Kitsilano Brazilian Jiu Jitsu Inc."
  // Row 2: Date range
  // Row 3: Blank
  // Row 4: Column headers
  // Row 5+: Data rows
  const csvLines = [
    ['Summary Report - Kitsilano Brazilian Jiu Jitsu Inc.'],
    [dateRange],
    [], // Blank row
    headers,
    ...rows,
  ];

  return csvLines.map((row) => row.map((cell) => escapeCsvValue(cell)).join(',')).join('\n');
}

function downloadCsv(csvContent: string, period: PayrollPeriod) {
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `payroll_${period.period_label.replace(/\//g, '-')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function loadFormatConfig(formatId: string | undefined): Promise<CSVExportFormat | null> {
  // Get format configuration
  let formatConfig = null;
  if (formatId) {
    const { getFormatById } = await import('@/lib/services/csv-format.service');
    const result = await getFormatById(formatId);
    if (result.error) {
      throw result.error;
    }
    formatConfig = result.data;
  }
  return formatConfig;
}

/** Builds the payroll CSV for a period and triggers the browser download. Throws on failure. */
export async function exportPayrollPeriodCsv({
  periods,
  staff,
  periodId,
  formatId,
}: {
  periods: PayrollPeriod[];
  staff: StaffMember[];
  periodId: string;
  formatId: string | undefined;
}): Promise<void> {
  const period = periods.find((p) => p.id === periodId);
  if (!period) {
    throw new Error('Period not found');
  }

  const formatConfig = await loadFormatConfig(formatId);

  // Fetch hours for the selected period — in-memory hours only cover the
  // current period, so exporting any other period needs its own query
  let periodHours = await getHoursForPeriod(periodId);

  // Apply staff ordering based on format configuration
  if (formatConfig?.staff_order_config) {
    periodHours = sortHoursByStaffOrder(periodHours, staff, formatConfig.staff_order_config);
  }

  // Build CSV based on format configuration
  const { headers, rowBuilder } = formatConfig?.column_config
    ? buildConfiguredColumns(formatConfig.column_config)
    : { headers: DEFAULT_HEADERS, rowBuilder: defaultRowBuilder };

  const rows = periodHours.map((h) => {
    const staffMember = staff.find((s) => s.id === h.staff_id);
    return rowBuilder(h, staffMember);
  });

  downloadCsv(buildCsvContent(period, headers, rows), period);
}
