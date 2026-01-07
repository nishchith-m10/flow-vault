// src/lib/middleware/rateLimiter.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { checkRateLimit } from '../rateLimit';

type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

interface RateLimiterOptions {
  action: string;
  cost?: number;
}

export function withRateLimiter(handler: NextApiHandler, options: RateLimiterOptions): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // A user ID is required for rate limiting.
    // This should be extracted from the session or JWT.
    // For this example, we'll assume it's available on the request object.
    const userId = (req as any).userId;

    if (!userId) {
      // If there's no user ID, we can't apply user-based rate limiting.
      // Depending on the security policy, we might block, allow, or use IP-based limiting.
      // For this implementation, we'll log a warning and allow the request.
      console.warn('Rate limiter middleware called without a userId.');
      return handler(req, res);
    }

    const { action, cost = 1 } = options;
    const { allowed, remaining, resetAt } = await checkRateLimit(userId, action, cost);

    res.setHeader('X-RateLimit-Limit', remaining + (allowed ? cost : 0));
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetAt.toISOString());

    if (!allowed) {
      const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({ error: 'Too many requests' });
    }

    return handler(req, res);
  };
}
