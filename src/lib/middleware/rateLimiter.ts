/**
 * Rate Limiter Middleware
 * Apply to API routes to enforce quotas
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/rateLimit';

export interface RateLimiterOptions {
  action: string;
  cost?: number;
}

/**
 * Rate limiter middleware factory
 * Usage:
 *   export const POST = withRateLimit('backup:trigger')(async (req) => { ... });
 */
export function withRateLimit(action: string, cost: number = 1) {
  return function <T extends (req: NextRequest, ...args: unknown[]) => Promise<NextResponse | Response>>(
    handler: T
  ): T {
    return (async (req: NextRequest, ...args: unknown[]) => {
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
        
        return NextResponse.json(
          {
            success: false,
            error: 'Rate limit exceeded',
            limit: rateLimit.limit,
            remaining: 0,
            resetAt: rateLimit.resetAt.toISOString(),
          },
          { status: 429, headers }
        );
      }

      // Call original handler
      const response = await handler(req, ...args);

      // Add rate limit headers to successful response
      if (response instanceof NextResponse) {
        headers.forEach((value, key) => {
          response.headers.set(key, value);
        });
      }

      return response;
    }) as T;
  };
}
