UPDATE intros
SET signed_up = 'Yes'
WHERE (signed_up IS NULL OR signed_up != 'Yes')
  AND EXISTS (
    SELECT 1 FROM signups s
    WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(intros.name))
  );
