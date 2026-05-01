-- ============================================
-- FIX SUPABASE SECURITY ADVISOR ISSUES
-- ============================================
-- Resolves three CRITICAL security advisor warnings:
-- 1. RLS disabled on public.follow_ups
-- 2. SECURITY DEFINER on public.staff_hours_summary view
-- 3. SECURITY DEFINER on public.department_mappings view

-- ==============================================
-- 1. Enable RLS on follow_ups (if it exists)
-- ==============================================
-- Note: follow_up_notes is the primary table used by the app.
-- follow_ups may exist as an older/alternative table in the live DB.

ALTER TABLE IF EXISTS follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view follow ups" ON follow_ups;
DROP POLICY IF EXISTS "Users can create follow ups" ON follow_ups;
DROP POLICY IF EXISTS "Users can update follow ups" ON follow_ups;
DROP POLICY IF EXISTS "Users can delete follow ups" ON follow_ups;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'follow_ups') THEN
    EXECUTE $p$
      CREATE POLICY "Users can view follow ups" ON follow_ups
          FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Users can create follow ups" ON follow_ups
          FOR INSERT WITH CHECK (auth.role() = 'authenticated');
      CREATE POLICY "Users can update follow ups" ON follow_ups
          FOR UPDATE USING (auth.role() = 'authenticated');
      CREATE POLICY "Users can delete follow ups" ON follow_ups
          FOR DELETE USING (auth.role() = 'authenticated');
    $p$;
  END IF;
END;
$$;

-- ==============================================
-- 2 & 3. Recreate views with security_invoker = true
-- ==============================================
-- SECURITY INVOKER means the view runs with the calling user's privileges,
-- so RLS policies on the underlying tables are properly enforced.
-- Previously the views defaulted to SECURITY DEFINER, which bypassed RLS.

-- staff_hours_summary — column names reflect 20260227000000_fix_payroll_schema.sql
-- (staff_id, period_id, period_label, vacation_hours — no sick_hours yet)
CREATE OR REPLACE VIEW staff_hours_summary
  WITH (security_invoker = true)
AS
SELECT
  sm.id as staff_id,
  sm.employee_id,
  sm.full_name,
  sm.job_title,
  COALESCE(sh.regular_hours, 0) as regular_hours,
  COALESCE(sh.overtime_hours, 0) as overtime_hours,
  COALESCE(sh.vacation_hours, 0) as vacation_hours,
  COALESCE(sh.regular_hours, 0) + COALESCE(sh.overtime_hours, 0) + COALESCE(sh.vacation_hours, 0) as total_hours,
  pp.id as period_id,
  pp.period_label as period
FROM staff_members sm
LEFT JOIN payroll_periods pp ON pp.is_current = true
LEFT JOIN staff_hours sh ON sm.id = sh.staff_id AND sh.period_id = pp.id
WHERE sm.is_active = true
ORDER BY sm.full_name, sm.job_title;

COMMENT ON VIEW staff_hours_summary IS 'Combines staff members with their hours for the current period (security_invoker enforces RLS)';

-- department_mappings (current definition from 20260114000000_create_payroll_system.sql)
CREATE OR REPLACE VIEW department_mappings
  WITH (security_invoker = true)
AS
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

COMMENT ON VIEW department_mappings IS 'Maps staff to departments and job IDs based on title and configuration (security_invoker enforces RLS)';
