CREATE TABLE IF NOT EXISTS members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name             TEXT NOT NULL,
  name_normalized  TEXT GENERATED ALWAYS AS (lower(trim(name))) STORED,
  birth_date       TEXT,
  email            TEXT,
  phone            TEXT,
  membership_type  TEXT,
  status           TEXT CHECK (status IN ('Active', 'On Hold', 'Inactive')),
  join_date        TEXT,
  last_sync_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_name_normalized ON members (name_normalized);

DROP TRIGGER IF EXISTS set_members_updated_at ON members;
CREATE TRIGGER set_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read members"
  ON members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert members"
  ON members FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update members"
  ON members FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete members"
  ON members FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_members_status ON members (status);
