-- Migration: dismissed_insights
-- Tracks per-user insight dismissal state (done, snoozed, dismissed).
-- Insights resurface when data_hash changes (underlying data shifted) or snooze expires.

create table if not exists dismissed_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  insight_id text not null,
  action text not null check (action in ('done', 'snoozed', 'dismissed')),
  snoozed_until timestamptz,
  dismissed_at timestamptz default now() not null,
  data_hash text not null,
  created_at timestamptz default now() not null,
  constraint dismissed_insights_user_insight_unique unique (user_id, insight_id)
);

alter table dismissed_insights enable row level security;

create policy "Users manage own dismissed insights"
  on dismissed_insights
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
