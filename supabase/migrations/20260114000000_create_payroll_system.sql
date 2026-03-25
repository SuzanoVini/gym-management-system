-- ============================================
-- PAYROLL SYSTEM TABLES
-- ============================================
-- This migration creates tables for the payroll management system:
-- - staff_members: Employee information
-- - payroll_periods: Bi-weekly payroll periods
-- - staff_hours: Aggregated hours per staff per period
-- - time_entries: Detailed time entry audit trail
-- - app_configuration: System settings and constants

-- ==============================================
-- TABLE: staff_members
-- Purpose: Store staff member information
-- ==============================================
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(10) UNIQUE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  job_title VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT check_staff_name_not_empty CHECK (LENGTH(TRIM(full_name)) > 0),
  CONSTRAINT check_staff_title_not_empty CHECK (LENGTH(TRIM(job_title)) > 0)
);

-- Indexes for staff_members
CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff_members(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_full_name ON staff_members(full_name);
CREATE INDEX IF NOT EXISTS idx_staff_created_at ON staff_members(created_at DESC);

COMMENT ON TABLE staff_members IS 'Stores employee information including name, ID, and job title';
COMMENT ON COLUMN staff_members.is_active IS 'Soft delete flag - false means employee is inactive/deleted';
COMMENT ON COLUMN staff_members.employee_id IS 'Employee ID from payroll system (e.g., 1023, 1030)';

-- ==============================================
-- TABLE: payroll_periods
-- Purpose: Store payroll period configurations
-- ==============================================
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT check_period_dates CHECK (end_date >= start_date),
  CONSTRAINT check_period_display_name_not_empty CHECK (LENGTH(TRIM(display_name)) > 0)
);

