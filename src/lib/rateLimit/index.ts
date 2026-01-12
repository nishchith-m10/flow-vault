/**
 * Rate Limiter Module
 * Uses flowvault_rate_limit_counters table for atomic quota enforcement
 */

import { createUserClient } from '@/lib/database/client';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// Default rate limit configs per action type
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  'backup:trigger': { windowMs: 60 * 60 * 1000, maxRequests: 100 }, // 100/hour
  'backup:restore': { windowMs: 60 * 60 * 1000, maxRequests: 20 }, // 20/hour
  'backup:export': { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // 50/hour
  'api:general': { windowMs: 60 * 1000, maxRequests: 60 }, // 60/min
};

/**
 * Check and increment rate limit counter
 * Uses atomic upsert to prevent race conditions
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  cost: number = 1
): Promise<RateLimitResult> {
  const config = DEFAULT_LIMITS[action] || DEFAULT_LIMITS['api:general'];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  const supabase = createUserClient(userId);

  // Atomic upsert: increment or create counter
  const { data, error } = await (supabase as unknown as { rpc: (name: string, params: unknown) => Promise<unknown> })
    .rpc('flowvault_increment_rate_limit', {
      p_user_id: userId,
      p_action: action,
      p_cost: cost,
      p_window_start: windowStart.toISOString(),
      p_max_requests: config.maxRequests,
    })
    .single();

  if (error) {
    console.error('Rate limit check failed:', error);
    // On error, allow request (fail open)
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowMs),
      limit: config.maxRequests,
    };
  }

  const resetAt = new Date(now.getTime() + config.windowMs);

  return {
    allowed: data.current_count <= config.maxRequests,
    remaining: Math.max(0, config.maxRequests - data.current_count),
    resetAt,
    limit: config.maxRequests,
  };
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  userId: string,
  action: string
): Promise<RateLimitResult> {
  const config = DEFAULT_LIMITS[action] || DEFAULT_LIMITS['api:general'];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  const supabase = createUserClient(userId);

  const { data, error } = await supabase
    .from('flowvault_rate_limit_counters')
    .select('count, window_start')
    .eq('user_id', userId)
    .eq('action', action)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // No counter exists yet
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowMs),
      limit: config.maxRequests,
    };
  }

  const resetAt = new Date(
    new Date((data as { window_start: string }).window_start).getTime() + config.windowMs
  );

  return {
    allowed: (data as { count: number }).count < config.maxRequests,
    remaining: Math.max(0, config.maxRequests - (data as { count: number }).count),
    resetAt,
    limit: config.maxRequests,
  };
}

/**
 * Reset rate limit for a user/action (admin only)
 */
export async function resetRateLimit(
  userId: string,
  action?: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();

  const query = supabase
    .from('flowvault_rate_limit_counters')
    .delete()
    .eq('user_id', userId);

  if (action) {
    query.eq('action', action);
  }

  await query;
}
