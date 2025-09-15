CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT USAGE ON SCHEMA net TO postgres;
grant all privileges on all tables in schema cron to postgres;
grant all privileges on all tables in schema net to postgres;

SELECT cron.schedule(
  'watchdog--worker',
  '2 seconds',
  $$
  SELECT net.http_post(
    url := 'http://kong:8000/functions/v1/worker'
  ) AS request_id
  WHERE (
    SELECT COUNT(DISTINCT worker_id) FROM pgflow.workers
    WHERE function_name = 'worker'
      AND last_heartbeat_at > NOW() - make_interval(secs => 6)
  ) < 2;
  $$
);
