-- ============================================
-- PAYROLL SYSTEM - INITIAL STAFF DATA
-- ============================================
-- This migration seeds placeholder staff members so a fresh environment has a
-- working roster. Real staff records live only in the database — they are
-- entered through the app and are deliberately not committed to this repo.

-- ==============================================
-- INSERT INITIAL STAFF MEMBERS
-- ==============================================

INSERT INTO staff_members (employee_id, full_name, job_title, is_active) VALUES
  ('1001', 'Staff Member 1', 'Coordinator', true),
  ('1002', 'Staff Member 2', 'Instructor', true),
  ('1003', 'Staff Member 3', 'Special Class', true),
  ('1004', 'Staff Member 4', 'Instructor', true),
  ('1005', 'Staff Member 5', 'Helper', true),
  ('1006', 'Staff Member 6', 'Instructor', true),
  ('1007', 'Staff Member 7', 'After School Program Helper', true),
  ('1007', 'Staff Member 7', 'Instructor', true),
  ('1008', 'Staff Member 8', 'After School Program Helper', true),
  ('1008', 'Staff Member 8', 'Instructor', true),
  ('1009', 'Staff Member 9', 'Instructor', true)
ON CONFLICT (employee_id) DO NOTHING;

-- Note: Some staff members have multiple entries with the same employee_id but different job titles
-- This is intentional as they work in multiple roles (e.g., Instructor + After School Program Helper)

-- ==============================================
-- CREATE INITIAL PAYROLL PERIOD
-- ==============================================

-- Calculate current payroll period based on today's date
DO $$
DECLARE
  today DATE := CURRENT_DATE;
  period_day INTEGER := EXTRACT(DAY FROM today);
  period_start DATE;
  period_end DATE;
  period_display VARCHAR(50);
BEGIN
  -- Determine if we're in first half (1-15) or second half (16-31) of month
  IF period_day <= 15 THEN
    -- First half: 1st to 15th
    period_start := DATE_TRUNC('month', today);
    period_end := DATE_TRUNC('month', today) + INTERVAL '14 days';
  ELSE
    -- Second half: 16th to end of month
    period_start := DATE_TRUNC('month', today) + INTERVAL '15 days';
    period_end := (DATE_TRUNC('month', today) + INTERVAL '1 month' - INTERVAL '1 day');
  END IF;

  -- Format display name (MM/DD/YY - MM/DD/YY)
  period_display := TO_CHAR(period_start, 'MM/DD/YY') || ' - ' || TO_CHAR(period_end, 'MM/DD/YY');

  -- Insert the period (only if it doesn't exist)
  INSERT INTO payroll_periods (start_date, end_date, display_name, is_current)
  VALUES (period_start, period_end, period_display, true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Current payroll period created: %', period_display;
END $$;

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================
DO $$
DECLARE
  staff_count INTEGER;
  period_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO staff_count FROM staff_members WHERE is_active = true;
  SELECT COUNT(*) INTO period_count FROM payroll_periods WHERE is_current = true;

  RAISE NOTICE '===================================================';
  RAISE NOTICE 'Initial staff data inserted successfully!';
  RAISE NOTICE '% active staff members created', staff_count;
  RAISE NOTICE '% current payroll period(s) created', period_count;
  RAISE NOTICE '===================================================';
  RAISE NOTICE 'Next step: Set up the frontend to connect to Supabase';
  RAISE NOTICE 'You will need to:';
  RAISE NOTICE '1. Get your Supabase URL and anon key from the project settings';
  RAISE NOTICE '2. Create config.js with your Supabase credentials';
  RAISE NOTICE '3. Create the service layer files (staff, hours, period services)';
  RAISE NOTICE '===================================================';
END $$;
