-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE intros ENABLE ROW LEVEL SECURITY;
ALTER TABLE signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE intro_class_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INTROS TABLE POLICIES
-- ============================================

-- Users can view all intros (read access for authenticated users)
CREATE POLICY "Users can view intros" ON intros
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert intros (create access for authenticated users)
CREATE POLICY "Users can create intros" ON intros
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update intros (update access for authenticated users)
CREATE POLICY "Users can update intros" ON intros
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Users can delete intros (delete access for authenticated users)
CREATE POLICY "Users can delete intros" ON intros
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- SIGNUPS TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view signups" ON signups
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create signups" ON signups
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update signups" ON signups
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete signups" ON signups
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- CANCELLATIONS TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view cancellations" ON cancellations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create cancellations" ON cancellations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update cancellations" ON cancellations
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete cancellations" ON cancellations
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- HOLDS TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view holds" ON holds
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create holds" ON holds
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update holds" ON holds
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete holds" ON holds
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- FOLLOW_UP_NOTES TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view follow up notes" ON follow_up_notes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create follow up notes" ON follow_up_notes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update follow up notes" ON follow_up_notes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete follow up notes" ON follow_up_notes
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- INTRO_CLASS_HISTORY TABLE POLICIES
-- ============================================

CREATE POLICY "Users can view intro class history" ON intro_class_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create intro class history" ON intro_class_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update intro class history" ON intro_class_history
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete intro class history" ON intro_class_history
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- SETTINGS TABLE POLICIES
-- ============================================

-- Settings are read-only for most users
CREATE POLICY "Users can view settings" ON settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only authenticated users can update settings (you might want to restrict this further)
CREATE POLICY "Users can update settings" ON settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================
-- SECURITY FUNCTIONS
-- ============================================

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN auth.role() = 'authenticated';
END;
$$;

-- Function to get current user ID
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN auth.uid()::TEXT;
END;
$$;

-- ============================================
-- TRIGGERS FOR AUDITING
-- ============================================

-- Function to automatically set created_by field
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.created_by = current_user_id();
    RETURN NEW;
END;
$$;

-- Create triggers for audit fields
CREATE TRIGGER set_intros_created_by
    BEFORE INSERT ON intros
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_signups_created_by
    BEFORE INSERT ON signups
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_cancellations_created_by
    BEFORE INSERT ON cancellations
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

CREATE TRIGGER set_holds_created_by
    BEFORE INSERT ON holds
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

-- Function to automatically update updated_at field
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER set_intros_updated_at
    BEFORE UPDATE ON intros
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_signups_updated_at
    BEFORE UPDATE ON signups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_cancellations_updated_at
    BEFORE UPDATE ON cancellations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_holds_updated_at
    BEFORE UPDATE ON holds
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_intros_month ON intros(month);
CREATE INDEX IF NOT EXISTS idx_intros_staff ON intros(staff);
CREATE INDEX IF NOT EXISTS idx_intros_class ON intros(class);
CREATE INDEX IF NOT EXISTS idx_intros_status ON intros(status);
CREATE INDEX IF NOT EXISTS idx_intros_created_at ON intros(created_at);

CREATE INDEX IF NOT EXISTS idx_signups_month ON signups(month);
CREATE INDEX IF NOT EXISTS idx_signups_created_at ON signups(created_at);

CREATE INDEX IF NOT EXISTS idx_cancellations_month ON cancellations(month);
CREATE INDEX IF NOT EXISTS idx_cancellations_created_at ON cancellations(created_at);

CREATE INDEX IF NOT EXISTS idx_holds_month ON holds(month);
CREATE INDEX IF NOT EXISTS idx_holds_created_at ON holds(created_at);

CREATE INDEX IF NOT EXISTS idx_follow_up_notes_intro_id ON follow_up_notes(intro_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_notes_created_at ON follow_up_notes(created_at);

CREATE INDEX IF NOT EXISTS idx_intro_class_history_intro_id ON intro_class_history(intro_id);
CREATE INDEX IF NOT EXISTS idx_intro_class_history_created_at ON intro_class_history(created_at);