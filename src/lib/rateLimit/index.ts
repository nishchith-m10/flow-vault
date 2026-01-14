/**
 * Rate Limiter Module
 * Uses flowvault_rate_limit_counters table for atomic quota enforcement
 */

import { createUserClient } from '@/lib/database/client';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  RateLimitRpcResponseSchema,
  RateLimitCounterSchema,
  safeValidate,
} from '@/lib/validation';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
  failedClosed?: boolean; // True if denied due to DB error with fail-closed strategy
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  failStrategy: 'open' | 'closed'; // How to handle database errors
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  // User-level rate limits (fail closed for security-critical operations)
  'backup:trigger': { windowMs: 60 * 60 * 1000, maxRequests: 100, failStrategy: 'closed' }, // 100/hour
  'backup:restore': { windowMs: 60 * 60 * 1000, maxRequests: 20, failStrategy: 'closed' }, // 20/hour (security-critical)
  'backup:export': { windowMs: 60 * 60 * 1000, maxRequests: 50, failStrategy: 'open' }, // 50/hour
  'api:general': { windowMs: 60 * 1000, maxRequests: 60, failStrategy: 'open' }, // 60/min (fail open for availability)

  // Instance-level rate limits (per n8n instance, fail closed to prevent abuse)
  'instance:backup': { windowMs: 60 * 60 * 1000, maxRequests: 200, failStrategy: 'closed' }, // 200/hour per instance
  'instance:restore': { windowMs: 60 * 60 * 1000, maxRequests: 50, failStrategy: 'closed' }, // 50/hour per instance
  'instance:export': { windowMs: 60 * 60 * 1000, maxRequests: 100, failStrategy: 'closed' }, // 100/hour per instance
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
  const res = await supabase.rpc('flowvault_increment_rate_limit', {
    p_user_id: userId,
    p_action: action,
    p_cost: cost,
    p_window_start: windowStart.toISOString(),
    p_max_requests: config.maxRequests,
  });

  const error = res.error;

  // Validate RPC response data with Zod schema
  if (res.data) {
    const validationResult = safeValidate(RateLimitRpcResponseSchema, res.data);
    if (!validationResult.success) {
      console.error('Rate limit RPC response validation failed:', validationResult.error);
      // Treat validation failure as database error (will trigger fail strategy below)
    } else if (validationResult.data) {
      const data = validationResult.data;
      const resetAt = new Date(now.getTime() + config.windowMs);

      return {
        allowed: data.current_count <= config.maxRequests,
        remaining: Math.max(0, config.maxRequests - data.current_count),
        resetAt,
        limit: config.maxRequests,
      };
    }
  }

  // If we reach here, either there was an error or validation failed
  if (error) {
    console.error('Rate limit check failed:', error);
  }

  // Apply fail strategy based on configuration
  if (config.failStrategy === 'closed') {
    // Fail closed: Deny request on database error (security-critical operations)
    console.warn(`Rate limit check failed for ${action}, failing closed (denying request)`);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now.getTime() + config.windowMs),
      limit: config.maxRequests,
      failedClosed: true,
    };
  }

  // Fail open: Allow request on database error (for availability)
  console.warn(`Rate limit check failed for ${action}, failing open (allowing request)`);
  return {
    allowed: true,
    remaining: config.maxRequests,
    resetAt: new Date(now.getTime() + config.windowMs),
    limit: config.maxRequests,
  };
}

/**
 * Check instance-level rate limit
 * Applies rate limits per n8n instance URL to prevent abuse of specific instances
 *
 * @param userId - User ID
 * @param instanceUrl - n8n instance URL (e.g., "https://n8n.example.com")
 * @param action - Action type (e.g., "backup", "restore", "export")
 * @param cost - Cost of the operation (default: 1)
 * @returns Rate limit result
 */
export async function checkInstanceRateLimit(
  userId: string,
  instanceUrl: string,
  action: string,
  cost: number = 1
): Promise<RateLimitResult> {
  // Get config for this instance action type
  const configKey = `instance:${action}`;
  const config = DEFAULT_LIMITS[configKey] || DEFAULT_LIMITS['api:general'];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // Create instance-specific action key using URL hash
  // Use hash of URL to create consistent identifier while avoiding URL injection
  const instanceHash = Buffer.from(instanceUrl).toString('base64').substring(0, 32);
  const instanceAction = `instance:${action}:${instanceHash}`;

  const supabase = createUserClient(userId);

  // Atomic upsert: increment or create counter for this instance
  const res = await supabase.rpc('flowvault_increment_rate_limit', {
    p_user_id: userId,
    p_action: instanceAction,
    p_cost: cost,
    p_window_start: windowStart.toISOString(),
    p_max_requests: config.maxRequests,
  });

  const error = res.error;

  // Validate RPC response data with Zod schema
  if (res.data) {
    const validationResult = safeValidate(RateLimitRpcResponseSchema, res.data);
    if (!validationResult.success) {
      console.error('Instance rate limit RPC response validation failed:', validationResult.error);
      // Treat validation failure as database error (will trigger fail strategy below)
    } else if (validationResult.data) {
      const data = validationResult.data;
      const resetAt = new Date(now.getTime() + config.windowMs);

      return {
        allowed: data.current_count <= config.maxRequests,
        remaining: Math.max(0, config.maxRequests - data.current_count),
        resetAt,
        limit: config.maxRequests,
      };
    }
  }

  // If we reach here, either there was an error or validation failed
  if (error) {
    console.error('Instance rate limit check failed:', error);
  }

  // Apply fail strategy based on configuration
  if (config.failStrategy === 'closed') {
    // Fail closed: Deny request on database error
    console.warn(`Instance rate limit check failed for ${instanceAction}, failing closed (denying request)`);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now.getTime() + config.windowMs),
      limit: config.maxRequests,
      failedClosed: true,
    };
  }

  // Fail open: Allow request on database error
  console.warn(`Instance rate limit check failed for ${instanceAction}, failing open (allowing request)`);
  return {
    allowed: true,
    remaining: config.maxRequests,
    resetAt: new Date(now.getTime() + config.windowMs),
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

  const { data: rawData, error } = await supabase
    .from('flowvault_rate_limit_counters')
    .select('count, window_start')
    .eq('clerk_user_id', userId)
    .eq('action', action)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (error || !rawData) {
    // No counter exists yet
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowMs),
      limit: config.maxRequests,
    };
  }

  // Validate database response with Zod schema
  const validationResult = safeValidate(RateLimitCounterSchema, rawData);
  if (!validationResult.success || !validationResult.data) {
    console.error('Rate limit counter validation failed:', validationResult.error);
    // Treat validation failure as no counter exists
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowMs),
      limit: config.maxRequests,
    };
  }

  const data = validationResult.data;
  const resetAt = new Date(
    new Date(data.window_start).getTime() + config.windowMs
  );

  return {
    allowed: data.count < config.maxRequests,
    remaining: Math.max(0, config.maxRequests - data.count),
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
    .eq('clerk_user_id', userId);

  if (action) {
    query.eq('action', action);
  }

  await query;
}
