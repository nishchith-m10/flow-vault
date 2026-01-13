/**
 * Rate Limit Status API
 * GET /api/rate-limit/status?action=backup:trigger
 * 
 * Returns current rate-limit status for a specific action
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRateLimitStatus } from '@/lib/rateLimit';

// Optional Clerk auth helper
let auth: () => Promise<{ userId?: string }> = async () => ({ userId: undefined });
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  auth = require('@clerk/nextjs/server').auth;
} catch (err) {
  // Clerk not available in this environment
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get action from query params
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['backup:trigger', 'backup:restore', 'backup:export', 'api:general'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get rate limit status (read-only, doesn't increment counter)
    const status = await getRateLimitStatus(userId, action);

    const current = status.limit - status.remaining;
    const percentUsed = Math.round((current / status.limit) * 100);

    return NextResponse.json({
      success: true,
      action,
      current,
      limit: status.limit,
      remaining: status.remaining,
      resetAt: status.resetAt.toISOString(),
      percentUsed,
    });
  } catch (error) {
    console.error('Rate limit status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
