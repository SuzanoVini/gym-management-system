-- Add cron source tracking and generated normalized-name dedup keys.

ALTER TABLE cancellations
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'cron')),
  ADD COLUMN IF NOT EXISTS name_normalized TEXT GENERATED ALWAYS AS (lower(trim(name))) STORED;

UPDATE cancellations SET source = 'manual' WHERE source IS NULL;

ALTER TABLE holds
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'cron')),
  ADD COLUMN IF NOT EXISTS hold_status TEXT,
  ADD COLUMN IF NOT EXISTS name_normalized TEXT GENERATED ALWAYS AS (lower(trim(name))) STORED;

UPDATE holds SET source = 'manual' WHERE source IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cancellations
    WHERE date IS NOT NULL
    GROUP BY name_normalized, date
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate cancellations exist by lower(trim(name)) + date; review and merge before creating idx_cancellations_dedup';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM holds
    WHERE start IS NOT NULL
    GROUP BY name_normalized, start
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate holds exist by lower(trim(name)) + start; review and merge before creating idx_holds_dedup';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cancellations_dedup
  ON cancellations (name_normalized, date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_holds_dedup
  ON holds (name_normalized, start);
