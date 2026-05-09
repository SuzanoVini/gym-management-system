// types/index.ts

/**
 * Base interface for all database records
 */
export interface BaseRecord {
  id: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Intro record - represents a potential new member introduction
 */
export interface Intro extends BaseRecord {
  month: string;
  date?: string; // Changed from number to string
  year?: number;
  time?: string;
  class: string;
  name: string;
  email?: string;
  phone?: string;
  staff: string;
  attended?: 'Yes' | 'No'; // Removed ''
  signed_up?: 'Yes' | 'No'; // Removed ''
  status?: 'Active' | 'Cancelled' | 'Completed';
  follow_up_status?: string;
  last_follow_up?: string;
  followup_1_at?: string | null;
  followup_2_at?: string | null;
  created_by?: string;
  // Relations
  follow_up_notes?: FollowUpNote[];
  intro_class_history?: ClassHistory[];
}

/**
 * Signup record - represents a new member who has joined
 */
export interface Signup extends BaseRecord {
  month: string;
  name: string;
  membership: string; // Changed to string for dynamic types
  membership_date?: string;
  first_payment_date?: string;
  signup_package?: boolean;
  notes?: string;
  year?: number;
  created_by?: string;
  // biome-ignore lint/suspicious/noExplicitAny: Index signature for dynamic CSV fields
  [key: string]: any;
}

/**
 * Cancellation record - represents a member who has cancelled
 */
export interface Cancellation extends BaseRecord {
  month: string;
  name: string;
  date?: string; // Renamed from cancellation_date
  reason?: string;
  age_group?: string;
  notes?: string;
  year?: number;
  created_by?: string;
  // biome-ignore lint/suspicious/noExplicitAny: Index signature for dynamic CSV fields
  [key: string]: any;
}

/**
 * Hold record - represents a member who has put their membership on hold
 */
export interface Hold extends BaseRecord {
  month: string;
  name: string;
  start?: string; // Renamed from start_date
  end?: string; // Renamed from end_date
  reason?: string;
  fee?: string;
  year?: number;
  created_by?: string;
}

/**
 * Follow-up note - notes added to an intro for tracking
 */
export interface FollowUpNote {
  id: string;
  intro_id: string;
  note: string;
  created_at: string;
  created_by?: string;
  staff_name?: string;
}

/**
 * Class history - tracks multiple class attendances for an intro
 */
export interface ClassHistory {
  id: string;
  intro_id: string;
  month: string;
  date?: string; // Changed from number to string
  time?: string;
  class?: string;
  staff?: string;
  attended?: 'Yes' | 'No'; // Removed ''
  notes?: string;
  created_at: string;
}

/**
 * Settings record - stores app configuration
 */
export interface Settings {
  id: string;
  key: string;
  // biome-ignore lint/suspicious/noExplicitAny: Settings value can be any JSON type
  value: any;
  updated_at: string;
}

/**
 * User profile record - stores user information
 */
export interface UserProfile extends BaseRecord {
  full_name: string;
  avatar_url?: string | null;
  role: 'owner' | 'staff';
}

// ============================================================================
// API Response Types
// ============================================================================

export type ApiResponse<T> = {
  data: T | null;
  error: Error | null;
};

export type ApiResult<T> = Promise<ApiResponse<T>>;

// ============================================================================
// Filter & Query Types
// ============================================================================

export type DateRangeFilter = 'all' | '1month' | '3months' | '6months' | 'year' | 'ytd' | 'custom';

export type SortOrder = 'newest' | 'oldest';

export type StatusFilter = 'all' | 'Active' | 'Cancelled' | 'Completed';

export type AttendanceFilter = 'all' | 'Yes' | 'No'; // Removed ''

export type SignedUpFilter = 'all' | 'Yes' | 'No'; // Removed ''

/**
 * Query options for fetching intros
 */
export interface IntroQueryOptions {
  limit?: number;
  offset?: number;
  month?: string;
  staff?: string;
  class?: string;
  attended?: AttendanceFilter;
  signed_up?: SignedUpFilter;
  status?: StatusFilter;
  includeHistory?: boolean;
  sortOrder?: SortOrder;
}

/**
 * Query options for fetching signups
 */
export interface SignupQueryOptions {
  limit?: number;
  offset?: number;
  month?: string;
  membership?: string;
  sortOrder?: SortOrder;
}

/**
 * Query options for fetching cancellations
 */
export interface CancellationQueryOptions {
  limit?: number;
  offset?: number;
  month?: string;
  reason?: string;
  ageGroup?: string;
  sortOrder?: SortOrder;
}

/**
 * Query options for fetching holds
 */
export interface HoldQueryOptions {
  limit?: number;
  offset?: number;
  month?: string;
  reason?: string;
  holdStatus?: string;
  sortOrder?: SortOrder;
}

// ============================================================================
// Form Data Types
// ============================================================================

/**
 * Form data for creating/updating an intro
 */
export type IntroFormData = Omit<
  Intro,
  'id' | 'created_at' | 'updated_at' | 'follow_up_notes' | 'intro_class_history'
>;

/**
 * Form data for creating/updating a signup
 */
export type SignupFormData = Omit<Signup, 'id' | 'created_at' | 'updated_at'>;

/**
 * Form data for creating/updating a cancellation
 */
export type CancellationFormData = Omit<Cancellation, 'id' | 'created_at' | 'updated_at'>;

/**
 * Form data for creating/updating a hold
 */
export type HoldFormData = Omit<Hold, 'id' | 'created_at' | 'updated_at'>;

/**
 * Form data for creating/updating a class history entry
 */
export type ClassHistoryFormData = Omit<ClassHistory, 'id' | 'created_at'>;

/**
 * Form data for creating/updating a follow-up note
 */
export type FollowUpNoteFormData = Omit<FollowUpNote, 'id' | 'created_at'>;

/**
 * Form data for creating/updating a user profile
 */
export type ProfileFormData = Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;

// ============================================================================
// Analytics & Stats Types
// ============================================================================

/**
 * Staff performance statistics
 */
export interface StaffStats {
  name: string;
  totalIntros: number;
  attended: number;
  signedUp: number;
  conversionRate: number;
  label: string; // e.g., "15/20 (75%)"
}

/**
 * Class performance statistics
 */
export interface ClassStats {
  name: string;
  intros: number;
  attended: number;
  signups: number;
  conversionRate: number;
}

/**
 * Monthly data point for charts
 */
export interface MonthlyData {
  month: string;
  Intros: number;
  'Sign-ups': number;
  Cancellations: number;
  'Net Growth': number;
}

/**
 * Conversion funnel data
 */
export interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
  countLabel: string;
}

