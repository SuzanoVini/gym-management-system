-- Turns captured Zen Planner attendance webhooks into app data:
--   * intros.attended = 'Yes' when the booked person checks into that exact class
--   * members.last_checkin_date for the "active but not training" insight
-- Additive only. Matching is idempotent and conservative: ambiguous matches are left
-- for staff, and a human-entered attended value is never overwritten.

-- One row per check-in, parsed from zenplanner_webhook_events by the app.
-- class_date/class_time are Zen Planner's local values, kept as-is (no tz math).
CREATE TABLE IF NOT EXISTS public.zenplanner_checkins (
  attendance_id text primary key,
  person_id text,
  first_name text,
  email text,          -- normalizeEmail()
  phone text,          -- normalizePhone(): same rule as intros.phone_normalized
  class_name text not null,
  class_date date not null,
  class_time text not null,  -- '7:15 PM', the format intros.time uses
  is_free_trial boolean not null default false,
  is_drop_in boolean not null default false,
  received_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS zenplanner_checkins_class_date_idx
  ON public.zenplanner_checkins (class_date);

-- Service role only, like zenplanner_webhook_events.
ALTER TABLE public.zenplanner_checkins ENABLE ROW LEVEL SECURITY;

-- Local date of the latest class this member checked into. CSV imports don't send it,
-- so their upserts leave it alone.
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS last_checkin_date date;

CREATE OR REPLACE FUNCTION public.apply_zenplanner_checkins(since date)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  intros_marked integer;
  members_updated integer;
BEGIN
  -- Intros: same date, same time, compatible class, same email or phone, and the
  -- pairing must be one-to-one. Anything else stays for a human to decide.
  WITH c AS (
    SELECT ch.attendance_id, ch.email, ch.phone, ch.class_date, ch.class_time,
           ch.class_name, cm.system_name
    FROM public.zenplanner_checkins ch
    LEFT JOIN public.class_mappings cm ON cm.zenplanner_name = ch.class_name
    WHERE ch.class_date >= since
  ),
  pairs AS (
    SELECT c.attendance_id, i.id AS intro_id
    FROM c
    JOIN public.intros i
      ON i.date = to_char(c.class_date, 'YYYY-MM-DD')
     AND upper(btrim(i.time)) = c.class_time
     AND (i.class = c.system_name OR i.class = c.class_name)
     AND ((c.email IS NOT NULL AND i.email_normalized = c.email)
       OR (c.phone IS NOT NULL AND i.phone_normalized = c.phone))
    WHERE i.status IS DISTINCT FROM 'Cancelled'
      AND i.is_spam IS NOT TRUE
  ),
  ranked AS (
    SELECT intro_id,
           count(*) OVER (PARTITION BY attendance_id) AS per_checkin,
           count(*) OVER (PARTITION BY intro_id) AS per_intro
    FROM pairs
  )
  UPDATE public.intros i
  SET attended = 'Yes'
  FROM ranked r
  WHERE i.id = r.intro_id
    AND r.per_checkin = 1
    AND r.per_intro = 1
    AND coalesce(i.attended::text, '') = '';
  GET DIAGNOSTICS intros_marked = ROW_COUNT;

  -- Members: same email or phone AND same first name (families share contacts),
  -- one member per check-in. The date only ever moves forward.
  WITH m AS (
    SELECT id, name,
           nullif(lower(btrim(email, ' ')), '') AS email,
           nullif(
             CASE
               WHEN length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) = 11
                AND left(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 1) = '1'
               THEN substr(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 2)
               ELSE regexp_replace(coalesce(phone, ''), '\D', '', 'g')
             END, '') AS phone
    FROM public.members
  ),
  pairs AS (
    SELECT ch.attendance_id, ch.class_date, m.id AS member_id
    FROM public.zenplanner_checkins ch
    JOIN m
      ON ((ch.email IS NOT NULL AND m.email = ch.email)
       OR (ch.phone IS NOT NULL AND m.phone = ch.phone))
     AND coalesce(ch.first_name, '') <> ''
     AND left(lower(m.name), length(ch.first_name)) = lower(ch.first_name)
    WHERE ch.class_date >= since
  ),
  latest AS (
    SELECT member_id, max(class_date) AS d
    FROM (
      SELECT member_id, class_date, count(*) OVER (PARTITION BY attendance_id) AS n
      FROM pairs
    ) x
    WHERE n = 1
    GROUP BY member_id
  )
  UPDATE public.members mem
  SET last_checkin_date = latest.d
  FROM latest
  WHERE mem.id = latest.member_id
    AND (mem.last_checkin_date IS NULL OR mem.last_checkin_date < latest.d);
  GET DIAGNOSTICS members_updated = ROW_COUNT;

  RETURN jsonb_build_object('intros_marked', intros_marked, 'members_updated', members_updated);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_zenplanner_checkins(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_zenplanner_checkins(date) TO service_role;

-- Start of the current unbroken run of attendance deliveries (no gap over 48h), or
-- null when the feed has been quiet for 48h. The "no check-in" insight only trusts
-- absence inside this window. A closure or outage resets it, which hides the insight
-- (a false negative) instead of flagging members as absent.
-- ponytail: scans every attendance delivery; add a received_at index if it ever gets slow.
CREATE OR REPLACE FUNCTION public.zenplanner_attendance_covered_since()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH e AS (
    SELECT received_at, lag(received_at) OVER (ORDER BY received_at) AS prev
    FROM public.zenplanner_webhook_events
    WHERE feed = 'attendance'
  )
  SELECT CASE
    WHEN (SELECT max(received_at) FROM e) >= now() - interval '48 hours'
    THEN (SELECT max(received_at) FROM e WHERE prev IS NULL OR received_at - prev > interval '48 hours')
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.zenplanner_attendance_covered_since() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zenplanner_attendance_covered_since() TO authenticated, service_role;
