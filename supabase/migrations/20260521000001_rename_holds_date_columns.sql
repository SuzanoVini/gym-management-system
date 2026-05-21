-- Align holds column names with app code.
-- App has always used start/end; DB still had start_date/end_date.

-- Drop indexes that reference the old column names.
DROP INDEX IF EXISTS idx_holds_start_date;
DROP INDEX IF EXISTS idx_holds_end_date;
DROP INDEX IF EXISTS idx_holds_active;

ALTER TABLE holds RENAME COLUMN start_date TO "start";
ALTER TABLE holds RENAME COLUMN end_date TO "end";

-- Recreate indexes on the renamed columns.
CREATE INDEX IF NOT EXISTS idx_holds_start ON holds("start");
CREATE INDEX IF NOT EXISTS idx_holds_end ON holds("end");

-- Update the year trigger function to reference the renamed column.
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
