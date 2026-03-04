-- ============================================
-- ADD SICK HOURS TO STAFF_HOURS TABLE
-- ============================================
-- This migration adds sick hours tracking to the payroll system
-- and updates aggregation functions to include sick hours in calculations

-- ==============================================
-- 1. Add sick_hours column to staff_hours table
-- ==============================================

ALTER TABLE staff_hours
ADD COLUMN IF NOT EXISTS sick_hours NUMERIC(6,2) DEFAULT 0 CHECK (sick_hours >= 0);

COMMENT ON COLUMN staff_hours.sick_hours IS 'Total sick hours for this period';

-- ==============================================
-- 2. Update time_entries entry_type constraint to include sick
-- ==============================================

-- Drop existing constraint
ALTER TABLE time_entries
DROP CONSTRAINT IF EXISTS time_entries_entry_type_check;

-- Add updated constraint with sick type
ALTER TABLE time_entries
ADD CONSTRAINT time_entries_entry_type_check
CHECK (entry_type IN ('regular', 'overtime', 'vacation', 'mat_cleaning', 'sick'));

-- ==============================================
-- 3. Update aggregate_time_entries function to include sick hours
-- ==============================================

-- Drop old trigger
DROP TRIGGER IF EXISTS aggregate_on_time_entry_insert ON time_entries;

-- Drop old function
DROP FUNCTION IF EXISTS aggregate_time_entries();

-- Create updated function with sick hours aggregation
CREATE OR REPLACE FUNCTION aggregate_time_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update staff_hours aggregation for the related staff_hours record
  UPDATE staff_hours
  SET
    regular_hours = (
      SELECT COALESCE(SUM(hours), 0)
      FROM time_entries
      WHERE staff_hours_id = COALESCE(NEW.staff_hours_id, OLD.staff_hours_id)
        AND entry_type = 'regular'
    ),
    overtime_hours = (
      SELECT COALESCE(SUM(hours), 0)
      FROM time_entries
      WHERE staff_hours_id = COALESCE(NEW.staff_hours_id, OLD.staff_hours_id)
        AND entry_type = 'overtime'
    ),
    vacation_hours = (
      SELECT COALESCE(SUM(hours), 0)
      FROM time_entries
      WHERE staff_hours_id = COALESCE(NEW.staff_hours_id, OLD.staff_hours_id)
        AND entry_type = 'vacation'
    ),
    sick_hours = (
      SELECT COALESCE(SUM(hours), 0)
      FROM time_entries
      WHERE staff_hours_id = COALESCE(NEW.staff_hours_id, OLD.staff_hours_id)
        AND entry_type = 'sick'
    ),
    mat_cleaning_count = (
      SELECT COUNT(*)
      FROM time_entries
      WHERE staff_hours_id = COALESCE(NEW.staff_hours_id, OLD.staff_hours_id)
        AND entry_type = 'mat_cleaning'
    ),
    total_hours = (
      SELECT COALESCE(SUM(hours), 0)
      FROM time_entries
      WHERE staff_hours_id = COALESCE(NEW.staff_hours_id, OLD.staff_hours_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.staff_hours_id, OLD.staff_hours_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION aggregate_time_entries() IS 'Automatically aggregates time_entries into staff_hours table (includes sick hours)';

-- Recreate trigger for INSERT, UPDATE, and DELETE
CREATE TRIGGER aggregate_on_time_entry_insert
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION aggregate_time_entries();

-- ==============================================
-- 4. Update staff_hours_summary view to include sick hours
-- ==============================================

CREATE OR REPLACE VIEW staff_hours_summary AS
SELECT
  sm.id as staff_id,
  sm.employee_id,
  sm.full_name,
  sm.job_title,
  COALESCE(sh.regular_hours, 0) as regular_hours,
  COALESCE(sh.overtime_hours, 0) as overtime_hours,
  COALESCE(sh.vacation_hours, 0) as vacation_hours,
  COALESCE(sh.sick_hours, 0) as sick_hours,
  COALESCE(sh.regular_hours, 0) + COALESCE(sh.overtime_hours, 0) + COALESCE(sh.vacation_hours, 0) + COALESCE(sh.sick_hours, 0) as total_hours,
  pp.id as period_id,
  pp.period_label as period
FROM staff_members sm
LEFT JOIN payroll_periods pp ON pp.is_current = true
LEFT JOIN staff_hours sh ON sm.id = sh.staff_id AND sh.period_id = pp.id
WHERE sm.is_active = true
ORDER BY sm.full_name, sm.job_title;

COMMENT ON VIEW staff_hours_summary IS 'Combines staff members with their hours for the current period (includes sick hours)';

-- ==============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ==============================================

ANALYZE staff_hours;
ANALYZE time_entries;
