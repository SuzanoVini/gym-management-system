-- supabase/migrations/20260515200000_restrict_config_payroll_rls.sql

-- ── settings: staff read-only, owner writes ──────────────────────────────────
-- No INSERT or DELETE owner policy is added: the settings table uses a fixed set
-- of rows managed only by migrations. Add owner-only INSERT/DELETE policies here
-- if application code ever needs to create or remove settings rows.
DROP POLICY IF EXISTS "Users can view settings" ON settings;
DROP POLICY IF EXISTS "Users can update settings" ON settings;

CREATE POLICY "Authenticated users can view settings" ON settings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owners can update settings" ON settings
  FOR UPDATE USING (is_owner());

-- ── class_mappings: staff read-only, owner writes ────────────────────────────
DROP POLICY IF EXISTS "Users can view class mappings" ON class_mappings;
DROP POLICY IF EXISTS "Users can manage class mappings" ON class_mappings;

CREATE POLICY "Authenticated users can view class mappings" ON class_mappings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owners can manage class mappings" ON class_mappings
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- ── csv_export_formats: staff read-only, owner writes ────────────────────────
DROP POLICY IF EXISTS "Users can view CSV formats" ON csv_export_formats;
DROP POLICY IF EXISTS "Users can create CSV formats" ON csv_export_formats;
DROP POLICY IF EXISTS "Users can update CSV formats" ON csv_export_formats;
DROP POLICY IF EXISTS "Users can delete CSV formats" ON csv_export_formats;

CREATE POLICY "Authenticated users can view CSV formats" ON csv_export_formats
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owners can manage CSV formats" ON csv_export_formats
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- ── staff_members: staff read-only, owner writes ────────────────────────────
-- (app/lib/services/staff.service.ts queries this table on the browser client)
DROP POLICY IF EXISTS "Users can view staff members" ON staff_members;
DROP POLICY IF EXISTS "Users can create staff members" ON staff_members;
DROP POLICY IF EXISTS "Users can update staff members" ON staff_members;
DROP POLICY IF EXISTS "Users can delete staff members" ON staff_members;

CREATE POLICY "Authenticated users can view staff members" ON staff_members
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owners can manage staff members" ON staff_members
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- ── payroll_periods: staff read-only, owner writes ───────────────────────────
-- (app/lib/services/hours.service.ts queries this table on the browser client)
DROP POLICY IF EXISTS "Users can view payroll periods" ON payroll_periods;
DROP POLICY IF EXISTS "Users can create payroll periods" ON payroll_periods;
DROP POLICY IF EXISTS "Users can update payroll periods" ON payroll_periods;
DROP POLICY IF EXISTS "Users can delete payroll periods" ON payroll_periods;

CREATE POLICY "Authenticated users can view payroll periods" ON payroll_periods
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owners can manage payroll periods" ON payroll_periods
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- ── staff_hours: staff read-only, owner writes ───────────────────────────────
-- (app/lib/services/hours.service.ts queries this table on the browser client)
DROP POLICY IF EXISTS "Users can view staff hours" ON staff_hours;
DROP POLICY IF EXISTS "Users can create staff hours" ON staff_hours;
DROP POLICY IF EXISTS "Users can update staff hours" ON staff_hours;
DROP POLICY IF EXISTS "Users can delete staff hours" ON staff_hours;

CREATE POLICY "Authenticated users can view staff hours" ON staff_hours
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owners can manage staff hours" ON staff_hours
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- ── time_entries: staff read-only, owner writes ──────────────────────────────
-- (app/lib/services/hours.service.ts queries this table on the browser client)
DROP POLICY IF EXISTS "Users can view time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can create time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can delete time entries" ON time_entries;

CREATE POLICY "Authenticated users can view time entries" ON time_entries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owners can manage time entries" ON time_entries
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

-- ── app_configuration: owner only ────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view configuration" ON app_configuration;
DROP POLICY IF EXISTS "Users can update configuration" ON app_configuration;

CREATE POLICY "Owners can manage app configuration" ON app_configuration
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());
