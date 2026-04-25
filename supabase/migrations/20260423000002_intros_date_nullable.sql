-- Allow intros.date to be NULL — not every intro record has a specific date.
-- The TypeScript type already marks the field as optional.
ALTER TABLE intros ALTER COLUMN date DROP NOT NULL;
