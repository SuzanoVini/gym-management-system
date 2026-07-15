-- signups.membership is backed by the membership_type enum, which the prior
-- migration (20260715000000) forgot to widen alongside the settings dropdown.
-- That left "Flex 10"/"Flex 20" selectable in the UI but rejected by the DB
-- with a 400 on insert. Enum values can't be added and used in the same
-- transaction, so this migration only adds them.
ALTER TYPE membership_type ADD VALUE IF NOT EXISTS 'Flex 10';
ALTER TYPE membership_type ADD VALUE IF NOT EXISTS 'Flex 20';