/**
 * Chart data for membership breakdown
 */
export interface ChartData {
  name: string;
  value: number;
}

// ============================================================================
// Insight Types
// ============================================================================

export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';

export type InsightCategory = 'conversion' | 'retention' | 'financial' | 'operational' | 'growth';

export type InsightColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

/**
 * Business insight with actionable recommendations
 */
export interface Insight {
  id: string;
  title: string;
  message: string;
  icon: string; // Lucide React icon component name
  color: InsightColor;
  priority: InsightPriority;
  actions: string[];
  impact?: string;
  category: InsightCategory;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pagination info
 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Modal state
 */
export interface ModalState {
  isOpen: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: Modal data can be any record type
  data?: any;
}

/**
 * Loading state
 */
export interface LoadingState {
  isLoading: boolean;
  error?: Error;
}

/**
 * Filter state
 */
export interface FilterState {
  month: string;
  staff: string;
  class: string;
  status: StatusFilter;
  searchTerm: string;
  reason: string;
  ageGroup: string;
  membership: string;
  holdStatus: string;
}

// ============================================================================
// Export/Import Types
// ============================================================================

/**
 * CSV export options
 */
export interface ExportOptions {
  filename?: string;
  dateRange?: DateRangeFilter;
  includeHeaders?: boolean;
}

/**
 * CSV import result
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors?: string[];
}

// ============================================================================
// Payroll Types
// ============================================================================

/**
 * Payroll period record - defines pay cycles (1st-15th, 16th-31st)
 */
export interface PayrollPeriod extends BaseRecord {
  period_label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
}

/**
 * Staff member record - represents an employee or contractor
 */
export interface StaffMember extends BaseRecord {
  employee_id: string;
  full_name: string;
  job_title: string;
  is_active: boolean;
}

/**
 * Staff hours record - tracks staff work time for a payroll period
 */
export interface StaffHours extends BaseRecord {
  period_id: string;
  staff_id: string;
  regular_hours: number;
  overtime_hours: number;
  vacation_hours: number;
  sick_hours: number;
  mat_cleaning_count: number;
  total_hours: number;
  notes?: string;
}

/**
 * Time entry record - individual time entries for staff hours
 */
export interface TimeEntry {
  id: string;
  staff_hours_id: string;
  entry_date: string;
  hours: number;
  entry_type: 'regular' | 'overtime' | 'vacation' | 'mat_cleaning' | 'sick';
  notes?: string;
  is_after_school_program: boolean;
  created_at: string;
}

/**
 * Form data for creating/updating a payroll period
 */
export type PayrollPeriodFormData = Omit<PayrollPeriod, 'id' | 'created_at' | 'updated_at'>;

/**
 * Form data for creating/updating a staff member
 */
export type StaffMemberFormData = Omit<StaffMember, 'id' | 'created_at' | 'updated_at'>;

/**
 * Form data for creating/updating staff hours
 */
export type StaffHoursFormData = Omit<StaffHours, 'id' | 'created_at' | 'updated_at'>;

/**
 * Form data for creating/updating a time entry
 */
export type TimeEntryFormData = Omit<TimeEntry, 'id' | 'created_at'>;

/**
 * CSV column configuration - defines a single column in CSV export
 */
export interface CSVColumnConfig {
  key: string; // Field key (e.g., 'staff_name', 'employee_id')
  label: string; // Column header label
  enabled: boolean; // Whether to include this column in export
}

/**
 * CSV staff order configuration - defines how to order staff rows
 */
export interface CSVStaffOrderConfig {
  type: 'id' | 'name' | 'custom'; // Order by employee ID, name, or custom
  direction: 'asc' | 'desc'; // Ascending or descending
  customOrder?: string[]; // Array of staff IDs in custom order (if type is 'custom')
}

/**
 * CSV export format - complete format configuration
 */
export interface CSVExportFormat extends BaseRecord {
  format_name: string;
  is_default: boolean;
  column_config: CSVColumnConfig[];
  staff_order_config: CSVStaffOrderConfig;
}

/**
 * Form data for creating/updating a CSV export format
 */
export type CSVExportFormatFormData = Omit<CSVExportFormat, 'id' | 'created_at' | 'updated_at'>;

/**
 * Field mapping confidence level
 */
export type MappingConfidence = 'exact' | 'partial' | 'guess' | 'none';

/**
 * CSV template field mapping - maps a CSV column to a database field
 */
export interface FieldMapping {
  csvColumn: string; // Original CSV column name
  dbField: string; // Database field key (e.g., 'staff_name', 'regular_hours')
  confidence: MappingConfidence; // How confident the automatic mapping is
  suggested?: boolean; // Whether this was auto-suggested
}

/**
 * CSV template analysis result
 */
export interface TemplateAnalysisResult {
  headers: string[]; // Original CSV headers
  rowCount: number; // Number of data rows (excluding header)
  sampleData: Record<string, string>[]; // First 3 rows as sample
  fieldMappings: FieldMapping[]; // Automatic field mappings
  unmappedColumns: string[]; // CSV columns that couldn't be mapped
  missingFields: string[]; // Required DB fields not found in CSV
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid Intro
 */
// biome-ignore lint/suspicious/noExplicitAny: Type guard requires any to check unknown values
export function isIntro(value: any): value is Intro {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'month' in value &&
    'date' in value
  );
}

/**
 * Check if a value is a valid Signup
 */
// biome-ignore lint/suspicious/noExplicitAny: Type guard requires any to check unknown values
export function isSignup(value: any): value is Signup {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'membership' in value
  );
}