-- Indexes for payroll_periods
CREATE INDEX IF NOT EXISTS idx_payroll_period_dates ON payroll_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_period_current ON payroll_periods(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_payroll_period_created_at ON payroll_periods(created_at DESC);

-- Unique constraint: Only one period can be current at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_only_one_current_period ON payroll_periods(is_current) WHERE is_current = true;

COMMENT ON TABLE payroll_periods IS 'Stores payroll period definitions (typically bi-weekly: 1-15 and 16-end of month)';
COMMENT ON COLUMN payroll_periods.is_current IS 'Only one period can be current at a time (enforced by unique index)';

-- ==============================================
-- TABLE: staff_hours
-- Purpose: Aggregated hours per staff per period
-- ==============================================
CREATE TABLE IF NOT EXISTS staff_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  regular_hours NUMERIC(6,2) DEFAULT 0 CHECK (regular_hours >= 0),
  overtime_hours NUMERIC(6,2) DEFAULT 0 CHECK (overtime_hours >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT unique_staff_period UNIQUE (staff_member_id, payroll_period_id)
);

-- Indexes for staff_hours
CREATE INDEX IF NOT EXISTS idx_staff_hours_staff ON staff_hours(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_staff_hours_period ON staff_hours(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_staff_hours_combined ON staff_hours(staff_member_id, payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_staff_hours_created_at ON staff_hours(created_at DESC);

COMMENT ON TABLE staff_hours IS 'Aggregated hours worked by each staff member for each payroll period';
COMMENT ON COLUMN staff_hours.regular_hours IS 'Total regular hours worked (including mat cleaning bonuses)';
COMMENT ON COLUMN staff_hours.overtime_hours IS 'Total overtime hours worked';

-- ==============================================
-- TABLE: time_entries
-- Purpose: Detailed time entry audit trail
-- ==============================================
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('regular', 'overtime', 'mat_clean')),
  hours NUMERIC(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  notes TEXT,
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'pdf', 'quick_import')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for time_entries
CREATE INDEX IF NOT EXISTS idx_time_entries_staff ON time_entries(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_period ON time_entries(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_time_entries_source ON time_entries(source);
CREATE INDEX IF NOT EXISTS idx_time_entries_type ON time_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_time_entries_created_at ON time_entries(created_at DESC);

-- Composite index for common query (staff + period)
CREATE INDEX IF NOT EXISTS idx_time_entries_staff_period ON time_entries(staff_member_id, payroll_period_id);

COMMENT ON TABLE time_entries IS 'Detailed audit trail of individual time entries';
COMMENT ON COLUMN time_entries.source IS 'How the entry was created: manual, csv, pdf, or quick_import';
COMMENT ON COLUMN time_entries.entry_type IS 'Type of hours: regular, overtime, or mat_clean';

-- ==============================================
-- TABLE: app_configuration
-- Purpose: Application settings and constants
-- ==============================================
CREATE TABLE IF NOT EXISTS app_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT check_config_key_not_empty CHECK (LENGTH(TRIM(config_key)) > 0)
);

-- Index for app_configuration
CREATE INDEX IF NOT EXISTS idx_config_key ON app_configuration(config_key);

COMMENT ON TABLE app_configuration IS 'Key-value store for application configuration (replaces hardcoded constants)';
COMMENT ON COLUMN app_configuration.config_value IS 'JSON value - can be string, number, array, or object';

-- ==============================================
-- VIEWS
-- ==============================================

-- View 1: staff_hours_summary
-- Purpose: Main table display with all staff and their hours for current period
CREATE OR REPLACE VIEW staff_hours_summary AS
SELECT
  sm.id as staff_id,
  sm.employee_id,
  sm.full_name,
  sm.job_title,
  COALESCE(sh.regular_hours, 0) as regular_hours,
  COALESCE(sh.overtime_hours, 0) as overtime_hours,
  COALESCE(sh.regular_hours, 0) + COALESCE(sh.overtime_hours, 0) as total_hours,
  pp.id as period_id,
  pp.display_name as period
FROM staff_members sm
LEFT JOIN payroll_periods pp ON pp.is_current = true
LEFT JOIN staff_hours sh ON sm.id = sh.staff_member_id AND sh.payroll_period_id = pp.id
WHERE sm.is_active = true
ORDER BY sm.full_name, sm.job_title;

COMMENT ON VIEW staff_hours_summary IS 'Combines staff members with their hours for the current period';

-- View 2: department_mappings
-- Purpose: Department and job ID assignment for export
CREATE OR REPLACE VIEW department_mappings AS
SELECT
  sm.id,
  sm.employee_id,
  sm.full_name,
  sm.job_title,
  CASE
    WHEN sm.job_title ILIKE '%after school%' THEN 'After School'
    WHEN EXISTS (
      SELECT 1 FROM app_configuration
      WHERE config_key = 'contractor_ids'
      AND config_value @> to_jsonb(sm.employee_id)
    ) THEN 'Contractors'
    ELSE 'Gym'
  END as department,
  CASE
    WHEN sm.job_title ILIKE '%instructor%' OR sm.job_title ILIKE '%special class%' THEN 1
    ELSE 0
  END as job_id
FROM staff_members sm
WHERE sm.is_active = true;

COMMENT ON VIEW department_mappings IS 'Maps staff to departments and job IDs based on title and configuration';

-- ==============================================
-- FUNCTIONS & TRIGGERS
-- ==============================================

-- Function: Aggregate time entries into staff_hours
CREATE OR REPLACE FUNCTION aggregate_time_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update or insert staff_hours aggregation
  INSERT INTO staff_hours (staff_member_id, payroll_period_id, regular_hours, overtime_hours)
  SELECT
    staff_member_id,
    payroll_period_id,
    SUM(CASE WHEN entry_type IN ('regular', 'mat_clean') THEN hours ELSE 0 END) as regular_hours,
    SUM(CASE WHEN entry_type = 'overtime' THEN hours ELSE 0 END) as overtime_hours
  FROM time_entries
  WHERE staff_member_id = NEW.staff_member_id
    AND payroll_period_id = NEW.payroll_period_id
  GROUP BY staff_member_id, payroll_period_id
  ON CONFLICT (staff_member_id, payroll_period_id)
  DO UPDATE SET
    regular_hours = EXCLUDED.regular_hours,
    overtime_hours = EXCLUDED.overtime_hours,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION aggregate_time_entries() IS 'Automatically aggregates time_entries into staff_hours table';

-- Trigger: Aggregate time entries after insert
CREATE TRIGGER aggregate_on_time_entry_insert
  AFTER INSERT ON time_entries
  FOR EACH ROW EXECUTE FUNCTION aggregate_time_entries();

-- Function: Ensure only one current period
CREATE OR REPLACE FUNCTION enforce_single_current_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_current = true THEN
    -- Set all other periods to not current
    UPDATE payroll_periods
    SET is_current = false
    WHERE id != NEW.id AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_single_current_period() IS 'Ensures only one payroll period can be marked as current';

-- Trigger: Enforce single current period
CREATE TRIGGER enforce_single_current_period_trigger
  BEFORE INSERT OR UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION enforce_single_current_period();

-- Triggers: Auto-update updated_at (using existing set_updated_at function)
CREATE TRIGGER set_staff_members_updated_at
  BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_payroll_periods_updated_at
  BEFORE UPDATE ON payroll_periods
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_staff_hours_updated_at
  BEFORE UPDATE ON staff_hours
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_app_configuration_updated_at
  BEFORE UPDATE ON app_configuration
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_configuration ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations for authenticated users
CREATE POLICY "Users can view staff members" ON staff_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create staff members" ON staff_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update staff members" ON staff_members
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete staff members" ON staff_members
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view payroll periods" ON payroll_periods
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create payroll periods" ON payroll_periods
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update payroll periods" ON payroll_periods
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete payroll periods" ON payroll_periods
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view staff hours" ON staff_hours
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create staff hours" ON staff_hours
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update staff hours" ON staff_hours
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete staff hours" ON staff_hours
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view time entries" ON time_entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create time entries" ON time_entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update time entries" ON time_entries
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete time entries" ON time_entries
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view configuration" ON app_configuration
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update configuration" ON app_configuration
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ==============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ==============================================

ANALYZE staff_members;
ANALYZE payroll_periods;
ANALYZE staff_hours;
ANALYZE time_entries;
ANALYZE app_configuration;
