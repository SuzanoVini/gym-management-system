-- Database Performance Indexes
-- Run this in Supabase SQL Editor to improve query performance

-- ============================================================================
-- INTROS TABLE INDEXES
-- ============================================================================

-- Index for filtering by month (common filter)
CREATE INDEX IF NOT EXISTS idx_intros_month ON intros(month);

-- Index for filtering by staff (common filter)
CREATE INDEX IF NOT EXISTS idx_intros_staff ON intros(staff);

-- Index for filtering by class (common filter)
CREATE INDEX IF NOT EXISTS idx_intros_class ON intros(class);

-- Index for sorting by creation date (most common sort)
CREATE INDEX IF NOT EXISTS idx_intros_created_at ON intros(created_at DESC);

-- Index for filtering by attendance status
CREATE INDEX IF NOT EXISTS idx_intros_attended ON intros(attended);

-- Index for filtering by signup status
CREATE INDEX IF NOT EXISTS idx_intros_signed_up ON intros(signed_up);

-- Index for filtering by intro status
CREATE INDEX IF NOT EXISTS idx_intros_status ON intros(status);

-- Composite index for common query combination (month + staff)
CREATE INDEX IF NOT EXISTS idx_intros_month_staff ON intros(month, staff);

-- Composite index for conversion analysis (attended + signed_up)
CREATE INDEX IF NOT EXISTS idx_intros_attended_signed_up ON intros(attended, signed_up);

-- Composite index for active intros that need follow-up
-- Note: Removed WHERE clause to avoid immutability issues
CREATE INDEX IF NOT EXISTS idx_intros_active_unsigned ON intros(status, attended, signed_up);

-- ============================================================================
-- SIGNUPS TABLE INDEXES
-- ============================================================================

-- Index for filtering by month
CREATE INDEX IF NOT EXISTS idx_signups_month ON signups(month);

-- Index for filtering by membership type
CREATE INDEX IF NOT EXISTS idx_signups_membership ON signups(membership);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_signups_created_at ON signups(created_at DESC);

-- Index for filtering by signup package
CREATE INDEX IF NOT EXISTS idx_signups_package ON signups(signup_package);

-- Index for membership date queries
CREATE INDEX IF NOT EXISTS idx_signups_membership_date ON signups(membership_date);

-- ============================================================================
-- CANCELLATIONS TABLE INDEXES
-- ============================================================================

-- Index for filtering by month
CREATE INDEX IF NOT EXISTS idx_cancellations_month ON cancellations(month);

-- Index for filtering by reason (for analytics)
CREATE INDEX IF NOT EXISTS idx_cancellations_reason ON cancellations(reason);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_cancellations_created_at ON cancellations(created_at DESC);

-- Index for cancellation date queries
CREATE INDEX IF NOT EXISTS idx_cancellations_date ON cancellations(cancellation_date);

-- Index for age category analysis
CREATE INDEX IF NOT EXISTS idx_cancellations_age_category ON cancellations(age_category);

-- ============================================================================
-- HOLDS TABLE INDEXES
-- ============================================================================

-- Index for filtering by month
CREATE INDEX IF NOT EXISTS idx_holds_month ON holds(month);

-- Index for start date queries
CREATE INDEX IF NOT EXISTS idx_holds_start_date ON holds(start_date);

-- Index for end date queries
CREATE INDEX IF NOT EXISTS idx_holds_end_date ON holds(end_date);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_holds_created_at ON holds(created_at DESC);

-- Composite index for finding active holds (end_date in future)
CREATE INDEX IF NOT EXISTS idx_holds_active ON holds(end_date)
  WHERE end_date > NOW();

-- ============================================================================
-- FOLLOW-UP NOTES TABLE INDEXES
-- ============================================================================

-- Index for looking up notes by intro_id (most common query)
CREATE INDEX IF NOT EXISTS idx_follow_up_notes_intro_id ON follow_up_notes(intro_id);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_follow_up_notes_created_at ON follow_up_notes(created_at DESC);

-- Composite index for intro notes ordered by date
CREATE INDEX IF NOT EXISTS idx_follow_up_notes_intro_created ON follow_up_notes(intro_id, created_at DESC);

-- ============================================================================
-- INTRO CLASS HISTORY TABLE INDEXES
-- ============================================================================

