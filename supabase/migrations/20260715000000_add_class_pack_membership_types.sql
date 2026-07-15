-- Add Flex 10 / Flex 20 class pack membership types to the existing
-- membership_types settings row. Idempotent: keeps any owner-added types
-- and de-duplicates.
UPDATE settings
SET
  value = (
    SELECT jsonb_agg(DISTINCT v ORDER BY v)
    FROM jsonb_array_elements_text(value || '["Flex 10","Flex 20"]'::jsonb) AS t (v)
  ),
  updated_at = now()
WHERE key = 'membership_types';
