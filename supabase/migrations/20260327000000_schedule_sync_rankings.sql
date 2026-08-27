-- Schedule daily OpenRouter rankings sync → Platform Pulse cache
-- Runs after the previous UTC day is complete (OpenRouter rankings are day-lagged).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Idempotent: unschedule if re-applied
do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'sync-platform-rankings';
exception
  when undefined_table then null;
  when others then null;
end $$;

select cron.schedule(
  'sync-platform-rankings',
  '15 6 * * *', -- 06:15 UTC daily
  $$
  select net.http_post(
    url := 'https://yitejhvhkpuklapxhpqk.supabase.co/functions/v1/sync-rankings',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
