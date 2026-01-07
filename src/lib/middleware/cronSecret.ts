// src/lib/middleware/cronSecret.ts
import { NextApiRequest, NextApiResponse } from 'next';

type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

/**
 * Middleware to protect cron job endpoints with a shared secret.
 * The secret can be provided in the 'X-CRON-SECRET' header or as a Bearer token.
 *
 * @param handler The Next.js API handler to protect.
 * @returns A new handler that includes the secret check.
 */
export function withCronSecret(handler: NextApiHandler): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      // If the secret is not configured on the server, we should not allow any cron jobs to run.
      console.error('CRON_SECRET is not set. Aborting cron job execution.');
      return res.status(500).json({ error: 'Cron secret not configured' });
    }

    const providedSecret =
      req.headers['x-cron-secret'] ||
      (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (providedSecret !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return handler(req, res);
  };
}