-- Index for looking up history by intro_id (most common query)
CREATE INDEX IF NOT EXISTS idx_intro_class_history_intro_id ON intro_class_history(intro_id);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_intro_class_history_created_at ON intro_class_history(created_at DESC);

-- Index for month-based queries
CREATE INDEX IF NOT EXISTS idx_intro_class_history_month ON intro_class_history(month);

-- Composite index for intro history ordered by date
CREATE INDEX IF NOT EXISTS idx_intro_class_history_intro_created ON intro_class_history(intro_id, created_at DESC);

-- ============================================================================
-- SETTINGS TABLE INDEXES
-- ============================================================================

-- Index for looking up settings by key (most common query)
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

-- ============================================================================
-- PAYROLL TABLES INDEXES
-- ============================================================================

-- CSV_EXPORT_FORMATS TABLE
-- Index for filtering by format name (common lookup)
CREATE INDEX IF NOT EXISTS idx_csv_format_name ON csv_export_formats(format_name);

-- Index for finding default format (frequent query)
CREATE INDEX IF NOT EXISTS idx_csv_format_default ON csv_export_formats(is_default);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_csv_format_created_at ON csv_export_formats(created_at DESC);

-- STAFF_HOURS TABLE
-- Index for filtering by staff member
CREATE INDEX IF NOT EXISTS idx_staff_hours_staff ON staff_hours(staff_id);

-- Index for filtering by period
CREATE INDEX IF NOT EXISTS idx_staff_hours_period ON staff_hours(period_id);

-- Composite index for staff + period queries (most common)
CREATE INDEX IF NOT EXISTS idx_staff_hours_combined ON staff_hours(staff_id, period_id);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_staff_hours_created_at ON staff_hours(created_at DESC);

-- TIME_ENTRIES TABLE
-- Index for filtering by staff hours record
CREATE INDEX IF NOT EXISTS idx_time_entries_staff_hours ON time_entries(staff_hours_id);

-- Index for filtering by entry type
CREATE INDEX IF NOT EXISTS idx_time_entries_type ON time_entries(entry_type);

-- Index for sorting by entry date
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(entry_date DESC);

-- Index for after school program filtering
CREATE INDEX IF NOT EXISTS idx_time_entries_asp ON time_entries(is_after_school_program);

-- PAYROLL_PERIODS TABLE
-- Index for finding current period
CREATE INDEX IF NOT EXISTS idx_payroll_periods_current ON payroll_periods(is_current);

-- Index for finding closed periods
CREATE INDEX IF NOT EXISTS idx_payroll_periods_closed ON payroll_periods(is_closed);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_payroll_periods_dates ON payroll_periods(start_date, end_date);

-- STAFF_MEMBERS TABLE
-- Index for active staff filtering
CREATE INDEX IF NOT EXISTS idx_staff_members_active ON staff_members(is_active);

-- Index for employee ID lookups
CREATE INDEX IF NOT EXISTS idx_staff_members_employee_id ON staff_members(employee_id);

-- Index for name sorting
CREATE INDEX IF NOT EXISTS idx_staff_members_name ON staff_members(full_name);

-- ============================================================================

-- Update statistics for query planner optimization
ANALYZE intros;
ANALYZE signups;
ANALYZE cancellations;
ANALYZE holds;
ANALYZE follow_up_notes;
ANALYZE intro_class_history;
ANALYZE settings;
ANALYZE csv_export_formats;
ANALYZE staff_hours;
ANALYZE time_entries;
ANALYZE payroll_periods;
ANALYZE staff_members;

-- ============================================================================
-- VACUUM TABLES (OPTIONAL - CLEAN UP)
-- ============================================================================

-- Uncomment if you want to reclaim space and update statistics
-- VACUUM ANALYZE intros;
-- VACUUM ANALYZE signups;
-- VACUUM ANALYZE cancellations;
-- VACUUM ANALYZE holds;
-- VACUUM ANALYZE follow_up_notes;
-- VACUUM ANALYZE intro_class_history;
-- VACUUM ANALYZE settings;

-- ============================================================================
-- VERIFY INDEXES
-- ============================================================================

-- Run this query to verify indexes were created:
-- SELECT tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;
