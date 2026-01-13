/**
 * Rate Limiter Middleware
 * Apply to API routes to enforce quotas
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';

// Optional Clerk auth helper
let auth: () => Promise<{ userId?: string }> = async () => ({ userId: undefined });
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  auth = require('@clerk/nextjs/server').auth;
} catch (err) {
  // Clerk not available; auth() will return undefined
}

export interface RateLimiterOptions {
  action: string;
  cost?: number;
}

/**
 * Rate limiter middleware factory
 * Usage:
 *   export const POST = withRateLimit('backup:trigger')(async (req) => { ... });
 *
 * Note: Type assertion at the end is necessary because TypeScript cannot infer
 * that the wrapped function preserves the exact signature of the handler.
 * The assertion is safe because we forward all args and preserve the return type.
 */
export function withRateLimit(action: string, cost: number = 1) {
  return function <T extends (...args: any[]) => Promise<NextResponse | Response>>(handler: T): T {
    return (async (...args: Parameters<T>) => {
      const req = args[0] as NextRequest;

      // Get user ID from Clerk
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check rate limit
      const rateLimit = await checkRateLimit(userId, action, cost);

      // Add rate limit headers
      const headers = new Headers({
        'X-RateLimit-Limit': rateLimit.limit.toString(),
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
      });

      if (!rateLimit.allowed) {
        headers.set('Retry-After', Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString());

        // Differentiate between normal rate limit and fail-closed database error
        const errorMessage = rateLimit.failedClosed
          ? 'Service temporarily unavailable due to rate limit system error'
          : 'Rate limit exceeded';

        const statusCode = rateLimit.failedClosed ? 503 : 429;

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            limit: rateLimit.limit,
            remaining: 0,
            resetAt: rateLimit.resetAt.toISOString(),
          },
          { status: statusCode, headers }
        );
      }

      // Call original handler with original args
      const response = await handler(...args);

      // Add rate limit headers to successful response
      if (response instanceof NextResponse) {
        headers.forEach((value, key) => {
          response.headers.set(key, value);
        });
      }

      return response;
    }) as unknown as T;
  };
}
