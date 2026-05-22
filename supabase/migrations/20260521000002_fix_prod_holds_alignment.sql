-- Alignment migration: brings production holds schema in sync with dev.
-- On dev this is all no-ops (columns/indexes already correct from 20260521000001).
-- On production the rename migration rolled back leaving duplicate columns and
-- a stale trigger function; this migration cleans that up.

-- Update trigger function to reference the canonical column name.
-- CREATE OR REPLACE is idempotent on both envs.
CREATE OR REPLACE FUNCTION derive_year_from_date()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'holds' THEN
    NEW.year := CASE
      WHEN NEW.start IS NOT NULL THEN EXTRACT(YEAR FROM NEW.start::date)::integer
      ELSE NULL
    END;
  ELSIF TG_TABLE_NAME = 'signups' THEN
    NEW.year := CASE
      WHEN NEW.membership_date IS NOT NULL THEN EXTRACT(YEAR FROM NEW.membership_date::date)::integer
      ELSE NULL
    END;
  ELSIF TG_TABLE_NAME IN ('cancellations', 'intros') THEN
    NEW.year := CASE
      WHEN NEW.date IS NOT NULL THEN EXTRACT(YEAR FROM NEW.date::date)::integer
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old columns if they still exist (prod had both sets; dev already clean).
ALTER TABLE holds DROP COLUMN IF EXISTS start_date;
ALTER TABLE holds DROP COLUMN IF EXISTS end_date;

-- Drop stale indexes if they still exist.
DROP INDEX IF EXISTS idx_holds_start_date;
DROP INDEX IF EXISTS idx_holds_end_date;
DROP INDEX IF EXISTS idx_holds_active;
DROP INDEX IF EXISTS idx_holds_date_range;

-- Create indexes on canonical columns (IF NOT EXISTS = safe on dev).
CREATE INDEX IF NOT EXISTS idx_holds_start ON holds("start");
CREATE INDEX IF NOT EXISTS idx_holds_end ON holds("end");

-- Backfill any holds still missing year (1 on prod, 0 on dev).
UPDATE holds SET year = EXTRACT(YEAR FROM "start"::date)::integer
  WHERE "start" IS NOT NULL AND year IS NULL;

-- Record 20260521000001 as applied on environments where it rolled back.
INSERT INTO supabase_migrations.schema_migrations (version)
  SELECT '20260521000001'
  WHERE NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260521000001'
  );
