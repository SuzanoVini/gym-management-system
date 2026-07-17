-- Payroll period labels were generated client-side by parsing YYYY-MM-DD with
-- new Date(), which reads as UTC midnight and renders one day early in
-- timezones behind UTC (07/01 became 06/30). The client formatter is fixed;
-- recompute the stored labels directly from the date columns.
UPDATE public.payroll_periods
SET period_label = to_char(start_date, 'MM/DD/YY') || ' - ' || to_char(end_date, 'MM/DD/YY')
WHERE period_label IS DISTINCT FROM
      to_char(start_date, 'MM/DD/YY') || ' - ' || to_char(end_date, 'MM/DD/YY');
