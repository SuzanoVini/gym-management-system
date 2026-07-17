-- Configurable revenue-per-member setting for the Insights tab. Replaces the
-- hardcoded $180/month figure baked into every dollar estimate in
-- useInsights — the settings modal now lets an owner tune it per gym.
INSERT INTO settings (key, value, description)
VALUES (
  'avg_monthly_membership_revenue',
  '180'::jsonb,
  'Average monthly revenue per member, used to estimate $ impact in Insights'
)
ON CONFLICT (key) DO NOTHING;
