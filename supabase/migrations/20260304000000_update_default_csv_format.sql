-- ============================================
-- UPDATE DEFAULT CSV FORMAT TO MATCH ACCOUNTANT TEMPLATE
-- ============================================
-- This migration updates the default CSV format configuration
-- to match the accountant's exact template structure

-- Update the default format configuration
UPDATE csv_export_formats
SET column_config = '[
  {"key": "staff_name", "label": "Employee name", "enabled": true},
  {"key": "employee_id", "label": "Employee payroll ID", "enabled": true},
  {"key": "first_name", "label": "First name", "enabled": true},
  {"key": "last_name", "label": "Last name", "enabled": true},
  {"key": "job_id", "label": "job id", "enabled": true},
  {"key": "department_name", "label": "Department name", "enabled": true},
  {"key": "overtime_hours", "label": "Overtime", "enabled": true},
  {"key": "regular_hours", "label": "Regular Pay", "enabled": true},
  {"key": "sick_hours", "label": "Sick Pay", "enabled": true},
  {"key": "vacation_hours", "label": "Vacation Pay", "enabled": true},
  {"key": "external_id", "label": "External ID", "enabled": true},
  {"key": "job_title", "label": "Job Title", "enabled": true}
]'::jsonb,
    updated_at = NOW()
WHERE format_name = 'Standard Payroll Format';

-- If the format doesn't exist, create it
INSERT INTO csv_export_formats (format_name, is_default, column_config, staff_order_config)
SELECT
  'Standard Payroll Format',
  true,
  '[
    {"key": "staff_name", "label": "Employee name", "enabled": true},
    {"key": "employee_id", "label": "Employee payroll ID", "enabled": true},
    {"key": "first_name", "label": "First name", "enabled": true},
    {"key": "last_name", "label": "Last name", "enabled": true},
    {"key": "job_id", "label": "job id", "enabled": true},
    {"key": "department_name", "label": "Department name", "enabled": true},
    {"key": "overtime_hours", "label": "Overtime", "enabled": true},
    {"key": "regular_hours", "label": "Regular Pay", "enabled": true},
    {"key": "sick_hours", "label": "Sick Pay", "enabled": true},
    {"key": "vacation_hours", "label": "Vacation Pay", "enabled": true},
    {"key": "external_id", "label": "External ID", "enabled": true},
    {"key": "job_title", "label": "Job Title", "enabled": true}
  ]'::jsonb,
  '{
    "type": "name",
    "direction": "asc"
  }'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM csv_export_formats WHERE format_name = 'Standard Payroll Format'
);

-- Analyze table
ANALYZE csv_export_formats;
