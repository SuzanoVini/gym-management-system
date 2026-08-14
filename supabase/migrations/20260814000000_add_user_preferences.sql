-- Per-user UI preferences (currently: each tab's default filter selection).
-- Stored as jsonb so new preference keys need no further migrations.
--
-- No new RLS policy is required: "Users can view their own profile" and "Users can
-- update their own profile" from 20260110000000 already scope this column to its owner,
-- and the role-protection trigger keeps a user from escalating themselves while writing.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_profiles.preferences IS
  'Per-user UI preferences. Shape: {"defaultFilters": {"<tab>": {...}}}. Unknown keys are ignored by the app.';
