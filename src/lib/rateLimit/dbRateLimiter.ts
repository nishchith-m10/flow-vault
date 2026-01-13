import { supabase } from '@/lib/database/client';

/**
 * DB-backed rate limiter using flowvault_rate_limit_counters and the increment_rate_limit RPC
 * - actionType: 'manual_backup' | 'export' | 'api_call' etc.
 * - limit: max requests in window
 * - windowSeconds: sliding window length in seconds
 */
export async function checkAndIncrementRateLimit(
  clerkUserId: string,
  actionType: string,
  limit = 10,
  windowSeconds = 60 * 60
): Promise<{ allowed: boolean; remaining?: number }> {
  // Call the atomic RPC implemented in SQL (increment_rate_limit)
  interface IncrementRateLimitResponse { data?: boolean; error?: unknown }

  const res = await (supabase as unknown as { rpc: (name: string, params: unknown) => Promise<IncrementRateLimitResponse> }).rpc('increment_rate_limit', {
    p_clerk_user_id: clerkUserId,
    p_action_type: actionType,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  const data = res?.data;
  const error = res?.error;

  if (error) {
    console.warn('Rate limiter RPC error:', (error as any)?.message || error);
    // Fail-open in case of DB errors — rely on Upstash Redis in prod
    return { allowed: true };
  }

  // RPC returns boolean allowed
  const allowed = !!data;

  return { allowed };
}

export async function getRateLimitStatus(clerkUserId: string, actionType: string) {
  const { data, error } = await supabase
    .from('flowvault_rate_limit_counters')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .eq('action_type', actionType)
    .order('window_start', { ascending: false })
    .limit(1);

  if (error) {
    console.warn('Rate limit status lookup error:', error.message || error);
    return null;
  }

  return data?.[0] ?? null;
}
