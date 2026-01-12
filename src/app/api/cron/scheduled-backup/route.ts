/**
 * Scheduled backup cron job
 * GET /api/cron/scheduled-backup
 * 
 * This endpoint is called by Vercel Cron Jobs or external schedulers
 * Requires CRON_SECRET for authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database/client';
import { runBackupWithRetry } from '@/lib/backup';

export const maxDuration = 300; // 5 minutes max for cron jobs

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    try {
      const { validateCronSecret } = await import('@/lib/middleware/cron');
      validateCronSecret(request);
    } catch (_err) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current hour and day
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday

    // Fetch all users with backup enabled
    const { data: users, error } = await supabase
      .from('flowvault_user_settings')
      .select('clerk_user_id, backup_schedule, last_backup_at')
      .eq('backup_enabled', true);

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with backup enabled',
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each user
    type UserRecord = { clerk_user_id: string; backup_schedule: string; last_backup_at: string | null };
    for (const user of users as UserRecord[]) {
      try {
        // Determine if backup should run based on schedule
        const shouldRun = shouldRunBackup(
          user.backup_schedule,
          user.last_backup_at,
          currentHour,
          currentDay
        );

        if (!shouldRun) {
          results.skipped++;
          continue;
        }

        // Run backup
        await runBackupWithRetry(user.clerk_user_id, 'scheduled');
        
        // Update last backup time
        const updateData: { last_backup_at: string } = {
          last_backup_at: now.toISOString(),
        };
        await supabase
          .from('flowvault_user_settings')
          .update(updateData as never)
          .eq('clerk_user_id', user.clerk_user_id);

        results.successful++;
        results.processed++;
      } catch (error) {
        console.error(`Backup failed for user ${user.clerk_user_id}:`, error);
        results.failed++;
        results.processed++;
        results.errors.push(
          `User ${user.clerk_user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled backup completed',
      ...results,
    });
  } catch (error) {
    console.error('Scheduled backup failed:', error);
    return NextResponse.json(
      {
        error: 'Scheduled backup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Determines if backup should run based on schedule
 */
function shouldRunBackup(
  schedule: string,
  lastBackupAt: string | null,
  currentHour: number,
  currentDay: number
): boolean {
  if (!lastBackupAt) {
    return true; // First backup
  }

  const lastBackup = new Date(lastBackupAt);
  const now = new Date();
  const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);

  switch (schedule) {
    case 'hourly':
      return hoursSinceLastBackup >= 1;
    
    case 'daily':
      // Run once per day at 2 AM
      return hoursSinceLastBackup >= 24 && currentHour === 2;
    
    case 'weekly':
      // Run once per week on Sunday at 2 AM
      return hoursSinceLastBackup >= 168 && currentDay === 0 && currentHour === 2;
    
    case 'manual':
      return false; // Never run on schedule
    
    default:
      return false;
  }
}
