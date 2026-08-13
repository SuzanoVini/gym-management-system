-- Canonicalize staff names: full name is canonical.
-- Old Zen Planner booking emails stored bare first names in intros.staff while
-- current ones store full names, splitting one coach into two ("Alpha" vs
-- "Alpha Instructor"). A bare first name is mapped to a full name only when exactly
-- ONE distinct full name in the data starts with it — the same ambiguity guard
-- as canonicalizeStaffName() in the app, so coaches sharing a first name are
-- never merged.

-- 1. Rewrite bare first names in intros.staff to their unambiguous full name.
WITH first_name_map AS (
  SELECT split_part(full_name, ' ', 1) AS first_name,
         min(full_name) AS full_name
  FROM (
    SELECT DISTINCT staff AS full_name
    FROM public.intros
    WHERE staff LIKE '% %'
  ) f
  GROUP BY split_part(full_name, ' ', 1)
  HAVING count(*) = 1
)
UPDATE public.intros i
SET staff = m.full_name
FROM first_name_map m
WHERE i.staff = m.first_name;

-- 2. Upgrade the staff_members settings vocabulary to full names using the
-- same map (entries with no unambiguous full name stay as they are).
WITH first_name_map AS (
  SELECT split_part(full_name, ' ', 1) AS first_name,
         min(full_name) AS full_name
  FROM (
    SELECT DISTINCT staff AS full_name
    FROM public.intros
    WHERE staff LIKE '% %'
  ) f
  GROUP BY split_part(full_name, ' ', 1)
  HAVING count(*) = 1
)
UPDATE public.settings s
SET value = coalesce(
      (
        SELECT jsonb_agg(coalesce(m.full_name, e.name) ORDER BY e.ord)
        FROM jsonb_array_elements_text(s.value) WITH ORDINALITY AS e(name, ord)
        LEFT JOIN first_name_map m ON m.first_name = e.name
      ),
      s.value
    ),
    updated_at = now()
WHERE s.key = 'staff_members';
