-- ============================================
-- PAYROLL SYSTEM - DEFAULT CONFIGURATION
-- ============================================
-- This migration inserts default configuration values into app_configuration table
-- These replace hardcoded constants from the original app.js file

-- ==============================================
-- INSERT DEFAULT CONFIGURATION
-- ==============================================

INSERT INTO app_configuration (config_key, config_value, description) VALUES
  -- Payroll period rules
  (
    'payroll_period_rules',
    '{"first_half_days": [1, 15], "second_half_days": [16, 31]}'::jsonb,
    'Payroll period day ranges: days 1-15 and 16-31'
  ),

  -- Mat cleaning hours bonus
  (
    'mat_cleaning_hours',
    '0.25'::jsonb,
    'Hours added for mat cleaning (15 minutes = 0.25 hours)'
  ),

  -- Auto-generated employee ID base
  (
    'auto_id_base',
    '1040'::jsonb,
    'Starting ID for auto-generated employee IDs'
  ),

  -- Hours increment for input fields
  (
    'hours_increment',
    '0.25'::jsonb,
    'Hour increment for input fields (15-minute intervals)'
  ),

  -- Data cache duration
  (
    'cache_duration_days',
    '7'::jsonb,
    'Days to cache payroll period data before refresh'
  ),

  -- Contractor employee IDs
  (
    'contractor_ids',
    '["1030", "1035", "1037"]'::jsonb,
    'Employee IDs classified as contractors (for department mapping)'
  ),

  -- After School Program detection keywords
  (
    'after_school_keywords',
    '["asp", "after", "school", "pickup", "pick", "up", "afterschool", "after-school"]'::jsonb,
    'Keywords for detecting After School Program entries during import'
  ),

  -- Company name for exports
  (
    'company_name',
    '"Kitsilano Brazilian Jiu Jitsu Inc."'::jsonb,
    'Company name used in CSV exports and reports'
  ),

  -- Weekend days (for overtime detection)
  (
    'weekend_days',
    '[0, 6]'::jsonb,
    'Day numbers for weekends (0=Sunday, 6=Saturday) - automatically classified as overtime'
  ),

  -- CSV export column mapping
  (
    'csv_export_columns',
    '{
      "employee_name": "Employee name",
      "payroll_id": "Employee payroll ID",
      "first_name": "First name",
      "last_name": "Last name",
      "job_id": "job id",
      "department": "Department name",
      "overtime": "Overtime",
      "regular": "Regular Pay",
      "vacation": "Vacation Pay",
      "external_id": "External ID",
      "job_title": "Job Title"
    }'::jsonb,
    'CSV export column header mappings for payroll system'
  )

ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================
DO $$
DECLARE
  config_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count FROM app_configuration;
  RAISE NOTICE 'Configuration data inserted successfully!';
  RAISE NOTICE '% configuration entries created', config_count;
  RAISE NOTICE 'Next step: Run the initial staff data migration (20260114000002_insert_initial_staff.sql)';
END $$;
