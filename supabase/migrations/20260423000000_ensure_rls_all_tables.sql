-- ============================================
-- ENSURE RLS IS ENABLED ON ALL PUBLIC TABLES
-- ============================================
-- Resolves Supabase security alert: rls_disabled_in_public
-- Safe to run multiple times — ALTER TABLE ENABLE ROW LEVEL SECURITY
-- is idempotent; DROP POLICY IF EXISTS prevents duplicate-policy errors.

-- Core gym data tables (originally in enable_rls.sql, no timestamp prefix)
ALTER TABLE IF EXISTS intros ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS follow_up_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS intro_class_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;

-- Payroll tables
ALTER TABLE IF EXISTS staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS staff_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_configuration ENABLE ROW LEVEL SECURITY;

-- CSV config table
ALTER TABLE IF EXISTS csv_export_formats ENABLE ROW LEVEL SECURITY;

-- User profiles
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES FOR TABLES FROM enable_rls.sql
-- (Drop first to avoid "already exists" errors)
-- ============================================

-- intros
DROP POLICY IF EXISTS "Users can view intros" ON intros;
DROP POLICY IF EXISTS "Users can create intros" ON intros;
DROP POLICY IF EXISTS "Users can update intros" ON intros;
DROP POLICY IF EXISTS "Users can delete intros" ON intros;

CREATE POLICY "Users can view intros" ON intros
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create intros" ON intros
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update intros" ON intros
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete intros" ON intros
    FOR DELETE USING (auth.role() = 'authenticated');

-- signups
DROP POLICY IF EXISTS "Users can view signups" ON signups;
DROP POLICY IF EXISTS "Users can create signups" ON signups;
DROP POLICY IF EXISTS "Users can update signups" ON signups;
DROP POLICY IF EXISTS "Users can delete signups" ON signups;

CREATE POLICY "Users can view signups" ON signups
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create signups" ON signups
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update signups" ON signups
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete signups" ON signups
    FOR DELETE USING (auth.role() = 'authenticated');

-- cancellations
DROP POLICY IF EXISTS "Users can view cancellations" ON cancellations;
DROP POLICY IF EXISTS "Users can create cancellations" ON cancellations;
DROP POLICY IF EXISTS "Users can update cancellations" ON cancellations;
DROP POLICY IF EXISTS "Users can delete cancellations" ON cancellations;

CREATE POLICY "Users can view cancellations" ON cancellations
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create cancellations" ON cancellations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update cancellations" ON cancellations
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete cancellations" ON cancellations
    FOR DELETE USING (auth.role() = 'authenticated');

-- holds
DROP POLICY IF EXISTS "Users can view holds" ON holds;
DROP POLICY IF EXISTS "Users can create holds" ON holds;
DROP POLICY IF EXISTS "Users can update holds" ON holds;
DROP POLICY IF EXISTS "Users can delete holds" ON holds;

CREATE POLICY "Users can view holds" ON holds
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create holds" ON holds
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update holds" ON holds
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete holds" ON holds
    FOR DELETE USING (auth.role() = 'authenticated');

-- follow_up_notes
DROP POLICY IF EXISTS "Users can view follow up notes" ON follow_up_notes;
DROP POLICY IF EXISTS "Users can create follow up notes" ON follow_up_notes;
DROP POLICY IF EXISTS "Users can update follow up notes" ON follow_up_notes;
DROP POLICY IF EXISTS "Users can delete follow up notes" ON follow_up_notes;

CREATE POLICY "Users can view follow up notes" ON follow_up_notes
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create follow up notes" ON follow_up_notes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update follow up notes" ON follow_up_notes
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete follow up notes" ON follow_up_notes
    FOR DELETE USING (auth.role() = 'authenticated');

-- intro_class_history
DROP POLICY IF EXISTS "Users can view intro class history" ON intro_class_history;
DROP POLICY IF EXISTS "Users can create intro class history" ON intro_class_history;
DROP POLICY IF EXISTS "Users can update intro class history" ON intro_class_history;
DROP POLICY IF EXISTS "Users can delete intro class history" ON intro_class_history;

CREATE POLICY "Users can view intro class history" ON intro_class_history
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create intro class history" ON intro_class_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update intro class history" ON intro_class_history
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete intro class history" ON intro_class_history
    FOR DELETE USING (auth.role() = 'authenticated');

-- settings
DROP POLICY IF EXISTS "Users can view settings" ON settings;
DROP POLICY IF EXISTS "Users can update settings" ON settings;

CREATE POLICY "Users can view settings" ON settings
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update settings" ON settings
    FOR UPDATE USING (auth.role() = 'authenticated');
