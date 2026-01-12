/**
 * Rate limiting for n8n API calls and backup operations
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitState {
  requests: number;
  resetAt: number;
}

const rateLimitStates = new Map<string, RateLimitState>();

const N8N_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * Checks if rate limit allows a request
 */
export function checkRateLimit(userId: string, config = N8N_RATE_LIMIT): boolean {
  const key = `n8n:${userId}`;
  const now = Date.now();
  const state = rateLimitStates.get(key);

  if (!state || now >= state.resetAt) {
    // Reset window
    rateLimitStates.set(key, {
      requests: 1,
      resetAt: now + config.windowMs,
    });
    return true;
  }

  if (state.requests >= config.maxRequests) {
    // Rate limit exceeded
    return false;
  }

  // Increment counter
  state.requests++;
  return true;
}

/**
 * Gets time until rate limit resets
 */
export function getRateLimitReset(userId: string): number {
  const key = `n8n:${userId}`;
  const state = rateLimitStates.get(key);

  if (!state) {
    return 0;
  }

  const now = Date.now();
  return Math.max(0, state.resetAt - now);
}

/**
 * Delays execution to respect rate limits
 * Processes items in batches with delays
 */
export async function batchWithRateLimit<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  userId: string,
  batchSize = 10
): Promise<R[]> {
  const results: R[] = [];
  const batches: T[][] = [];

  // Split into batches
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  // Process batches with rate limit checks
  for (const batch of batches) {
    // Check rate limit before processing batch
    if (!checkRateLimit(userId)) {
      const resetTime = getRateLimitReset(userId);
      console.log(`Rate limit exceeded, waiting ${resetTime}ms`);
      await sleep(resetTime);
    }

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(item => processFn(item))
    );
    results.push(...batchResults);

    // Delay between batches (600ms for 100 req/min)
    if (batches.indexOf(batch) < batches.length - 1) {
      await sleep(600);
    }
  }

  return results;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clears rate limit state (useful for testing)
 */
export function clearRateLimitState(userId?: string): void {
  if (userId) {
    rateLimitStates.delete(`n8n:${userId}`);
  } else {
    rateLimitStates.clear();
  }
}
