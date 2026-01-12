/**
 * Manual backup trigger API
 * POST /api/backups/trigger
 * 
 * Rate-limited to 100 requests/hour using atomic DB counters
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runBackupWithRetry } from '@/lib/backup';
import { handleApiError } from '@/lib/errors';
import { withRateLimit } from '@/lib/middleware/rateLimiter';

async function handleTriggerBackup() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run backup with retry logic
    const result = await runBackupWithRetry(userId, 'manual');

    if (!result.success) {
      return NextResponse.json(
        {
          message: 'Backup completed with errors',
          jobId: result.jobId,
          workflowsProcessed: result.workflowsProcessed,
          workflowsBackedUp: result.workflowsBackedUp,
          workflowsSkipped: result.workflowsSkipped,
          errors: result.errors,
        },
        { status: 207 } // Multi-status
      );
    }

    return NextResponse.json({
      message: 'Backup completed successfully',
      jobId: result.jobId,
      workflowsProcessed: result.workflowsProcessed,
      workflowsBackedUp: result.workflowsBackedUp,
      workflowsSkipped: result.workflowsSkipped,
      errors: result.errors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Wrap with rate-limiter: 100 requests/hour for backup:trigger action
export const POST = withRateLimit('backup:trigger')(handleTriggerBackup);
