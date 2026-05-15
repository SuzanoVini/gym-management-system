-- Marks intros as signed_up = 'No' when:
--   - signed_up has never been recorded (null or empty string)
--   - the class date has already passed
-- Uses COALESCE(date::date, created_at::date) to handle legacy records where date is null.
-- Returns the count of rows updated (used by the cron response).

CREATE OR REPLACE FUNCTION mark_unsigned_intros()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.intros
  SET signed_up = 'No'
  WHERE (signed_up IS NULL OR signed_up = '')
    AND COALESCE(date::date, created_at::date) < CURRENT_DATE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
