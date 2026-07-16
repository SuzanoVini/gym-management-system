-- Reconstruction of the database state that existed BEFORE the project adopted
-- CLI-managed migrations. The lifecycle tables and their enums were originally
-- created through the Supabase dashboard, so the timestamped migration chain
-- assumes they exist. This baseline is applied first in the migration test so
-- the full chain can run against an empty PostgreSQL.
--
-- Column names and types intentionally reflect the OLD state (e.g. intros.date
-- as INTEGER, cancellations.cancellation_date, holds.start_date/end_date) so
-- the later conversion and rename migrations exercise their real paths.

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TYPE attendance_status AS ENUM ('Yes', 'No', '');
CREATE TYPE signup_status AS ENUM ('Yes', 'No', '');
CREATE TYPE intro_status AS ENUM ('Active', 'Cancelled', 'Completed');
CREATE TYPE membership_type AS ENUM ('Integrity', 'Legacy', 'Special', 'ASP');

CREATE TABLE intros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    month TEXT NOT NULL,
    date INTEGER,
    time TEXT,
    class TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    staff TEXT,
    attended attendance_status,
    signed_up signup_status,
    status intro_status,
    follow_up_status TEXT,
    last_follow_up TIMESTAMPTZ,
    created_by UUID
);

CREATE TABLE signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    month TEXT NOT NULL,
    name TEXT NOT NULL,
    membership membership_type NOT NULL,
    membership_date DATE,
    first_payment_date DATE,
    signup_package BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_by UUID
);

CREATE TABLE cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    month TEXT NOT NULL,
    name TEXT NOT NULL,
    cancellation_date DATE,
    reason TEXT,
    age_category TEXT,
    notes TEXT,
    created_by UUID
);

CREATE TABLE holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    month TEXT NOT NULL,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    reason TEXT,
    fee TEXT,
    created_by UUID
);

CREATE TABLE follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    intro_id UUID REFERENCES intros(id),
    name TEXT,
    class TEXT,
    month TEXT,
    contact_info TEXT,
    last_contact_date DATE,
    next_followup_date DATE,
    notes TEXT,
    priority TEXT,
    status TEXT
);

CREATE TABLE follow_up_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    intro_id UUID REFERENCES intros(id),
    note TEXT NOT NULL,
    staff_name TEXT,
    created_by UUID
);

CREATE TABLE intro_class_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    intro_id UUID NOT NULL REFERENCES intros(id),
    month TEXT NOT NULL,
    date INTEGER NOT NULL,
    time TEXT,
    class TEXT,
    staff TEXT,
    attended attendance_status,
    notes TEXT
);

CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT
);
