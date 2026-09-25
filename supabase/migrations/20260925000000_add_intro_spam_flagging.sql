-- Spam flagging for intros. Defaults fill existing rows (not spam, no signals),
-- so nothing is re-scored. The two generated columns mirror the JS normalizers
-- in app/lib/spam/normalize.ts and let one UPDATE resolve a spam group.
ALTER TABLE public.intros
  ADD COLUMN IF NOT EXISTS is_spam boolean not null default false,
  ADD COLUMN IF NOT EXISTS spam_marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS spam_signals text[] not null default '{}',
  ADD COLUMN IF NOT EXISTS spam_warning_dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_normalized text generated always as (nullif(lower(btrim(email, ' ')), '')) stored,
  ADD COLUMN IF NOT EXISTS phone_normalized text generated always as (
    nullif(
      case
        when length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) = 11
         and left(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 1) = '1'
        then substr(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 2)
        else regexp_replace(coalesce(phone, ''), '\D', '', 'g')
      end, '')
  ) stored;
