-- ============================================
-- RENAME CANCELLATIONS COLUMNS TO MATCH APP
-- ============================================
-- The frontend Cancellation type uses 'date' and 'age_group'.
-- The database still has 'cancellation_date' and 'age_category'.
-- Uses conditional logic to be safe if the rename was partially applied.

DO $$
BEGIN
  -- Rename cancellation_date → date if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cancellations' AND column_name = 'cancellation_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cancellations' AND column_name = 'date'
  ) THEN
    ALTER TABLE cancellations RENAME COLUMN cancellation_date TO date;
  END IF;

  -- Rename age_category → age_group if needed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cancellations' AND column_name = 'age_category'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cancellations' AND column_name = 'age_group'
  ) THEN
    ALTER TABLE cancellations RENAME COLUMN age_category TO age_group;
  END IF;
END;
$$;
