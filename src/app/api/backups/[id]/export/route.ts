/**
 * Export workflow backup as JSON API endpoint
 * GET /api/backups/[id]/export
 * 
 * Rate-limited to 50 requests/hour for export downloads
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getBackupById } from '@/lib/database/workflowBackups';
import { decryptBackupData, formatWorkflowForExport } from '@/lib/backup/restore';
import { type EncryptedData } from '@/lib/encryption';
import { withRateLimit } from '@/lib/middleware/rateLimiter';

async function handleExport(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const backupId = resolvedParams.id;

    // Get backup from database
    const backup = await getBackupById(backupId);

    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      );
    }

    // Verify backup belongs to user
    if (backup.clerk_user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get encryption password
    const encryptionPassword = process.env.FLOWVAULT_ENCRYPTION_KEY;
    if (!encryptionPassword) {
      return NextResponse.json(
        { success: false, error: 'Encryption key not configured' },
        { status: 500 }
      );
    }

    // Decrypt backup data
    const encryptedData = backup.workflow_data as unknown as EncryptedData;
    const decryptResult = await decryptBackupData(encryptedData, encryptionPassword);

    if (!decryptResult.success || !decryptResult.workflow) {
      return NextResponse.json(
        {
          success: false,
          error: decryptResult.error || 'Failed to decrypt backup data',
        },
        { status: 500 }
      );
    }

    // Format workflow for export
    const exportJSON = formatWorkflowForExport(decryptResult.workflow);

    // Create filename
    const timestamp = new Date(backup.created_at).toISOString().split('T')[0];
    const filename = `${backup.workflow_name}_v${backup.version}_${timestamp}.json`;

    // Return as downloadable JSON file
    return new NextResponse(exportJSON, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export workflow error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Wrap handler with rate-limiter: 50 requests/hour for exports
export const GET = withRateLimit('backup:export')(handleExport);
