// src/lib/rateLimit/index.ts

import { createClient } from '@supabase/supabase-js';

// Assume supabase client is initialized and exported from a central place
// As we don't have the real one, we'll use a placeholder
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key'
);

const RATE_LIMIT_QUOTAS: Record<string, { limit: number; window: number }> = {
  'default': { limit: 100, window: 60 * 60 }, // 100 requests per hour
  'backup_trigger': { limit: 10, window: 60 * 60 }, // 10 per hour
  'cron': { limit: 5, window: 60 }, // 5 per minute
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Checks and updates the rate limit for a given user and action.
 *
 * @param userId The ID of the user.
 * @param action The action being performed.
 * @param cost The cost of the action (default: 1).
 * @returns An object with the rate limit status.
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  cost: number = 1
): Promise<RateLimitResult> {
  const quota = RATE_LIMIT_QUOTAS[action] || RATE_LIMIT_QUOTAS['default'];
  const { limit, window: windowInSeconds } = quota;

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowInSeconds * 1000);

  // This should be an atomic operation. Using a stored procedure (RPC) is the best way.
  // We will call a postgres function 'check_rate_limit'
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_action: action,
    p_cost: cost,
    p_limit: limit,
    p_window: `${windowInSeconds} seconds`,
  });

  if (error) {
    console.error('Error checking rate limit:', error);
    // In case of error, default to allowing the request to avoid blocking users.
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(now.getTime() + windowInSeconds * 1000),
    };
  }

  const { allowed, remaining, reset_at } = data;

  return {
    allowed,
    remaining,
    resetAt: new Date(reset_at),
  };
}

/*
-- Note for migrations:
-- The following PostgreSQL function should be added in a new migration file.
-- This function handles the rate limiting logic atomically.

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
*/
