-- ============================================
-- FIX PAYROLL SCHEMA MISMATCHES
-- ============================================
-- This migration fixes mismatches between the database schema
-- and the TypeScript code expectations

-- ==============================================
-- 1. Fix payroll_periods table
-- ==============================================

-- Add is_closed column if it doesn't exist
ALTER TABLE payroll_periods
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false;

-- Rename display_name to period_label
ALTER TABLE payroll_periods
RENAME COLUMN display_name TO period_label;

COMMENT ON COLUMN payroll_periods.is_closed IS 'Whether this payroll period is closed and locked for editing';
COMMENT ON COLUMN payroll_periods.period_label IS 'Human-readable period label (e.g., "01/01/26 - 01/15/26")';

-- ==============================================
-- 2. Fix staff_hours table
-- ==============================================

-- Drop existing foreign key constraints
ALTER TABLE staff_hours
DROP CONSTRAINT IF EXISTS staff_hours_staff_member_id_fkey;

ALTER TABLE staff_hours
DROP CONSTRAINT IF EXISTS staff_hours_payroll_period_id_fkey;

-- Rename columns
ALTER TABLE staff_hours
RENAME COLUMN staff_member_id TO staff_id;

ALTER TABLE staff_hours
RENAME COLUMN payroll_period_id TO period_id;

-- Recreate foreign key constraints with new column names
ALTER TABLE staff_hours
ADD CONSTRAINT staff_hours_staff_id_fkey
FOREIGN KEY (staff_id) REFERENCES staff_members(id) ON DELETE CASCADE;

ALTER TABLE staff_hours
ADD CONSTRAINT staff_hours_period_id_fkey
FOREIGN KEY (period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE;

-- Drop old unique constraint
ALTER TABLE staff_hours
DROP CONSTRAINT IF EXISTS unique_staff_period;

-- Add new unique constraint with new column names
ALTER TABLE staff_hours
ADD CONSTRAINT unique_staff_period UNIQUE (staff_id, period_id);

-- Update indexes
DROP INDEX IF EXISTS idx_staff_hours_staff;
DROP INDEX IF EXISTS idx_staff_hours_period;
DROP INDEX IF EXISTS idx_staff_hours_combined;

CREATE INDEX idx_staff_hours_staff ON staff_hours(staff_id);
CREATE INDEX idx_staff_hours_period ON staff_hours(period_id);
CREATE INDEX idx_staff_hours_combined ON staff_hours(staff_id, period_id);

-- Add missing columns to staff_hours (if they don't exist)
ALTER TABLE staff_hours
ADD COLUMN IF NOT EXISTS vacation_hours NUMERIC(6,2) DEFAULT 0 CHECK (vacation_hours >= 0);

ALTER TABLE staff_hours
ADD COLUMN IF NOT EXISTS mat_cleaning_count INTEGER DEFAULT 0 CHECK (mat_cleaning_count >= 0);

ALTER TABLE staff_hours
ADD COLUMN IF NOT EXISTS total_hours NUMERIC(6,2) DEFAULT 0 CHECK (total_hours >= 0);

ALTER TABLE staff_hours
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN staff_hours.vacation_hours IS 'Total vacation hours for this period';
COMMENT ON COLUMN staff_hours.mat_cleaning_count IS 'Number of mat cleaning bonuses (15 min each)';
COMMENT ON COLUMN staff_hours.total_hours IS 'Total hours including all types and mat cleaning bonuses';
COMMENT ON COLUMN staff_hours.notes IS 'Additional notes about hours worked';

-- ==============================================
-- 3. Fix time_entries table
-- ==============================================

-- Drop existing foreign key constraints
ALTER TABLE time_entries
DROP CONSTRAINT IF EXISTS time_entries_staff_member_id_fkey;

ALTER TABLE time_entries
DROP CONSTRAINT IF EXISTS time_entries_payroll_period_id_fkey;

-- Drop old columns
ALTER TABLE time_entries
DROP COLUMN IF EXISTS staff_member_id;

ALTER TABLE time_entries
DROP COLUMN IF EXISTS payroll_period_id;

-- Add staff_hours_id column if it doesn't exist
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS staff_hours_id UUID;

-- Add foreign key constraint
ALTER TABLE time_entries
DROP CONSTRAINT IF EXISTS time_entries_staff_hours_id_fkey;

ALTER TABLE time_entries
ADD CONSTRAINT time_entries_staff_hours_id_fkey
FOREIGN KEY (staff_hours_id) REFERENCES staff_hours(id) ON DELETE CASCADE;

-- Make staff_hours_id NOT NULL (after adding the constraint)
UPDATE time_entries SET staff_hours_id = NULL WHERE staff_hours_id IS NULL;

-- Update entry_type check constraint to include vacation
ALTER TABLE time_entries
DROP CONSTRAINT IF EXISTS time_entries_entry_type_check;

ALTER TABLE time_entries
ADD CONSTRAINT time_entries_entry_type_check
CHECK (entry_type IN ('regular', 'overtime', 'vacation', 'mat_cleaning'));

-- Add is_after_school_program column if it doesn't exist
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS is_after_school_program BOOLEAN DEFAULT false;

COMMENT ON COLUMN time_entries.staff_hours_id IS 'Reference to the staff_hours record this entry belongs to';
COMMENT ON COLUMN time_entries.is_after_school_program IS 'Whether this entry is for after school program work';

-- Update indexes
DROP INDEX IF EXISTS idx_time_entries_staff;
DROP INDEX IF EXISTS idx_time_entries_period;
DROP INDEX IF EXISTS idx_time_entries_staff_period;

CREATE INDEX IF NOT EXISTS idx_time_entries_staff_hours ON time_entries(staff_hours_id);

-- ==============================================
-- 4. Update aggregate_time_entries function
-- ==============================================

-- Drop old trigger
DROP TRIGGER IF EXISTS aggregate_on_time_entry_insert ON time_entries;

-- Drop old function
DROP FUNCTION IF EXISTS aggregate_time_entries();

-- Create new function that works with the updated schema
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
      WHERE staff_hours_id = NEW.staff_hours_id
        AND entry_type = 'regular'
    ),
    overtime_hours = (
      SELECT COALESCE(SUM(hours), 0)
      FROM time_entries
      WHERE staff_hours_id = NEW.staff_hours_id
        AND entry_type = 'overtime'
    ),
    vacation_hours = (
      SELECT COALESCE(SUM(hours), 0)
      FROM time_entries
      WHERE staff_hours_id = NEW.staff_hours_id
        AND entry_type = 'vacation'
    ),
    mat_cleaning_count = (
      SELECT COUNT(*)
      FROM time_entries
      WHERE staff_hours_id = NEW.staff_hours_id
        AND entry_type = 'mat_cleaning'
    ),
    total_hours = (
      SELECT COALESCE(SUM(hours), 0)
      FROM time_entries
      WHERE staff_hours_id = NEW.staff_hours_id
    ),
    updated_at = NOW()
  WHERE id = NEW.staff_hours_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION aggregate_time_entries() IS 'Automatically aggregates time_entries into staff_hours table';

-- Recreate trigger
CREATE TRIGGER aggregate_on_time_entry_insert
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION aggregate_time_entries();

-- ==============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ==============================================

ANALYZE staff_members;
ANALYZE payroll_periods;
ANALYZE staff_hours;
ANALYZE time_entries;
ANALYZE app_configuration;
