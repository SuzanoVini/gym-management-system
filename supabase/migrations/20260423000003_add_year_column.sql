-- Add nullable year column to all tabs' tables.
-- Existing rows get NULL (no year known); new imports populate it.
ALTER TABLE intros        ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE signups       ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE cancellations ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE holds         ADD COLUMN IF NOT EXISTS year INTEGER;
