-- Migration: 003_rate_limit_function.sql
-- Description: Adds the check_rate_limit function for atomic rate limiting.
-- Order: This migration can be applied after 001_rls_flowvault.sql.

BEGIN;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id TEXT,
  p_action TEXT,
  p_cost INT,
  p_limit INT,
  p_window INTERVAL
)
RETURNS TABLE (allowed BOOLEAN, remaining INT, reset_at TIMESTAMPTZ) AS $$
DECLARE
  current_count INT;
  updated_at_val TIMESTAMPTZ;
  reset_at_val TIMESTAMPTZ;
BEGIN
  -- Upsert the counter
  INSERT INTO public.flowvault_rate_limit_counters (user_id, action, count, updated_at)
  VALUES (p_user_id::uuid, p_action, p_cost, NOW())
  ON CONFLICT (user_id, action) DO UPDATE
  SET
    count = CASE
      WHEN flowvault_rate_limit_counters.updated_at < NOW() - p_window THEN p_cost
      ELSE flowvault_rate_limit_counters.count + p_cost
    END,
    updated_at = NOW()
  RETURNING count, updated_at INTO current_count, updated_at_val;

  reset_at_val := updated_at_val + p_window;

  IF current_count > p_limit THEN
    RETURN QUERY SELECT FALSE, 0, reset_at_val;
  ELSE
    RETURN QUERY SELECT TRUE, p_limit - current_count, reset_at_val;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Verification query:
-- SELECT * FROM check_rate_limit('your-user-id', 'test_action', 1, 10, '1 minute');

COMMIT;
