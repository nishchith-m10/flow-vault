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
 */
export function withRateLimit(action: string, cost: number = 1) {
  return function <T extends (...args: any[]) => Promise<NextResponse | Response>>(handler: T): T {
    return (async (...args: any[]) => {
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
