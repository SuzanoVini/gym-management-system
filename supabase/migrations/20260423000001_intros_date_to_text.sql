-- Change intros.date from INTEGER to TEXT
-- The column previously stored a numeric day-of-month; it now stores
-- ISO date strings (YYYY-MM-DD) coming from the CSV import.
ALTER TABLE intros ALTER COLUMN date TYPE TEXT USING date::TEXT;
