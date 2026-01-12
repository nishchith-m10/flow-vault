/**
 * Retention cleanup cron job
 * GET /api/cron/cleanup-backups
 * 
 * Runs daily to delete old backups based on retention policies
 * Requires CRON_SECRET for authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupAllUsers } from '@/lib/backup';

export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    try {
      const { validateCronSecret } = await import('@/lib/middleware/cron');
      validateCronSecret(request);
    } catch (_err) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run cleanup for all users
    const result = await cleanupAllUsers();

    return NextResponse.json({
      success: true,
      message: 'Retention cleanup completed',
      ...result,
    });
  } catch (error) {
    console.error('Retention cleanup failed:', error);
    return NextResponse.json(
      {
        error: 'Retention cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
