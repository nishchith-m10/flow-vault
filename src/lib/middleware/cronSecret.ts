/**
 * CRON Secret Validation Middleware
 * Protects cron endpoints from unauthorized access
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Validate CRON_SECRET header
 * Usage in cron routes:
 *   export async function GET(req: NextRequest) {
 *     const authError = validateCronSecret(req);
 *     if (authError) return authError;
 *     // ... cron logic
 *   }
 */
export function validateCronSecret(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured - cron endpoints are unprotected!');
    // Allow in development, block in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }
    return null; // Allow in dev
  }

  // Check X-CRON-SECRET header
  const headerSecret = req.headers.get('X-CRON-SECRET');
  
  // Check Authorization Bearer token as alternative
  const authHeader = req.headers.get('Authorization');
  const bearerSecret = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  const providedSecret = headerSecret || bearerSecret;

  if (!providedSecret) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing CRON_SECRET. Provide via X-CRON-SECRET header or Authorization Bearer token.',
      },
      { status: 401 }
    );
  }

  if (providedSecret !== cronSecret) {
    return NextResponse.json(
      { success: false, error: 'Invalid CRON_SECRET' },
      { status: 403 }
    );
  }

  return null; // Valid
}

/**
 * Wrapper for cron route handlers
 * Usage:
 *   export const GET = withCronAuth(async (req) => { ... });
 */
export function withCronAuth<T extends (req: NextRequest, ...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (req: NextRequest, ...args: unknown[]) => {
    const authError = validateCronSecret(req);
    if (authError) return authError;
    
    return handler(req, ...args);
  }) as T;
}
