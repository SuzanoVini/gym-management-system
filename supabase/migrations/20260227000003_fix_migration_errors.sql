-- ============================================
-- FIX MIGRATION ERRORS
-- ============================================
-- This migration fixes errors from previous migrations
-- Run this AFTER the previous migrations have been attempted

-- ==============================================
-- 1. Drop and recreate the trigger (fix "already exists" error)
-- ==============================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS enforce_single_default_format_trigger ON csv_export_formats;

-- Drop function if exists
DROP FUNCTION IF EXISTS enforce_single_default_format();

-- Recreate function
CREATE OR REPLACE FUNCTION enforce_single_default_format()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Set all other formats to not default
    UPDATE csv_export_formats
    SET is_default = false
    WHERE id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION enforce_single_default_format() IS 'Ensures only one CSV export format can be marked as default';

-- Recreate trigger
CREATE TRIGGER enforce_single_default_format_trigger
  BEFORE INSERT OR UPDATE ON csv_export_formats
  FOR EACH ROW EXECUTE FUNCTION enforce_single_default_format();

-- ==============================================
-- 2. Ensure staff_hours_summary view is correct
-- ==============================================

-- Drop and recreate view to avoid column rename issues
DROP VIEW IF EXISTS staff_hours_summary CASCADE;

CREATE VIEW staff_hours_summary AS
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
-- 3. Verify indexes (recreate if needed)
-- ==============================================

-- Drop and recreate problematic indexes
DROP INDEX IF EXISTS idx_csv_format_default;
CREATE INDEX idx_csv_format_default ON csv_export_formats(is_default) WHERE is_default = true;

DROP INDEX IF EXISTS idx_only_one_default_format;
CREATE UNIQUE INDEX idx_only_one_default_format ON csv_export_formats(is_default) WHERE is_default = true;

-- ==============================================
-- 4. Ensure RLS policies exist
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view CSV formats" ON csv_export_formats;
DROP POLICY IF EXISTS "Users can create CSV formats" ON csv_export_formats;
DROP POLICY IF EXISTS "Users can update CSV formats" ON csv_export_formats;
DROP POLICY IF EXISTS "Users can delete CSV formats" ON csv_export_formats;

-- Recreate policies
CREATE POLICY "Users can view CSV formats" ON csv_export_formats
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create CSV formats" ON csv_export_formats
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update CSV formats" ON csv_export_formats
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete CSV formats" ON csv_export_formats
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ==============================================
-- 5. Analyze tables
-- ==============================================

ANALYZE csv_export_formats;
ANALYZE staff_hours;
ANALYZE time_entries;
