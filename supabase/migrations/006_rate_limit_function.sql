-- Add rate limit increment function (required by src/lib/rateLimit/index.ts)
-- This must be run after 001_rls_flowvault.sql and 002_key_metadata.sql

CREATE OR REPLACE FUNCTION public.flowvault_increment_rate_limit(
  p_user_id TEXT,
  p_action TEXT,
  p_cost INT,
  p_window_start TIMESTAMPTZ,
  p_max_requests INT
)
RETURNS TABLE(current_count INT) AS $$
DECLARE
  v_count INT;
BEGIN
  -- Atomic upsert: increment existing or create new counter
  INSERT INTO public.flowvault_rate_limit_counters (user_id, action, count, window_start, last_request_at)
  VALUES (p_user_id, p_action, p_cost, p_window_start, NOW())
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET
    count = flowvault_rate_limit_counters.count + p_cost,
    last_request_at = NOW()
  RETURNING count INTO v_count;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;
