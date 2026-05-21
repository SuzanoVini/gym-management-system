-- Derive year automatically from the canonical date column on each table.
-- This makes year consistent regardless of how data enters (form, CSV, direct API).

CREATE OR REPLACE FUNCTION derive_year_from_date()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'holds' THEN
    NEW.year := CASE
      WHEN NEW.start_date IS NOT NULL THEN EXTRACT(YEAR FROM NEW.start_date::date)::integer
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

CREATE TRIGGER sync_year_holds
  BEFORE INSERT OR UPDATE ON holds
  FOR EACH ROW EXECUTE FUNCTION derive_year_from_date();

CREATE TRIGGER sync_year_signups
  BEFORE INSERT OR UPDATE ON signups
  FOR EACH ROW EXECUTE FUNCTION derive_year_from_date();

CREATE TRIGGER sync_year_cancellations
  BEFORE INSERT OR UPDATE ON cancellations
  FOR EACH ROW EXECUTE FUNCTION derive_year_from_date();

CREATE TRIGGER sync_year_intros
  BEFORE INSERT OR UPDATE ON intros
  FOR EACH ROW EXECUTE FUNCTION derive_year_from_date();

-- Backfill existing rows that were saved before year tracking was hardened.
UPDATE holds        SET year = EXTRACT(YEAR FROM start_date::date)::integer        WHERE start_date IS NOT NULL;
UPDATE signups      SET year = EXTRACT(YEAR FROM membership_date::date)::integer  WHERE membership_date IS NOT NULL;
UPDATE cancellations SET year = EXTRACT(YEAR FROM "date"::date)::integer          WHERE "date" IS NOT NULL;
UPDATE intros       SET year = EXTRACT(YEAR FROM "date"::date)::integer           WHERE "date" IS NOT NULL;
