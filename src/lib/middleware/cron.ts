import { NextRequest } from 'next/server';

export function validateCronSecret(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    const err = new Error('Unauthorized');
    // add code to distinguish for caller
    // caller should return 401
    throw err;
  }
}

export function validateCronSecretFromHeader(authHeader?: string | null) {
  const secret = process.env.CRON_SECRET;
  return !!secret && authHeader === `Bearer ${secret}`;
}
