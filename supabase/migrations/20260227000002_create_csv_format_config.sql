-- ============================================
-- CSV EXPORT FORMAT CONFIGURATION
-- ============================================
-- This migration creates a table to store CSV export format configurations
-- allowing users to customize column order, headers, and staff ordering

-- ==============================================
-- TABLE: csv_export_formats
-- Purpose: Store CSV export format configurations
-- ==============================================
CREATE TABLE IF NOT EXISTS csv_export_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format_name VARCHAR(100) UNIQUE NOT NULL,
  is_default BOOLEAN DEFAULT false,
  column_config JSONB NOT NULL,
  staff_order_config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT check_format_name_not_empty CHECK (LENGTH(TRIM(format_name)) > 0)
);

-- Indexes for csv_export_formats
CREATE INDEX IF NOT EXISTS idx_csv_format_name ON csv_export_formats(format_name);
CREATE INDEX IF NOT EXISTS idx_csv_format_default ON csv_export_formats(is_default);
CREATE INDEX IF NOT EXISTS idx_csv_format_created_at ON csv_export_formats(created_at DESC);

COMMENT ON TABLE csv_export_formats IS 'Stores CSV export format configurations including column order, headers, and staff ordering';
COMMENT ON COLUMN csv_export_formats.column_config IS 'JSONB array defining column order, enabled state, and custom headers';
COMMENT ON COLUMN csv_export_formats.staff_order_config IS 'JSONB object defining staff row ordering (by id, name, or custom)';
COMMENT ON COLUMN csv_export_formats.is_default IS 'Only one format can be default at a time (enforced by trigger function)';

-- ==============================================
-- FUNCTION: Ensure only one default format
-- ==============================================
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

-- ==============================================
-- TRIGGER: Enforce single default format
-- ==============================================
CREATE TRIGGER enforce_single_default_format_trigger
  BEFORE INSERT OR UPDATE ON csv_export_formats
  FOR EACH ROW EXECUTE FUNCTION enforce_single_default_format();

-- ==============================================
-- TRIGGER: Auto-update updated_at
-- ==============================================
CREATE TRIGGER set_csv_export_formats_updated_at
  BEFORE UPDATE ON csv_export_formats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS
ALTER TABLE csv_export_formats ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations for authenticated users
CREATE POLICY "Users can view CSV formats" ON csv_export_formats
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create CSV formats" ON csv_export_formats
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update CSV formats" ON csv_export_formats
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete CSV formats" ON csv_export_formats
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==============================================
-- INSERT DEFAULT FORMAT CONFIGURATION
-- ==============================================

-- Create a default format configuration
INSERT INTO csv_export_formats (format_name, is_default, column_config, staff_order_config)
VALUES (
  'Standard Payroll Format',
  true,
  '[
    {"key": "staff_name", "label": "Staff Name", "enabled": true},
    {"key": "employee_id", "label": "Payroll ID", "enabled": true},
    {"key": "regular_hours", "label": "Regular Hours", "enabled": true},
    {"key": "overtime_hours", "label": "Overtime Hours", "enabled": true},
    {"key": "vacation_hours", "label": "Vacation Hours", "enabled": true},
    {"key": "mat_cleaning_count", "label": "Mat Cleaning Count", "enabled": true},
    {"key": "total_hours", "label": "Total Hours", "enabled": true}
  ]'::jsonb,
  '{
    "type": "name",
    "direction": "asc"
  }'::jsonb
)
ON CONFLICT (format_name) DO NOTHING;

-- ==============================================
-- ANALYZE TABLE FOR QUERY PLANNER
-- ==============================================

ANALYZE csv_export_formats;
