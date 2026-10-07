-- ============================================================
-- ProcrastiNation 2.0 — Web Push sender schedule (Supabase Cron)
--
-- Calls the site's /api/cron/push at the start of every minute (Vercel's
-- own cron runs only once a day). Run ONCE on production at the v2 deploy,
-- after 01_schema.sql and once the v2 site is live. Re-running replaces the
-- job. First store the site's CRON_SECRET in Vault (SQL editor, not a file):
--
--   select vault.create_secret('<the CRON_SECRET from Vercel>', 'push_cron_secret');
--
-- Check it runs:  select * from cron.job_run_details order by start_time desc limit 5;
--                 select status_code, content from net._http_response order by created desc limit 5;
-- Stop it:        select cron.unschedule('web-push');
-- In development, apps/site/scripts/push-cron-dev.sh does this instead.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'web-push',
  '* * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://procrasti-nation.work/api/cron/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'push_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $job$
);
