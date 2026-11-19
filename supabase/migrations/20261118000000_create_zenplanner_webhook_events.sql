-- Raw capture of Zen Planner webhook deliveries. Zen Planner doesn't document
-- the payload, so this stores exactly what arrives until we know what to parse.
-- RLS on with no policies: only the service role (the webhook route) can touch it.
CREATE TABLE IF NOT EXISTS public.zenplanner_webhook_events (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  feed text not null,
  headers jsonb not null,
  body text not null
);

CREATE INDEX IF NOT EXISTS zenplanner_webhook_events_feed_received_idx
  ON public.zenplanner_webhook_events (feed, received_at desc);

ALTER TABLE public.zenplanner_webhook_events ENABLE ROW LEVEL SECURITY;
